import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import axios from 'axios';
import { OLL_LOGO_B64, OLL_LOGO_HORIZONTAL } from './ollAssets';

/**
 * Generates, downloads, uploads and saves a Proposal PDF for a school.
 * @param {object} school - The school inquiry object
 * @param {object} data   - The proposal/onboarding data
 * @param {object} ctx    - Context: { API, getAuthHeaders, user, toast, fetchInquiries, setLastProposalPDF }
 */
export async function generateProposalDocument(school, data, { API, getAuthHeaders, user, toast, fetchInquiries, setLastProposalPDF }) {
  const PW = 210, PH = 297, M = 15;
  const CW = PW - M * 2;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const schoolName = school?.school_name || school?.name || 'School';

  let y = 12;

  const addBulletPoint = (text, xOffset = 8) => {
    doc.setFillColor(30, 58, 95);
    doc.circle(M + 3, y - 1.5, 1.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, CW - xOffset - 4);
    lines.forEach((line) => { doc.text(line, M + xOffset, y); y += 5; });
    y += 1;
  };

  // ── BLUE HEADER BAND WITH WHITE LOGO ────────────────────────
  const HEADER_HEIGHT = 32;
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, PW, HEADER_HEIGHT, 'F');
  try {
    doc.addImage(OLL_LOGO_B64, 'PNG', M, 4, 45, 24);
  } catch {
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); doc.text('OLL', M + 10, 20);
  }
  y = HEADER_HEIGHT + 10;

  // ── TITLE ────────────────────────────────────────────────────
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('OLL Robotics and AI Program Proposal', PW / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`For ${schoolName}`, PW / 2, y, { align: 'center' });
  y += 10;

  // ── GREETING ──────────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
  doc.text(`Dear ${schoolName} Team,`, M, y);
  doc.setFont('helvetica', 'normal'); y += 6;
  doc.text('Greetings from Team OLL', M, y); y += 10;

  // ── INTRODUCTION ─────────────────────────────────────────────
  doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  const grades = (data?.grade_pricing || []).map(g => parseInt(g.grade)).filter(g => !isNaN(g)).sort((a, b) => a - b);
  const gradeRange = grades.length > 0 ? `Grades ${grades[0]} to ${grades[grades.length - 1]}` : 'Grades 1 to 10';
  const introText = `We are delighted to share our OLL's Robotics & AI Lab Setup for the upcoming academic year for your school. Designed for students from ${gradeRange}, this program has already been successfully implemented in 400+ schools across India, with remarkable achievements.`;
  const introLines = doc.splitTextToSize(introText, CW);
  introLines.forEach((line, idx) => { doc.text(line, M, y + (idx * 7)); });
  y += introLines.length * 7 + 8;

  // ── PROGRAM DETAILS BOX ───────────────────────────────────
  doc.setFillColor(245, 245, 245); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CW, 26, 2, 2, 'FD');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
  const courseTypeDisplay = data.course_type === 'robotics_coding_ai' ? 'Robotics, Coding & AI' : 'Robotics & AI';
  doc.text(`Program: ${courseTypeDisplay}`, M + 8, y + 8);
  const modelDisplay = data.model === 'optional' ? 'Optional' : 'Compulsory';
  doc.text(`Model: ${modelDisplay}`, M + 100, y + 8);
  const trainingDisplay = data.training_type === 'teacher_training' ? 'Teacher Training' : data.training_type === 'student_training' ? 'Student Training' : 'Both';
  doc.text(`Type of Training: ${trainingDisplay}`, M + 8, y + 15);
  doc.text(`Grades: ${data.grades_from || '1st'} to ${data.grades_to || '8th'}`, M + 8, y + 22);
  y += 32;

  // ── PROGRAM DELIVERABLES ─────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
  doc.text('Program Deliverables', M, y); y += 8;
  doc.setFontSize(10); doc.setTextColor(0, 0, 0);

  const deliverables = [];
  if (data.program_type === 'lab_setup') {
    deliverables.push(`${data.lab_kit_count || 30} Master Robotics & AI Lab Kits will be provided to the school. Kit to Child ratio: ${data.kit_ratio || '1:2'}`);
    deliverables.push('Lab Wallpapers & Decoration material will be provided');
  }
  if (data.program_type === 'per_student') {
    deliverables.push('Individual Robotics & AI Kit will be provided to each student');
  }
  deliverables.push('28 Projects Based Curriculum covering: Robotics, Coding, 3D Design, AI, Science');
  if (data.training_type === 'teacher_training') {
    deliverables.push('Year Long Teacher Training will be provided to the School Teachers');
    deliverables.push('One Hardcopy Robotics Manual per Grade will be provided to the Teachers');
  } else if (data.training_type === 'student_training') {
    deliverables.push('Direct Student Training sessions will be conducted by OLL trainers');
  } else if (data.training_type === 'both') {
    deliverables.push('Year Long Teacher Training will be provided to the School Teachers');
    deliverables.push('Direct Student Training sessions will also be conducted by OLL trainers');
    deliverables.push('One Hardcopy Robotics Manual per Grade will be provided to the Teachers');
  }
  deliverables.push('Each child gets LMS Access - Tracking progress, Monitoring Assessment & Soft copy STEM Certificate');
  deliverables.push('Robotics Competition & Robotics Exhibition conducted at the School');
  if (data.book_type === 'individual') {
    deliverables.push('Hardcopy Robotics Take Home Book per child');
  }
  deliverables.forEach((item) => addBulletPoint(item));
  y += 4;

  // ── FEES STRUCTURE TABLE ─────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
  doc.text('Fees Structure', M, y); y += 6;

  const pricingType = data.pricing_type || 'per_student';
  let feeRows = [];
  if (pricingType === 'fixed') {
    feeRows.push(['Robotics & AI Program (Annual Fee)', `Rs. ${Number(data.fixed_price || '0').toLocaleString('en-IN')}`]);
  } else if (pricingType === 'both') {
    feeRows.push(['Fixed Annual Program Fee', `Rs. ${Number(data.fixed_price || '0').toLocaleString('en-IN')}`]);
    (data.grade_pricing || []).filter(gp => gp.grade && gp.price_per_student).forEach(gp => {
      feeRows.push([`Grade ${gp.grade} (Per Student)`, `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}/student/year`]);
    });
  } else {
    feeRows = (data.grade_pricing || []).filter(gp => gp.grade && gp.price_per_student).map(gp => [
      `Grade ${gp.grade}`, `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}/student/year`
    ]);
    if (feeRows.length === 0) feeRows.push(['Robotics & AI Program Fees', 'Per student pricing (to be discussed)']);
  }

  autoTable(doc, {
    startY: y, head: [['Structure', 'Fees for Program']], body: feeRows, theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
    margin: { left: M, right: M }, alternateRowStyles: { fillColor: [248, 248, 248] },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── PAGE 2 ───────────────────────────────────────────────────
  doc.addPage(); y = 12;
  try { doc.addImage(OLL_LOGO_HORIZONTAL, 'PNG', M, y, 50, 12); } catch {
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0); doc.text('OLL', M, y + 8);
  }
  y += 22;

  // ── REQUIREMENTS FROM SCHOOL ─────────────────────────────────
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
  doc.text('Requirements from School', M, y); y += 8;
  doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  [
    'Schools need to provide a list of enrolled students (Name, STD & Division), Schedule, school holidays & exam in a specific format for program related communication & Certification purposes.',
    `The program should be opted for a minimum ${data.min_students || 800} students for the altogether chosen grades, as selected by the school for this pricing.`,
    'OLL collects 100% advance Program Fees which can be submitted via NEFT/Cheque to Clone Futura Live Solutions Private Limited.',
  ].forEach((item) => addBulletPoint(item));
  y += 6;

  // ── NEXT STEPS BOX ───────────────────────────────────────────
  doc.setFillColor(248, 248, 248); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);
  const nextStepsText = `Upon finalizing the proposal, we will proceed with signing the Memorandum of Understanding (MoU), which will be shared by OLL.\n\nAfter signing the MoU and completion of the payment process, a minimum of 15 days will be required to commence the teacher training program to ensure proper allocation and verification of resource personnel for quality execution.`;
  const nextStepsLines = doc.splitTextToSize(nextStepsText, CW - 16);
  const boxHeight = nextStepsLines.length * 5 + 12;
  doc.roundedRect(M, y, CW, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  doc.text(nextStepsLines, M + 8, y + 8);
  y += boxHeight + 10;

  // ── CLOSING ──────────────────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
  doc.text('We look forward to your positive response and a fruitful collaboration ahead!', M, y); y += 12;

  // ── CONTACT ──────────────────────────────────────────────────
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  doc.text('For any queries or assistance, feel free to contact our Business Development Team at', M, y); y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('+91 9699188188  |  Team OLL  |  www.oll.co', M, y);

  // ── DOWNLOAD ─────────────────────────────────────────────────
  const fileName = `Proposal_${(schoolName).replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.pdf`;

  // Store base64 for email attachment if setter is provided
  if (setLastProposalPDF) {
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    setLastProposalPDF({ base64: pdfBase64, filename: fileName, schoolId: school.id });
  }

  doc.save(fileName);

  // ── UPLOAD & STORE (atomically) ───────────────────────────────
  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', pdfFile);
    const uploadRes = await axios.post(`${API}/upload`, formData, { headers: getAuthHeaders() });
    const fileUrl = uploadRes.data.url;
    if (fileUrl) {
      await axios.post(`${API}/schools/${school.id}/add-document`, {
        type: 'Proposal', url: fileUrl, name: fileName,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || user?.email || 'Admin',
      }, { headers: getAuthHeaders() });
      if (fetchInquiries) fetchInquiries();
    }
    toast.success('Proposal generated, downloaded & saved!');
  } catch {
    toast.success('Proposal downloaded!');
  }
}
