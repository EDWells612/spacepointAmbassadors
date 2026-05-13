from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str
    country: Optional[str] = None
    invited_by_id: Optional[UUID] = None

class UserOut(UserBase):
    id: UUID
    role: str
    country: Optional[str] = None
    invite_code: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    status: str  # "active", "rejected"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None

# Lead Schemas
class LeadBase(BaseModel):
    contact_name: str
    company: str
    type: str
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadOut(LeadBase):
    id: UUID
    ambassador_id: UUID
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    points_reward: int

class TaskCreate(TaskBase):
    assigned_to: UUID

class TaskOut(TaskBase):
    id: UUID
    assigned_to: UUID
    created_by: Optional[UUID] = None
    status: str
    edit_notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskStatusUpdate(BaseModel):
    status: str  # "accepted", "submitted", "approved", "rejected", "edit_requested"
    edit_notes: Optional[str] = None

# System Setting
class SettingOut(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True
