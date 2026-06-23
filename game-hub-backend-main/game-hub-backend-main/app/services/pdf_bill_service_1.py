"""
PDF bill service v1: 80mm Zebra thermal receipt with VAT No, CR No.
Supports session bill (game + canteen) and canteen-only bill for walk-in.
Logo (if set) is drawn to the left of the tenant name at the top.
"""
import io
import logging
from pathlib import Path
from decimal import Decimal

from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

try:
    import qrcode
    HAS_QR = True
except ImportError:
    HAS_QR = False

from app.services.billing_service_1 import calculate_bill, calculate_canteen_only_bill
from app.services.session_engine import get_session_for_tenant
from app.services.upload_service import get_upload_root
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

# 80mm width in points
WIDTH_80MM = 80 * mm
HEIGHT_RECEIPT = 350
LOGO_BOX_SIZE = 18 * mm  # square logo to the left of tenant name


def _qr_image_bytes(data: str, size_px: int = 80) -> bytes | None:
    """Generate QR code image as PNG bytes."""
    if not HAS_QR:
        return None
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size_px, size_px))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _get_tenant_vat_cr(db, tenant_id) -> tuple[str | None, str | None]:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return None, None
    return getattr(tenant, "vat_no", None), getattr(tenant, "cr_no", None)


def _resolve_logo_path(logo_url: str | None) -> Path | None:
    """Convert /static/uploads/... URL to absolute filesystem path for ReportLab."""
    if not logo_url or not logo_url.strip():
        return None
    url = logo_url.strip()
    if url.startswith("/static/uploads/"):
        rel = url.replace("/static/uploads/", "").lstrip("/")
        path = Path(get_upload_root()) / rel
        if path.is_file():
            return path
        logger.warning("Invoice logo file not found: %s", path)
        return None
    if Path(url).is_file():
        return Path(url).resolve()
    return None


def _draw_header_with_logo(c, width: float, y: float, company_name: str, logo_path: Path | None) -> float:
    """Draw logo (left) and tenant name (right of logo) on one row. Returns new y."""
    logo_drawn = False
    if logo_path:
        try:
            img = ImageReader(str(logo_path))
            iw, ih = img.getSize()
            scale = min(LOGO_BOX_SIZE / iw, LOGO_BOX_SIZE / ih)
            draw_w = iw * scale
            draw_h = ih * scale
            x_logo = 2 * mm
            y_logo = y - LOGO_BOX_SIZE
            c.drawImage(img, x_logo, y_logo, width=draw_w, height=draw_h)
            logo_drawn = True
        except Exception as e:
            logger.warning("Could not draw invoice logo from %s: %s", logo_path, e)
    name_x = (2 * mm + LOGO_BOX_SIZE + 2 * mm) if logo_drawn else 10
    c.setFont("Helvetica-Bold", 14)
    c.drawString(name_x, y - 5 * mm, company_name[:25] if len(company_name) > 25 else company_name)
    return y - (LOGO_BOX_SIZE + 4 * mm) if logo_drawn else y - 14


def generate_bill_pdf(
    db,
    session_id: int,
    tenant_id: int,
    verification_base_url: str | None = None,
    vat_percent: Decimal = Decimal("15"),
) -> bytes:
    """
    Generate PDF bill for session. 80mm width, 15% VAT.
    Includes VAT No, CR No, Game Charge, Canteen Charge, VAT, Total, QR code.
    """
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")

    breakdown = calculate_bill(db, session_id, tenant_id, vat_percent=vat_percent)
    game_charge = breakdown["game_charge"]
    canteen_charge = breakdown["canteen_charge"]
    vat_amount = breakdown["vat_amount"]
    total = breakdown["total"]

    vat_no, cr_no = _get_tenant_vat_cr(db, tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    company_name = tenant.name if tenant else "GameHub"
    logo_url = getattr(tenant, "invoice_logo_url", None) if tenant else None
    logo_path = _resolve_logo_path(logo_url)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(WIDTH_80MM, HEIGHT_RECEIPT))
    width = WIDTH_80MM
    y = HEIGHT_RECEIPT - 20
    line_height = 14

    def draw_center(text: str, font_size: int = 12):
        c.setFont("Helvetica-Bold", font_size)
        c.drawCentredString(width / 2, y, text)
        return y - line_height

    def draw_left(text: str, font_size: int = 10):
        c.setFont("Helvetica", font_size)
        c.drawString(10, y, text)
        return y - line_height

    # Header: logo (left) + tenant name (right of logo)
    y = _draw_header_with_logo(c, width, y, company_name, logo_path)
    y -= 2

    # VAT No, CR No
    if vat_no:
        y = draw_center(f"VAT No: {vat_no}", 9)
    if cr_no:
        y = draw_center(f"CR No: {cr_no}", 9)
    y -= 6

    # Session info
    y = draw_left(f"Session ID: {session.id}")
    y = draw_left(f"Game Unit: {session.game_unit_id}")
    y = draw_left(f"Start: {session.start_time.strftime('%Y-%m-%d %H:%M')}")
    end_str = session.end_time.strftime("%Y-%m-%d %H:%M") if session.end_time else "-"
    y = draw_left(f"End: {end_str}")
    y -= 6

    # Line
    c.line(10, y, width - 10, y)
    y -= line_height

    y = draw_left(f"Game Charge       {float(game_charge):.2f}")
    y = draw_left(f"Canteen Charge    {float(canteen_charge):.2f}")
    y = draw_left(f"Subtotal          {float(game_charge + canteen_charge):.2f}")
    y = draw_left(f"VAT (15%)         {float(vat_amount):.2f}")
    y -= 4
    c.line(10, y, width - 10, y)
    y -= line_height
    c.setFont("Helvetica-Bold", 12)
    c.drawString(10, y, f"TOTAL             {float(total):.2f}")
    y -= line_height * 2

    # QR code
    qr_data = f"session_id={session_id}&total={float(total):.2f}"
    if verification_base_url:
        qr_data = f"{verification_base_url.rstrip('/')}/verify?session_id={session_id}&total={float(total):.2f}"
    qr_bytes = _qr_image_bytes(qr_data)
    if qr_bytes:
        from reportlab.lib.utils import ImageReader
        img = ImageReader(io.BytesIO(qr_bytes))
        qr_size = 60
        c.drawImage(img, (width - qr_size) / 2, y - qr_size, width=qr_size, height=qr_size)
        y -= qr_size + 8
    else:
        y = draw_left(f"Verify: {qr_data}", 8)

    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, y, "Scan for bill verification")
    y -= 8
    c.drawCentredString(width / 2, 20, "Thank you!")
    c.save()
    return buf.getvalue()


def generate_canteen_only_bill_pdf(
    db,
    canteen_bill_id: int,
    tenant_id: int,
    vat_percent: Decimal = Decimal("15"),
) -> bytes:
    """
    Generate PDF bill for walk-in canteen order (food only, no game charge).
    Includes VAT No, CR No, item list, subtotal, VAT, total, QR code.
    """
    breakdown = calculate_canteen_only_bill(
        db, canteen_bill_id, tenant_id, vat_percent=vat_percent
    )
    canteen_charge = breakdown["canteen_charge"]
    vat_amount = breakdown["vat_amount"]
    total = breakdown["total"]
    items = breakdown.get("items", [])
    customer_name = breakdown.get("customer_name", "")
    customer_mobile = breakdown.get("customer_mobile", "")

    vat_no, cr_no = _get_tenant_vat_cr(db, tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    company_name = tenant.name if tenant else "GameHub"
    logo_url = getattr(tenant, "invoice_logo_url", None) if tenant else None
    logo_path = _resolve_logo_path(logo_url)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(WIDTH_80MM, HEIGHT_RECEIPT))
    width = WIDTH_80MM
    y = HEIGHT_RECEIPT - 20
    line_height = 12

    def draw_center(text: str, font_size: int = 12):
        c.setFont("Helvetica-Bold", font_size)
        c.drawCentredString(width / 2, y, text)
        return y - line_height

    def draw_left(text: str, font_size: int = 10):
        c.setFont("Helvetica", font_size)
        c.drawString(10, y, text)
        return y - line_height

    # Header: logo (left) + tenant name (right of logo)
    y = _draw_header_with_logo(c, width, y, company_name, logo_path)
    y -= 2
    if vat_no:
        y = draw_center(f"VAT No: {vat_no}", 9)
    if cr_no:
        y = draw_center(f"CR No: {cr_no}", 9)
    y -= 6

    # Customer
    y = draw_left(f"Customer: {customer_name[:25]}")
    if customer_mobile:
        y = draw_left(f"Mobile: {customer_mobile[:20]}")
    y -= 4

    c.line(10, y, width - 10, y)
    y -= line_height

    # Items
    for it in items:
        name = it.get("product_name", "")[:25]
        qty = it.get("quantity", 1)
        price = float(it.get("price", 0))
        subt = float(it.get("total", price * qty))
        y = draw_left(f"{name} x{qty} {subt:.2f}")
    y -= 4

    c.line(10, y, width - 10, y)
    y -= line_height
    y = draw_left(f"Canteen Charge    {float(canteen_charge):.2f}")
    y = draw_left(f"Subtotal          {float(canteen_charge):.2f}")
    y = draw_left(f"VAT (15%)         {float(vat_amount):.2f}")
    y -= 4
    c.line(10, y, width - 10, y)
    y -= line_height
    c.setFont("Helvetica-Bold", 12)
    c.drawString(10, y, f"TOTAL             {float(total):.2f}")
    y -= line_height * 2

    # QR code
    qr_data = f"canteen_bill_id={canteen_bill_id}&total={float(total):.2f}"
    qr_bytes = _qr_image_bytes(qr_data)
    if qr_bytes:
        from reportlab.lib.utils import ImageReader
        img = ImageReader(io.BytesIO(qr_bytes))
        qr_size = 60
        c.drawImage(img, (width - qr_size) / 2, y - qr_size, width=qr_size, height=qr_size)
        y -= qr_size + 8

    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, y, "Scan for bill verification")
    y -= 8
    c.drawCentredString(width / 2, 20, "Thank you!")
    c.save()
    return buf.getvalue()
