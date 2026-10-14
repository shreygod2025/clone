import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLES = {
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
};

const fmtDT = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export const exportSubmissionsXlsx = (rows) => {
  const data = rows.map((s) => ({
    'Submitted On': fmtDT(s.created_at),
    'Full Name': s.full_name || '',
    'Date of Birth': s.date_of_birth || '',
    Age: s.age ?? '',
    'Age Category': s.age_category || '',
    Email: s.email || '',
    Phone: s.phone || '',
    'School / College': s.school_or_college || '',
    City: s.city || '',
    State: s.state || '',
    Pincode: s.pincode || '',
    Country: s.country || '',
    Track: (s.competition || '').replace(/_/g, ' '),
    Region: s.zone || '',
    'Project Category': s.project_category || '',
    'Project Theme': s.project_theme || '',
    'Team ID': s.team_id || '',
    'Competition ID': s.competition_id || '',
    'Team Members': (s.team_members || []).map((m) => [m.name || m.full_name, m.email, m.phone].filter(Boolean).join(' / ')).join('; '),
    'Drive Link': s.drive_link || '',
    'ID Proof Type': s.id_proof_type || '',
    'ID Proof URL': s.id_proof_url || '',
    'School Permission URL': s.school_permission_url || '',
    Status: s.review_status || 'pending',
    Duplicate: s.is_duplicate ? 'Yes' : 'No',
    'Judge Remarks': s.judge_remarks || '',
    'Reviewed By': s.reviewed_by || '',
    'Reviewed On': fmtDT(s.reviewed_at),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
  XLSX.writeFile(wb, `techfest-submissions-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const ReviewStatusBadge = ({ s }) => (
  <div className="flex flex-col items-start gap-1">
    <span data-testid={`admin-submission-status-${s._id}`} className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 ${STATUS_STYLES[s.review_status] || STATUS_STYLES.pending}`}>
      {s.review_status || 'pending'}
    </span>
    {s.is_duplicate && (
      <span data-testid={`admin-submission-duplicate-${s._id}`} title={`Same Team ID / Competition ID as submission ${s.duplicate_of}`} className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 bg-slate-800 text-white">
        Duplicate
      </span>
    )}
  </div>
);

export const ReviewActions = ({ s, onReview }) => (
  <div className="min-w-[180px]">
    <div className="flex gap-1.5">
      <button type="button" onClick={() => onReview(s, 'approved')} data-testid={`admin-submission-approve-${s._id}`}
        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
      </button>
      <button type="button" onClick={() => onReview(s, 'rejected')} data-testid={`admin-submission-reject-${s._id}`}
        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
        <XCircle className="w-3.5 h-3.5" /> Reject
      </button>
    </div>
    {s.judge_remarks && (
      <div className="mt-1.5 text-[11px] text-slate-600 leading-snug" data-testid={`admin-submission-remarks-${s._id}`}>
        <span className="font-semibold text-slate-800">Remarks:</span> {s.judge_remarks}
        {s.reviewed_by && <div className="text-[10px] text-slate-400">— {s.reviewed_by}{s.reviewed_at ? `, ${new Date(s.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}</div>}
      </div>
    )}
  </div>
);

export default function SubmissionReviewDialog({ target, onClose, onSaved, headers }) {
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const approve = target?.decision === 'approved';

  useEffect(() => { setRemarks(target?.sub?.judge_remarks || ''); }, [target]);

  const save = async () => {
    if (remarks.trim().length < 3) { toast.error("Judge's remarks are mandatory — please state the reason."); return; }
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/admin/techfest/submissions/${target.sub._id}/review`,
        { decision: target.decision, remarks: remarks.trim() }, { headers });
      toast.success(approve ? 'Submission approved' : 'Submission rejected');
      onSaved(target.sub._id, res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not save review');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="admin-submission-review-dialog">
        <DialogHeader>
          <DialogTitle>{approve ? 'Approve' : 'Reject'} submission</DialogTitle>
        </DialogHeader>
        {target && (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{target.sub.full_name}</span> · {target.sub.competition?.replace('_', ' ')} · Team ID {target.sub.team_id || '—'}
            </div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Judge&apos;s remarks <span className="text-red-600">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              placeholder={approve ? 'Why is this project approved?' : 'Why is this project rejected?'}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              data-testid="admin-submission-review-remarks"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} data-testid="admin-submission-review-cancel">Cancel</Button>
              <Button onClick={save} disabled={saving || remarks.trim().length < 3}
                className={approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                data-testid="admin-submission-review-save">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {approve ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
