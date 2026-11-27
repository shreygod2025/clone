import jsPDF from 'jspdf';

/**
 * Generate and download a payment receipt PDF
 * @param {Object} payment - Payment record from school_student_payments
 * @param {string} schoolName - Fallback school name
 */
export function downloadReceiptPDF(payment, schoolName) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ─── Header ───
  doc.setFillColor(30, 58, 95); // #1E3A5F
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OLL', margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('One Learner at a time, One Life skill at a time', margin, 25);

  // Receipt title on right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth - margin, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const receiptNum = payment.receipt_number || payment.id || 'N/A';
  doc.text(`Receipt #: ${receiptNum}`, pageWidth - margin, 26, { align: 'right' });

  y = 50;
  doc.setTextColor(0, 0, 0);

  // ─── Status Badge ───
  const status = (payment.status || 'PAID').toUpperCase();
  const isRefunded = status === 'REFUNDED';
  doc.setFillColor(isRefunded ? 168 : 34, isRefunded ? 85 : 139, isRefunded ? 247 : 34); // purple for refunded, green for paid
  doc.roundedRect(margin, y, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(status, margin + 15, y + 5.5, { align: 'center' });

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const paidDate = payment.paid_at || payment.payment_time || payment.created_at;
  const dateStr = paidDate ? new Date(paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y + 5.5, { align: 'right' });

  y += 18;

  // ─── Student Details Box ───
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Student Details', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(9);

  const leftCol = margin + 6;
  const rightCol = margin + contentWidth / 2 + 6;
  let detailY = y + 16;

  const addDetailRow = (label, value, x, rowY) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(String(value || 'N/A'), x + 30, rowY);
  };

  addDetailRow('Name:', payment.student_name || 'N/A', leftCol, detailY);
  addDetailRow('Phone:', payment.phone || 'N/A', rightCol, detailY);
  detailY += 8;
  addDetailRow('School:', payment.school_name || schoolName || 'N/A', leftCol, detailY);
  addDetailRow('Grade:', payment.grade ? `Grade ${payment.grade}${payment.division ? ` - ${payment.division}` : ''}` : 'N/A', rightCol, detailY);

  y += 50;

  // ─── Payment Details Box ───
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Payment Details', margin + 6, y + 8);

  doc.setFontSize(9);
  detailY = y + 16;

  addDetailRow('Amount:', `Rs. ${Number(payment.amount || 0).toLocaleString('en-IN')}`, leftCol, detailY);
  addDetailRow('Method:', 'Online (Cashfree)', rightCol, detailY);
  detailY += 8;

  const txnId = payment.transaction_id || payment.cf_order_id || payment.id || 'N/A';
  addDetailRow('Txn ID:', txnId, leftCol, detailY);
  addDetailRow('Order ID:', payment.id || 'N/A', rightCol, detailY);
  detailY += 8;

  if (payment.programme_name || payment.skill) {
    addDetailRow('Program:', payment.programme_name || payment.skill || 'N/A', leftCol, detailY);
  }

  y += 58;

  // ─── Amount Summary ───
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid', margin + 8, y + 10.5);
  doc.text(`Rs. ${Number(payment.amount || 0).toLocaleString('en-IN')}`, pageWidth - margin - 8, y + 10.5, { align: 'right' });

  y += 26;

  // ─── Footer ───
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('For any queries, contact us at info@oll.co', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('OLL - One Learner at a time, One Life skill at a time | www.oll.co', pageWidth / 2, y, { align: 'center' });

  // Download
  const fileName = `OLL_Receipt_${payment.student_name?.replace(/\s+/g, '_') || 'Student'}_${receiptNum}.pdf`;
  doc.save(fileName);
}
