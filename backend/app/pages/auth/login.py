from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from .me import UserResponse as AuthUser
from ...middleware.auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_user_roles_with_hierarchy,
)
from ...database.shared import get_user_by_email
from ...config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    user: AuthUser


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
        samesite="lax",
        secure=getattr(settings, "cookie_secure", False),
    )
    response.set_cookie(
        "refresh_token", 
        refresh_token,
        httponly=True,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        samesite="lax",
        secure=getattr(settings, "cookie_secure", False),
    )
    
    roles = list(get_user_roles_with_hierarchy(user.id))

    return LoginResponse(
        success=True,
        user=AuthUser(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            roles=roles,
            created_at=user.created_at.isoformat() if getattr(user, "created_at", None) else None,
        ),
    )
