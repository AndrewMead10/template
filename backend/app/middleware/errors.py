from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import structlog
import uuid


async def global_exception_handler(request: Request, exc: Exception):
    """Centralized error handling with consistent response format"""
    request_id = str(uuid.uuid4())
    
    logger = structlog.get_logger("app")
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        error=str(exc),
        path=request.url.path,
        method=request.method,
        user_id=getattr(request.state, 'user_id', None),
    )
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        message = exc.detail
    elif isinstance(exc, ValidationError):
        status_code = 422
        message = "Input validation failed"
    else:
        status_code = 500
        message = "An unexpected error occurred"
    
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": message,
            "request_id": request_id,
            "status_code": status_code
        }
    )
