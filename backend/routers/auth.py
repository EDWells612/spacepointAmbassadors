import logging
import secrets
import traceback
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional

import schemas
from database import get_db_connection
from core import security
from core import dependencies

logger = logging.getLogger("auth")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Extra schema for teacher apply (includes invite_code) ────

class TeacherApplyPayload(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # must be "teacher"
    invite_code: str  # ambassador's invite code


class InstructorApplyPayload(BaseModel):
    name: str
    email: EmailStr
    invite_code: str


# ── Ambassador application ────────────────────────────────────

@router.post("/apply", response_model=schemas.UserOut)
def apply_ambassador(user: schemas.UserCreate, conn=Depends(get_db_connection)):
    """
    Used for:
    - Ambassador application (role='ambassador', no invite_code needed)
    - Teacher application (role='teacher', invite_code required — links to ambassador)
    """
    logger.info(f"Apply: email={user.email}, role={user.role}")
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = security.get_password_hash(user.password)

        invite_code = None
        invited_by_id = None
        user_status = "pending"

        if user.role == "ambassador":
            # Generate a unique invite code for this ambassador
            invite_code = secrets.token_hex(4).upper()

        elif user.role == "teacher":
            # Resolve the ambassador from their invite_code
            if not user.invited_by_id:
                raise HTTPException(status_code=400, detail="invite_code is required for teacher applications")
            # invited_by_id is actually the ambassador's invite_code string passed from frontend
            # Frontend sends it in the invite_code field; we need to look up the ambassador
            cursor.execute("SELECT id FROM users WHERE invite_code = %s AND role = 'ambassador'", (str(user.invited_by_id),))
            ambassador = cursor.fetchone()
            if not ambassador:
                raise HTTPException(status_code=400, detail="Invalid invite code")
            invited_by_id = str(ambassador["id"])

        elif user.role == "admin":
            user_status = "active"
        else:
            raise HTTPException(status_code=400, detail="Invalid role")

        cursor.execute(
            """INSERT INTO users (name, email, hashed_password, role, country, invite_code, invited_by_id, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id, name, email, role, country, invite_code, status, created_at""",
            (user.name, user.email, hashed_password, user.role, user.country, invite_code, invited_by_id, user_status),
        )
        new_user = cursor.fetchone()
        conn.commit()
        logger.info(f"Apply success: id={new_user['id']}, email={user.email}, role={user.role}")
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apply FAILED for {user.email}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Teacher apply (cleaner endpoint that accepts invite_code directly) ──

@router.post("/teacher-apply")
def teacher_apply(payload: TeacherApplyPayload, conn=Depends(get_db_connection)):
    """Public endpoint for teacher applications via ambassador invite code."""
    if payload.role != "teacher":
        raise HTTPException(status_code=400, detail="Role must be 'teacher'")

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (payload.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    cursor.execute("SELECT id FROM users WHERE invite_code = %s AND role = 'ambassador' AND status = 'active'", (payload.invite_code,))
    ambassador = cursor.fetchone()
    if not ambassador:
        raise HTTPException(status_code=400, detail="Invalid or inactive invite code")

    hashed_password = security.get_password_hash(payload.password)
    cursor.execute(
        """INSERT INTO users (name, email, hashed_password, role, invited_by_id, status)
           VALUES (%s, %s, %s, 'teacher', %s, 'pending')
           RETURNING id, name, email, role, country, invite_code, status, created_at""",
        (payload.name, payload.email, hashed_password, str(ambassador["id"])),
    )
    new_user = cursor.fetchone()
    conn.commit()
    logger.info(f"Teacher applied: {payload.email} via ambassador {ambassador['id']}")
    return new_user


# ── Instructor apply ──────────────────────────────────────────

@router.post("/instructor-apply")
def instructor_apply(payload: InstructorApplyPayload, conn=Depends(get_db_connection)):
    """Public endpoint for instructor applications via ambassador invite code."""
    cursor = conn.cursor()

    # Validate invite code
    cursor.execute("SELECT id FROM users WHERE invite_code = %s AND role = 'ambassador' AND status = 'active'", (payload.invite_code,))
    ambassador = cursor.fetchone()
    if not ambassador:
        raise HTTPException(status_code=400, detail="Invalid or inactive invite code")

    # Check for duplicate
    cursor.execute("SELECT id FROM instructors WHERE email = %s AND invited_by = %s", (payload.email, str(ambassador["id"])))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="You have already applied via this ambassador")

    cursor.execute(
        """INSERT INTO instructors (invited_by, name, email, status)
           VALUES (%s, %s, %s, 'pending') RETURNING *""",
        (str(ambassador["id"]), payload.name, payload.email),
    )
    new_instructor = cursor.fetchone()
    conn.commit()
    logger.info(f"Instructor applied: {payload.email} via ambassador {ambassador['id']}")
    return new_instructor


# ── Invite code validation ────────────────────────────────────

@router.get("/invite/{code}")
def validate_invite_code(code: str, conn=Depends(get_db_connection)):
    """Validate an ambassador invite code. Returns ambassador name if valid."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM users WHERE invite_code = %s AND role = 'ambassador' AND status = 'active'", (code,))
    ambassador = cursor.fetchone()
    if not ambassador:
        raise HTTPException(status_code=404, detail="Invalid or inactive invite code")
    return {"ambassador_name": ambassador["name"], "valid": True}


# ── Login ─────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), conn=Depends(get_db_connection)):
    logger.info(f"Login attempt: {form_data.username}")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (form_data.username,))
    user = cursor.fetchone()

    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user["status"] == "pending" and user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is pending approval")
    if user["status"] == "rejected":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been rejected")

    from datetime import timedelta
    access_token = security.create_access_token(
        data={"sub": str(user["id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    logger.info(f"Login OK: {form_data.username} (role={user['role']})")
    return {"access_token": access_token, "token_type": "bearer"}


# ── Me ────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: dict = Depends(dependencies.get_current_active_user)):
    return current_user