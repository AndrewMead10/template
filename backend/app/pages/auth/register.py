from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from ...middleware.auth import get_password_hash
from ...database.shared import get_user_by_email, create_user
from ...config import settings

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    success: bool
    message: str


@router.post("/auth/register/onsubmit", response_model=RegisterResponse)
async def register_onsubmit(user_data: RegisterRequest):
    """Handle user registration"""
    if not settings.enable_user_registration:
        raise HTTPException(status_code=403, detail="Registration is disabled")
    
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    hashed_password = get_password_hash(user_data.password)
    create_user(user_data.email, hashed_password)
    
    return RegisterResponse(
        success=True,
        message="Account created successfully"
    )