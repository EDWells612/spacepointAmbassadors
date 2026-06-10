import uuid
import secrets
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.core.dependencies import require_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.models.instructor import Instructor
from app.models.teacher_session import TeacherSession
from app.models.points_transaction import PointsTransaction
from app.models.system_setting import SystemSetting
from app.models.application_question import ApplicationQuestion
from app.models.teacher_application import TeacherApplication
from app.models.enums import UserRole
from app.schemas.user import UserOut, UserStatusUpdate, AdminUserCreate, AdminUserUpdate
from app.schemas.network import TeacherOut, InstructorOut, SessionOut
from app.schemas.application import ApplicationQuestionCreate, ApplicationQuestionUpdate, ApplicationQuestionOut, TeacherApplicationOut
from app.services import stats as stats_service
from app.services import achievements as ach_service
from app.services.points import award_points, get_setting_int, lifetime_points
from app.services.titles import resolve_title_progress
from app.services.notifications import notify

logger = logging.getLogger("admin")
router = APIRouter(prefix="/admin", tags=["admin"])


# ── Users ─────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(User)
    if status:
        q = q.where(User.status == status)
    if role:
        q = q.where(User.role == role)
    q = q.order_by(User.created_at.desc())
    return list((await db.execute(q)).scalars().all())


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin creates a user directly. Account is active immediately."""
    exists = (await db.execute(select(User.id).where(User.email == body.email))).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        full_name=body.full_name,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=body.role,
        country=body.country,
        status="active",
        invite_code=secrets.token_hex(4).upper() if body.role == UserRole.ambassador else None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def edit_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_unset=True)
    if "password" in data:
        pw = data.pop("password")
        if pw:
            user.password_hash = get_password_hash(pw)
    if data.get("role") == UserRole.ambassador and not user.invite_code:
        user.invite_code = secrets.token_hex(4).upper()
    for k, v in data.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Permanently delete a user and cascade their data."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account")
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"status": "deleted"}


@router.get("/users/{user_id}/points-log")
async def ambassador_points_log(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Full points ledger for one ambassador (newest first)."""
    rows = (await db.execute(
        select(PointsTransaction)
        .where(PointsTransaction.ambassador_id == user_id)
        .order_by(PointsTransaction.created_at.desc())
    )).scalars().all()
    return [
        {
            "id": str(r.id),
            "amount": r.amount,
            "type": r.type,
            "reason": r.reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/activity")
async def activity_log(
    limit: int = 60,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Platform-wide activity feed, merged from points, leads, tasks, sessions
    and signups, newest first. Read-only (derived from existing tables)."""
    from app.models.lead import Lead
    from app.models.task import Task

    events: list[dict] = []

    def add(created_at, kind, text, actor=None, amount=None):
        if created_at is None:
            return
        events.append({
            "created_at": created_at, "kind": kind, "text": text,
            "actor": actor, "amount": amount,
        })

    # Points ledger
    for pt, name in (await db.execute(
        select(PointsTransaction, User.full_name)
        .outerjoin(User, PointsTransaction.ambassador_id == User.id)
        .order_by(PointsTransaction.created_at.desc()).limit(limit)
    )).all():
        add(pt.created_at, "points", pt.reason, name, pt.amount)

    # Leads submitted
    for ld, name in (await db.execute(
        select(Lead, User.full_name)
        .outerjoin(User, Lead.ambassador_id == User.id)
        .order_by(Lead.created_at.desc()).limit(limit)
    )).all():
        add(ld.created_at, "lead", f"submitted lead — {ld.company or ld.contact_name} ({ld.status})", name)

    # Tasks assigned
    for tk, name in (await db.execute(
        select(Task, User.full_name)
        .outerjoin(User, Task.assigned_to == User.id)
        .order_by(Task.created_at.desc()).limit(limit)
    )).all():
        add(tk.created_at, "task", f"task '{tk.title}' ({tk.status})", name)

    # Sessions
    for ss, name in (await db.execute(
        select(TeacherSession, User.full_name)
        .outerjoin(User, TeacherSession.teacher_id == User.id)
        .order_by(TeacherSession.created_at.desc()).limit(limit)
    )).all():
        add(ss.created_at, "session", f"session '{ss.title}' ({ss.status})", name)

    # Signups (ambassadors/teachers)
    for u in (await db.execute(
        select(User).where(User.role != UserRole.admin)
        .order_by(User.created_at.desc()).limit(limit)
    )).scalars().all():
        role = u.role.value if hasattr(u.role, "value") else str(u.role)
        add(u.created_at, "signup", f"joined as {role} ({u.status})", u.full_name)

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return [
        {
            "created_at": e["created_at"].isoformat(),
            "kind": e["kind"],
            "text": e["text"],
            "actor": e["actor"],
            "amount": e["amount"],
        }
        for e in events[:limit]
    ]


@router.get("/network")
async def full_network(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """Whole platform network: every active ambassador with their teachers
    (incl. each teacher's completed-session count) and instructors."""
    ambassadors = (await db.execute(
        select(User).where(User.role == UserRole.ambassador, User.status == "active").order_by(User.full_name)
    )).scalars().all()

    teachers = (await db.execute(
        select(User).where(User.role == UserRole.teacher)
    )).scalars().all()

    instructors = (await db.execute(select(Instructor))).scalars().all()

    # completed sessions per teacher
    done_rows = (await db.execute(
        select(TeacherSession.teacher_id, func.count())
        .where(TeacherSession.status == "done")
        .group_by(TeacherSession.teacher_id)
    )).all()
    done_by_teacher = {tid: cnt for tid, cnt in done_rows}

    by_amb_teachers: dict = {}
    for t in teachers:
        by_amb_teachers.setdefault(t.invited_by_id, []).append(t)
    by_amb_instructors: dict = {}
    for i in instructors:
        by_amb_instructors.setdefault(i.invited_by, []).append(i)

    return {
        "ambassadors": [
            {
                "id": str(a.id),
                "full_name": a.full_name,
                "teachers": [
                    {"id": str(t.id), "full_name": t.full_name, "status": t.status,
                     "sessions_done": int(done_by_teacher.get(t.id, 0))}
                    for t in by_amb_teachers.get(a.id, [])
                ],
                "instructors": [
                    {"id": str(i.id), "name": i.name, "status": i.status}
                    for i in by_amb_instructors.get(a.id, [])
                ],
            }
            for a in ambassadors
        ]
    }


@router.get("/ambassadors/{ambassador_id}/network")
async def ambassador_network(
    ambassador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Teachers, instructors and sessions for one ambassador (for the admin map)."""
    amb = (await db.execute(
        select(User).where(User.id == ambassador_id, User.role == UserRole.ambassador)
    )).scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    teachers = (await db.execute(
        select(User).where(User.role == UserRole.teacher, User.invited_by_id == ambassador_id)
    )).scalars().all()
    instructors = (await db.execute(
        select(Instructor).where(Instructor.invited_by == ambassador_id)
    )).scalars().all()
    sessions_rows = (await db.execute(
        select(TeacherSession, User.full_name)
        .join(User, TeacherSession.teacher_id == User.id)
        .where(User.invited_by_id == ambassador_id)
    )).all()
    sessions = []
    for s, tname in sessions_rows:
        d = SessionOut.model_validate(s)
        d.teacher_name = tname
        sessions.append(d)

    return {
        "ambassador": {"id": str(amb.id), "full_name": amb.full_name},
        "teachers": [TeacherOut.model_validate(t) for t in teachers],
        "instructors": [InstructorOut.model_validate(i) for i in instructors],
        "sessions": sessions,
    }


@router.put("/users/{user_id}/status", response_model=UserOut)
async def update_user_status(
    user_id: uuid.UUID,
    body: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if (body.status == "active" and user.role == UserRole.teacher
            and user.invited_by_id and not user.recruit_points_awarded):
        reward = await get_setting_int(db, "teacher_points_reward", 500)
        await award_points(db, user.invited_by_id, reward, f"Recruited teacher: {user.full_name}")
        user.recruit_points_awarded = True
        await notify(db, user.invited_by_id, "Points Earned!", f"You earned {reward} points for recruiting {user.full_name}.", "points")

    activated_teacher_of = user.invited_by_id if (
        body.status == "active" and user.status != "active" and user.role == UserRole.teacher
    ) else None
    user.status = body.status
    if body.status == "active":
        await notify(db, user.id, "Account Activated", "Your account was activated by an administrator.", "system")
    if activated_teacher_of:
        # Same badge check the ambassador-approval path runs (active_teachers criteria).
        await db.flush()
        await ach_service.check_and_grant(db, activated_teacher_of)
    await db.commit()
    await db.refresh(user)
    return user


# ── Leaderboard & logs ────────────────────────────────────────

@router.get("/leaderboard")
async def admin_leaderboard(
    season: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = stats_service.season_start() if season else None
    return await stats_service.leaderboard(db, since=since)


@router.get("/points-log")
async def points_log(
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    rows = (await db.execute(
        select(PointsTransaction, User.full_name, User.email)
        .join(User, PointsTransaction.ambassador_id == User.id)
        .order_by(PointsTransaction.created_at.desc())
        .offset(offset).limit(min(limit, 500))
    )).all()
    return [
        {
            "id": str(t.id), "amount": t.amount, "type": t.type, "reason": t.reason,
            "created_at": t.created_at.isoformat(), "ambassador_name": name, "ambassador_email": email,
        }
        for t, name, email in rows
    ]


# ── Instructors ───────────────────────────────────────────────

@router.get("/instructors")
async def list_instructors(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = (select(Instructor, User.full_name).join(User, Instructor.invited_by == User.id, isouter=True))
    if status:
        q = q.where(Instructor.status == status)
    q = q.order_by(Instructor.created_at.desc())
    rows = (await db.execute(q)).all()
    return [
        {
            "id": str(i.id), "name": i.name, "email": i.email, "status": i.status,
            "invited_by": str(i.invited_by), "created_at": i.created_at.isoformat(),
            "ambassador_name": amb_name,
        }
        for i, amb_name in rows
    ]


@router.put("/instructors/{instructor_id}/status")
async def update_instructor_status(
    instructor_id: uuid.UUID,
    body: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if body.status not in ("active", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'rejected'")
    inst = (await db.execute(select(Instructor).where(Instructor.id == instructor_id))).scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor not found")

    if body.status == "active" and inst.invited_by and not inst.recruit_points_awarded:
        reward = await get_setting_int(db, "instructor_points_reward", 500)
        await award_points(db, inst.invited_by, reward, f"Recruited instructor: {inst.name}")
        inst.recruit_points_awarded = True
        await notify(db, inst.invited_by, "Points Earned!", f"You earned {reward} points for recruiting {inst.name}.", "points")
        await db.flush()
        await ach_service.check_and_grant(db, inst.invited_by)

    inst.status = body.status
    await db.commit()
    await db.refresh(inst)
    return {"id": str(inst.id), "name": inst.name, "email": inst.email, "status": inst.status}


# ── Teacher sessions (global) ─────────────────────────────────

@router.get("/teacher-sessions")
async def all_teacher_sessions(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    teacher = User.__table__.alias("teacher")
    amb = User.__table__.alias("amb")
    rows = (await db.execute(
        select(
            TeacherSession,
            teacher.c.full_name.label("teacher_name"),
            teacher.c.email.label("teacher_email"),
            amb.c.full_name.label("ambassador_name"),
        )
        .join(teacher, TeacherSession.teacher_id == teacher.c.id)
        .join(amb, teacher.c.invited_by_id == amb.c.id, isouter=True)
        .order_by(TeacherSession.date.desc())
    )).all()
    return [
        {
            "id": str(s.id), "teacher_id": str(s.teacher_id), "title": s.title,
            "description": s.description, "date": s.date.isoformat(), "status": s.status,
            "material_sent": s.material_sent, "planned_students": s.planned_students,
            "attended_students": s.attended_students, "teacher_name": tn, "teacher_email": te,
            "ambassador_name": an, "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, tn, te, an in rows
    ]


# ── Ambassador / teacher deep stats ───────────────────────────

@router.get("/users/{user_id}/ambassador-stats")
async def ambassador_stats(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    amb = (await db.execute(select(User).where(User.id == user_id, User.role == UserRole.ambassador))).scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambassador not found")
    overview = await stats_service.ambassador_overview(db, user_id)
    points = await lifetime_points(db, user_id)
    season_pts = await lifetime_points(db, user_id, since=stats_service.season_start())
    title_info = await resolve_title_progress(db, points)
    badges = await ach_service.list_for(db, user_id)
    teachers = (await db.execute(
        select(User).where(User.role == UserRole.teacher, User.invited_by_id == user_id).order_by(User.created_at.desc())
    )).scalars().all()

    full = await stats_service.leaderboard(db)
    # None (not a fake rank) when the ambassador isn't on the board, e.g. inactive.
    rank = next((i + 1 for i, r in enumerate(full) if r["id"] == str(user_id)), None)

    return {
        "ambassador": UserOut.model_validate(amb),
        "points": {"balance": points, "total_earned": points, "season": season_pts},
        "rank": rank,
        "overview": overview,
        "achievements": badges,
        "teachers": [UserOut.model_validate(t) for t in teachers],
        **title_info,
    }


@router.get("/users/{user_id}/teacher-stats")
async def teacher_stats(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    teacher = (await db.execute(select(User).where(User.id == user_id, User.role == UserRole.teacher))).scalars().first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    ambassador = None
    if teacher.invited_by_id:
        ambassador = (await db.execute(select(User).where(User.id == teacher.invited_by_id))).scalars().first()
    sessions = (await db.execute(
        select(TeacherSession).where(TeacherSession.teacher_id == user_id).order_by(TeacherSession.date.desc())
    )).scalars().all()
    stats = {
        "total": len(sessions),
        "pending": sum(1 for s in sessions if s.status == "pending"),
        "approved": sum(1 for s in sessions if s.status == "approved"),
        "done": sum(1 for s in sessions if s.status == "done"),
    }
    return {
        "teacher": UserOut.model_validate(teacher),
        "ambassador": {"full_name": ambassador.full_name, "email": ambassador.email} if ambassador else None,
        "sessions_stats": stats,
        "sessions": [
            {"id": str(s.id), "title": s.title, "date": s.date.isoformat(), "status": s.status,
             "attended_students": s.attended_students} for s in sessions
        ],
    }


# ── Settings ──────────────────────────────────────────────────

class SettingUpdate(BaseModel):
    value: str


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    rows = (await db.execute(select(SystemSetting))).scalars().all()
    return {r.key: r.value for r in rows}


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    body: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    setting = (await db.execute(select(SystemSetting).where(SystemSetting.key == key))).scalars().first()
    if setting:
        setting.value = body.value
    else:
        db.add(SystemSetting(key=key, value=body.value))
    await db.commit()
    return {"key": key, "value": body.value}


# ── Application Questions ─────────────────────────────────────

@router.get("/application-questions", response_model=list[ApplicationQuestionOut])
async def list_questions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get all active and deleted questions."""
    rows = (await db.execute(
        select(ApplicationQuestion).order_by(ApplicationQuestion.order, ApplicationQuestion.created_at)
    )).scalars().all()
    return rows


@router.post("/application-questions", response_model=ApplicationQuestionOut, status_code=201)
async def create_question(
    body: ApplicationQuestionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a new application question, appended to the end."""
    max_order = (await db.execute(
        select(func.max(ApplicationQuestion.order)).where(ApplicationQuestion.deleted_at.is_(None))
    )).scalar()
    next_order = (max_order + 1) if max_order is not None else 0
    q = ApplicationQuestion(
        question_text=body.question_text,
        question_type=body.question_type,
        required=body.required,
        order=next_order,
        options=body.options,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


@router.put("/application-questions/{question_id}", response_model=ApplicationQuestionOut)
async def update_question(
    question_id: uuid.UUID,
    body: ApplicationQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update an application question."""
    q = (await db.execute(select(ApplicationQuestion).where(ApplicationQuestion.id == question_id))).scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(q, k, v)
    await db.commit()
    await db.refresh(q)
    return q


@router.delete("/application-questions/{question_id}")
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Soft delete an application question."""
    from datetime import timezone
    q = (await db.execute(select(ApplicationQuestion).where(ApplicationQuestion.id == question_id))).scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "deleted"}


# ── Teacher Applications ──────────────────────────────────────

@router.get("/teacher-applications", response_model=list[TeacherApplicationOut])
async def list_teacher_applications(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get all teacher applications."""
    q = select(TeacherApplication)
    if status:
        q = q.where(TeacherApplication.status == status)
    q = q.order_by(TeacherApplication.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return rows


@router.get("/teacher-applications/{app_id}", response_model=TeacherApplicationOut)
async def get_teacher_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get a specific teacher application with answers."""
    app = (await db.execute(
        select(TeacherApplication).where(TeacherApplication.id == app_id)
    )).scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.put("/teacher-applications/{app_id}/approve")
async def approve_teacher_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Approve a teacher application and create the user."""
    app = (await db.execute(
        select(TeacherApplication).where(TeacherApplication.id == app_id)
    )).scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Application is not pending")

    user = User(
        full_name=app.full_name,
        email=app.email,
        password_hash=app.password_hash,
        role=UserRole.teacher,
        invited_by_id=app.invited_by_id,
        status="active",
    )
    db.add(user)
    app.status = "approved"
    await db.commit()
    await notify(db, app.invited_by_id, "Teacher Approved", f"{app.full_name}'s application was approved.", "system")
    return {"status": "approved"}


@router.put("/teacher-applications/{app_id}/reject")
async def reject_teacher_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Reject a teacher application."""
    app = (await db.execute(
        select(TeacherApplication).where(TeacherApplication.id == app_id)
    )).scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Application is not pending")

    app.status = "rejected"
    await db.commit()
    return {"status": "rejected"}
