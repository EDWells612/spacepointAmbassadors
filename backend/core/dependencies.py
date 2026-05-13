from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from database import get_db_connection
from core.security import SECRET_KEY, ALGORITHM
import schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), conn = Depends(get_db_connection)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(id=user_id, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
        
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (token_data.id,))
    user = cursor.fetchone()
    
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if current_user['status'] != "active" and current_user['role'] != "admin":
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(role: str):
    def role_checker(current_user: dict = Depends(get_current_active_user)):
        if current_user['role'] != role and current_user['role'] != "admin":
            raise HTTPException(status_code=403, detail="Operation not permitted")
        return current_user
    return role_checker
