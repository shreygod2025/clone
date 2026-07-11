import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Search, Copy, Check, User, KeyRound, Shield, ExternalLink, GraduationCap, X, AlertTriangle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LMS_URL = 'https://lms.oll.co';
const getAuthHeaders = () => {
  const t = localStorage.getItem('oll_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const roleTone = {
  school: 'bg-purple-100 text-purple-700',
  teacher: 'bg-emerald-100 text-emerald-700',
  student: 'bg-blue-100 text-blue-700',
};

const CopyBtn = ({ value, label = 'Copy', testid }) => {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
      data-testid={testid}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
};

/**
 * LMS Credentials Modal
 *
 * Opened from LMS-category support tickets. Lets an admin:
 *   1. Pick the school (auto-selects if the ticket came from LMS feedback sync)
 *   2. Search users by username / name / role
 *   3. See each user's LMS username + plain-text password (copyable)
 *   4. Jump to the LMS admin console to change passwords (change is not
 *      exposed by the LMS external API)
 */
export default function LmsCredentialsModal({ open, ticket, preselectedSchoolLmsId, preselectedUsername, onClose }) {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolId, setSchoolId] = useState(''); // CRM school id
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [q, setQ] = useState(preselectedUsername || '');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');

  // Reset when the ticket changes
  useEffect(() => {
    if (open) {
      setQ(preselectedUsername || (ticket?.name?.split(' ')?.[0]?.toLowerCase() || ''));
      setRoleFilter('all');
      setSchoolId('');
      setSchoolName('');
      setUsers([]);
      setError('');
    }
  }, [open, ticket?.id, preselectedUsername, ticket?.name]);

  // Load LMS-linked schools once
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingSchools(true);
      try {
        const res = await axios.get(`${API}/lms/schools-with-users`, { headers: getAuthHeaders() });
        const rows = res.data?.schools || [];
        setSchools(rows);
        if (preselectedSchoolLmsId) {
          const match = rows.find(s => s.lms_school_id === preselectedSchoolLmsId);
          if (match) setSchoolId(match.id);
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load LMS-linked schools');
      } finally {
        setLoadingSchools(false);
      }
    })();
  }, [open, preselectedSchoolLmsId]);

  // Fetch users whenever schoolId changes
  useEffect(() => {
    if (!schoolId) { setUsers([]); return; }
    (async () => {
      setLoadingUsers(true);
      setError('');
      try {
        const res = await axios.get(`${API}/lms/schools/${schoolId}/users`, { headers: getAuthHeaders() });
        setUsers(res.data?.users || []);
        setSchoolName(res.data?.school_name || '');
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to fetch LMS users');
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [schoolId]);

  const filteredUsers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && (u.role || '').toLowerCase() !== roleFilter) return false;
      if (!needle) return true;
      return (
        (u.username || '').toLowerCase().includes(needle) ||
        (u.name || '').toLowerCase().includes(needle)
      );
    });
  }, [users, q, roleFilter]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        data-testid="lms-credentials-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            LMS Credentials Lookup
            {ticket?.ticket_number && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono ml-2">
                #{ticket.ticket_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900">
              <strong>Sensitive:</strong> LMS credentials shown here are the current plain-text
              logins. Share via secure channels only. Password changes are handled inside the
              LMS admin console — this modal is read-only.
            </div>
          </div>

          {/* School picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">LMS-linked school *</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={loadingSchools}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm disabled:opacity-60"
                data-testid="lms-cred-school-select"
              >
                <option value="">
                  {loadingSchools ? 'Loading schools…' : 'Select a school…'}
                </option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.school_name}</option>
                ))}
              </select>
              {schools.length === 0 && !loadingSchools && (
                <p className="text-[11px] text-slate-500 mt-1">
                  No LMS-linked schools yet. Run &quot;Sync LMS&quot; in School CRM first.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                data-testid="lms-cred-role-filter"
              >
                <option value="all">All roles</option>
                <option value="school">School admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>

          {/* Search */}
          {schoolId && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search username or name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
                data-testid="lms-cred-search"
              />
            </div>
          )}

          {/* Show / hide passwords */}
          {schoolId && filteredUsers.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span data-testid="lms-cred-count">
                {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'} · {schoolName}
              </span>
              <button
                type="button"
                onClick={() => setShowPasswords(v => !v)}
                className="text-indigo-600 hover:underline font-medium"
                data-testid="lms-cred-toggle-passwords"
              >
                {showPasswords ? 'Hide passwords' : 'Reveal passwords'}
              </button>
            </div>
          )}

          {/* Users list */}
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-start gap-2" data-testid="lms-cred-error">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : loadingUsers ? (
            <div className="text-center text-sm text-slate-500 py-6">Loading LMS users…</div>
          ) : schoolId && filteredUsers.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-6">
              No users match the current filter.
            </div>
          ) : schoolId ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  className="px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                  data-testid={`lms-cred-user-${u.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 text-sm truncate">{u.name || u.username}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${roleTone[u.role] || 'bg-slate-100 text-slate-600'} capitalize`}>
                        {u.role}
                      </span>
                      {u.class_name && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {u.class_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-mono truncate">
                        <User className="w-3 h-3 text-slate-400" />
                        {u.username}
                      </span>
                      <CopyBtn value={u.username || ''} label="user" testid={`lms-cred-copy-user-${u.id}`} />
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-mono truncate">
                        <KeyRound className="w-3 h-3 text-slate-400" />
                        {showPasswords ? (u.plain_password || '—') : '••••••••'}
                      </span>
                      <CopyBtn value={u.plain_password || ''} label="pw" testid={`lms-cred-copy-pw-${u.id}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-slate-500 py-8">
              <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              Select a school above to look up LMS users.
            </div>
          )}

          {/* Password change note */}
          {schoolId && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="text-[11px] text-indigo-900">
                <strong>Need to reset a password?</strong> The LMS API does not currently expose
                password changes. Reset directly in the LMS admin console.
              </div>
              <a
                href={LMS_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1 flex-shrink-0"
                data-testid="lms-cred-open-lms-btn"
              >
                <ExternalLink className="w-3 h-3" />
                Open LMS
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} data-testid="lms-cred-close">
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
