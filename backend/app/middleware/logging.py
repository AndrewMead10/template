import structlog
import logging.config
import time
import uuid
from fastapi import Request


LOGGING_CONFIG = {
    "version": 1,
    "formatters": {
        "structured": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.processors.JSONRenderer(),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        },
    },
    "loggers": {
        "app": {"handlers": ["console"], "level": "INFO"},
        "uvicorn": {"handlers": ["console"], "level": "INFO"},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = structlog.get_logger("app")


async def log_requests(request: Request, call_next):
    """Log all incoming requests and outgoing responses for audit trail"""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    logger.info(
        "Incoming request",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        query_params=dict(request.query_params),
        user_id=getattr(request.state, 'user_id', None),
        user_agent=request.headers.get("user-agent"),
        ip_address=(request.client.host if request.client else None),
    )
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        "Outgoing response",
        request_id=request_id,
        status_code=response.status_code,
        process_time=process_time,
    )
    
    return response
