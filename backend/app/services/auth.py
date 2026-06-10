from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest
from app.core.security import verify_password, create_access_token, create_refresh_token


async def authenticate_user(db: AsyncSession, login_data: LoginRequest):
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role != UserRole.admin:
        if user.status == "pending":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is pending approval")
        if user.status == "rejected":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been rejected")

    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "access_token": create_access_token(subject=user.id, role=role),
        "refresh_token": create_refresh_token(subject=user.id, role=role),
        "token_type": "bearer",
    }
