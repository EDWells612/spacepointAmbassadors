import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Instructor(Base):
    __tablename__ = "instructors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending, active, rejected
    # True once recruitment points went to the inviting ambassador (never re-awarded).
    recruit_points_awarded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
