import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from app.db.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(ENUM(UserRole, name="user_role", create_type=False), nullable=False)
    country = Column(String(100), nullable=True)
    invite_code = Column(String(100), unique=True, nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # True once the inviting ambassador received recruitment points for this user —
    # prevents re-awarding when status toggles rejected/active.
    recruit_points_awarded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
