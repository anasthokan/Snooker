"""
Tenant isolation middleware: set request.state.tenant_id from JWT.
"""
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.jwt import decode_token

logger = logging.getLogger(__name__)


def get_tenant_id_from_token(request: Request) -> int | None:
    """Extract tenant_id from Authorization Bearer token if present."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    return payload.get("tenant_id")


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Sets request.state.tenant_id from JWT payload.
    Only sets when token is valid; otherwise tenant_id remains unset.
    API handlers and services should filter by tenant_id when present.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.tenant_id = get_tenant_id_from_token(request)
        return await call_next(request)
