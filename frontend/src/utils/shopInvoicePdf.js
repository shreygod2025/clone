import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a clean, printable PDF invoice for a shop order so the learner
 * can download it from /my-bookings. Entirely client-side — no server round
 * trip required.
 *
 * @param {Object} order — the shop_orders Mongo doc as returned by
 *   /api/shop/my-orders.
 */
export function downloadShopOrderInvoice(order) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const page = { w: 210, h: 297, left: 15, right: 15 };

  // ── Masthead ───────────────────────────────────────────────────────────
  doc.setFillColor(10, 31, 68);
  doc.rect(0, 0, page.w, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OLL — Online Learning Launchpad', page.left, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('103, Kshitij Building, Veera Desai Rd, Andheri West, Mumbai 400053', page.left, 20);
  doc.text('care@oll.co · +91 86574 03418 · GSTIN: 27AADCO9075D1Z4', page.left, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', page.w - page.right, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(order.order_no || order.id?.slice(0, 10), page.w - page.right, 20, { align: 'right' });
  const date = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '';
  doc.text(date, page.w - page.right, 25, { align: 'right' });

  // ── Billing block ──────────────────────────────────────────────────────
  const s = order.shipping || {};
  let y = 42;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', page.left, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  y += 5;
  doc.text(s.full_name || '', page.left, y); y += 4.5;
  if (s.line1) { doc.text(s.line1, page.left, y); y += 4.5; }
  if (s.line2) { doc.text(s.line2, page.left, y); y += 4.5; }
  const cityLine = [s.city, s.state, s.pincode].filter(Boolean).join(', ');
  if (cityLine) { doc.text(cityLine, page.left, y); y += 4.5; }
  if (s.phone) { doc.text(`Phone: ${s.phone}`, page.left, y); y += 4.5; }
  if (s.email) { doc.text(`Email: ${s.email}`, page.left, y); y += 4.5; }

  // ── Items table ────────────────────────────────────────────────────────
  const items = order.items || [];
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || 0);
  const delivery = Number(order.delivery_charge || 0);
  const total = Number(order.total || 0);
  // Shop prices are already inclusive of GST at the vendor level — show the
  // GST breakdown as implicit (effective 18%, split 9% CGST + 9% SGST).
  const taxableBase = Math.round((subtotal / 1.18) * 100) / 100;
  const totalGST = Math.round((subtotal - taxableBase) * 100) / 100;
  const cgst = Math.round((totalGST / 2) * 100) / 100;
  const sgst = Math.round((totalGST / 2) * 100) / 100;

  const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  autoTable(doc, {
    startY: Math.max(y + 4, 80),
    head: [['#', 'Item', 'Qty', 'Unit price', 'Amount']],
    body: items.map((it, i) => [
      String(i + 1),
      it.name || it.product_title || it.title || '—',
      String(it.quantity || 1),
      inr(it.unit_price || 0),
      inr(it.line_total || (it.unit_price || 0) * (it.quantity || 1)),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [10, 31, 68], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: 30 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: page.left, right: page.right },
  });

  // ── Totals (right-aligned block) ──────────────────────────────────────
  let ty = doc.lastAutoTable.finalY + 8;
  const totalsX = page.w - page.right;
  const labelX = totalsX - 60;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const row = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, labelX, ty);
    doc.text(value, totalsX, ty, { align: 'right' });
    ty += 5.5;
  };
  row('Taxable value', inr(taxableBase));
  row('CGST (9%)', inr(cgst));
  row('SGST (9%)', inr(sgst));
  row('Sub Total', inr(subtotal));
  if (discount > 0) row(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, '-' + inr(discount));
  if (delivery > 0) row('Delivery', inr(delivery));
  doc.setDrawColor(200);
  doc.line(labelX, ty - 2, totalsX, ty - 2);
  ty += 1;
  row('TOTAL', inr(total), true);

  // ── Payment + delivery status ─────────────────────────────────────────
  ty += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text(`Payment: ${(order.payment_status || 'PAID').toUpperCase()}`, page.left, ty);
  doc.setTextColor(100, 116, 139);
  doc.text(`Delivery: ${(order.fulfillment_status || 'pending').toUpperCase()}`, page.left + 55, ty);

  // ── Footer ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This is a system-generated tax invoice. For any clarifications email care@oll.co.',
    page.w / 2, page.h - 10, { align: 'center' },
  );

  const safeNo = (order.order_no || order.id || 'order').replace(/[^A-Za-z0-9_-]/g, '_');
  doc.save(`OLL_Invoice_${safeNo}.pdf`);
}
