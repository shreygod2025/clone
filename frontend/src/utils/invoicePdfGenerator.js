import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ──────────────────────────────────────────────
// OLL Company Details (Seller)
// ──────────────────────────────────────────────
const COMPANY = {
  name: 'Clone Futura Live Solutions Pvt Ltd',
  address: '103 SBI Employees, Neelkamal CHS, CTS-640A, Veera Desai Road',
  phone: '9323835523',
  email: 'accounts@clonefutura.com',
  gstin: '27AAKCC1113B1ZC',
  website: 'https://www.oll.co/',
  stateCode: '27',
  stateName: 'Maharashtra',
  cin: 'U80903MH2022PTC377002',
  pan: 'AAKCC1113B',
  bank: 'HDFC Bank',
  accountNo: '50200063789133',
  ifsc: 'HDFC0000240',
  regdOffice: '91, Nagdevi Cross Lane Mumbai-400003',
};

const HSN_SAC = '999259';

// ──────────────────────────────────────────────
// Number to Words (Indian Rupees)
// ──────────────────────────────────────────────
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
  }

  const intPart = Math.floor(Math.abs(num));
  if (intPart === 0) return 'Zero';

  let result = '';
  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const remainder = intPart % 1000;

  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) result += convertGroup(remainder);

  return result.trim();
}

function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = 'Indian Rupee ' + numberToWords(rupees);
  if (paise > 0) {
    words += ' and ' + numberToWords(paise) + ' Paise';
  }
  words += ' Only';
  return words;
}

function formatINR(num) {
  if (!num && num !== 0) return '0.00';
  const n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function generateInvoiceNumber(payment) {
  const now = new Date();
  const year = now.getFullYear();
  const hash = (payment.school_id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = (payment.tranche_index || 0) + 1;
  const seq = String(hash * 100 + idx + now.getMonth() * 10).slice(-6).padStart(6, '0');
  return `OLL${year}/${seq}`;
}

// ──────────────────────────────────────────────
// GST Calculation
// ──────────────────────────────────────────────
function calculateGST(amount, gstType, schoolState) {
  // Book GST = no GST applicable
  if (gstType === 'book_gst') {
    return {
      baseAmount: amount,
      totalWithGST: amount,
      cgstRate: 0, cgstAmount: 0,
      sgstRate: 0, sgstAmount: 0,
      igstRate: 0, igstAmount: 0,
      isIntraState: true,
      isBookGST: true,
    };
  }

  const gstRate = 18;
  const halfRate = gstRate / 2;
  let baseAmount, gstAmount;

  if (gstType === 'inclusive') {
    baseAmount = amount / (1 + gstRate / 100);
    gstAmount = amount - baseAmount;
  } else {
    baseAmount = amount;
    gstAmount = amount * gstRate / 100;
  }

  const isIntraState = !schoolState || schoolState.toLowerCase().includes('maharashtra');

  if (isIntraState) {
    return {
      baseAmount, totalWithGST: baseAmount + gstAmount,
      cgstRate: halfRate, cgstAmount: gstAmount / 2,
      sgstRate: halfRate, sgstAmount: gstAmount / 2,
      igstRate: 0, igstAmount: 0,
      isIntraState: true, isBookGST: false,
    };
  } else {
    return {
      baseAmount, totalWithGST: baseAmount + gstAmount,
      cgstRate: 0, cgstAmount: 0,
      sgstRate: 0, sgstAmount: 0,
      igstRate: gstRate, igstAmount: gstAmount,
      isIntraState: false, isBookGST: false,
    };
  }
}

// ──────────────────────────────────────────────
// Main: Generate Invoice PDF
// ──────────────────────────────────────────────
export async function generateInvoicePDF(payment, schoolData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const innerLeft = margin;
  const innerRight = pageWidth - margin;
  let y = margin;

  // Load images
  let logoImg = null;
  let signImg = null;
  try { logoImg = await loadImageAsDataURL('/oll_logo_invoice.png'); } catch (e) { /* fallback */ }
  try { signImg = await loadImageAsDataURL('/shreyaan_sign.png'); } catch (e) { /* fallback */ }

  // ─── Border ───
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - margin * 2 + 4);

  // ─── Header: Logo (aspect-ratio preserved) + Company Info ───
  // Logo is 1080x1920 (portrait). Height=30mm, Width=30*(1080/1920)=16.9mm
  const logoH = 30;
  const logoW = 16.9;
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', innerLeft + 2, y, logoW, logoH);
  }

  const companyX = innerLeft + logoW + 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(COMPANY.name, companyX, y + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(COMPANY.address, companyX, y + 14);
  doc.text(`Phone: ${COMPANY.phone}  |  Email: ${COMPANY.email}`, companyX, y + 19);
  doc.text(`GSTIN: ${COMPANY.gstin}  |  ${COMPANY.website}`, companyX, y + 24);

  // TAX INVOICE title (no "TAX" prefix for book_gst)
  const gstType = payment.gst_type || 'exclusive';
  const invoiceTitle = gstType === 'book_gst' ? 'INVOICE' : 'TAX INVOICE';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(invoiceTitle, innerRight - 2, y + 12, { align: 'right' });

  y += 34;

  // ─── Divider ───
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.3);
  doc.line(innerLeft, y, innerRight, y);
  y += 4;

  // ─── Invoice Details ───
  const invoiceNo = generateInvoiceNumber(payment);
  const invoiceDate = payment.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dueDate = payment.due_date
    ? new Date(payment.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : invoiceDate;

  const schoolState = schoolData?.state || schoolData?.onboarding_data?.state || 'Maharashtra';
  const stateCode = schoolState.toLowerCase().includes('maharashtra') ? '27' : '';
  const placeOfSupply = stateCode ? `${schoolState} (${stateCode})` : schoolState || 'Maharashtra (27)';

  doc.setFontSize(8);
  const detailsLeft = innerLeft + 2;
  const detailsRight = pageWidth / 2 + 10;

  const addDetailPair = (label, value, x, rowY) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value || 'N/A'), x + 32, rowY);
  };

  addDetailPair('Invoice No:', invoiceNo, detailsLeft, y);
  addDetailPair('Terms:', 'Due on Receipt', detailsRight, y);
  y += 5;
  addDetailPair('Invoice Date:', invoiceDate, detailsLeft, y);
  addDetailPair('Due Date:', dueDate, detailsRight, y);
  y += 5;
  addDetailPair('Place of Supply:', placeOfSupply, detailsLeft, y);
  y += 6;

  // ─── Divider ───
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(innerLeft, y, innerRight, y);
  y += 4;

  // ─── Bill To / Ship To ───
  const schoolName = schoolData?.school_name || payment.school_name || 'N/A';
  const schoolAddress = schoolData?.address || schoolData?.city || schoolState || '';
  const schoolGSTIN = schoolData?.gstin || schoolData?.onboarding_data?.gstin || '';
  const halfWidth = contentWidth / 2 - 2;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(innerLeft, y, halfWidth, 22, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Bill To', innerLeft + 3, y + 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(schoolName, innerLeft + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  if (schoolAddress) doc.text(schoolAddress, innerLeft + 3, y + 16, { maxWidth: halfWidth - 6 });
  if (schoolGSTIN) doc.text(`GSTIN: ${schoolGSTIN}`, innerLeft + 3, y + 20);

  const shipX = innerLeft + halfWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(shipX, y, halfWidth, 22, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Ship To', shipX + 3, y + 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(schoolName, shipX + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  if (schoolState) doc.text(schoolState, shipX + 3, y + 16);

  y += 28;

  // ─── Items Table ───
  const gst = calculateGST(payment.amount || 0, gstType, schoolState);

  const gradePricing = schoolData?.onboarding_data?.grade_pricing || [];
  const totalStudents = schoolData?.onboarding_data?.total_students || payment.qty || '';
  let itemDesc = schoolName;
  if (gradePricing.length > 0) {
    const grades = gradePricing.map(g => g.grade).join(', ');
    itemDesc += ` - ${grades}`;
  }
  if (payment.tranche_info) {
    itemDesc += ` (${payment.tranche_info})`;
  }

  const pricePerStudent = totalStudents ? (gst.baseAmount / Number(totalStudents)) : gst.baseAmount;
  const qtyStr = totalStudents ? String(totalStudents) : '1';
  const rateStr = formatINR(totalStudents ? pricePerStudent : gst.baseAmount);

  // Table layout depends on GST type
  let tableHeaders, tableBody, columnStyles;

  if (gst.isBookGST) {
    // No GST columns for Book GST
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount']];
    tableBody = [['1', itemDesc, HSN_SAC, qtyStr, rateStr, formatINR(gst.baseAmount)]];
    columnStyles = {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    };
  } else if (gst.isIntraState) {
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'CGST %', 'CGST Amt', 'SGST %', 'SGST Amt', 'Amount']];
    tableBody = [['1', itemDesc, HSN_SAC, qtyStr, rateStr,
      `${gst.cgstRate}%`, formatINR(gst.cgstAmount),
      `${gst.sgstRate}%`, formatINR(gst.sgstAmount),
      formatINR(gst.baseAmount),
    ]];
    columnStyles = {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 13 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'right', cellWidth: 20 },
    };
  } else {
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'IGST %', 'IGST Amt', 'Amount']];
    tableBody = [['1', itemDesc, HSN_SAC, qtyStr, rateStr,
      `${gst.igstRate}%`, formatINR(gst.igstAmount),
      formatINR(gst.baseAmount),
    ]];
    columnStyles = {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 24 },
    };
  }

  doc.autoTable({
    head: tableHeaders,
    body: tableBody,
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2.5,
      textColor: [30, 30, 30],
    },
    columnStyles,
  });

  y = doc.lastAutoTable.finalY + 4;

  // ─── Totals Section ───
  const totalsX = innerRight - 70;
  const totalsW = 68;

  const addTotalRow = (label, value, isBold, bgColor) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(totalsX, y - 3, totalsW, 6, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(isBold ? 30 : 80, isBold ? 30 : 80, isBold ? 30 : 80);
    doc.text(label, totalsX + 2, y);
    doc.text(value, totalsX + totalsW - 2, y, { align: 'right' });
    y += 6;
  };

  addTotalRow('Sub Total', formatINR(gst.baseAmount), false);

  if (!gst.isBookGST) {
    if (gst.isIntraState) {
      addTotalRow(`CGST9 (${gst.cgstRate}%)`, formatINR(gst.cgstAmount), false);
      addTotalRow(`SGST9 (${gst.sgstRate}%)`, formatINR(gst.sgstAmount), false);
    } else {
      addTotalRow(`IGST (${gst.igstRate}%)`, formatINR(gst.igstAmount), false);
    }
  }

  y += 1;
  addTotalRow('Total', `Rs. ${formatINR(gst.totalWithGST)}`, true, [30, 58, 95]);
  // Override text color for total row (white on dark bg)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', totalsX + 2, y - 6);
  doc.text(`Rs. ${formatINR(gst.totalWithGST)}`, totalsX + totalsW - 2, y - 6, { align: 'right' });

  y += 2;
  addTotalRow('Balance Due', `Rs. ${formatINR(payment.status === 'paid' ? 0 : gst.totalWithGST)}`, true);
  y += 4;

  // ─── Amount in Words ───
  doc.setDrawColor(200, 200, 200);
  doc.line(innerLeft, y, innerRight, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Total In Words', innerLeft + 2, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(amountInWords(gst.totalWithGST), innerLeft + 2, y);
  y += 7;

  // ─── Notes ───
  doc.setDrawColor(200, 200, 200);
  doc.line(innerLeft, y, innerRight, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Notes', innerLeft + 2, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('We appreciate your business and look forward to helping you again soon.', innerLeft + 2, y);
  y += 7;

  // ─── Terms & Conditions ───
  doc.setDrawColor(200, 200, 200);
  doc.line(innerLeft, y, innerRight, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Terms & Conditions', innerLeft + 2, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(6.5);
  const terms = [
    `All Payment has to be made in the name of '${COMPANY.name}'`,
    `Company CINO : ${COMPANY.cin}`,
    `Company PAN No. ${COMPANY.pan}`,
    `${COMPANY.bank}, A/C No. ${COMPANY.accountNo} IFSCode: ${COMPANY.ifsc}`,
    `Regd office: ${COMPANY.regdOffice}`,
  ];
  terms.forEach(t => {
    doc.text(t, innerLeft + 2, y);
    y += 3.5;
  });
  y += 4;

  // ─── Signature ───
  doc.setDrawColor(200, 200, 200);
  doc.line(innerLeft, y, innerRight, y);
  y += 3;

  const signX = innerRight - 52;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`For ${COMPANY.name}`, signX, y + 3);

  if (signImg) {
    doc.addImage(signImg, 'PNG', signX + 5, y + 5, 30, 15);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Shreyaan Daga', signX + 10, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signatory', signX + 6, y + 27);

  // ─── Save ───
  const fileName = `Invoice_${schoolName.replace(/\s+/g, '_')}_${invoiceNo.replace('/', '_')}.pdf`;
  doc.save(fileName);
}
