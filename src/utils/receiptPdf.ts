import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface ReceiptData {
  sessionId: number;
  gameTypeName?: string;
  unitName?: string;
  startedAt?: string;
  endedAt?: string;
  canteenTotal: number;
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  vatPercent?: number;
}

export async function generateReceiptPdf(data: ReceiptData) {
  const {
    sessionId,
    gameTypeName,
    unitName,
    startedAt,
    endedAt,
    canteenTotal,
    subtotal,
    vat,
    discount,
    total,
    vatPercent,
  } = data;

  // 80mm wide thermal receipt style page
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200],
  });

  let y = 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Bill', 40, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (gameTypeName) {
    doc.text(`Game: ${gameTypeName}`, 4, y);
    y += 4;
  }
  if (unitName) {
    doc.text(`Unit: ${unitName}`, 4, y);
    y += 4;
  }

  doc.text(`Session ID: ${sessionId}`, 4, y);
  y += 4;

  if (startedAt) {
    doc.text(`Start: ${new Date(startedAt).toLocaleString()}`, 4, y);
    y += 4;
  }
  if (endedAt) {
    doc.text(`End:   ${new Date(endedAt).toLocaleString()}`, 4, y);
    y += 4;
  }

  y += 2;
  doc.line(4, y, 76, y);
  y += 4;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 4, y);
  doc.text('Amount', 76, y, { align: 'right' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.line(4, y, 76, y);
  y += 4;

  const addRow = (label: string, value: number) => {
    doc.text(label, 4, y);
    doc.text(value.toFixed(2), 76, y, { align: 'right' });
    y += 4;
  };

  const gameCharge = subtotal - canteenTotal;
  if (gameCharge > 0) {
    addRow('Game', gameCharge);
  }

  if (canteenTotal > 0) {
    addRow('Canteen', canteenTotal);
  }

  if (vat > 0) {
    const vatLabel = vatPercent != null ? `VAT (${vatPercent}%)` : 'VAT';
    addRow(vatLabel, vat);
  }

  if (discount > 0) {
    addRow('Discount', discount);
  }

  y += 1;
  doc.line(4, y, 76, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Total', 4, y);
  doc.text(total.toFixed(2), 76, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');

  // QR code with basic bill info – can be read by POS or verification tools
  const qrPayload = JSON.stringify({
    session_id: sessionId,
    total,
    subtotal,
    vat,
    discount,
    canteen_total: canteenTotal,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 256,
    });

    const qrSize = 28;
    doc.text('Scan for bill details', 40, y, { align: 'center' });
    y += 4;
    doc.addImage(qrDataUrl, 'PNG', (80 - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 4;
  } catch {
    // If QR generation fails, just skip it – still deliver the PDF
  }

  doc.save(`session-${sessionId}-bill.pdf`);
}

