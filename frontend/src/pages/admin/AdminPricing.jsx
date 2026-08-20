import { useMemo, useState } from 'react';
import { Calculator, Download, Plus, Trash2, ArrowLeft, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';

// ── Price catalog (from Pricing_Sheet_2027-28.pdf) ──────────────────────────
// All prices are MRP / GP in INR per unit.
const PRICE_CATALOG = {
  robotics_beginner: {
    label: 'Robotics — Beginner',
    kits: [
      { key: 'rk_g1',  label: 'Robotic Kit · Grade 1',  mrp: 900,  gp: 600  },
      { key: 'rk_g2',  label: 'Robotic Kit · Grade 2',  mrp: 1500, gp: 1100 },
      { key: 'rk_g3',  label: 'Robotic Kit · Grade 3',  mrp: 1650, gp: 1250 },
      { key: 'rk_g4',  label: 'Robotic Kit · Grade 4',  mrp: 1750, gp: 1350 },
      { key: 'rk_g5',  label: 'Robotic Kit · Grade 5',  mrp: 1850, gp: 1450 },
      { key: 'rk_g6',  label: 'Robotic Kit · Grade 6',  mrp: 1850, gp: 1450 },
      { key: 'rk_g7',  label: 'Robotic Kit · Grade 7',  mrp: 2150, gp: 1650 },
      { key: 'rk_g8',  label: 'Robotic Kit · Grade 8',  mrp: 2150, gp: 1650 },
      { key: 'rk_g9',  label: 'Robotic Kit · Grade 9',  mrp: 2200, gp: 1700 },
      { key: 'rk_g10', label: 'Robotic Kit · Grade 10', mrp: 2300, gp: 1800 },
      { key: 'iot_g7', label: 'IoT Kit · Grade 7',      mrp: 3250, gp: 2750 },
      { key: 'iot_g8', label: 'IoT Kit · Grade 8',      mrp: 4000, gp: 3000 },
      { key: 'ai_g9',  label: 'AI Kit · Grade 9',       mrp: 4000, gp: 3000 },
      { key: 'iot_ai_g10', label: 'IoT + AI Kit · Grade 10', mrp: 4000, gp: 3000 },
      { key: 'rb_g1_3',   label: 'Robotics Book · Grade 1–2', mrp: 480, gp: 180 },
      { key: 'rb_g3_10',  label: 'Robotics Book · Grade 3–10', mrp: 580, gp: 220 },
      { key: 'iot_book',  label: 'IoT Book · Grade 7–8', mrp: 680, gp: 260 },
      { key: 'ai_book',   label: 'AI Vision Book · Grade 9', mrp: 680, gp: 260 },
      { key: 'iot_ai_book', label: 'IoT+AI Book · Grade 10', mrp: 680, gp: 260 },
    ],
    trainings: [
      { key: 'teacher_training', label: 'Teacher Training' },
    ],
  },
  ict_coding_ai: {
    label: 'ICT · Coding · AI (Beginner)',
    kits: [
      { key: 'lms_child',     label: 'LMS Access · Per Child',            mrp: 690, gp: 290 },
      { key: 'lms_lab_child', label: 'LMS Virtual Labs · Per Child',      mrp: 690, gp: 290 },
      { key: 'comp_book',     label: 'Computer Book (ICSE / CBSE)',       mrp: 690, gp: 290 },
      { key: 'ict_teacher',   label: 'Teacher Training (per school/yr)',  mrp: 790, gp: 520 },
    ],
    trainings: [
      { key: 'teacher_training', label: 'Teacher Training' },
      { key: 'lms_access',       label: 'LMS Access' },
    ],
  },
  club_house: {
    label: 'Club House System',
    kits: [
      { key: 'club_pack',      label: 'Club House · Robotics Book + Take-Home Kit', mrp: 30000, gp: 24000 },
    ],
    trainings: [],
  },
  service_package: {
    label: 'Service Package · Maintenance + Training',
    kits: [
      { key: 'service_pkg',    label: 'Annual Service Package', mrp: 150000, gp: 100000 },
    ],
    trainings: [
      { key: 'teacher_training', label: 'Teacher Training' },
    ],
  },
};

// Quantity-based discount slabs (% off GP price) — applied per line-item quantity.
const DISCOUNT_SLABS = [
  { min: 0,    max: 99,   pct: 0  },
  { min: 100,  max: 199,  pct: 10 },
  { min: 200,  max: 399,  pct: 15 },
  { min: 400,  max: 799,  pct: 20 },
  { min: 800,  max: 999,  pct: 30 },
  { min: 1000, max: 1499, pct: 40 },
  { min: 1500, max: 999999, pct: 45 },
];

const discountForQty = (qty) => {
  const slab = DISCOUNT_SLABS.find((s) => qty >= s.min && qty <= s.max);
  return slab ? slab.pct : 0;
};

const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

const emptyLine = (courseKey) => ({
  id: crypto.randomUUID(),
  courseKey,
  kitKey: '',
  training: '',
  qty: 100,
  mrp: 0,     // editable
  gp: 0,      // from catalog
});

export default function AdminPricing() {
  const navigate = useNavigate();
  const [course, setCourse] = useState('robotics_beginner');
  const [studentCount, setStudentCount] = useState(100);
  const [lines, setLines] = useState([]);

  const catalog = PRICE_CATALOG[course];

  // ── Actions ──
  const addLine = () => {
    const kit = catalog.kits[0];
    if (!kit) return;
    setLines((prev) => [
      ...prev,
      { ...emptyLine(course), kitKey: kit.key, qty: studentCount, mrp: kit.mrp, gp: kit.gp,
        training: catalog.trainings[0]?.key || '' },
    ]);
  };
  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.id !== id));
  const patchLine = (id, patch) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const onCourseChange = (nextCourse) => {
    setCourse(nextCourse);
    setLines([]); // fresh lines for the new course
  };

  const onKitChange = (line, nextKitKey) => {
    const kit = PRICE_CATALOG[line.courseKey].kits.find((k) => k.key === nextKitKey);
    if (!kit) return;
    patchLine(line.id, { kitKey: kit.key, mrp: kit.mrp, gp: kit.gp });
  };

  // ── Computed totals ──
  const computed = useMemo(() => {
    let mrpTotal = 0;
    let gpTotalGross = 0;
    let discountTotal = 0;
    let netToSchool = 0;
    const rows = lines.map((l) => {
      const marginPct = l.mrp > 0 ? Math.max(0, ((l.mrp - l.gp) / l.mrp) * 100) : 0;
      const slabPct = discountForQty(l.qty);
      const netGpUnit = l.gp * (1 - slabPct / 100);
      const lineMrp = l.mrp * l.qty;
      const lineGpGross = l.gp * l.qty;
      const lineDiscount = lineGpGross - netGpUnit * l.qty;
      const lineNet = netGpUnit * l.qty;
      mrpTotal += lineMrp;
      gpTotalGross += lineGpGross;
      discountTotal += lineDiscount;
      netToSchool += lineNet;
      return { ...l, marginPct, slabPct, netGpUnit, lineMrp, lineGpGross, lineDiscount, lineNet };
    });
    const overallMarginPct = mrpTotal > 0 ? ((mrpTotal - netToSchool) / mrpTotal) * 100 : 0;
    return { rows, mrpTotal, gpTotalGross, discountTotal, netToSchool, overallMarginPct };
  }, [lines]);

  // ── Export ──
  const exportPDF = () => {
    // Use the browser's built-in print → save-as-PDF from a purpose-built window
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    const rowsHTML = computed.rows.map((r, idx) => {
      const kit = PRICE_CATALOG[r.courseKey].kits.find((k) => k.key === r.kitKey);
      const training = PRICE_CATALOG[r.courseKey].trainings.find((t) => t.key === r.training);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${PRICE_CATALOG[r.courseKey].label}</td>
        <td>${kit?.label || '—'}</td>
        <td>${training?.label || '—'}</td>
        <td style="text-align:right">${r.qty}</td>
        <td style="text-align:right">${inr(r.mrp)}</td>
        <td style="text-align:right">${inr(r.gp)}</td>
        <td style="text-align:right">${r.marginPct.toFixed(1)}%</td>
        <td style="text-align:right">${r.slabPct}%</td>
        <td style="text-align:right">${inr(r.netGpUnit)}</td>
        <td style="text-align:right"><strong>${inr(r.lineNet)}</strong></td>
      </tr>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><title>OLL Pricing Quote</title>
      <style>
        body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 40px; color: #0F1E33; }
        h1 { margin: 0 0 4px; color: #1E3A5F; }
        .sub { color: #64748B; margin-bottom: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: left; }
        thead th { background: #F1F5F9; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
        .totals { margin-top: 24px; float: right; width: 380px; border: 2px solid #1E3A5F; border-radius: 12px; padding: 18px; }
        .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .totals .row.net { border-top: 1px solid #CBD5E1; margin-top: 8px; padding-top: 12px; font-size: 15px; font-weight: 700; }
        @media print { body { margin: 24px; } }
      </style></head><body>
      <h1>OLL Pricing Quote</h1>
      <div class="sub">Generated ${new Date().toLocaleString('en-IN')} · ${computed.rows.length} line items</div>
      <table>
        <thead><tr>
          <th>#</th><th>Course</th><th>Kit / Item</th><th>Training</th>
          <th>Qty</th><th>MRP</th><th>GP</th><th>Margin</th><th>Qty Disc</th><th>Net GP</th><th>Line Total</th>
        </tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Total MRP</span><strong>${inr(computed.mrpTotal)}</strong></div>
        <div class="row"><span>Total GP (gross)</span><strong>${inr(computed.gpTotalGross)}</strong></div>
        <div class="row"><span>Quantity Discount</span><strong style="color:#DC2626">− ${inr(computed.discountTotal)}</strong></div>
        <div class="row"><span>Overall Margin</span><strong>${computed.overallMarginPct.toFixed(1)}%</strong></div>
        <div class="row net"><span>Net to School</span><strong>${inr(computed.netToSchool)}</strong></div>
      </div>
      <script>window.onload=()=>window.print();</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <AdminLayout title="Pricing">
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <button
                onClick={() => navigate('/admin/schools')}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#1E3A5F] mb-2"
                data-testid="pricing-back-btn"
              >
                <ArrowLeft className="w-4 h-4" /> Back to School CRM
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F1E33] flex items-center gap-2">
                <Calculator className="w-7 h-7 text-[#DC2626]" /> Pricing Calculator
              </h1>
              <p className="text-sm text-slate-500 mt-1">Growth Partner rate card · FY 2027–28</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPDF}
                disabled={computed.rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E3A5F] hover:bg-[#162a44] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
                data-testid="pricing-export-pdf-btn"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>

          {/* Course + student inputs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Course</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E3A5F]"
                value={course}
                onChange={(e) => onCourseChange(e.target.value)}
                data-testid="pricing-course-select"
              >
                {Object.entries(PRICE_CATALOG).map(([key, c]) => (
                  <option key={key} value={key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Student Count (default for new lines)</label>
              <input
                type="number"
                min={1}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E3A5F]"
                value={studentCount}
                onChange={(e) => setStudentCount(Math.max(1, Number(e.target.value) || 0))}
                data-testid="pricing-student-count-input"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Discount slab @ this count: <strong>{discountForQty(studentCount)}%</strong> off GP
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={addLine}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#b91c1c] text-white text-sm font-semibold"
                data-testid="pricing-add-line-btn"
              >
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </div>
          </div>

          {/* Line items table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-3 font-semibold">Kit / Item</th>
                    <th className="text-left p-3 font-semibold">Training</th>
                    <th className="text-right p-3 font-semibold">Qty</th>
                    <th className="text-right p-3 font-semibold">MRP</th>
                    <th className="text-right p-3 font-semibold">GP</th>
                    <th className="text-right p-3 font-semibold">Margin</th>
                    <th className="text-right p-3 font-semibold">Qty Disc.</th>
                    <th className="text-right p-3 font-semibold">Net GP</th>
                    <th className="text-right p-3 font-semibold">Line Total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400" data-testid="pricing-empty-state">
                        No line items yet. Pick a course and click <strong>Add Line Item</strong>.
                      </td>
                    </tr>
                  )}
                  {computed.rows.map((r) => {
                    const cat = PRICE_CATALOG[r.courseKey];
                    return (
                      <tr key={r.id} className="border-t border-slate-100" data-testid={`pricing-row-${r.id}`}>
                        <td className="p-2">
                          <select
                            value={r.kitKey}
                            onChange={(e) => onKitChange(r, e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                            data-testid={`pricing-row-kit-${r.id}`}
                          >
                            {cat.kits.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          {cat.trainings.length > 0 ? (
                            <select
                              value={r.training}
                              onChange={(e) => patchLine(r.id, { training: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                              data-testid={`pricing-row-training-${r.id}`}
                            >
                              <option value="">— none —</option>
                              {cat.trainings.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-xs">n/a</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number" min={1}
                            value={r.qty}
                            onChange={(e) => patchLine(r.id, { qty: Math.max(1, Number(e.target.value) || 0) })}
                            className="w-24 text-right border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                            data-testid={`pricing-row-qty-${r.id}`}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number" min={0}
                            value={r.mrp}
                            onChange={(e) => patchLine(r.id, { mrp: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-28 text-right border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-semibold"
                            data-testid={`pricing-row-mrp-${r.id}`}
                          />
                        </td>
                        <td className="p-2 text-right text-slate-700">{inr(r.gp)}</td>
                        <td className="p-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.marginPct >= 30 ? 'bg-emerald-100 text-emerald-700' : r.marginPct >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {r.marginPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            {r.slabPct}%
                          </span>
                        </td>
                        <td className="p-2 text-right text-slate-700">{inr(r.netGpUnit)}</td>
                        <td className="p-2 text-right font-bold text-[#0F1E33]">{inr(r.lineNet)}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removeLine(r.id)}
                            className="text-slate-400 hover:text-rose-600"
                            data-testid={`pricing-row-remove-${r.id}`}
                            aria-label="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals card */}
          {computed.rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4" data-testid="pricing-totals">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total MRP</div>
                <div className="text-xl font-bold text-slate-700 mt-1">{inr(computed.mrpTotal)}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total GP (gross)</div>
                <div className="text-xl font-bold text-slate-700 mt-1">{inr(computed.gpTotalGross)}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Qty Discount</div>
                <div className="text-xl font-bold text-rose-600 mt-1">− {inr(computed.discountTotal)}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Overall Margin</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{computed.overallMarginPct.toFixed(1)}%</div>
              </div>
              <div className="bg-gradient-to-br from-[#1E3A5F] to-[#DC2626] rounded-2xl p-4 text-white">
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/80 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Net to School
                </div>
                <div className="text-2xl font-bold mt-1" data-testid="pricing-net-total">{inr(computed.netToSchool)}</div>
              </div>
            </div>
          )}

          {/* Discount slab reference */}
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Quantity Discount Slabs (off GP)</div>
            <div className="flex flex-wrap gap-2">
              {DISCOUNT_SLABS.map((s) => (
                <div key={`${s.min}-${s.max}`} className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>{s.min}–{s.max === 999999 ? '∞' : s.max}</strong> units → <span className="text-rose-600 font-bold">{s.pct}%</span> off
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
