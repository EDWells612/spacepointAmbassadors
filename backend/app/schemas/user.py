from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.enums import UserRole


class UserBase(BaseModel):
    full_name: str
    email: EmailStr


class UserOut(UserBase):
    id: UUID
    role: UserRole
    country: Optional[str] = None
    invite_code: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Public applications ──────────────────────────────────────────

class AmbassadorApply(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    country: Optional[str] = None


class TeacherApply(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    invite_code: str
    answers: Optional[dict] = None


class InstructorApply(BaseModel):
    full_name: str
    email: EmailStr
    invite_code: str


class UserStatusUpdate(BaseModel):
    status: str  # "active", "rejected"


class AdminUserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole
    country: Optional[str] = None


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    country: Optional[str] = None
    status: Optional[str] = None
