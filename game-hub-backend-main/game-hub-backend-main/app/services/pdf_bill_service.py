"""
Generate 80mm Zebra thermal receipt PDF: Game Charge, Canteen, VAT 15%, Total, QR code.
Returns PDF bytes for downloadable response (application/pdf).
"""
import io
from decimal import Decimal

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4  # height reference

try:
    import qrcode
    HAS_QR = True
except ImportError:
    HAS_QR = False

from app.services.billing_service import calculate_bill
from app.services.session_engine import get_session_for_tenant


# 80mm width in points (1 mm ≈ 2.83465 pt)
WIDTH_80MM = 80 * mm
# Receipt height (dynamic content; use a safe max for thermal)
HEIGHT_RECEIPT = 350


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


def generate_bill_pdf(
    db,
    session_id: int,
    tenant_id: int,
    verification_base_url: str | None = None,
    vat_percent: Decimal = Decimal("15"),
) -> bytes:
    """
    Generate PDF bill for session. 80mm width, 15% VAT.
    QR code links to verification URL with session_id and total.
    """
    session = get_session_for_tenant(db, session_id, tenant_id)
    if not session:
        raise ValueError("Session not found")

    breakdown = calculate_bill(db, session_id, tenant_id, vat_percent=vat_percent)
    game_charge = breakdown["game_charge"]
    canteen_charge = breakdown["canteen_charge"]
    vat_amount = breakdown["vat_amount"]
    total = breakdown["total"]

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

    # Title
    y = draw_center("GAMEHUB BILL", 14)
    y -= 4
    y = draw_center(f"Session #{session_id}", 10)
    y -= 8

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

    # QR code (verification / payment link)
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

    c.drawCentredString(width / 2, 20, "Thank you!")
    c.save()
    return buf.getvalue()