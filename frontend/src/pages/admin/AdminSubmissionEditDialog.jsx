import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TEXT_FIELDS = [
  ['full_name', 'Team lead name'], ['email', 'Email'], ['phone', 'Phone'], ['date_of_birth', 'Date of birth (YYYY-MM-DD)'],
  ['school_or_college', 'School / College'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'],
  ['team_id', 'Team ID'], ['competition_id', 'Competition ID'], ['project_category', 'Project category'],
  ['project_theme', 'Project theme'], ['drive_link', 'Drive link'], ['school_permission_url', 'Permission letter URL'],
];
const SELECTS = [
  ['competition', 'Competition', [['robo_sumo', 'Robo Sumo'], ['robo_race', 'Robo Race'], ['robo_innovation', 'Robo Innovation']]],
  ['zone', 'Zone', [['', '—'], ['north', 'North'], ['south', 'South'], ['east', 'East'], ['west', 'West'], ['central', 'Central']]],
  ['age_category', 'Age category', [['junior', 'Junior'], ['senior', 'Senior']]],
];
const MEMBER_FIELDS = [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['school', 'School']];
const inputCls = 'w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white';

const Field = ({ label, children }) => (
  <label className="block"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span><div className="mt-1">{children}</div></label>
);

const MembersEditor = ({ members, setMembers }) => {
  const upd = (i, k, v) => setMembers(members.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  return (
    <div className="space-y-2" data-testid="admin-edit-members">
      {members.map((m, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-slate-50 rounded-lg p-2">
          {MEMBER_FIELDS.map(([k, l]) => (
            <Field key={k} label={l}><input className={inputCls} value={m[k] || ''} onChange={(e) => upd(i, k, e.target.value)} data-testid={`admin-edit-member-${i}-${k}`} /></Field>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setMembers(members.filter((_, j) => j !== i))} data-testid={`admin-edit-member-remove-${i}`}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      {members.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setMembers([...members, {}])} data-testid="admin-edit-member-add"><Plus className="w-4 h-4 mr-1" /> Add member</Button>
      )}
    </div>
  );
};

export default function AdminSubmissionEditDialog({ sub, onClose, onSaved, headers }) {
  const [form, setForm] = useState({});
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!sub) return;
    setForm(Object.fromEntries([...TEXT_FIELDS, ...SELECTS].map(([k]) => [k, sub[k] || ''])));
    setMembers((sub.team_members || []).map((m) => ({ ...m })));
  }, [sub]);

  const save = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== (sub[k] || '') && (v !== '' || k === 'zone')));
      const clean = members.map((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== '' && v != null)));
      if (JSON.stringify(clean) !== JSON.stringify(sub.team_members || [])) body.team_members = clean;
      const r = await axios.patch(`${API}/admin/techfest/submissions/${sub._id}`, body, { headers });
      toast.success(r.data.modified ? 'Submission updated' : 'No changes to save');
      if (r.data.submission) onSaved(sub._id, r.data.submission);
      onClose();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(Array.isArray(d) ? d.map((x) => `${x.loc?.slice(-1)[0]}: ${x.msg}`).join(', ') : d || 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto" data-testid="admin-submission-edit-dialog">
        <DialogHeader><DialogTitle>Edit submission — {sub?.full_name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SELECTS.map(([k, l, opts]) => (
            <Field key={k} label={l}>
              <select className={inputCls} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`admin-edit-${k}`}>
                {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </Field>
          ))}
          {TEXT_FIELDS.map(([k, l]) => (
            <Field key={k} label={l}><input className={inputCls} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`admin-edit-${k}`} /></Field>
          ))}
        </div>
        <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Team members</div>
        <MembersEditor members={members} setMembers={setMembers} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="admin-edit-cancel">Cancel</Button>
          <Button className="bg-[#0A1F44] hover:bg-[#13306b] text-white" disabled={saving} onClick={save} data-testid="admin-edit-save">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
