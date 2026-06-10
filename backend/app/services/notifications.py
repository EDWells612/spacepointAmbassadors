import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.notification import Notification
from app.models.user import User
from app.models.enums import UserRole

logger = logging.getLogger("notifications")


async def notify(db: AsyncSession, user_id, title: str, body: str, n_type: str):
    """Queue a notification. Part of the caller's transaction — caller commits."""
    db.add(Notification(user_id=user_id, title=title, body=body, type=n_type))
    logger.info(f"Notification queued for {user_id}: {title}")


async def notify_admins(db: AsyncSession, title: str, body: str, n_type: str):
    result = await db.execute(select(User.id).where(User.role == UserRole.admin))
    for (admin_id,) in result.all():
        await notify(db, admin_id, title, body, n_type)
