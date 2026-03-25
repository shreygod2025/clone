import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import axios from 'axios';
import { OLL_LOGO_B64 } from './ollAssets';

/**
 * Generates, downloads, uploads and saves an MOU PDF for a school.
 * @param {object} school - The school inquiry object
 * @param {object} data   - The onboarding data
 * @param {object} ctx    - Context: { API, getAuthHeaders, user, toast, fetchInquiries, setOnboardData, noDownload }
 * @returns {{ base64, filename }} always — caller can use for email attachment
 */
export async function generateMOUDocument(school, data, { API, getAuthHeaders, user, toast, fetchInquiries, setOnboardData, noDownload } = {}) {
  const PW = 210, PH = 297, M = 15;
  const CW = PW - M * 2;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── USE EMBEDDED OLL LOGO (no CORS issues) ─────────────────
  const logoDataUrl = OLL_LOGO_B64;

  // ── HELPERS ────────────────────────────────────────────────
  let y = 0;

  const drawPageHeader = () => {
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, PW, 26, 'F');
    // 1920x1080 = 1.78:1 ratio → at height 20mm: width = 20*1.78 = 35.5mm
    doc.addImage(logoDataUrl, 'PNG', M, 3, 36, 20);
  };

  const drawFooter = (pageNum, total) => {
    doc.setFillColor(30, 58, 95);
    doc.rect(0, PH - 10, PW, 10, 'F');
    doc.setTextColor(180, 200, 235);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Clonefutura Live Solutions Pvt Ltd  |  info@oll.co  |  +91 9920188188  |  www.oll.co', M, PH - 4);
    doc.text(`Page ${pageNum} of ${total}`, PW - M, PH - 4, { align: 'right' });
  };

  const ensureSpace = (needed) => {
    if (y + needed > PH - 15) {
      doc.addPage();
      drawPageHeader();
      y = 31;
    }
  };

  const sectionTitle = (text) => {
    ensureSpace(12);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(text, M, y);
    y += 7;
  };

  const bullet = (text, indent = 4) => {
    const lines = doc.splitTextToSize('• ' + text, CW - indent);
    ensureSpace(lines.length * 5 + 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(lines, M + indent, y);
    y += lines.length * 5 + 1;
  };

  const inlineField = (label, value, indent = 4) => {
    ensureSpace(7);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(`${label}: `, M + indent, y);
    const lw = doc.getTextWidth(`${label}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(value || '________________________________________', M + indent + lw, y);
    y += 6;
  };

  // ── DATA ───────────────────────────────────────────────────
  const schoolName = school?.school_name || school?.name || school?.school || data?._school_name || data?.school_name || '';
  // Debug: log what data is available (remove after confirming fix)
  console.log('[MOU Debug] school object:', JSON.stringify({ school_name: school?.school_name, name: school?.name, id: school?.id }));
  console.log('[MOU Debug] data._school_name:', data?._school_name, '| final schoolName:', schoolName);
  const schoolAddress = data.school_address || school?.location || school?.address || '';
  const contacts = data.school_contacts || [];
  const principal = contacts.find(c => c.role === 'principal') || contacts[0] || {};
  const coordinator = contacts.find(c => ['coordinator', 'program_coordinator', 'teacher'].includes(c.role)) || contacts[1] || {};
  const accountsCoord = contacts.find(c => ['accounts', 'accountant', 'admin'].includes(c.role)) || contacts[2] || {};

  const courseTypeLabel = { only_robotics: 'Only Robotics', robotics_coding_ai: 'Robotics, Coding & AI' };
  const kitTypeLabel = { lab_setup: 'Lab Setup', individual: 'Individual', no_kit: 'No Kit' };
  const trainingLabel = { student_training: 'Student Training', teacher_training: 'Teacher Training', both: 'Teacher & Student Training' };
  const paymentCollectionLabel = { from_school: 'School Collects & Pays OLL', from_student: 'OLL Collects Online', from_distributor: 'Via Distributor', online: 'OLL Collects Online' };
  const paymentMethodLabel = { cheque: 'Cheque', neft: 'Netbanking', online: 'Online Payments', cash: 'Cash' };

  const todayStr = format(new Date(), 'dd MMMM yyyy');

  // ── PAGE 1 HEADER ──────────────────────────────────────────
  drawPageHeader();
  y = 32;

  // MOU Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('MEMORANDUM OF UNDERSTANDING', PW / 2, y, { align: 'center' });
  y += 6;
  // Subtitle with school name
  if (schoolName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 100, 130);
    doc.text(`Between ${schoolName} and Clonefutura Live Solutions Pvt Ltd (OLL)`, PW / 2, y, { align: 'center' });
    y += 5;
  }
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.6);
  doc.line(M, y, PW - M, y);
  y += 8;

  // Introduction
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const introText = `This Memorandum of Understanding (MOU) is entered into on ${todayStr} by and between Clonefutura Live Solutions Pvt Ltd ("OLL") and ${schoolName || '________________________________________'} ("School").`;
  const introLines = doc.splitTextToSize(introText, CW);
  doc.text(introLines, M, y);
  y += introLines.length * 5.5 + 3;

  // Party 1 — dynamic height based on address line count
  const ollAddrText = '103, 1st Floor - Kshitij Building, Veera Desai Rd, Dattaguru Nagar, Azad Nagar, Andheri West, Mumbai, Maharashtra 400053';
  const ollAddrLines = doc.splitTextToSize(ollAddrText, CW - 8);
  const p1H = 6 + 7 + (ollAddrLines.length * 5) + 6 + 4; // padding + name + addr + phone line + bottom
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(M, y, CW, p1H, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('PARTY 1 (Service Provider):', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Clonefutura Live Solutions Pvt Ltd, also referred to as "OLL"', M + 4, y + 13);
  doc.text(ollAddrLines, M + 4, y + 19);
  doc.text('Phone: +91 9920188188  |  GST No: 27AAKCC1113B1ZC', M + 4, y + 19 + ollAddrLines.length * 5 + 2);
  y += p1H + 4;

  // Party 2
  const p2Lines = schoolAddress ? doc.splitTextToSize(`Address: ${schoolAddress}`, CW - 8) : [];
  const p2H = 22 + (p2Lines.length > 1 ? (p2Lines.length - 1) * 5 : 0);
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(M, y, CW, p2H, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('PARTY 2 (School):', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`School Name: ${schoolName || '________________________________________'}`, M + 4, y + 13);
  if (p2Lines.length > 0) doc.text(p2Lines, M + 4, y + 19);
  y += p2H + 6;

  // Terms & Conditions Banner
  ensureSpace(12);
  doc.setFillColor(30, 58, 95);
  doc.rect(M, y, CW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS AND CONDITIONS', M + 4, y + 5.5);
  y += 12;

  // ── SECTION 1: PROGRAM DETAILS ─────────────────────────────
  sectionTitle('1. PROGRAM DETAILS');

  const progFields = [
    ['Course Name', data.offering],
    ['Course Type', courseTypeLabel[data.course_type] || data.course_type],
    ['Model', data.model || 'Compulsory / Optional'],
    ['Kit', kitTypeLabel[data.kit_type] || data.kit_type || 'Individual / Lab Setup'],
    ...(data.kit_type === 'lab_setup' ? [['No. of Lab Kits', String(data.lab_kit_count || '')]] : []),
    ['Mode', 'Offline'],
    ['Type of Training', trainingLabel[data.training_type] || 'Teacher Training / Student Training'],
    ['Assistant Educator Required', 'Yes / No'],
  ];
  progFields.forEach(([lbl, val]) => inlineField(lbl, val));
  y += 3;

  // Timeline
  ensureSpace(35);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Timeline of Program:', M + 4, y);
  y += 6;

  const trainingStart = '_____ / _____ / _____';
  [
    ['Teacher Training Start Date (if teacher training)', trainingStart],
    ['Kit Delivery Date', '_____ / _____ / _____'],
    ['Kit Distribution Date', '_____ / _____ / _____'],
  ].forEach(([lbl, val]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`• ${lbl}: ${val}`, M + 4, y);
    y += 6;
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('* NOTE: The kits will only be delivered 15 days after we receive payment', M + 4, y);
  y += 8;

  // ── SECTION 2: COUNT AND PAYMENT ───────────────────────────
  ensureSpace(15);
  sectionTitle('2. COUNT AND PAYMENT');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  const gradeOrder = ['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const enteredGrades = (data.grade_pricing || []).filter(gp => gp.grade && (gp.students || gp.price_per_student));
  const isExclusiveGST = data.gst_type === 'exclusive_18';
  
  // Helper to add GST rows to table body
  const addGstRows = (body, baseAmt, cols) => {
    if (isExclusiveGST && baseAmt > 0) {
      const gstAmt = Math.round(baseAmt * 0.18);
      const grandTot = baseAmt + gstAmt;
      // GST row
      const gstRow = cols === 2 
        ? [{ content: 'GST @ 18%', styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }, { content: `Rs. ${gstAmt.toLocaleString('en-IN')}`, styles: { fontStyle: 'italic', textColor: [80, 80, 80], halign: 'right' } }]
        : [{ content: 'GST @ 18%', styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }, '', '', { content: `Rs. ${gstAmt.toLocaleString('en-IN')}`, styles: { fontStyle: 'italic', textColor: [80, 80, 80], halign: 'right' } }];
      body.push(gstRow);
      // Grand Total row
      const grandRow = cols === 2
        ? [{ content: 'Grand Total (incl. GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: `Rs. ${grandTot.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }]
        : [{ content: 'Grand Total (incl. GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, '', '', { content: `Rs. ${grandTot.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }];
      body.push(grandRow);
    }
  };

  // ═══ CASE 1: FIXED PRICING - Hide "Student Count" and "Amount per Student" columns ═══
  if (data.pricing_type === 'fixed') {
    doc.text('Below is the fixed program pricing:', M, y);
    y += 5;
    
    const fixedAmt = Number(data.fixed_price || data.total_amount || 0);
    const fixedTableBody = [
      [{ content: 'Fixed Price Package', styles: { fontStyle: 'bold' } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { halign: 'right', fontStyle: 'bold' } }],
    ];
    // Add Subtotal row for GST exclusive
    if (isExclusiveGST) {
      fixedTableBody.push([
        { content: 'Subtotal (before GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
        { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } },
      ]);
    } else {
      fixedTableBody.push([
        { content: 'Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
        { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } },
      ]);
    }
    addGstRows(fixedTableBody, fixedAmt, 2);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Total Amount']],
      body: fixedTableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 5;

  // ═══ CASE 2: BOTH PRICING - Two separate tables ═══
  } else if (data.pricing_type === 'both') {
    // ── Fixed Price Table ──
    doc.text('Fixed Program Fee:', M, y);
    y += 5;
    
    const fixedAmt = Number(data.fixed_price || 0);
    const fixedTableBody = [
      [{ content: 'Fixed Price Component', styles: { fontStyle: 'bold' } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { halign: 'right', fontStyle: 'bold' } }],
      [{ content: 'Subtotal (Fixed)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount']],
      body: fixedTableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── Per-Student Pricing Table ──
    ensureSpace(15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Per-Student Program Fee:', M, y);
    y += 5;

    let perStudentTotal = 0;
    let perStudentTableBody;
    if (enteredGrades.length > 0) {
      perStudentTableBody = enteredGrades.map(gp => {
        if (gp.students && gp.price_per_student) {
          const tot = Number(gp.students) * Number(gp.price_per_student);
          perStudentTotal += tot;
          return [gp.grade, String(gp.students), `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, `Rs. ${tot.toLocaleString('en-IN')}`];
        }
        return [gp.grade, String(gp.students || ''), gp.price_per_student ? `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}` : '', ''];
      });
    } else {
      // Empty grade_pricing: show blank table Jr. KG to 10th
      perStudentTableBody = gradeOrder.map(grade => [grade, '', '', '']);
    }
    
    if (data.training_type === 'teacher_training' || data.training_type === 'both') {
      perStudentTableBody.push(['No. of Teachers', '', '', '']);
    }
    perStudentTableBody.push([
      { content: 'Subtotal (Per-Student)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
      { content: String(data.total_students || ''), styles: { fontStyle: 'bold' } },
      '',
      { content: perStudentTotal ? `Rs. ${perStudentTotal.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Grade', 'No. of Students', 'Price / Student', 'Total Amount']],
      body: perStudentTableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 38, halign: 'center' }, 2: { cellWidth: 57, halign: 'right' }, 3: { cellWidth: 57, halign: 'right' } },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── Combined Total Table ──
    ensureSpace(15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Combined Total:', M, y);
    y += 5;
    
    const combinedBase = fixedAmt + perStudentTotal;
    const combinedTableBody = [
      ['Fixed Component', fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : ''],
      ['Per-Student Component', perStudentTotal ? `Rs. ${perStudentTotal.toLocaleString('en-IN')}` : ''],
      [{ content: isExclusiveGST ? 'Subtotal (before GST)' : 'Grand Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: combinedBase ? `Rs. ${combinedBase.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }],
    ];
    addGstRows(combinedTableBody, combinedBase, 2);

    autoTable(doc, {
      startY: y,
      head: [['Component', 'Amount']],
      body: combinedTableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 5;

  // ═══ CASE 3: PER-STUDENT PRICING (default) ═══
  } else {
    doc.text('Below is the table outlining the count and program pricing per student:', M, y);
    y += 5;

    let tableTotal = 0;
    let gradeTableBody;
    
    if (enteredGrades.length > 0) {
      // Show entered grades with their data
      gradeTableBody = enteredGrades.map(gp => {
        if (gp.students && gp.price_per_student) {
          const tot = Number(gp.students) * Number(gp.price_per_student);
          tableTotal += tot;
          return [gp.grade, String(gp.students), `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, `Rs. ${tot.toLocaleString('en-IN')}`];
        }
        return [gp.grade, String(gp.students || ''), gp.price_per_student ? `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}` : '', ''];
      });
    } else {
      // Empty grade_pricing: render blank table from Jr. KG to 10th
      gradeTableBody = gradeOrder.map(grade => [grade, '', '', '']);
    }

    if (data.training_type === 'teacher_training' || data.training_type === 'both') {
      gradeTableBody.push(['No. of Teachers', '', '', '']);
    }
    
    const baseAmt = tableTotal > 0 ? tableTotal : Number(data.total_amount || 0);
    const baseAmtDisp = baseAmt ? `Rs. ${baseAmt.toLocaleString('en-IN')}` : '';
    
    gradeTableBody.push([
      { content: isExclusiveGST ? 'Subtotal (before GST)' : 'Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
      { content: String(data.total_students || ''), styles: { fontStyle: 'bold' } },
      '',
      { content: baseAmtDisp, styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
    ]);
    addGstRows(gradeTableBody, baseAmt, 4);

    autoTable(doc, {
      startY: y,
      head: [['Grade', 'No. of Students', 'Price / Student', 'Total Amount']],
      body: gradeTableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 38, halign: 'center' }, 2: { cellWidth: 57, halign: 'right' }, 3: { cellWidth: 57, halign: 'right' } },
      margin: { left: M, right: M },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('* NOTE: In case of change in count it will take us additional 15 days to deliver the material', M, y);
  y += 7;

  // Requirements
  ensureSpace(25);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Requirements:', M, y);
  y += 5;
  ['Room with basic infrastructure provided with table & chairs and storage space for the Robotic kits',
    'WiFi / internet stability',
    'Projector / Smart Board',
  ].forEach(r => bullet(r));
  y += 3;

  // Additional Services Table — only show if entries exist
  const validServices = (data.additional_services || []).filter(s => s.item || s.qty || s.price);
  if (validServices.length > 0) {
    ensureSpace(38);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Additional Services / Components:', M, y);
    y += 4;
    const servicesBody = validServices.map(s => [
      s.item || '',
      String(s.qty || ''),
      s.price ? `Rs. ${Number(s.price).toLocaleString('en-IN')}` : '',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Price']],
      body: servicesBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' } },
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Payment Collection
  ensureSpace(22);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Payment Collection:', M, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Collection From: ${paymentCollectionLabel[data.payment_mode] || '________________________'}`, M + 4, y);
  y += 6;
  doc.text(`Payment Mode: ${paymentMethodLabel[data.payment_method] || '________________________'}`, M + 4, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Notes for Payment: ', M + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Program Fees to be paid 100% in advance.', M + 4 + doc.getTextWidth('Notes for Payment: '), y);
  y += 7;

  // Payment Terms Table
  ensureSpace(30);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Payment Terms:', M, y);
  y += 4;

  const validTranches = (data.payment_tranches || []).filter(t => t.amount);
  const trancheRows = validTranches.length > 0
    ? validTranches.map(t => [
        `Rs. ${Number(t.amount).toLocaleString('en-IN')}`,
        t.percentage ? `${t.percentage}%` : '100%',
        t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '________________________',
      ])
    : [['________________________', '100%', '________________________']];

  autoTable(doc, {
    startY: y,
    head: [['Amount', 'Payment %', 'Due Date']],
    body: trancheRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 70 } },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 6;

  // GST info - just show the GST type (calculations are in tables)
  const gstLabels = { inclusive_18: 'GST Inclusive @ 18%', exclusive_18: 'GST Exclusive @ 18%', book_gst_0: 'Book GST = 0%' };
  if (data.gst_type) {
    ensureSpace(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('GST: ', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(gstLabels[data.gst_type] || data.gst_type, M + doc.getTextWidth('GST: '), y);
    y += 6;
  }

  // Bank Details
  ensureSpace(30);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Bank Details for Payment:', M, y);
  y += 5;
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(M, y, CW, 24, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Account No: 50200063789133', M + 4, y + 6);
  doc.text('IFSC Code: HDFC0000240', M + 4, y + 12);
  doc.text('Bank: HDFC Bank  |  Branch: Sandoz House Worli', M + 4, y + 18);
  doc.text('Account Holder: Clonefutura Live Solutions Pvt Ltd', M + CW/2, y + 6);
  doc.text('GST No: 27AAKCC1113B1ZC', M + CW/2, y + 12);
  y += 30;

  // ── SECTION 3 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('3. PROGRAM EXECUTION & DELIVERABLES');
  const kitDeliverableLine = data.kit_type === 'lab_setup'
    ? `${data.lab_kit_count ? data.lab_kit_count + ' Lab Kit(s)' : 'Lab Kits'} will be supplied.`
    : data.kit_type === 'individual'
    ? 'Individual kits will be provided to each student.'
    : null;
  [
    'OLL will require a dedicated coordinator who will be the point of contact for the program\'s execution at the school level.',
    'Grade-specific individual textbooks will be provided.',
    ...(kitDeliverableLine ? [kitDeliverableLine] : []),
    '16 projects-based curriculum will be delivered.',
    'Teacher training will be provided.',
    'STEM certificates will be awarded to each participating child.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 4 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('4. KIT & BOOK MANAGEMENT');
  [
    'OLL will deliver the required kits and books to the school within 15 days of receiving full payment.',
    'The school is responsible for informing security and arranging proper storage for the kits and books upon arrival.',
    'The school is also required to verify the count of kits and books as per the delivery provided by OLL to ensure accuracy.',
    'Free Replacement for Damaged Components: In the event that any kit components are found to be damaged or defective, OLL will provide a free replacement for such components for the full duration of the program.',
    'Replacement for Lost Components & Books: If students misplace or lose components, they are required to purchase replacements either from the OLL website or directly from the educator. Misplaced components are not covered under the free replacement policy.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 5 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('5. EDUCATOR CONFIRMATION & TRAINING SCHEDULE');
  [
    'The school will provide OLL with the final timetable and holiday calendar of the school.',
    'OLL will take 15 days from receiving the timetable and calendar to allocate a certified educator for the program.',
    'Once allocated, the school will have the opportunity to approve the educator and provide feedback. If satisfied, OLL will move forward with the training sessions.',
    'In case the school wishes to request a change of the educator for valid reasons, OLL will evaluate the request and, if accepted, will take 15 days to allocate a new educator.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 6 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('6. REPORTS');
  bullet('OLL will collect physical/digital feedback forms from students and teachers once every three months. OLL will analyze these and share the report with the school.');
  y += 3;

  // ── SECTION 7 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('7. ASSESSMENT & AUDIT');
  [
    'OLL will conduct periodic on-site audits of educators to ensure quality and consistency in the delivery of the program.',
    'Students will undergo assessments at the end of the year that will include both theoretical and practical components to gauge their understanding and progress.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 8 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('8. DISPLAY');
  [
    'School is requested to inform the OLL team about all parent orientations and Parent Teacher Meetings. OLL will have representatives and projects showcased on a table.',
    'Students will prepare projects to showcase during a final exhibition, where parents will be invited to observe the students\' work.',
    'One final video will be professionally shot by OLL; school to give permission to shoot on a mutually agreed upon date.',
    'All videos and photos clicked by OLL/School team are permissible to be uploaded on social media platforms.',
    'For Competitions: In certain cases, students may need to arrange additional components for their projects. Our team will guide where to purchase from and even support students, including offering components for rent with a minimal deposit.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 9 ──────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('9. CERTIFICATION');
  [
    'Upon completion of the program, a graduation ceremony will be held where students will receive OLL certifications.',
    'Students list of First Name, Last Name, Grade and Division will be shared with OLL to make the certificates.',
    'A final compilation report summarizing each student\'s performance will also be provided to the school.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 10 ─────────────────────────────────────────────
  ensureSpace(12);
  sectionTitle('10. TERM OF AGREEMENT');

  const cStartDisplay = data.contract_start ? format(new Date(data.contract_start), 'dd MMMM yyyy') : '________________________';
  const cEndDisplay = data.contract_end ? format(new Date(data.contract_end), 'dd MMMM yyyy') : '________________________';

  [
    `This MoU will remain in effect from ${cStartDisplay} to ${cEndDisplay} (one academic year).`,
    'Either party may terminate the agreement with 30 days\' written notice if either party fails to meet their obligations.',
    'Renewal of the agreement for the following year will be based on mutual consent and performance evaluation.',
  ].forEach(item => bullet(item));
  y += 3;

  // ── SECTION 11: CONTACT DETAILS ────────────────────────────
  ensureSpace(12);
  sectionTitle('11. CONTACT DETAILS');

  const renderContact = (title, c, fallbackName, fallbackPhone, fallbackEmail) => {
    ensureSpace(30);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(title, M, y);
    y += 6;
    [
      ['Name', c?.name || fallbackName || ''],
      ['Mobile', c?.phone_number || fallbackPhone || ''],
      ['E-mail', c?.email || fallbackEmail || ''],
    ].forEach(([lbl, val]) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`${lbl}: ${val || '________________________________________________________'}`, M + 4, y);
      y += 6;
    });
    y += 3;
  };

  renderContact(
    'Program Coordinator Details (From School):',
    coordinator.name ? coordinator : principal,
    school?.contact_name, school?.phone, school?.email
  );
  renderContact('Accounts Coordinator Details (From School):', accountsCoord);
  renderContact(
    'School Principal Details (From School):',
    principal,
    school?.contact_name, school?.phone, school?.email
  );

  // ── AUTHORIZED SIGNATORIES ─────────────────────────────────
  ensureSpace(65);
  doc.setDrawColor(200, 215, 235);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 7;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('AUTHORIZED SIGNATORIES', M, y);
  y += 8;

  const sigW = (CW - 10) / 2;
  const sigH = 55;

  // OLL sig box
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(M, y, sigW, sigH, 2, 2, 'F');
  doc.setDrawColor(160, 185, 215);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, sigW, sigH, 2, 2);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('OLL Representative', M + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Name: Vidushi Daga', M + 4, y + 15);
  doc.text('Designation: Chairman', M + 4, y + 21);
  doc.text('Signature:', M + 4, y + 32);
  doc.setDrawColor(120, 140, 170);
  doc.line(M + 32, y + 32, M + sigW - 4, y + 32);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Date: _______________________', M + 4, y + 48);

  // School sig box
  const rx = M + sigW + 10;
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(rx, y, sigW, sigH, 2, 2, 'F');
  doc.roundedRect(rx, y, sigW, sigH, 2, 2);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('School Representative', rx + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Name: ${principal?.name || school?.contact_name || '________________________'}`, rx + 4, y + 15);
  doc.text(`Designation: ${principal?.role || '________________________'}`, rx + 4, y + 21);
  doc.text('Signature:', rx + 4, y + 32);
  doc.setDrawColor(120, 140, 170);
  doc.line(rx + 32, y + 32, rx + sigW - 4, y + 32);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Date: _______________________', rx + 4, y + 48);

  y += sigH + 5;

  // ── FOOTER ON ALL PAGES ────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // ── DOWNLOAD ───────────────────────────────────────────────
  const fileName = `MOU_${(schoolName || 'School').replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.pdf`;
  const pdfBase64 = doc.output('datauristring').split(',')[1];

  if (!noDownload) {
    doc.save(fileName);
  }

  // ── UPLOAD & STORE IN DOCUMENTS ───────────────────────────
  if (!noDownload) {
    try {
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', pdfFile);
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        headers: getAuthHeaders(),
      });
      const fileUrl = uploadRes.data.url;
      if (!fileUrl) throw new Error('Upload returned no URL');

      // Atomically append to documents (avoids stale state overwrite)
      await axios.post(`${API}/schools/${school.id}/add-document`, {
        type: 'MOU',
        url: fileUrl,
        name: fileName,
      }, { headers: getAuthHeaders() });
      if (setOnboardData) setOnboardData(prev => ({ ...prev, mou_url: fileUrl }));
      if (fetchInquiries) fetchInquiries();
      if (toast) toast.success('MOU generated and saved!');
    } catch (uploadErr) {
      console.error('MOU upload/save error:', uploadErr);
      if (toast) toast.error('Failed to save MOU: ' + (uploadErr.response?.data?.detail || uploadErr.message));
    }
  }

  return { base64: pdfBase64, filename: fileName };
}
