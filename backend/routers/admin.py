import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid

import schemas
from database import get_db_connection
from core import dependencies

logger = logging.getLogger("admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Users ─────────────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.UserOut])
def list_all_users(
    status: str = None,
    role: str = None,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """List users, optionally filtered by status and/or role."""
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE 1=1"
    params = []
    if status:
        query += " AND status = %s"
        params.append(status)
    if role:
        query += " AND role = %s"
        params.append(role)
    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    users = cursor.fetchall()
    logger.info(f"Admin {current_user['email']} listed users (status={status}, role={role}): {len(users)} results")
    return users


@router.get("/leaderboard")
def get_global_leaderboard(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Full global leaderboard for all active ambassadors."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT
               u.id,
               u.name,
               u.country,
               (SELECT COALESCE(SUM(CASE WHEN pt.type = 'earn' THEN pt.amount ELSE -pt.amount END), 0) 
                FROM points_transactions pt WHERE pt.ambassador_id = u.id) AS points,
               (SELECT COUNT(*) FROM users t WHERE t.invited_by_id = u.id AND t.role = 'teacher' AND t.status = 'active') AS teachers,
               (SELECT COUNT(*) FROM instructors i WHERE i.invited_by = u.id AND i.status = 'active') AS instructors,
               (SELECT COUNT(*) FROM teacher_sessions ts 
                JOIN users t2 ON ts.teacher_id = t2.id 
                WHERE t2.invited_by_id = u.id AND ts.status = 'done') AS sessions_done,
               (SELECT COUNT(*) FROM leads l WHERE l.ambassador_id = u.id AND l.status = 'converted') AS converted_leads,
               (SELECT COALESCE(SUM(ts.attended_students), 0) FROM teacher_sessions ts 
                JOIN users t3 ON ts.teacher_id = t3.id 
                WHERE t3.invited_by_id = u.id AND ts.status = 'done') AS students_reached
           FROM users u
           WHERE u.role = 'ambassador' AND u.status = 'active'
           ORDER BY points DESC"""
    )
    return [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "country": row["country"] or "N/A",
            "points": int(row["points"]),
            "teachers": int(row["teachers"]),
            "instructors": int(row["instructors"]),
            "sessions_done": int(row["sessions_done"]),
            "converted_leads": int(row["converted_leads"]),
            "students_reached": int(row["students_reached"]),
        }
        for row in cursor.fetchall()
    ]


@router.get("/commission-log")
def get_global_commission_log(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Full commission transaction log across all ambassadors."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT ct.*, u.name as ambassador_name, u.email as ambassador_email,
                  l.contact_name as lead_name, l.company as lead_company
           FROM commission_transactions ct
           JOIN users u ON ct.ambassador_id = u.id
           LEFT JOIN leads l ON ct.lead_id = l.id
           ORDER BY ct.created_at DESC"""
    )
    return cursor.fetchall()


@router.get("/points-log")
def get_global_points_log(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Full points transaction log across all ambassadors."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT pt.*, u.name as ambassador_name, u.email as ambassador_email
           FROM points_transactions pt
           JOIN users u ON pt.ambassador_id = u.id
           ORDER BY pt.created_at DESC"""
    )
    return cursor.fetchall()



@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: uuid.UUID,
    body: schemas.UserStatusUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Approve or reject a user (ambassador or instructor account)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (str(user_id),))
    target_user = cursor.fetchone()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If approving a teacher, award points to the ambassador who invited them
    if body.status == "active" and target_user["status"] != "active" and target_user["role"] == "teacher":
        if target_user["invited_by_id"]:
            # Get reward setting
            cursor.execute("SELECT value FROM system_settings WHERE key = 'teacher_points_reward'")
            row = cursor.fetchone()
            reward = int(row["value"]) if row else 500
            
            cursor.execute(
                """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
                   VALUES (%s, %s, 'earn', %s)""",
                (target_user["invited_by_id"], reward, f"Recruited teacher: {target_user['name']}")
            )
            from core.notifications import create_notification
            create_notification(conn, str(target_user["invited_by_id"]), "Points Earned!", f"You earned {reward} points for recruiting {target_user['name']}.", "points")

    cursor.execute(
        "UPDATE users SET status = %s WHERE id = %s RETURNING id, name, email, role, country, invite_code, status, created_at",
        (body.status, str(user_id)),
    )
    updated = cursor.fetchone()
    
    from core.notifications import create_notification
    msg = f"Your account has been {body.status} by the administrator."
    create_notification(conn, str(user_id), f"Account {body.status.title()}", msg, "system")

    conn.commit()
    logger.info(f"Admin {current_user['email']} set user {target_user['email']} status -> {body.status}")
    return updated


@router.get("/users/{user_id}/ambassador-stats")
def get_ambassador_stats(
    user_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Admin view of an ambassador's complete performance."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s AND role = 'ambassador'", (str(user_id),))
    ambassador = cursor.fetchone()
    if not ambassador:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    # Points
    cursor.execute("SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0) as balance, COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) as total_earned FROM points_transactions WHERE ambassador_id = %s", (str(user_id),))
    pts = cursor.fetchone()

    # Commission
    cursor.execute("SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE -amount END), 0) as balance, COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) as total_earned FROM commission_transactions WHERE ambassador_id = %s", (str(user_id),))
    comm = cursor.fetchone()

    # Leads
    cursor.execute("SELECT status, COUNT(*) as count FROM leads WHERE ambassador_id = %s GROUP BY status", (str(user_id),))
    leads_raw = cursor.fetchall()
    leads = {l["status"]: l["count"] for l in leads_raw}

    # Tasks
    cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = %s AND status = 'approved'", (str(user_id),))
    tasks_done = cursor.fetchone()["count"]

    # Teachers
    cursor.execute("SELECT id, name, email, status, created_at FROM users WHERE role = 'teacher' AND invited_by_id = %s ORDER BY created_at DESC", (str(user_id),))
    teachers = cursor.fetchall()

    # Instructors
    cursor.execute("SELECT COUNT(*) as count FROM instructors WHERE invited_by = %s", (str(user_id),))
    instructors_count = cursor.fetchone()["count"]

    return {
        "ambassador": ambassador,
        "points": {"balance": int(pts["balance"]), "total_earned": int(pts["total_earned"])},
        "commission": {"balance": float(comm["balance"]), "total_earned": float(comm["total_earned"])},
        "leads": leads,
        "tasks_completed": tasks_done,
        "teachers": teachers,
        "instructors_recruited": instructors_count
    }


@router.get("/users/{user_id}/teacher-stats")
def get_teacher_stats(
    user_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Admin view of a teacher's complete performance."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s AND role = 'teacher'", (str(user_id),))
    teacher = cursor.fetchone()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    ambassador = None
    if teacher["invited_by_id"]:
        cursor.execute("SELECT name, email FROM users WHERE id = %s", (str(teacher["invited_by_id"]),))
        ambassador = cursor.fetchone()

    cursor.execute("SELECT * FROM teacher_sessions WHERE teacher_id = %s ORDER BY date DESC", (str(user_id),))
    sessions = cursor.fetchall()
    
    sessions_stats = {
        "total": len(sessions),
        "pending": sum(1 for s in sessions if s["status"] == "pending"),
        "approved": sum(1 for s in sessions if s["status"] == "approved"),
        "done": sum(1 for s in sessions if s["status"] == "done")
    }

    return {
        "teacher": teacher,
        "ambassador": ambassador,
        "sessions_stats": sessions_stats,
        "sessions": sessions
    }


# ── Instructors (admin approves/rejects) ──────────────────────

@router.get("/instructors")
def list_all_instructors(
    status: str = None,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """List all instructor applications, optionally filtered by status."""
    cursor = conn.cursor()
    if status:
        cursor.execute(
            """SELECT i.*, u.name as ambassador_name, u.email as ambassador_email
               FROM instructors i
               LEFT JOIN users u ON i.invited_by = u.id
               WHERE i.status = %s
               ORDER BY i.created_at DESC""",
            (status,),
        )
    else:
        cursor.execute(
            """SELECT i.*, u.name as ambassador_name, u.email as ambassador_email
               FROM instructors i
               LEFT JOIN users u ON i.invited_by = u.id
               ORDER BY i.created_at DESC"""
        )
    return cursor.fetchall()


@router.put("/instructors/{instructor_id}/status")
def update_instructor_status(
    instructor_id: uuid.UUID,
    body: schemas.UserStatusUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Admin approves or rejects an instructor application."""
    if body.status not in ("active", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'rejected'")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM instructors WHERE id = %s", (str(instructor_id),))
    instructor = cursor.fetchone()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    # Award points if instructor is approved
    if body.status == "active" and instructor["status"] != "active":
        if instructor["invited_by"]:
            # Get reward setting
            cursor.execute("SELECT value FROM system_settings WHERE key = 'instructor_points_reward'")
            row = cursor.fetchone()
            reward = int(row["value"]) if row else 500
            
            cursor.execute(
                """INSERT INTO points_transactions (ambassador_id, amount, type, reason)
                   VALUES (%s, %s, 'earn', %s)""",
                (instructor["invited_by"], reward, f"Recruited instructor: {instructor['name']}")
            )

    cursor.execute(
        "UPDATE instructors SET status = %s WHERE id = %s RETURNING *",
        (body.status, str(instructor_id)),
    )
    updated = cursor.fetchone()
    conn.commit()
    logger.info(f"Admin {current_user['email']} set instructor {instructor['email']} -> {body.status}")
    return updated


# ── Teacher Sessions (admin global view) ──────────────────────

@router.get("/teacher-sessions")
def list_all_teacher_sessions(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.require_role("admin")),
):
    """Admin global view of all teacher sessions."""
    cursor = conn.cursor()
    cursor.execute(
        """SELECT ts.*, u.name as teacher_name, u.email as teacher_email,
                  amb.name as ambassador_name
           FROM teacher_sessions ts
           JOIN users u ON ts.teacher_id = u.id
           LEFT JOIN users amb ON u.invited_by_id = amb.id
           ORDER BY ts.date ASC"""
    )
    return cursor.fetchall()