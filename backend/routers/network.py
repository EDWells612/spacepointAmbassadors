import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

from database import get_db_connection
from core import dependencies

logger = logging.getLogger("network")

router = APIRouter(prefix="/api/network", tags=["network"])


# ── Schemas ───────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str


class SessionCreate(BaseModel):
    title: str
    date: str  # ISO datetime string from frontend
    planned_students: int


class SessionDone(BaseModel):
    attended_students: int


# ── Teachers ──────────────────────────────────────────────────

@router.get("/teachers")
def list_my_teachers(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """List teachers invited by (and belonging to) this ambassador."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, name, email, status, created_at
           FROM users
           WHERE role = 'teacher' AND invited_by_id = %s
           ORDER BY created_at DESC""",
        (str(current_user["id"]),),
    )
    return cursor.fetchall()


@router.put("/teachers/{teacher_id}/status")
def update_teacher_status(
    teacher_id: uuid.UUID,
    body: StatusUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """Ambassador approves or rejects a teacher application."""
    if body.status not in ("active", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'rejected'")

    cursor = conn.cursor()
    # Make sure this teacher belongs to this ambassador
    cursor.execute(
        "SELECT * FROM users WHERE id = %s AND role = 'teacher' AND invited_by_id = %s",
        (str(teacher_id), str(current_user["id"])),
    )
    teacher = cursor.fetchone()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found or not yours")

    # Award points if teacher is approved
    if body.status == "active" and teacher["status"] != "active":
        cursor.execute(
            """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
               VALUES (%s, %s, 'earn', %s)""",
            (str(current_user["id"]), 500, f"Recruited teacher: {teacher['name']}")
        )

    cursor.execute(
        "UPDATE users SET status = %s WHERE id = %s RETURNING id, name, email, status",
        (body.status, str(teacher_id)),
    )
    updated = cursor.fetchone()
    conn.commit()
    logger.info(f"Ambassador {current_user['email']} set teacher {teacher['email']} -> {body.status}")
    return updated


# ── Instructors ───────────────────────────────────────────────

@router.get("/instructors")
def list_my_instructors(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """List instructors invited by this ambassador (read-only for ambassador)."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM instructors WHERE invited_by = %s ORDER BY created_at DESC",
        (str(current_user["id"]),),
    )
    return cursor.fetchall()


# ── Teacher Sessions ──────────────────────────────────────────

@router.get("/teachers/{teacher_id}/sessions")
def get_teacher_sessions(
    teacher_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """
    Get sessions for a specific teacher.
    - Ambassador can view sessions of their own teachers.
    - Teacher can view their own sessions.
    """
    cursor = conn.cursor()

    if current_user["role"] == "ambassador":
        # Verify teacher belongs to this ambassador
        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'teacher' AND invited_by_id = %s",
            (str(teacher_id), str(current_user["id"])),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="This teacher is not in your network")

    elif current_user["role"] == "teacher":
        if str(current_user["id"]) != str(teacher_id):
            raise HTTPException(status_code=403, detail="You can only view your own sessions")

    elif current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    cursor.execute(
        "SELECT * FROM teacher_sessions WHERE teacher_id = %s ORDER BY date ASC",
        (str(teacher_id),),
    )
    return cursor.fetchall()


@router.get("/all-sessions")
def list_all_sessions(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """List all sessions from all teachers recruited by this ambassador."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT ts.*, u.name as teacher_name, u.email as teacher_email 
           FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           WHERE u.invited_by_id = %s
           ORDER BY ts.date DESC""",
        (str(current_user["id"]),),
    )
    return cursor.fetchall()


@router.post("/teachers/{teacher_id}/sessions")
def create_teacher_session(
    teacher_id: uuid.UUID,
    body: SessionCreate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("teacher")),
):
    """Teacher submits a new session for ambassador approval."""
    # Teachers can only add sessions for themselves
    if str(current_user["id"]) != str(teacher_id):
        raise HTTPException(status_code=403, detail="You can only add sessions for yourself")

    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO teacher_sessions (teacher_id, title, date, planned_students, status, material_sent)
           VALUES (%s, %s, %s, %s, 'pending', FALSE) RETURNING *""",
        (str(teacher_id), body.title, body.date, body.planned_students),
    )
    session = cursor.fetchone()
    
    from core.notifications import create_notification
    # Notify Ambassador
    cursor.execute("SELECT invited_by_id FROM users WHERE id = %s", (str(current_user["id"]),))
    teacher_row = cursor.fetchone()
    if teacher_row and teacher_row["invited_by_id"]:
        create_notification(conn, str(teacher_row["invited_by_id"]), "New Session Submitted", f"Teacher {current_user['name']} submitted a new session: {body.title}.", "session")

    conn.commit()
    logger.info(f"Teacher {current_user['email']} created session '{body.title}'")
    return session


@router.put("/sessions/{session_id}/approve")
def approve_session(
    session_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """Ambassador approves a pending teacher session."""
    cursor = conn.cursor()

    # Verify the session's teacher belongs to this ambassador
    cursor.execute(
        """SELECT ts.*, u.invited_by_id
           FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           WHERE ts.id = %s""",
        (str(session_id),),
    )
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session["invited_by_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="This session is not from your network")
    if session["status"] != "pending":
        raise HTTPException(status_code=400, detail="Session is not pending")

    cursor.execute(
        "UPDATE teacher_sessions SET status = 'approved' WHERE id = %s RETURNING *",
        (str(session_id),),
    )
    updated = cursor.fetchone()
    
    from core.notifications import create_notification
    create_notification(conn, str(session["teacher_id"]), "Session Approved", f"Your session '{session['title']}' has been approved.", "session")

    conn.commit()
    return updated


@router.put("/sessions/{session_id}/reject")
def reject_session(
    session_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """Ambassador rejects a pending teacher session."""
    cursor = conn.cursor()
    # Verify the session's teacher belongs to this ambassador
    cursor.execute(
        """SELECT ts.*, u.invited_by_id FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id WHERE ts.id = %s""",
        (str(session_id),),
    )
    session = cursor.fetchone()
    if not session or str(session["invited_by_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to reject this session")

    cursor.execute("UPDATE teacher_sessions SET status = 'rejected' WHERE id = %s RETURNING *", (str(session_id),))
    updated = cursor.fetchone()

    from core.notifications import create_notification
    create_notification(conn, str(session["teacher_id"]), "Session Rejected", f"Your session '{session['title']}' has been rejected.", "session")

    conn.commit()
    return updated


@router.put("/sessions/{session_id}/material-sent")
def mark_material_sent(
    session_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("ambassador")),
):
    """Ambassador marks that session material has been sent to the teacher."""
    cursor = conn.cursor()

    cursor.execute(
        """SELECT ts.*, u.invited_by_id
           FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           WHERE ts.id = %s""",
        (str(session_id),),
    )
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session["invited_by_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not your network")
    if session["status"] != "approved":
        raise HTTPException(status_code=400, detail="Session must be approved before sending material")

    cursor.execute(
        "UPDATE teacher_sessions SET material_sent = TRUE WHERE id = %s RETURNING *",
        (str(session_id),),
    )
    updated = cursor.fetchone()
    conn.commit()
    return updated


@router.put("/sessions/{session_id}/done")
def mark_session_done(
    session_id: uuid.UUID,
    body: SessionDone,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("teacher")),
):
    """Teacher marks a session as done after delivering it."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM teacher_sessions WHERE id = %s AND teacher_id = %s",
        (str(session_id), str(current_user["id"])),
    )
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "approved" or not session["material_sent"]:
        raise HTTPException(status_code=400, detail="Session must be approved and material sent before marking done")

    cursor.execute(
        "UPDATE teacher_sessions SET status = 'done', attended_students = %s WHERE id = %s RETURNING *",
        (body.attended_students, str(session_id)),
    )
    updated = cursor.fetchone()

    # Award commission to the ambassador who invited this teacher
    cursor.execute("SELECT invited_by_id FROM users WHERE id = %s", (str(current_user["id"]),))
    teacher_row = cursor.fetchone()
    if teacher_row and teacher_row["invited_by_id"]:
        ambassador_id = teacher_row["invited_by_id"]
        
        # Check if points reward is enabled (using commission_enabled as a proxy for financial/points system or just always enabled)
        # We'll use a setting for session_points_reward
        cursor.execute("SELECT value FROM system_settings WHERE key = 'session_points_reward'")
        rate_setting = cursor.fetchone()
        amount = int(rate_setting["value"]) if rate_setting else 200 # Default to 200 points
        
        cursor.execute(
            """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
               VALUES (%s, %s, 'earn', %s)""",
            (str(ambassador_id), amount, f"Teacher session completed: {updated['title']}")
        )
        from core.notifications import create_notification
        create_notification(conn, str(ambassador_id), "Points Earned!", f"You earned {amount} points because {current_user['name']} completed a session.", "points")
        logger.info(f"Awarded {amount} points to ambassador {ambassador_id} for session {session_id}")

    conn.commit()
    logger.info(f"Teacher {current_user['email']} marked session {session_id} as done")
    return updated