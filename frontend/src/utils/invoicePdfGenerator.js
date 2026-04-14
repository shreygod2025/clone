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
  branch: 'Sandoz House Worli',
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

function loadImageAsDataURL(url, maxWidth = 200, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Fill white background to avoid black on transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
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
  if (gstType === 'book_gst_0' || gstType === 'book_gst') {
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

  // payment.amount always represents the INCLUSIVE total (what the school actually pays).
  // For both inclusive_18 and exclusive_18: extract the base by dividing by (1 + GST rate).
  // The difference is only in DISPLAY:
  //   inclusive_18 → GST shown per line item inside the table
  //   exclusive_18 → GST shown as separate line items below the subtotal
  if (gstType === 'inclusive_18' || gstType === 'inclusive' ||
      gstType === 'exclusive_18' || gstType === 'exclusive') {
    baseAmount = amount / (1 + gstRate / 100);
    gstAmount = amount - baseAmount;
  } else {
    // Unknown / legacy: add GST on top of base
    baseAmount = amount;
    gstAmount = amount * gstRate / 100;
  }

  const isIntraState = schoolState ? schoolState.toLowerCase().includes('maharashtra') : true;

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
export async function generateInvoicePDF(payment, schoolData, { skipDownload = false } = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const innerLeft = margin;
  const innerRight = pageWidth - margin;
  let y = margin;

  // ── Determine seller: OLL or Distributor ─────────────────────────────────
  const onboardingData = schoolData?.onboarding_data || {};
  const isDistributor = onboardingData.payment_mode === 'from_distributor';
  const SELLER = isDistributor ? {
    name: onboardingData.distributor_name || 'Distributor',
    address: onboardingData.distributor_address || '',
    phone: '',
    email: '',
    gstin: onboardingData.distributor_gstin || '',
    website: '',
  } : COMPANY;

  // Load images
  let logoImg = null;
  let signImg = null;
  try { logoImg = await loadImageAsDataURL('/oll_logo_invoice.png', 120, 200); } catch (e) { /* fallback */ }
  try { signImg = await loadImageAsDataURL('/shreyaan_sign.png', 200, 100); } catch (e) { /* fallback */ }

  // ─── Border ───
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - margin * 2 + 4);

  // ─── Header: Logo (aspect-ratio preserved) + Company/Distributor Info ────
  // Logo is 1080x1920 (portrait). Height=30mm, Width=30*(1080/1920)=16.9mm
  const logoH = 30;
  const logoW = 16.9;
  if (logoImg && !isDistributor) {
    doc.addImage(logoImg, 'JPEG', innerLeft + 2, y, logoW, logoH);
  }

  const companyX = isDistributor ? innerLeft + 2 : innerLeft + logoW + 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(SELLER.name, companyX, y + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (SELLER.address) doc.text(SELLER.address, companyX, y + 14);
  if (SELLER.phone || SELLER.email) doc.text(`${SELLER.phone ? `Phone: ${SELLER.phone}` : ''}${SELLER.phone && SELLER.email ? '  |  ' : ''}${SELLER.email ? `Email: ${SELLER.email}` : ''}`, companyX, y + 19);
  if (SELLER.gstin || SELLER.website) doc.text(`${SELLER.gstin ? `GSTIN: ${SELLER.gstin}` : ''}${SELLER.gstin && SELLER.website ? '  |  ' : ''}${SELLER.website || ''}`, companyX, y + 24);

  // TAX INVOICE title (no "TAX" prefix for book_gst)
  const headerGstType = schoolData?.onboarding_data?.gst_type || payment.gst_type || 'exclusive_18';
  const invoiceTitle = (headerGstType === 'book_gst_0' || headerGstType === 'book_gst') ? 'INVOICE' : 'TAX INVOICE';
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

  const INDIAN_STATES_LIST = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
    'Andaman and Nicobar', 'Lakshadweep', 'Dadra and Nagar Haveli',
  ];

  const STATE_GST_CODES = {
    'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
    'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
    'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
    'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
    'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
    'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
    'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
    'Delhi': '07', 'Jammu and Kashmir': '01', 'Ladakh': '38', 'Chandigarh': '04',
    'Puducherry': '34', 'Andaman and Nicobar': '35', 'Lakshadweep': '31',
    'Dadra and Nagar Haveli': '26',
  };

  // Detect state from address text when not explicitly stored
  const detectStateFromAddress = (addr) => {
    if (!addr) return '';
    const lower = addr.toLowerCase();
    // Check longer names first to avoid partial matches
    const sorted = [...INDIAN_STATES_LIST].sort((a, b) => b.length - a.length);
    for (const s of sorted) {
      if (lower.includes(s.toLowerCase())) return s;
    }
    return '';
  };

  const rawStateField = schoolData?.state || schoolData?.onboarding_data?.state || '';
  const fullAddressForDetection = [
    schoolData?.address, schoolData?.onboarding_data?.address,
    schoolData?.location, schoolData?.city,
  ].filter(Boolean).join(', ');
  const schoolState = rawStateField || detectStateFromAddress(fullAddressForDetection);
  const isMaharashtra = schoolState.toLowerCase().includes('maharashtra');
  const gstStateCode = STATE_GST_CODES[schoolState] || '';
  const placeOfSupply = schoolState
    ? (gstStateCode ? `${schoolState} (${gstStateCode})` : schoolState)
    : 'Maharashtra (27)';

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
  const rawAddr = schoolData?.address || schoolData?.onboarding_data?.address || '';
  const cityVal = schoolData?.city || schoolData?.onboarding_data?.city || '';
  const pincode = schoolData?.pincode || schoolData?.onboarding_data?.pincode || '';
  const statePinPart = schoolState && pincode ? `${schoolState} - ${pincode}` : pincode || schoolState;
  const addrParts = [rawAddr, cityVal, statePinPart].filter(Boolean);
  const schoolAddress = addrParts.join(', ');
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
  if (schoolAddress) doc.text(schoolAddress, shipX + 3, y + 16, { maxWidth: halfWidth - 6 });

  y += 28;

  // ─── Items Table ───
  // gst_type is stored in onboarding_data; fall back to payment field for legacy records
  const gstType = schoolData?.onboarding_data?.gst_type || payment.gst_type || 'exclusive_18';
  const gst = calculateGST(payment.amount || 0, gstType, schoolState);

  // Build per-grade rows from grade_pricing[]
  const rawGrades = (schoolData?.onboarding_data?.grade_pricing || [])
    .filter(g => g.grade && g.students && g.price_per_student);

  // Sum of (students × rate) across all grades — the full contract base
  const rawContractTotal = rawGrades.reduce(
    (sum, g) => sum + (parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0),
    0
  );

  // Scaling factor: distributes tranche amounts proportionally across grades
  const scalingFactor = rawContractTotal > 0 ? gst.baseAmount / rawContractTotal : 1;

  // Helper: build one row per grade with per-row GST split
  function buildGradeRows() {
    return rawGrades.map((g, idx) => {
      const students = parseInt(g.students) || 0;
      const rateRaw = parseFloat(g.price_per_student) || 0;
      // Proportionally scaled base amount for this grade in the invoice
      const rowBase = students * rateRaw * scalingFactor;
      // Scale the rate so that Qty × scaledRate = rowBase (consistent math on invoice)
      const scaledRate = students > 0 ? rowBase / students : rateRaw * scalingFactor;
      const rowCGST = rowBase * gst.cgstRate / 100;
      const rowSGST = rowBase * gst.sgstRate / 100;
      const rowIGST = rowBase * gst.igstRate / 100;
      const desc = `Grade ${g.grade}`;
      return { idx, desc, students, scaledRate, rowBase, rowCGST, rowSGST, rowIGST };
    });
  }

  // Fallback single-row data (when no detailed grade_pricing)
  function buildFallbackRow(desc) {
    const totalStudents = schoolData?.onboarding_data?.total_students || payment.qty || '';
    const pricePerStudent = totalStudents ? (gst.baseAmount / Number(totalStudents)) : gst.baseAmount;
    return {
      desc: desc + (payment.tranche_info ? ` (${payment.tranche_info})` : ''),
      qtyStr: totalStudents ? String(totalStudents) : '1',
      rateStr: formatINR(totalStudents ? pricePerStudent : gst.baseAmount),
    };
  }

  const useGradeRows = rawGrades.length > 0;
  const gradeRows = useGradeRows ? buildGradeRows() : [];
  const fallback = !useGradeRows ? buildFallbackRow(schoolName) : null;

  // Table layout depends on GST type
  // For exclusive GST (exclusive_18 / exclusive): GST is shown only in the summary totals section,
  // NOT per line item — to avoid the appearance of double-charging.
  // For inclusive GST: per-item GST breakdown is shown since the tax is embedded in the rate.
  const isExclusiveGST = gstType === 'exclusive_18' || gstType === 'exclusive';

  let tableHeaders, tableBody, columnStyles;

  // Simple table layout (no per-row GST columns): used for book_gst and exclusive GST types
  const simpleColumnStyles = {
    0: { halign: 'center', cellWidth: 10 },
    1: { cellWidth: 'auto' },
    2: { halign: 'center', cellWidth: 20 },
    3: { halign: 'center', cellWidth: 18 },
    4: { halign: 'right', cellWidth: 28 },
    5: { halign: 'right', cellWidth: 28 },
  };

  if (gst.isBookGST || isExclusiveGST) {
    // Book GST = 0% tax. Exclusive = GST totals shown in summary only (not per item).
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount']];
    columnStyles = simpleColumnStyles;
    tableBody = useGradeRows
      ? gradeRows.map(r => [String(r.idx + 1), r.desc, HSN_SAC, String(r.students), formatINR(r.scaledRate), formatINR(r.rowBase)])
      : [['1', fallback.desc, HSN_SAC, fallback.qtyStr, fallback.rateStr, formatINR(gst.baseAmount)]];

  } else if (gst.isIntraState) {
    // Inclusive intra-state: show CGST/SGST breakdown per line item
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'CGST %', 'CGST Amt', 'SGST %', 'SGST Amt', 'Amount']];
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
    tableBody = useGradeRows
      ? gradeRows.map(r => [
          String(r.idx + 1), r.desc, HSN_SAC, String(r.students), formatINR(r.scaledRate),
          `${gst.cgstRate}%`, formatINR(r.rowCGST),
          `${gst.sgstRate}%`, formatINR(r.rowSGST),
          formatINR(r.rowBase),
        ])
      : [['1', fallback.desc, HSN_SAC, fallback.qtyStr, fallback.rateStr,
          `${gst.cgstRate}%`, formatINR(gst.cgstAmount),
          `${gst.sgstRate}%`, formatINR(gst.sgstAmount),
          formatINR(gst.baseAmount)]];

  } else {
    // Inter-state: show IGST breakdown per line item (only for inclusive; exclusive handled above)
    tableHeaders = [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'IGST %', 'IGST Amt', 'Amount']];
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
    tableBody = useGradeRows
      ? gradeRows.map(r => [
          String(r.idx + 1), r.desc, HSN_SAC, String(r.students), formatINR(r.scaledRate),
          `${gst.igstRate}%`, formatINR(r.rowIGST),
          formatINR(r.rowBase),
        ])
      : [['1', fallback.desc, HSN_SAC, fallback.qtyStr, fallback.rateStr,
          `${gst.igstRate}%`, formatINR(gst.igstAmount),
          formatINR(gst.baseAmount)]];
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
  // Balance Due: 0 if fully paid, remaining if partial, full amount otherwise
  const paidAmount = payment.status === 'paid'
    ? gst.totalWithGST  // fully paid → balance = 0
    : Number(payment.paid_amount || 0);
  const balanceDue = Math.max(0, gst.totalWithGST - paidAmount);

  if (paidAmount > 0 && payment.status !== 'paid') {
    addTotalRow('Amount Paid', `Rs. ${formatINR(paidAmount)}`, false);
  }
  if (payment.status === 'paid') {
    addTotalRow('Amount Paid', `Rs. ${formatINR(gst.totalWithGST)}`, false);
  }
  addTotalRow('Balance Due', `Rs. ${formatINR(balanceDue)}`, true);
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
  const terms = isDistributor ? [
    `All Payment has to be made in the name of '${SELLER.name}'`,
    SELLER.gstin ? `GSTIN: ${SELLER.gstin}` : '',
    SELLER.address ? `Address: ${SELLER.address}` : '',
  ].filter(Boolean) : [
    `All Payment has to be made in the name of '${COMPANY.name}'`,
    `Company CINO : ${COMPANY.cin}`,
    `Company PAN No. ${COMPANY.pan}`,
    `Bank: ${COMPANY.bank}, Branch: ${COMPANY.branch}`,
    `A/C No. ${COMPANY.accountNo}, IFSC Code: ${COMPANY.ifsc}`,
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
  doc.text(`For ${SELLER.name}`, signX, y + 3);

  if (signImg) {
    doc.addImage(signImg, 'JPEG', signX + 5, y + 5, 30, 15);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Shreyaan Daga', signX + 10, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signatory', signX + 6, y + 27);

  // ─── Save & return ───
  const fileName = `Invoice_${schoolName.replace(/\s+/g, '_')}_${invoiceNo.replace('/', '_')}.pdf`;
  if (!skipDownload) doc.save(fileName);
  // Return invoice number + base64 so the caller can persist it
  return { invoiceNo, fileName, base64: doc.output('datauristring').split(',')[1] };
}
