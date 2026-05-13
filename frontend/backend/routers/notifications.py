from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
import logging

from database import get_db_connection
from core import dependencies

logger = logging.getLogger("notifications")

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/")
def get_notifications(
    limit: int = 20,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Get notifications for the current user."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])
    cursor.execute(
        "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
        (user_id, limit)
    )
    return cursor.fetchall()

@router.get("/unread-count")
def get_unread_count(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Get the count of unread notifications."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])
    cursor.execute(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE",
        (user_id,)
    )
    return cursor.fetchone()

@router.put("/{notif_id}/read")
def mark_as_read(
    notif_id: uuid.UUID,
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Mark a specific notification as read."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])
    cursor.execute(
        "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s RETURNING id",
        (str(notif_id), user_id)
    )
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Notification not found")
    conn.commit()
    return {"status": "ok"}

@router.put("/mark-all-read")
def mark_all_as_read(
    conn=Depends(get_db_connection),
    current_user: dict = Depends(dependencies.get_current_active_user),
):
    """Mark all notifications for current user as read."""
    cursor = conn.cursor()
    user_id = str(current_user["id"])
    cursor.execute(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
        (user_id,)
    )
    conn.commit()
    return {"status": "ok"}
