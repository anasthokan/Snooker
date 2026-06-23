"""
Profile API: current user info + tenant branding + upload logo/picture from device.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    require_roles,
    SUPER_ADMIN,
    TENANT_ADMIN,
)
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.common import SuccessResponse, ErrorResponse
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    TenantBrandingUpdateRequest,
)
from app.services.tenant_service import get_tenant_by_id
from app.services.upload_service import save_profile_picture, save_tenant_logo


router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=SuccessResponse[ProfileResponse])
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current user's profile including tenant branding (VAT, CR, logo)."""
    tenant = get_tenant_by_id(db, current_user.tenant_id)
    tenant_name = tenant.name if tenant else None
    vat_no = tenant.vat_no if tenant else None  # type: ignore[attr-defined]
    cr_no = tenant.cr_no if tenant else None  # type: ignore[attr-defined]
    logo_url = tenant.invoice_logo_url if tenant else None  # type: ignore[attr-defined]

    data = ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "",  # type: ignore[union-attr]
        tenant_id=current_user.tenant_id,
        tenant_name=tenant_name,
        is_active=current_user.is_active,
        profile_picture_url=current_user.profile_picture_url,  # type: ignore[attr-defined]
        tenant_vat_no=vat_no,
        tenant_cr_no=cr_no,
        tenant_logo_url=logo_url,
        created_at=current_user.created_at,
    )
    return SuccessResponse(data=data)


@router.patch(
    "/me",
    response_model=SuccessResponse[ProfileResponse],
    responses={400: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def update_me(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's profile: email, password, and/or profile picture URL. Only sent fields are updated."""
    sent = body.model_dump(exclude_unset=True)
    updated = False

    if "email" in sent and sent["email"] is not None:
        new_email = sent["email"].strip().lower()
        other = db.query(User).filter(
            func.lower(User.email) == new_email,
            User.id != current_user.id,
        ).first()
        if other:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        current_user.email = new_email
        updated = True

    if "new_password" in sent and sent["new_password"]:
        current = sent.get("current_password") or ""
        if not verify_password(current, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        current_user.password_hash = hash_password(sent["new_password"])
        updated = True

    if "profile_picture_url" in sent:
        current_user.profile_picture_url = sent["profile_picture_url"]  # type: ignore[attr-defined]
        updated = True

    if updated:
        db.commit()
        db.refresh(current_user)

    tenant = get_tenant_by_id(db, current_user.tenant_id)
    tenant_name = tenant.name if tenant else None
    vat_no = tenant.vat_no if tenant else None  # type: ignore[attr-defined]
    cr_no = tenant.cr_no if tenant else None  # type: ignore[attr-defined]
    logo_url = tenant.invoice_logo_url if tenant else None  # type: ignore[attr-defined]

    data = ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "",  # type: ignore[union-attr]
        tenant_id=current_user.tenant_id,
        tenant_name=tenant_name,
        is_active=current_user.is_active,
        profile_picture_url=current_user.profile_picture_url,  # type: ignore[attr-defined]
        tenant_vat_no=vat_no,
        tenant_cr_no=cr_no,
        tenant_logo_url=logo_url,
        created_at=current_user.created_at,
    )
    return SuccessResponse(data=data, message="Profile updated")


@router.post(
    "/upload-tenant-logo",
    response_model=SuccessResponse[ProfileResponse],
    responses={400: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def upload_tenant_logo(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, GIF, WebP) – browse from device"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """
    Upload a logo from your device for the current tenant (invoices/branding).
    Replaces the previous tenant logo. Use the file picker (browse) to select an image.
    """
    tenant = get_tenant_by_id(db, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    url_path = save_tenant_logo(file, current_user.tenant_id)
    tenant.invoice_logo_url = url_path  # type: ignore[attr-defined]
    db.commit()
    db.refresh(tenant)
    data = ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "",  # type: ignore[union-attr]
        tenant_id=current_user.tenant_id,
        tenant_name=tenant.name,
        is_active=current_user.is_active,
        profile_picture_url=current_user.profile_picture_url,  # type: ignore[attr-defined]
        tenant_vat_no=tenant.vat_no,  # type: ignore[attr-defined]
        tenant_cr_no=tenant.cr_no,  # type: ignore[attr-defined]
        tenant_logo_url=tenant.invoice_logo_url,  # type: ignore[attr-defined]
        created_at=current_user.created_at,
    )
    return SuccessResponse(data=data, message="Tenant logo updated")


@router.post(
    "/upload-picture",
    response_model=SuccessResponse[ProfileResponse],
    responses={400: {"model": ErrorResponse}},
)
def upload_profile_picture(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, GIF, WebP) – browse from device"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a profile picture from your device. Use the file picker (browse) to select an image.
    """
    url_path = save_profile_picture(file, current_user.id)
    current_user.profile_picture_url = url_path  # type: ignore[attr-defined]
    db.commit()
    db.refresh(current_user)
    tenant = get_tenant_by_id(db, current_user.tenant_id)
    tenant_name = tenant.name if tenant else None
    vat_no = tenant.vat_no if tenant else None  # type: ignore[attr-defined]
    cr_no = tenant.cr_no if tenant else None  # type: ignore[attr-defined]
    logo_url = tenant.invoice_logo_url if tenant else None  # type: ignore[attr-defined]
    data = ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "",  # type: ignore[union-attr]
        tenant_id=current_user.tenant_id,
        tenant_name=tenant_name,
        is_active=current_user.is_active,
        profile_picture_url=current_user.profile_picture_url,  # type: ignore[attr-defined]
        tenant_vat_no=vat_no,
        tenant_cr_no=cr_no,
        tenant_logo_url=logo_url,
        created_at=current_user.created_at,
    )
    return SuccessResponse(data=data, message="Profile picture updated")


@router.patch(
    "/tenant-branding",
    response_model=SuccessResponse[ProfileResponse],
    responses={403: {"model": ErrorResponse}},
)
def update_tenant_branding(
    body: TenantBrandingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SUPER_ADMIN, TENANT_ADMIN)),
):
    """
    Update current tenant's branding (VAT no, CR no, logo).

    - Super Admin: can update any tenant by switching context.
    - Tenant Admin: only their own tenant.
    """
    tenant = get_tenant_by_id(db, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Apply only fields that were sent (allows clearing logo with null)
    sent = body.model_dump(exclude_unset=True)
    if "vat_no" in sent:
        tenant.vat_no = sent["vat_no"]
    if "cr_no" in sent:
        tenant.cr_no = sent["cr_no"]
    if "invoice_logo_url" in sent:
        tenant.invoice_logo_url = sent["invoice_logo_url"]
    db.commit()
    db.refresh(tenant)
    updated_tenant = tenant

    data = ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "",  # type: ignore[union-attr]
        tenant_id=current_user.tenant_id,
        tenant_name=updated_tenant.name,
        is_active=current_user.is_active,
        profile_picture_url=current_user.profile_picture_url,  # type: ignore[attr-defined]
        tenant_vat_no=updated_tenant.vat_no,  # type: ignore[attr-defined]
        tenant_cr_no=updated_tenant.cr_no,  # type: ignore[attr-defined]
        tenant_logo_url=updated_tenant.invoice_logo_url,  # type: ignore[attr-defined]
        created_at=current_user.created_at,
    )
    return SuccessResponse(data=data, message="Tenant branding updated")

