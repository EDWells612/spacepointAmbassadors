from typing import Optional
import uuid
import logging
from database import get_db_connection

logger = logging.getLogger("notifications_core")

def create_notification(conn, user_id: str, title: str, message: str, n_type: str):
    """
    Creates a notification for a specific user.
    'conn' should be an active database connection.
    """
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               VALUES (%s, %s, %s, %s)""",
            (user_id, title, message, n_type)
        )
        # We don't commit here because this is usually part of a larger transaction
        logger.info(f"Notification created for user {user_id}: {title}")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
