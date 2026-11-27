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
  const { user, period, breakdown_unit, buckets = [], totals = {}, tasks = {}, queries = {}, crm = {}, role_kpis = [], projects = {} } = payload || {};
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

  // ── Summary KPI strip — ROLE-BASED (falls back to activity totals) ──
  y += 80;

  const fmtVal = (v, unit) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return String(v ?? '0');
    const n = Number(v);
    if (unit === '₹') return `₹${Math.round(n).toLocaleString('en-IN')}`;
    if (unit === '%') return `${(Math.round(n * 10) / 10)}%`;
    if (unit === 'hours') return `${(Math.round(n * 10) / 10)}h`;
    return Number.isInteger(n) ? n.toLocaleString('en-IN') : (Math.round(n * 10) / 10).toLocaleString('en-IN');
  };

  const palette = [
    BRAND.primary, BRAND.emerald, BRAND.amber, [8, 145, 178],   // cyan
    [124, 58, 237], BRAND.rose, [5, 150, 105], [249, 115, 22],   // orange
    [14, 165, 233], [217, 70, 239], [16, 185, 129], [37, 99, 235],
  ];

  const kpisToShow = (role_kpis && role_kpis.length > 0)
    ? role_kpis.map((k, idx) => ({
        label: k.name || k.id || 'KPI',
        value: fmtVal(k.total, k.unit),
        sub:   k.target ? `Target: ${fmtVal(k.target, k.unit)}` : (k.category || ''),
        color: palette[idx % palette.length],
      }))
    : [
        { label: 'Tasks Assigned',    value: fmtVal(totals.tasks_assigned),   color: BRAND.primary },
        { label: 'Tasks Completed',   value: fmtVal(totals.tasks_completed),  color: BRAND.emerald },
        { label: 'Queries Assigned',  value: fmtVal(totals.queries_assigned), color: BRAND.amber },
        { label: 'Queries Resolved',  value: fmtVal(totals.queries_resolved), color: BRAND.emerald },
        { label: 'Calls Made',        value: fmtVal(totals.calls_made),       color: BRAND.primary },
        { label: 'Calls Connected',   value: fmtVal(totals.calls_connected),  color: BRAND.emerald },
        { label: 'Field Visits',      value: fmtVal(totals.field_visits),     color: [8, 145, 178] },
        { label: 'Schools Onboarded', value: fmtVal(totals.schools_onboarded), color: [124, 58, 237] },
      ];

  // Section heading — only if we're rendering role-based KPIs
  if (role_kpis && role_kpis.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.slate);
    doc.text(`KPIs assigned to ${user?.role_name || 'this role'}  (${role_kpis.length})`, M, y);
    y += 12;
  }

  const cardW = (pageW - 2 * M - 3 * 8) / 4;
  const cardH = role_kpis && role_kpis.length > 0 ? 56 : 46;   // taller when we show sub-line
  const rowCount = Math.ceil(kpisToShow.length / 4);
  kpisToShow.forEach((k, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const x = M + col * (cardW + 8);
    const yy = y + row * (cardH + 8);
    doc.setFillColor(...k.color);
    doc.setDrawColor(...k.color);
    doc.roundedRect(x, yy, cardW, cardH, 4, 4, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(String(k.value ?? 0), x + 10, yy + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const lbl = k.label.length > 30 ? `${k.label.slice(0, 30)}…` : k.label;
    doc.text(lbl.toUpperCase(), x + 10, yy + 38);
    if (k.sub) {
      doc.setFontSize(6.5);
      const sub = k.sub.length > 34 ? `${k.sub.slice(0, 34)}…` : k.sub;
      doc.text(sub, x + 10, yy + 50);
    }
  });
  y += cardH * rowCount + 8 * (rowCount - 1) + 16;

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
    head: [['Period', 'Tasks Assigned', 'Tasks Done', 'Queries In', 'Queries Resolved', 'Field Visits', 'Calls Made', 'Calls Connected']],
    body: buckets.map(b => [
      b.key,
      b.tasks_assigned || 0,
      b.tasks_completed || 0,
      b.queries_assigned || 0,
      b.queries_resolved || 0,
      b.field_visits || 0,
      b.calls_made || 0,
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

  // ── Projects Leading / Member ────────────────────────────────
  const leading = projects.leading || [];
  const memberOf = projects.member || [];
  if (leading.length > 0 || memberOf.length > 0) {
    if (y > pageH - 200) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(124, 58, 237); // violet-600
    doc.text(`Projects · Leading (${leading.length})  ·  Member of (${memberOf.length})`, M, y);
    y += 6;

    const projRows = (list, tag) => list.map(p => [
      tag,
      p.name || '—',
      cap(p.status || '—'),
      (typeof p.progress === 'number') ? `${p.progress}%` : '—',
      cap(p.priority || 'normal'),
      fmtDate(p.due_date),
    ]);
    autoTable(doc, {
      startY: y + 4,
      head: [['Role', 'Project', 'Status', 'Progress', 'Priority', 'Due']],
      body: [...projRows(leading, 'Lead'), ...projRows(memberOf, 'Member')],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 200 },
      },
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

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
