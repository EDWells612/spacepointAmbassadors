import uuid
from sqlalchemy import Column, String, Boolean, Integer, Numeric, Text, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(255), primary_key=True)
    value = Column(String(255), nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    country = Column(String(100))
    invite_code = Column(String(100), unique=True)
    status = Column(String(50), default="pending")
    invited_by_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ambassador_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    contact_name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    status = Column(String(50), default="submitted")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assigned_to = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    deadline = Column(DateTime(timezone=True))
    status = Column(String(50), default="pending")
    points_reward = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TeacherSession(Base):
    __tablename__ = "teacher_sessions"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="pending")
    material_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Instructor(Base):
    __tablename__ = "instructors"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invited_by = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PointsTransaction(Base):
    __tablename__ = "points_transactions"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ambassador_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    amount = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CommissionTransaction(Base):
    __tablename__ = "commission_transactions"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ambassador_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(50), nullable=False)
    lead_id = Column(Uuid(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SwagItem(Base):
    __tablename__ = "swag_items"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    points_cost = Column(Integer, nullable=False)
    image_url = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RedemptionOrder(Base):
    __tablename__ = "redemption_orders"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ambassador_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    item_id = Column(Uuid(as_uuid=True), ForeignKey("swag_items.id", ondelete="SET NULL"))
    wallet = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")
    address = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
