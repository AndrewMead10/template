from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from ...middleware.auth import verify_password, create_access_token, create_refresh_token
from ...database.shared import get_user_by_email
from ...config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    user: dict


@router.post("/auth/login/onsubmit", response_model=LoginResponse)
async def login_onsubmit(credentials: LoginRequest, response: Response):
    """Handle user login"""
    user = get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        max_age=settings.access_token_ttl_minutes * 60,
        samesite="lax"
    )
    response.set_cookie(
        "refresh_token", 
        refresh_token,
        httponly=True,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        samesite="lax"
    )
    
    return LoginResponse(
        success=True,
        user={
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active
        }
    )
