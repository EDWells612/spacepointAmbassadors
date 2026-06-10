import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token, create_refresh_token
from app.models.user import User
from app.models.instructor import Instructor
from app.models.teacher_application import TeacherApplication
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest, Token, RefreshRequest
from app.schemas.user import UserOut, AmbassadorApply, TeacherApply, InstructorApply
from app.services import auth as auth_service
from app.services.notifications import notify, notify_admins

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.authenticate_user(db, login_data)


@router.post("/refresh", response_model=Token)
async def refresh(refresh_data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    sub = payload.get("sub")
    if sub is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Re-validate against the DB so deleted/deactivated users (or role changes)
    # can't keep minting tokens for the rest of the refresh window.
    user = (await db.execute(select(User).where(User.id == sub))).scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if user.role != UserRole.admin and user.status != "active":
        raise HTTPException(status_code=401, detail="Account is no longer active")

    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "access_token": create_access_token(subject=user.id, role=role),
        "refresh_token": create_refresh_token(subject=user.id, role=role),
        "token_type": "bearer",
    }


async def _email_taken(db: AsyncSession, email: str) -> bool:
    return (await db.execute(select(User.id).where(User.email == email))).first() is not None


@router.post("/apply", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def apply_ambassador(payload: AmbassadorApply, db: AsyncSession = Depends(get_db)):
    """Public ambassador application. Starts as 'pending' for admin approval."""
    if await _email_taken(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=UserRole.ambassador,
        country=payload.country,
        invite_code=secrets.token_hex(4).upper(),
        status="pending",
    )
    db.add(user)
    await notify_admins(db, "New Ambassador Application", f"{payload.full_name} applied as an ambassador.", "system")
    await db.commit()
    await db.refresh(user)
    logger.info(f"Ambassador applied: {payload.email}")
    return user


@router.post("/teacher-apply", status_code=status.HTTP_201_CREATED)
async def teacher_apply(payload: TeacherApply, db: AsyncSession = Depends(get_db)):
    """Public teacher application via an ambassador's invite code."""
    if await _email_taken(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    amb = (await db.execute(
        select(User).where(
            User.invite_code == payload.invite_code,
            User.role == UserRole.ambassador,
            User.status == "active",
        )
    )).scalars().first()
    if not amb:
        raise HTTPException(status_code=400, detail="Invalid or inactive invite code")

    dup = (await db.execute(
        select(TeacherApplication.id).where(
            TeacherApplication.email == payload.email,
            TeacherApplication.invited_by_id == amb.id,
            TeacherApplication.status == "pending"
        )
    )).first()
    if dup:
        raise HTTPException(status_code=400, detail="You have already applied via this ambassador")

    app = TeacherApplication(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        invite_code=payload.invite_code,
        invited_by_id=amb.id,
        answers=getattr(payload, "answers", None),
        status="pending",
    )
    db.add(app)
    await notify(db, amb.id, "New Teacher Application",
                 f"{payload.full_name} applied as a teacher with your invite code — review them in Network.", "system")
    await db.commit()
    await db.refresh(app)
    logger.info(f"Teacher applied: {payload.email} via {amb.email}")
    return {"id": str(app.id), "email": app.email, "status": app.status}


@router.post("/instructor-apply", status_code=status.HTTP_201_CREATED)
async def instructor_apply(payload: InstructorApply, db: AsyncSession = Depends(get_db)):
    """Public instructor application via an ambassador's invite code."""
    amb = (await db.execute(
        select(User).where(
            User.invite_code == payload.invite_code,
            User.role == UserRole.ambassador,
            User.status == "active",
        )
    )).scalars().first()
    if not amb:
        raise HTTPException(status_code=400, detail="Invalid or inactive invite code")

    dup = (await db.execute(
        select(Instructor.id).where(Instructor.email == payload.email, Instructor.invited_by == amb.id)
    )).first()
    if dup:
        raise HTTPException(status_code=400, detail="You have already applied via this ambassador")

    inst = Instructor(invited_by=amb.id, name=payload.full_name, email=payload.email, status="pending")
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    logger.info(f"Instructor applied: {payload.email} via {amb.email}")
    return {"id": str(inst.id), "name": inst.name, "email": inst.email, "status": inst.status}


@router.get("/invite/{code}")
async def validate_invite(code: str, db: AsyncSession = Depends(get_db)):
    amb = (await db.execute(
        select(User).where(
            User.invite_code == code, User.role == UserRole.ambassador, User.status == "active"
        )
    )).scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Invalid or inactive invite code")
    return {"ambassador_name": amb.full_name, "valid": True}
