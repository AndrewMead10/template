from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import asyncio

from .middleware.cors import setup_cors
from .middleware.logging import log_requests
from .middleware.errors import global_exception_handler
from .pages.auth import login, register, refresh, logout, me, reset
from .pages import dashboard
from .functions.backups import daily_backup_loop, cleanup_expired_tokens
from .database import get_db_session
from .config import settings

app = FastAPI(
    title="Service Template",
    description="A comprehensive service template with authentication",
    version="1.0.0"
)

setup_cors(app)

app.middleware("http")(log_requests)

app.add_exception_handler(Exception, global_exception_handler)

# Mount all API routes under a common /api prefix to avoid
# collisions with SPA client-side routes like /auth/* when
# running the frontend dev server or refreshing deep links.
app.include_router(login.router, prefix="/api")
app.include_router(register.router, prefix="/api")
app.include_router(refresh.router, prefix="/api")
app.include_router(logout.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(reset.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


@app.get("/livez")
def livez():
    """Liveness check"""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness check"""
    try:
        with get_db_session() as db:
            db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not ready", "error": str(e)}


@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    if settings.enable_backups:
        asyncio.create_task(daily_backup_loop())
    
    asyncio.create_task(cleanup_expired_tokens())
