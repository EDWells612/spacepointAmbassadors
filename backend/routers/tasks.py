from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import uuid
import logging

import schemas
from database import get_db_connection
from core import dependencies

logger = logging.getLogger("tasks")

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("/", response_model=schemas.TaskOut)
def create_task(
    task: schemas.TaskCreate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """
    Create a task assignment.
    - Admin can assign to ambassadors
    - Ambassadors can assign to teachers (users with role='teacher' invited by them)
    """
    cursor = conn.cursor()
    creator_role = current_user["role"]
    creator_id = str(current_user["id"])
    assignee_id = str(task.assigned_to)

    # Validate the assignee exists and the creator has permission
    cursor.execute("SELECT * FROM users WHERE id = %s", (assignee_id,))
    assignee = cursor.fetchone()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    if creator_role == "admin":
        # Admin can assign to ambassadors (and technically anyone)
        if assignee["role"] not in ("ambassador", "teacher"):
            raise HTTPException(status_code=400, detail="Admin can only assign tasks to ambassadors or teachers")
    elif creator_role == "ambassador":
        # Ambassadors can only assign to their own teachers
        if assignee["role"] != "teacher":
            raise HTTPException(status_code=403, detail="Ambassadors can only assign tasks to teachers")
        if str(assignee.get("invited_by_id", "")) != creator_id:
            raise HTTPException(status_code=403, detail="You can only assign tasks to teachers you invited")
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to create tasks")

    cursor.execute(
        """
        INSERT INTO tasks (assigned_to, created_by, title, description, deadline, points_reward, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """,
        (assignee_id, creator_id, task.title, task.description, task.deadline, task.points_reward, "pending"),
    )

    db_task = cursor.fetchone()
    
    from core.notifications import create_notification
    create_notification(conn, assignee_id, "New Task Assigned", f"You have been assigned a new task: {task.title}", "task")

    conn.commit()
    logger.info(f"Task '{task.title}' created by {current_user['email']} -> assigned to {assignee['email']}")
    return db_task


@router.get("/", response_model=List[schemas.TaskOut])
def get_tasks(
    view: Optional[str] = None,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """
    Get tasks.
    - view=assigned: tasks assigned TO me (default for ambassador/teacher)
    - view=created: tasks I created / assigned to others
    - Admin sees all tasks by default
    """
    cursor = conn.cursor()
    user_id = str(current_user["id"])
    role = current_user["role"]

    if role == "admin":
        if view == "created":
            cursor.execute("SELECT * FROM tasks WHERE created_by = %s ORDER BY created_at DESC", (user_id,))
        else:
            # Admin sees all tasks
            cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
    elif role == "ambassador":
        if view == "created":
            cursor.execute("SELECT * FROM tasks WHERE created_by = %s ORDER BY created_at DESC", (user_id,))
        else:
            # Default: tasks assigned to me
            cursor.execute("SELECT * FROM tasks WHERE assigned_to = %s ORDER BY created_at DESC", (user_id,))
    elif role == "teacher":
        # Teachers only see tasks assigned to them
        cursor.execute("SELECT * FROM tasks WHERE assigned_to = %s ORDER BY created_at DESC", (user_id,))
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    return cursor.fetchall()


@router.get("/assignable-users")
def get_assignable_users(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """
    Get the list of users the current user can assign tasks to.
    - Admin -> all active ambassadors
    - Ambassador -> their own teachers
    """
    cursor = conn.cursor()
    role = current_user["role"]
    user_id = str(current_user["id"])

    if role == "admin":
        cursor.execute(
            "SELECT id, name, email, role, country FROM users WHERE role = 'ambassador' AND status = 'active' ORDER BY name"
        )
    elif role == "ambassador":
        cursor.execute(
            "SELECT id, name, email, role, country FROM users WHERE role = 'teacher' AND invited_by_id = %s AND status = 'active' ORDER BY name",
            (user_id,),
        )
    else:
        return []

    return cursor.fetchall()


@router.put("/{task_id}/status", response_model=schemas.TaskOut)
def update_task_status(
    task_id: uuid.UUID,
    body: schemas.TaskStatusUpdate,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = %s", (str(task_id),))
    db_task = cursor.fetchone()

    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    status = body.status
    role = current_user["role"]
    user_id = str(current_user["id"])

    # 1. Assigned user can accept or submit the task
    if str(db_task["assigned_to"]) == user_id:
        if status not in ("accepted", "submitted"):
            raise HTTPException(status_code=400, detail="You can only accept or submit tasks assigned to you")
    
    # 2. Creator (Admin or Ambassador) can approve, reject, or request edits
    elif str(db_task["created_by"]) == user_id or role == "admin":
        if status not in ("approved", "rejected", "edit_requested"):
            raise HTTPException(status_code=400, detail="Only the creator or an admin can approve, reject, or request edits")
        
        # Award points on approval (only once)
        if status == "approved" and db_task["status"] != "approved":
            cursor.execute(
                """
                INSERT INTO points_transactions (ambassador_id, amount, type, reason)
                VALUES (%s, %s, %s, %s)
                """,
                (db_task["assigned_to"], db_task["points_reward"], "earn", f"Completed task: {db_task['title']}"),
            )
    else:
        raise HTTPException(status_code=403, detail="Not authorized to update this task's status")

    # Update status and edit_notes if provided
    cursor.execute(
        "UPDATE tasks SET status = %s, edit_notes = %s WHERE id = %s RETURNING *",
        (status, body.edit_notes or db_task.get("edit_notes"), str(task_id))
    )
    updated_task = cursor.fetchone()
    
    from core.notifications import create_notification
    if status == "submitted":
        create_notification(conn, str(db_task["created_by"]), "Task Submitted", f"Task '{db_task['title']}' has been submitted for review.", "task")
    elif status == "approved":
        create_notification(conn, str(db_task["assigned_to"]), "Task Approved!", f"Your task '{db_task['title']}' has been approved. {db_task['points_reward']} points awarded.", "points")
    elif status == "rejected":
        create_notification(conn, str(db_task["assigned_to"]), "Task Rejected", f"Your task '{db_task['title']}' was rejected.", "task")
    elif status == "edit_requested":
        create_notification(conn, str(db_task["assigned_to"]), "Revision Requested", f"A revision was requested for task '{db_task['title']}'. Check notes.", "task")

    conn.commit()
    logger.info(f"Task {task_id} status updated to '{status}' by {current_user['email']}")
    return updated_task
