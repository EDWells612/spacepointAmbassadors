"""
Demo seed — creates an admin plus sample ambassadors whose points are earned
ENTIRELY through real records (approved tasks, converted leads, recruited
teachers/instructors, completed sessions). Every points-ledger row therefore
maps to something concrete; there are no synthetic lump-sum points.

Run from the backend dir (with deps installed and .env configured):

    python seed.py                 # admin@space.com / admin123
    python seed.py --reset         # wipe demo data first, then reseed cleanly
    python seed.py you@x.com pass   # custom admin credentials

Idempotent: an ambassador that already has points is left untouched (use
--reset to rebuild the demo data from scratch).
"""

import sys
import asyncio
import secrets
from datetime import datetime, timezone, timedelta

from sqlalchemy import delete
from sqlalchemy.future import select

from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.instructor import Instructor
from app.models.lead import Lead
from app.models.task import Task
from app.models.teacher_session import TeacherSession
from app.models.points_transaction import PointsTransaction
from app.models.enums import UserRole
from app.services import achievements

args = [a for a in sys.argv[1:] if not a.startswith("--")]
RESET = "--reset" in sys.argv
ADMIN_EMAIL = args[0] if len(args) > 0 else "admin@space.com"
ADMIN_PASSWORD = args[1] if len(args) > 1 else "admin123"

now = datetime.now(timezone.utc)

DEMO_AMBASSADORS = [
    # name, email, country, approved-task specs (title, points)
    ("Layla Hassan", "layla@demo.com", "UAE", [
        ("Launch campus space club", 5000),
        ("Host 3 STEM webinars", 6000),
        ("Onboard a partner school", 4000),
    ]),
    ("Omar Said", "omar@demo.com", "Egypt", [
        ("Campus ambassador drive", 3000),
    ]),
    ("Sara Ali", "sara@demo.com", "Jordan", [
        ("First community outreach", 1200),
    ]),
]
DEMO_EMAILS = [e for _, e, _, _ in DEMO_AMBASSADORS] + ["maya@demo.com", "ken@demo.com"]


async def get_or_create_user(db, *, email, full_name, role, status, country=None, password="password123", invited_by_id=None):
    existing = (await db.execute(select(User).where(User.email == email))).scalars().first()
    if existing:
        return existing, False
    user = User(
        full_name=full_name, email=email, password_hash=get_password_hash(password),
        role=role, status=status, country=country, invited_by_id=invited_by_id,
        invite_code=secrets.token_hex(4).upper() if role == UserRole.ambassador else None,
    )
    db.add(user)
    await db.flush()
    return user, True


def award(db, amb_id, amount, reason):
    db.add(PointsTransaction(ambassador_id=amb_id, amount=amount, type="earn", reason=reason))


async def reset_demo(db):
    # Deleting users cascades to their leads, tasks, sessions, points, achievements.
    # Instructors cascade via invited_by; teacher sessions via teacher_id.
    await db.execute(delete(User).where(User.email.in_(DEMO_EMAILS)))
    await db.commit()
    print("Reset: removed demo ambassadors/teachers and all their data.")


async def main():
    async with AsyncSessionLocal() as db:
        if RESET:
            await reset_demo(db)

        admin, created = await get_or_create_user(
            db, email=ADMIN_EMAIL, full_name="Platform Admin", role=UserRole.admin,
            status="active", password=ADMIN_PASSWORD,
        )
        await db.flush()
        print(f"{'Created' if created else 'Found'} admin: {ADMIN_EMAIL}")

        for name, email, country, task_specs in DEMO_AMBASSADORS:
            amb, _ = await get_or_create_user(
                db, email=email, full_name=name, role=UserRole.ambassador, status="active", country=country,
            )
            await db.flush()

            # Skip if this ambassador already has a ledger (keeps re-runs idempotent).
            has_points = (await db.execute(
                select(PointsTransaction.id).where(PointsTransaction.ambassador_id == amb.id)
            )).first()
            if has_points:
                print(f"  {name}: already seeded, skipping.")
                continue

            # Approved tasks → each awards its points with a traceable reason.
            for title, pts in task_specs:
                db.add(Task(assigned_to=amb.id, created_by=admin.id, title=title,
                            description="(demo) completed campaign task", status="approved",
                            points_reward=pts, created_at=now - timedelta(days=20)))
                award(db, amb.id, pts, f"Completed task: {title}")

            # The top ambassador gets a full network so the maps/sessions populate.
            if email == "layla@demo.com":
                maya, _ = await get_or_create_user(db, email="maya@demo.com", full_name="Maya Teacher",
                                                   role=UserRole.teacher, status="active", invited_by_id=amb.id)
                ken, _ = await get_or_create_user(db, email="ken@demo.com", full_name="Ken Teacher",
                                                  role=UserRole.teacher, status="active", invited_by_id=amb.id)
                await db.flush()
                award(db, amb.id, 500, "Recruited teacher: Maya Teacher")
                award(db, amb.id, 500, "Recruited teacher: Ken Teacher")

                db.add(Instructor(invited_by=amb.id, name="Ivy Instructor", email="ivy@demo.com", status="active"))
                award(db, amb.id, 500, "Recruited instructor: Ivy Instructor")

                db.add_all([
                    TeacherSession(teacher_id=maya.id, title="Intro to Rockets", date=now - timedelta(days=10),
                                   status="done", material_sent=True, planned_students=30, attended_students=28),
                    TeacherSession(teacher_id=maya.id, title="Mars 101", date=now + timedelta(days=5),
                                   status="approved", material_sent=True, planned_students=25),
                    TeacherSession(teacher_id=ken.id, title="Stargazing Night", date=now + timedelta(days=12),
                                   status="pending", planned_students=40),
                ])
                award(db, amb.id, 200, "Teacher session completed: Intro to Rockets")

                db.add(Lead(ambassador_id=amb.id, contact_name="Acme School", company="Acme Education",
                            type="B2B", status="converted", points_awarded=True, notes="Big district deal"))
                award(db, amb.id, 1000, "Lead converted: Acme Education")
                db.add(Lead(ambassador_id=amb.id, contact_name="Nova Family Centre", company="Nova",
                            type="B2C", status="submitted"))

            await db.flush()
            await achievements.check_and_grant(db, amb.id)
            print(f"  {name}: seeded with mapped points.")

        await db.commit()
        print(f"\nLog in as admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("Demo ambassadors (password 'password123'): layla@demo.com, omar@demo.com, sara@demo.com")


if __name__ == "__main__":
    asyncio.run(main())
