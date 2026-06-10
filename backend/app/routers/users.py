from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user
