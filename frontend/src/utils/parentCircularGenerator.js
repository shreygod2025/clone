import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import axios from 'axios';

/**
 * Generates, downloads, uploads and saves a Parent Circular DOCX for a school.
 * @param {object} school - The school inquiry object
 * @param {object} data   - The onboarding data
 * @param {object} ctx    - Context: { API, getAuthHeaders, user, toast, fetchInquiries, setData }
 */
export async function generateParentCircularDocument(school, data, { API, getAuthHeaders, user, toast, fetchInquiries, setData }) {
    // Dynamic import of docx library to avoid webpack initialization issues
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ExternalHyperlink, TableLayoutType } = docx;

    const schoolName = school?.school_name || school?.name || 'School';
    const academicYear = data.contract_start ? format(new Date(data.contract_start), 'yyyy') + '-' + (parseInt(format(new Date(data.contract_start), 'yy')) + 1).toString().padStart(2, '0') : '2026-27';

    // Get grade range from grade_pricing
    const enteredGrades = (data.grade_pricing || []).filter(gp => gp.grade && gp.price_per_student);
    const gradeOrder = ['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    let gradeRangeText = '';
    if (enteredGrades.length > 0) {
      const sortedGrades = enteredGrades.map(g => g.grade).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
      gradeRangeText = sortedGrades.length > 1 ? `${sortedGrades[0]} to ${sortedGrades[sortedGrades.length - 1]}` : sortedGrades[0];
    }

    // Payment link
    const paymentLink = data.payment_link || school?.payment_link || `https://oll.co/school-pay/${school?.id || 'demo'}`;

    // Generate QR code as base64 image
    let qrImageData = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(paymentLink, {
        width: 150, margin: 1, color: { dark: '#1e3a5f', light: '#ffffff' },
      });
      qrImageData = qrDataUrl.split(',')[1];
    } catch (qrErr) {
      console.error('QR Code generation failed:', qrErr);
    }

    // Build fee table rows
    let feeTableRows = [];
    if (enteredGrades.length > 0) {
      feeTableRows = enteredGrades.map(gp =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: gp.grade, size: 22 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, size: 22 })], alignment: AlignmentType.CENTER })] }),
          ],
        })
      );
    } else if (data.pricing_type === 'fixed' && data.fixed_price) {
      feeTableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'All Grades', size: 22 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Rs. ${Number(data.fixed_price).toLocaleString('en-IN')}`, size: 22 })], alignment: AlignmentType.CENTER })] }),
          ],
        }),
      ];
    } else {
      feeTableRows = [
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1st to 4th', size: 22 })], alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rs. ________', size: 22 })], alignment: AlignmentType.CENTER })] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '5th to 8th', size: 22 })], alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rs. ________', size: 22 })], alignment: AlignmentType.CENTER })] })] }),
      ];
    }

    // Create document sections
    const docSections = [
      new Paragraph({ children: [new TextRun({ text: schoolName, bold: true, size: 36, color: '1E3A5F' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: `Robotics & A.I. for Academic Year ${academicYear}`, bold: true, size: 32, color: '1E3A5F' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
      new Paragraph({ children: [new TextRun({ text: 'Dear Parents,', bold: true, size: 24 })], spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: `As per the release of NEP 2020, Our school will introduce the Robotics & A.I. Program as a subject from next academic year. We are thrilled to announce our partnership with OLL, to train all our students of Classes from ${gradeRangeText || '_____ to _____'} grade in the field of Robotics & AI so that our children will have an upper hand in the future work industry. OLL is a skill partner with over 400+ Schools across India.`, size: 22 })], spacing: { after: 300 } }),
      new Paragraph({ children: [new TextRun({ text: 'Program Deliverables', bold: true, size: 26, color: '1E3A5F' })], spacing: { before: 200, after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: '1. Take home Robotic Kit: ', bold: true, size: 22 }), new TextRun({ text: 'Every child gets their own Robotics Kit', size: 22 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: '2. Duration: ', bold: true, size: 22 }), new TextRun({ text: 'Year long - Once a Week, Offline in the school during school hours.', size: 22 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: '3. Assessment & Certification: ', bold: true, size: 22 }), new TextRun({ text: 'will be conducted by the expert from OLL. International Accredited Certificates by STEM.org will be provided after assessment', size: 22 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: '4. Tech Exhibition: ', bold: true, size: 22 }), new TextRun({ text: 'Parents will be invited to an exhibition where our students will proudly showcase their innovative robotics projects.', size: 22 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: '5. 16 Projects: ', bold: true, size: 22 }), new TextRun({ text: 'will be made from that kit', size: 22 })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: '6. Hard Copy Robotics & AI Books: ', bold: true, size: 22 }), new TextRun({ text: 'will be provided (Step by Step manual + videos, and PDFs)', size: 22 })], spacing: { after: 300 } }),
      new Paragraph({ children: [new TextRun({ text: 'Following are the Fees for the Robotics Program', bold: true, size: 26, color: '1E3A5F' })], spacing: { before: 200, after: 200 } }),
      new Table({
        layout: TableLayoutType.FIXED, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [4000, 4000],
        rows: [
          new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Grade', bold: true, size: 22, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: '1E3A5F' }, verticalAlign: 'center' }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fee per Student', bold: true, size: 22, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: '1E3A5F' }, verticalAlign: 'center' })] }),
          ...feeTableRows,
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: `For Grades ${gradeRangeText || '1st to 8th'} Payment Link:`, bold: true, size: 24, color: '1E3A5F' })], spacing: { before: 300, after: 100 } }),
      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun({ text: paymentLink, color: '0066CC', underline: {}, size: 22 })], link: paymentLink })], spacing: { after: 200 } }),
    ];

    // Add QR code if generated
    if (qrImageData) {
      docSections.push(
        new Paragraph({ children: [new TextRun({ text: 'Scan QR Code to Pay:', size: 22 })], spacing: { before: 100, after: 100 } }),
        new Paragraph({ children: [new ImageRun({ data: Uint8Array.from(atob(qrImageData), c => c.charCodeAt(0)), transformation: { width: 100, height: 100 }, type: 'png' })], spacing: { after: 200 } })
      );
    }

    docSections.push(
      new Paragraph({ children: [new TextRun({ text: 'Please Note: ', bold: true, size: 22, color: 'B48200' }), new TextRun({ text: 'Students will receive their kits and books once the Robotics Classes commence in School.', size: 22, color: '664600' })], spacing: { before: 200, after: 300 }, shading: { fill: 'FFF8E1' } }),
      new Paragraph({ children: [new TextRun({ text: `We look forward to a progressive & dynamic year ${academicYear} on the Journey of Upskilling our students!`, size: 22 })], spacing: { after: 300 } }),
      new Paragraph({ children: [new TextRun({ text: 'Regards,', bold: true, size: 24 })], spacing: { after: 50 } }),
      new Paragraph({ children: [new TextRun({ text: 'Principal', bold: true, size: 24 })], spacing: { after: 300 } }),
      new Paragraph({ children: [new TextRun({ text: 'For Queries – Call the OLL Helpline Number - 99201 88188', bold: true, size: 22, color: 'FFFFFF' })], alignment: AlignmentType.CENTER, shading: { fill: '1E3A5F' } })
    );

    const doc = new Document({ sections: [{ properties: {}, children: docSections }] });
    const blob = await Packer.toBlob(doc);
    const fileName = `ParentCircular_${(schoolName).replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.docx`;
    saveAs(blob, fileName);

    // Upload & Store atomically
    try {
      const docFile = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const formData = new FormData();
      formData.append('file', docFile);
      const uploadRes = await axios.post(`${API}/upload`, formData, { headers: getAuthHeaders() });
      const fileUrl = uploadRes.data.url;
      if (setData) setData(prev => ({ ...prev, parent_circular_url: fileUrl }));
      // Atomically append to documents
      await axios.post(`${API}/schools/${school.id}/add-document`, {
        type: 'Parent Circular', url: fileUrl, name: fileName,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || user?.email || 'Admin',
      }, { headers: getAuthHeaders() });
      if (fetchInquiries) fetchInquiries();
      toast.success('Parent Circular generated, downloaded & saved!');
    } catch {
      toast.success('Parent Circular downloaded! (Save to documents failed)');
    }
}
