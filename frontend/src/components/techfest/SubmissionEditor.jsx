import { useState } from 'react';
import { Loader2, Save, Upload, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  ZONES, COMPETITIONS, AGE_CATEGORIES, INNOVATION_CATEGORIES, MAX_TEAM_MEMBERS, emptyMember,
} from '../../pages/TechfestSubmitPage';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = 'techfest_portal_token';

const TEXT_FIELDS = [
  ['full_name', 'Team Lead Name'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'],
  ['date_of_birth', 'Date of Birth', 'date'], ['age', 'Age', 'number'], ['country', 'Country'],
  ['state', 'State'], ['city', 'City'], ['pincode', 'Pincode'], ['school_or_college', 'School / College'],
  ['team_id', 'Team ID'], ['competition_id', 'Competition ID'], ['drive_link', 'Project Drive Link', 'url'],
];
const ALL_KEYS = [...TEXT_FIELDS.map(([k]) => k), 'age_category', 'competition', 'zone', 'project_category', 'project_theme', 'id_proof_url', 'id_proof_type', 'school_permission_url'];

const CLEARABLE = ['team_id', 'competition_id', 'school_permission_url', 'project_category', 'project_theme', 'state', 'city', 'pincode', 'country'];

const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', file.type?.startsWith('image/') ? 'images' : 'documents');
  const res = await fetch(`${API_BASE}/techfest/upload`, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || 'Upload failed');
  return data.url;
};

const Select = ({ label, value, onChange, options, testid }) => (
  <div>
    <label className="tpp-label">{label}</label>
    <select className="tpp-input" value={value || ''} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
    </select>
  </div>
);

const FileField = ({ label, url, onPicked, busy, testid }) => (
  <div>
    <label className="tpp-label">{label}</label>
    <div className="flex items-center gap-2">
      <label className={`tpp-btn border border-slate-200 text-[#0A1F44] text-xs cursor-pointer ${busy ? 'opacity-60' : ''}`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {url ? 'Replace' : 'Upload'}
        <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && onPicked(e.target.files[0])} data-testid={testid} />
      </label>
      {url && <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1 truncate"><ExternalLink className="w-3 h-3" /> View current file</a>}
    </div>
  </div>
);

const ID_TYPES = [{ slug: 'aadhar', label: 'Aadhar card' }, { slug: 'pan', label: 'PAN card' }, { slug: 'other', label: 'Other' }];

export default function SubmissionEditor({ sub, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({ ...Object.fromEntries(ALL_KEYS.map((k) => [k, sub[k] ?? ''])), id_proof_type: sub.id_proof_type || 'aadhar' }));
  const [members, setMembers] = useState(() => (sub.team_members || []).map((m) => ({ ...emptyMember(), ...m })));
  const [uploading, setUploading] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setMember = (i, k, v) => setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  const zonal = COMPETITIONS.find((c) => c.slug === form.competition)?.zonal;
  const innovation = form.competition === 'robo_innovation';

  const pick = async (key, file, apply) => {
    setUploading(key);
    try { apply(await uploadFile(file)); toast.success('File uploaded'); }
    catch (e) { toast.error(e.message); } finally { setUploading(''); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) body[k] = k === 'age' ? Number(v) : v;
        else if (CLEARABLE.includes(k)) body[k] = '';
      });
      if (!zonal) body.zone = '';
      if (!innovation) { body.project_category = ''; body.project_theme = ''; }
      body.team_members = members.filter((m) => m.name?.trim()).map((m) => ({ ...m, email: m.email?.trim() || null }));
      const res = await fetch(`${API_BASE}/techfest/submission-portal/submission/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = data?.detail;
        throw new Error(Array.isArray(d) ? `${d[0]?.loc?.slice(-1)[0]}: ${d[0]?.msg}` : d || 'Save failed.');
      }
      toast.success('Submission updated.');
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-6" data-testid={`portal-editor-${sub.id}`}>
      <div className="grid sm:grid-cols-2 gap-4">
        {TEXT_FIELDS.map(([key, label, type]) => (
          <div key={key}>
            <label className="tpp-label">{label}</label>
            <input type={type || 'text'} className="tpp-input" value={form[key] ?? ''} onChange={(e) => set(key)(e.target.value)} data-testid={`portal-field-${key}`} />
          </div>
        ))}
        <Select label="Age Category" value={form.age_category} onChange={set('age_category')} options={AGE_CATEGORIES} testid="portal-field-age_category" />
        <Select label="Track" value={form.competition} onChange={set('competition')} options={COMPETITIONS} testid="portal-field-competition" />
        {zonal && <Select label="Zone" value={form.zone} onChange={set('zone')} options={ZONES} testid="portal-field-zone" />}
        {innovation && (
          <>
            <Select label="Project Category" value={form.project_category} onChange={set('project_category')} options={INNOVATION_CATEGORIES.map((c) => ({ slug: c, label: c }))} testid="portal-field-project_category" />
            <div>
              <label className="tpp-label">Project Theme</label>
              <input className="tpp-input" value={form.project_theme} onChange={(e) => set('project_theme')(e.target.value)} data-testid="portal-field-project_theme" />
            </div>
          </>
        )}
        <Select label="ID Proof Type" value={form.id_proof_type} onChange={set('id_proof_type')} options={ID_TYPES} testid="portal-field-id_proof_type" />
        <FileField label="ID Proof" url={form.id_proof_url} busy={uploading === 'id'} onPicked={(f) => pick('id', f, set('id_proof_url'))} testid="portal-upload-id-proof" />
        <FileField label="School Permission Letter" url={form.school_permission_url} busy={uploading === 'perm'} onPicked={(f) => pick('perm', f, set('school_permission_url'))} testid="portal-upload-permission" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="tpp-label !mb-0">Team Members ({members.length}/{MAX_TEAM_MEMBERS})</div>
          {members.length < MAX_TEAM_MEMBERS && (
            <button type="button" onClick={() => setMembers((ms) => [...ms, emptyMember()])} className="text-xs font-bold text-[#DC2626] inline-flex items-center gap-1" data-testid="portal-add-member"><Plus className="w-3.5 h-3.5" /> Add member</button>
          )}
        </div>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 grid sm:grid-cols-3 gap-3" data-testid={`portal-member-${i}`}>
              {[['name', 'Name'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'], ['date_of_birth', 'Date of Birth', 'date'], ['school', 'School']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="tpp-label">{l}</label>
                  <input type={t || 'text'} className="tpp-input" value={m[k] || ''} onChange={(e) => setMember(i, k, e.target.value)} data-testid={`portal-member-${i}-${k}`} />
                </div>
              ))}
              <FileField label="ID Proof" url={m.id_proof_url} busy={uploading === `m${i}`} onPicked={(f) => pick(`m${i}`, f, (u) => setMember(i, 'id_proof_url', u))} testid={`portal-member-${i}-upload`} />
              <div className="sm:col-span-3 text-right">
                <button type="button" onClick={() => setMembers((ms) => ms.filter((_, idx) => idx !== i))} className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1" data-testid={`portal-member-${i}-remove`}><Trash2 className="w-3.5 h-3.5" /> Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="tpp-btn border border-slate-200 text-slate-600 text-xs">Cancel</button>
        <button type="button" onClick={save} disabled={saving || !!uploading} className="tpp-btn primary text-xs" data-testid={`portal-save-${sub.id}`}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
