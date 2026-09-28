/**
 * Team Member Performance Report — PDF generator
 * Generates a nicely-formatted PDF using jsPDF + jspdf-autotable
 * from the /api/team/member-report response payload.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const BRAND = {
  primary:   [37, 99, 235],   // blue-600
  emerald:   [16, 185, 129],  // emerald-500
  slate:     [51, 65, 85],    // slate-700
  slateLite: [241, 245, 249], // slate-100
  amber:     [217, 119, 6],
  rose:      [225, 29, 72],
  muted:     [148, 163, 184], // slate-400
};

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'd MMM'); } catch { return String(v).slice(0, 10); }
};

const cap = (s) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1);

export async function generateTeamMemberReportPDF(payload) {
  const { user, period, breakdown_unit, buckets = [], totals = {}, tasks = {}, queries = {}, crm = {} } = payload || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40; // margin

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 96, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Team Member Performance Report', M, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${cap(period?.type)} · ${period?.label || ''}`, M, 60);
  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), 'd MMM yyyy, HH:mm')} IST`, M, 78);

  // Right-side badge with OLL brand
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('OLL · Live Ops', pageW - M, 40, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Confidential', pageW - M, 55, { align: 'right' });

  // ── Member identity card ─────────────────────────────────────
  let y = 120;
  doc.setDrawColor(...BRAND.slateLite);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, y, pageW - 2 * M, 60, 6, 6, 'FD');
  doc.setTextColor(...BRAND.slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(user?.name || '—', M + 16, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(user?.role_name || 'Team Member', M + 16, y + 38);
  doc.text(`${user?.email || ''}   ${user?.phone ? '· ' + user.phone : ''}`, M + 16, y + 52);
  // Period on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.primary);
  doc.text(`${period?.start} → ${period?.end}`, pageW - M - 16, y + 30, { align: 'right' });

  // ── Summary KPI strip ────────────────────────────────────────
  y += 80;
  const kpis = [
    { label: 'Tasks Assigned',    value: totals.tasks_assigned,   color: BRAND.primary },
    { label: 'Tasks Completed',   value: totals.tasks_completed,  color: BRAND.emerald },
    { label: 'Queries Assigned',  value: totals.queries_assigned, color: BRAND.amber },
    { label: 'Queries Resolved',  value: totals.queries_resolved, color: BRAND.emerald },
    { label: 'Field Visits',      value: totals.field_visits,     color: [8, 145, 178] },  // cyan-700
    { label: 'Calls Connected',   value: totals.calls_connected,  color: BRAND.emerald },
    { label: 'Leads Added',       value: totals.leads_added,      color: BRAND.rose },
    { label: 'Schools Onboarded', value: totals.schools_onboarded, color: [124, 58, 237] },  // violet-600
  ];
  const cardW = (pageW - 2 * M - 3 * 8) / 4;
  const cardH = 46;
  kpis.forEach((k, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const x = M + col * (cardW + 8);
    const yy = y + row * (cardH + 8);
    doc.setFillColor(...k.color);
    doc.setDrawColor(...k.color);
    doc.roundedRect(x, yy, cardW, cardH, 4, 4, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(k.value ?? 0), x + 10, yy + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(k.label.toUpperCase(), x + 10, yy + 38);
  });
  y += cardH * 2 + 8 + 16;

  // ── Time-bucketed breakdown ──────────────────────────────────
  const unitLabel = breakdown_unit === 'day'   ? 'Day-wise'
                  : breakdown_unit === 'week'  ? 'Week-wise'
                  : breakdown_unit === 'month' ? 'Month-wise'
                  : 'Breakdown';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.slate);
  doc.text(`${unitLabel} Breakdown`, M, y);
  y += 6;

  autoTable(doc, {
    startY: y + 4,
    head: [['Period', 'Tasks Assigned', 'Tasks Done', 'Queries In', 'Queries Resolved', 'Field Visits', 'Calls Connected']],
    body: buckets.map(b => [
      b.key,
      b.tasks_assigned || 0,
      b.tasks_completed || 0,
      b.queries_assigned || 0,
      b.queries_resolved || 0,
      b.field_visits || 0,
      b.calls_connected || 0,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: BRAND.slateLite },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 20;

  // ── Tasks assigned during window ─────────────────────────────
  if (y > pageH - 200) { doc.addPage(); y = M; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.slate);
  doc.text(`Tasks Assigned in this Period (${(tasks.assigned || []).length})`, M, y);
  y += 6;
  autoTable(doc, {
    startY: y + 4,
    head: [['Task', 'Project', 'Priority', 'Status', 'Assigned', 'Due']],
    body: (tasks.assigned || []).slice(0, 60).map(t => [
      t.title || '—',
      t.project_name || '—',
      cap(t.priority || 'normal'),
      cap(t.status || '—'),
      fmtDate(t.created_at),
      fmtDate(t.due_date),
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND.slate, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 180 } },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 16;

  // ── Tasks completed ──────────────────────────────────────────
  if (y > pageH - 200) { doc.addPage(); y = M; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.emerald);
  doc.text(`Tasks Completed (${(tasks.completed || []).length})`, M, y);
  y += 6;
  autoTable(doc, {
    startY: y + 4,
    head: [['Task', 'Project', 'Priority', 'Completed On']],
    body: (tasks.completed || []).slice(0, 60).map(t => [
      t.title || '—',
      t.project_name || '—',
      cap(t.priority || 'normal'),
      fmtDate(t.completed_at),
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND.emerald, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 220 } },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 16;

  // ── Support queries assigned ─────────────────────────────────
  if ((queries.assigned || []).length > 0) {
    if (y > pageH - 200) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.amber);
    doc.text(`Support Queries Assigned (${(queries.assigned || []).length})`, M, y);
    y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [['#', 'Category', 'From', 'Priority', 'Status', 'Created', 'Resolved']],
      body: (queries.assigned || []).slice(0, 80).map(q => [
        q.ticket_number || '—',
        [q.main_category, q.category, q.sub_category].filter(Boolean).join(' · ') || '—',
        q.name || q.email || '—',
        cap(q.priority || 'normal'),
        cap(q.status || '—'),
        fmtDate(q.created_at),
        fmtDate(q.resolved_at),
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND.amber, textColor: 255, fontStyle: 'bold' },
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── CRM roll-up ──────────────────────────────────────────────
  if (y > pageH - 100) { doc.addPage(); y = M; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.rose);
  doc.text('CRM Highlights', M, y);
  autoTable(doc, {
    startY: y + 6,
    head: [['Metric', 'Value']],
    body: [
      ['School Leads Added',   crm.leads_added ?? 0],
      ['Schools Onboarded',    crm.schools_onboarded ?? 0],
      ['Student Leads Added',  crm.student_leads ?? 0],
      ['Field Visits · Total', totals.field_visits ?? 0],
      ['Field Entries Gained', totals.field_entries ?? 0],
      ['Field Interested Leads', totals.field_leads ?? 0],
      ['Distance Travelled (km)', totals.field_km ?? 0],
      ['Calls Made',           totals.calls_made ?? 0],
      ['Calls Connected',      totals.calls_connected ?? 0],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND.rose, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 }, 1: { halign: 'right' } },
    margin: { left: M, right: M },
  });

  // ── Footer on every page ─────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Page ${i} of ${total}`, pageW - M, pageH - 18, { align: 'right' });
    doc.text('© OLL Learn Pvt Ltd — Auto-generated report', M, pageH - 18);
  }

  // ── Save ─────────────────────────────────────────────────────
  const safeName = (user?.name || 'member').replace(/[^\w]+/g, '_');
  doc.save(`OLL_${cap(period?.type)}_Report_${safeName}_${period?.start}.pdf`);
}
