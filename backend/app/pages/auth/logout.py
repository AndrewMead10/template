from fastapi import APIRouter, Response

router = APIRouter()


@router.post("/auth/logout/onsubmit")
async def logout(response: Response):
    """Logout user by clearing cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
