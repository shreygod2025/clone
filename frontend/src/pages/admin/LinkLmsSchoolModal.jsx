import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Search, CheckCircle2, AlertTriangle, Link2, GraduationCap, Loader2, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuthHeaders = () => {
  const t = localStorage.getItem('oll_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * LinkLmsSchoolModal — manual LMS-to-CRM link picker.
 *
 * Solves the case where an admin has a CRM school AND an LMS school for the
 * same institution but their names don't match — auto-sync would otherwise
 * create a duplicate CRM record. Admin picks the correct LMS row here and
 * the link is stamped `lms_link_manual=true` so future cron runs preserve it.
 */
export default function LinkLmsSchoolModal({ open, crmSchool, onClose, onLinked }) {
  const [q, setQ] = useState('');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !crmSchool) return;
    setQ(crmSchool.school_name || '');
    setError('');
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/lms/all-schools`, { headers: getAuthHeaders() });
        setSchools(res.data?.schools || []);
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load LMS schools');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, crmSchool?.id, crmSchool?.school_name, crmSchool]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schools.slice(0, 100);
    return schools.filter(s => (s.school_name || '').toLowerCase().includes(needle)).slice(0, 100);
  }, [schools, q]);

  const link = async (lmsSchool, deletePrev) => {
    setLinkingId(lmsSchool.lms_school_id);
    try {
      const res = await axios.patch(
        `${API}/schools/${crmSchool.id}/link-lms`,
        { lms_school_id: lmsSchool.lms_school_id, delete_previous: !!deletePrev },
        { headers: getAuthHeaders() },
      );
      toast.success(
        res.data?.transferred_from
          ? (deletePrev
              ? `Linked. Removed duplicate: ${res.data.transferred_from.crm_school_name || 'previous CRM row'}`
              : `Linked. Previous CRM row (${res.data.transferred_from.crm_school_name || ''}) was unlinked.`)
          : 'LMS school linked'
      );
      onLinked?.({ ...crmSchool, lms_school_id: lmsSchool.lms_school_id, lms_link_manual: true });
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not link LMS school');
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="link-lms-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-600" />
            Link LMS school
            {crmSchool?.school_name && (
              <span className="text-xs text-slate-500 font-normal truncate">
                · {crmSchool.school_name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Pick the LMS record for this CRM school. The link is preserved on
            all future syncs (marked as manual).
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search LMS schools by name…"
              className="pl-9"
              autoFocus
              data-testid="link-lms-search"
            />
          </div>

          {error ? (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : loading ? (
            <div className="text-center text-sm text-slate-500 py-6">Loading LMS schools…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-6">No LMS schools match this search.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {filtered.map((s) => {
                const alreadyLinked = s.linked_to;
                const linkedToThisSchool = alreadyLinked?.crm_school_id === crmSchool?.id;
                const busy = linkingId === s.lms_school_id;
                return (
                  <div
                    key={s.lms_school_id}
                    className="px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                    data-testid={`lms-school-row-${s.lms_school_id}`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{s.school_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {s.lms_school_id.slice(0, 12)}…
                        {alreadyLinked && !linkedToThisSchool && (
                          <span className="ml-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-sans">
                            currently linked → {alreadyLinked.crm_school_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {linkedToThisSchool ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                        <CheckCircle2 className="w-3 h-3" /> Linked here
                      </span>
                    ) : alreadyLinked ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => link(s, false)}
                          className="text-[11px] px-2 py-1 h-auto"
                          data-testid={`link-lms-transfer-${s.lms_school_id}`}
                        >
                          Move here
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => link(s, true)}
                          className="text-[11px] px-2 py-1 h-auto bg-red-600 hover:bg-red-700 text-white"
                          data-testid={`link-lms-merge-${s.lms_school_id}`}
                          title="Delete the other CRM row and move the LMS link here"
                        >
                          Merge
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => link(s, false)}
                        className="text-[11px] px-2 py-1 h-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                        data-testid={`link-lms-btn-${s.lms_school_id}`}
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Link'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} data-testid="link-lms-close">
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
