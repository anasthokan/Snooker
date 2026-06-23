"""
Common response schemas per API design doc.
"""
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response: status, data, message."""

    status: str = "success"
    data: T
    message: str = "OK"


class ErrorResponse(BaseModel):
    """Standard error response."""

    status: str = "error"
    error_code: int
    message: str
