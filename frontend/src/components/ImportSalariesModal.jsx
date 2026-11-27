import { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ImportSalariesModal = ({ open, onClose, onImported }) => {
  const { getAuthHeaders } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const download = () => {
    const rows = [
      ['Name', 'Email', 'Month', 'Base Salary', 'Incentive', 'Deduction', 'Net Paid', 'Notes'],
      ['Anushree Sharma', 'anushree@oll.co', '2026-03', '50000', '8000', '2000', '', 'March cycle'],
      ['Rahul Kumar', 'rahul@oll.co', '2026-03', '45000', '5000', '1500', '', ''],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'salaries_template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10 MB)'); return; }
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/salaries/import`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      const { created, updated, skipped } = res.data;
      toast.success(`Imported: ${created} new, ${updated} updated, ${skipped.length} skipped`);
      onImported?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-testid="import-salaries-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Import Team Salaries
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            Upload an Excel (.xlsx) or CSV. One row per team member per month.
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
            <div className="font-semibold mb-1">Required columns (any of these header names work):</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><span className="font-medium">Name</span> or <span className="font-medium">Email</span> — team member (Email is more accurate)</li>
              <li><span className="font-medium">Month</span> — <code className="bg-white px-1 rounded">2026-03</code>, <code className="bg-white px-1 rounded">March 2026</code>, or a date</li>
              <li><span className="font-medium">Base Salary</span>, <span className="font-medium">Incentive</span>, <span className="font-medium">Deduction</span></li>
              <li><span className="font-medium">Net Paid</span> — optional (auto-computed if blank)</li>
              <li><span className="font-medium">Notes</span> — optional</li>
            </ul>
          </div>

          <Button variant="outline" size="sm" onClick={download} className="w-full" data-testid="download-salary-template-btn">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download CSV template
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="hidden"
            data-testid="salary-import-input"
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="upload-salary-btn"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4 mr-1.5" /> Choose file</>
            )}
          </Button>

          {result && (
            <div className="border border-slate-200 rounded-lg p-3 text-sm" data-testid="import-result">
              <div className="flex gap-3 flex-wrap">
                <Chip icon={<CheckCircle2 className="w-3 h-3" />} label={`${result.created} created`} tone="emerald" />
                <Chip icon={<CheckCircle2 className="w-3 h-3" />} label={`${result.updated} updated`} tone="blue" />
                {result.skipped.length > 0 && (
                  <Chip icon={<AlertCircle className="w-3 h-3" />} label={`${result.skipped.length} skipped`} tone="amber" />
                )}
              </div>
              {result.skipped.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-500 space-y-0.5">
                  {result.skipped.map((s, i) => (
                    <div key={i}>Row {s.row}: {s.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Chip = ({ icon, label, tone }) => {
  const toneMap = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${toneMap[tone] || 'bg-slate-100 text-slate-600'}`}>
      {icon}
      {label}
    </span>
  );
};

export default ImportSalariesModal;
