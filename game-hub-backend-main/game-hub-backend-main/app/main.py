"""
GameHub Pro - FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.auth import router as auth_router
from app.api.signup import router as signup_router
from app.api.tenants import router as tenants_router
from app.api.users import router as users_router
from app.api.games import router as games_router
from app.api.sessions import router as sessions_router
from app.api.orders_1 import router as orders_router
from app.api.billing_1 import router as billing_router, payments_router
from app.api.products import router as products_router
from app.api.customers import router as customers_router
from app.api.customer_accounts import router as customer_accounts_router
from app.api.reports import router as reports_router
from app.api.repayments import router as repayments_router
from app.api.public_payments import router as public_payments_router
from app.api.customer_portal import router as customer_portal_router
from app.api.profile import router as profile_router
from app.api.ai import router as ai_router
from app.core.config import get_settings
from app.middleware.tenant import TenantMiddleware
from app.services.upload_service import get_upload_root
from app.schemas.common import ErrorResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("GameHub Pro API starting")
    yield
    logger.info("GameHub Pro API shutting down")


app = FastAPI(
    title=settings.app_name,
    description="Backend API for GameHub Pro - game parlour management",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)

app.include_router(auth_router)
app.include_router(signup_router)
app.include_router(tenants_router)
app.include_router(users_router)
app.include_router(games_router)
app.include_router(sessions_router)
app.include_router(orders_router)
app.include_router(billing_router)
app.include_router(payments_router)
app.include_router(products_router)
app.include_router(customers_router)
app.include_router(customer_accounts_router)
app.include_router(public_payments_router)
app.include_router(customer_portal_router)
app.include_router(reports_router)
app.include_router(repayments_router)
app.include_router(profile_router)
app.include_router(ai_router)

# Serve uploaded files (tenant logos, profile pictures) at /static/uploads
_upload_root = get_upload_root()
_upload_root.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(_upload_root)), name="uploads")


def _error_message(exc: HTTPException, default: str) -> str:
    msg = getattr(exc, "detail", default)
    if isinstance(msg, list):
        return "; ".join(str(e.get("msg", e)) for e in msg)
    return str(msg)


@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException):
    """Standard error response format for all HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error_code=exc.status_code, message=_error_message(exc, "Error")).model_dump(),
    )


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 422 in standard error format."""
    msg = "; ".join(str(e.get("msg", e)) for e in exc.errors()) if exc.errors() else "Validation error"
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(error_code=422, message=msg).model_dump(),
    )


@app.get("/health")
def health():
    """Health check for load balancers."""
    return {"status": "ok"}


# Serve React frontend (production build) — enables single URL for staff + customer pay page
_STATIC_APP = Path(__file__).resolve().parent.parent / "static_app"
if _STATIC_APP.is_dir() and (_STATIC_APP / "index.html").is_file():
    from fastapi.responses import FileResponse

    @app.get("/")
    async def spa_root():
        return FileResponse(_STATIC_APP / "index.html")

    app.mount("/assets", StaticFiles(directory=str(_STATIC_APP / "assets")), name="spa-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """SPA routes: /pay, /login, /tenant, etc."""
        if full_path.startswith(("docs", "redoc", "openapi", "static/uploads", "auth", "sessions", "public", "billing", "payments", "customers", "reports", "health")):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        file_path = _STATIC_APP / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_STATIC_APP / "index.html")
