import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import RichTextEditor from '../../components/RichTextEditor';
import {
  Trophy, Plus, Search, Edit, Trash2, Upload, ExternalLink,
  Paperclip, X, Loader2, Award, Eye, EyeOff, Star,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LEVELS = [
  { n: 1, name: 'Creator', tone: 'from-slate-400 to-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200', desc: 'The child made something independently — first robot, first game, first story.' },
  { n: 2, name: 'Published', tone: 'from-blue-400 to-blue-500', chip: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'The creation is shared with the world — public link, Play Store, Kindle, YouTube.' },
  { n: 3, name: 'Recognition', tone: 'from-indigo-500 to-indigo-600', chip: 'bg-indigo-100 text-indigo-700 border-indigo-200', desc: 'External validation — competition, media feature, patent filed, testimonial.' },
  { n: 4, name: 'Impact', tone: 'from-amber-500 to-orange-500', chip: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'Measurable value — downloads, views, revenue, users, adoption.' },
  { n: 5, name: 'Transformation', tone: 'from-fuchsia-500 to-rose-500', chip: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', desc: 'Life-changing outcome — internship, scholarship, funding, admission, job offer.' },
];

const LEVEL_MAP = Object.fromEntries(LEVELS.map(l => [l.n, l]));

const emptyForm = {
  student_name: '',
  age: '',
  school_name: '',
  image_url: '',
  level: 1,
  story: '',
  excerpt: '',
  tags: [],
  attachments: [],
  evidence_links: [],
  verification_notes: '',
  is_published: true,
};

const AdminSuccessStories = () => {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') || 'all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (search) params.append('search', search);
      const res = await axios.get(`${API}/success-stories?${params.toString()}`, { headers: getAuthHeaders() });
      setStories(res.data || []);
    } catch (err) {
      toast.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setShowModal(true); };
  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.student_name}"'s story? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/success-stories/${s.id}`, { headers: getAuthHeaders() });
      toast.success('Story deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <AdminLayout title="Verified Success Stories">
      <div className="max-w-7xl mx-auto space-y-4" data-testid="admin-success-stories-page">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Verified Success Stories
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1">
              A measurable, externally validated achievement that demonstrates a child has applied their skills to create real-world value.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="add-success-story-btn">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Story
            </Button>
          )}
        </div>

        {/* Level cards row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {LEVELS.map(l => {
            const count = stories.filter(s => s.level === l.n).length;
            const active = levelFilter === String(l.n);
            return (
              <button
                key={l.n}
                onClick={() => { setLevelFilter(active ? 'all' : String(l.n)); setSearchParams(active ? {} : { level: String(l.n) }); }}
                className={`rounded-xl px-3 py-2 text-left bg-gradient-to-br ${l.tone} text-white transition-all ${active ? 'ring-2 ring-offset-2 ring-slate-900 scale-[1.02]' : 'opacity-90 hover:opacity-100'}`}
                data-testid={`level-filter-${l.n}`}
              >
                <div className="text-[10px] uppercase opacity-80">Level {l.n}</div>
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name, school, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="success-stories-search"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setSearchParams(e.target.value === 'all' ? {} : { level: e.target.value }); }}
            className="h-9 text-sm border border-slate-200 rounded-lg px-2"
            data-testid="success-stories-level-select"
          >
            <option value="all">All levels</option>
            {LEVELS.map(l => <option key={l.n} value={l.n}>Level {l.n} — {l.name}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-10 text-slate-500" data-testid="success-stories-loading">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center" data-testid="success-stories-empty">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-slate-700 font-semibold">No stories yet</div>
            <div className="text-slate-500 text-sm mt-1">Add your first verified success story.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map(s => (
              <StoryCard
                key={s.id}
                s={s}
                isAdmin={isAdmin}
                onView={() => setViewing(s)}
                onEdit={() => openEdit(s)}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <StoryModal
          initial={editing || emptyForm}
          isEdit={!!editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
      {viewing && (
        <ViewStoryModal story={viewing} onClose={() => setViewing(null)} />
      )}
    </AdminLayout>
  );
};

const StoryCard = ({ s, isAdmin, onView, onEdit, onDelete }) => {
  const lvl = LEVEL_MAP[s.level] || LEVELS[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow" data-testid={`story-card-${s.id}`}>
      <div className="relative aspect-[16/9] bg-slate-100">
        {s.image_url ? (
          <img src={s.image_url} alt={s.student_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Trophy className="w-10 h-10" />
          </div>
        )}
        {s.is_flagship && (
          <div className="absolute top-2 left-2 bg-fuchsia-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            FLAGSHIP
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${lvl.chip}`}>
          L{s.level} · {lvl.name}
        </div>
        {!s.is_published && (
          <div className="absolute bottom-2 left-2 bg-slate-800/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            Draft
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-slate-900 truncate">{s.student_name}</div>
        <div className="text-xs text-slate-500 truncate">
          {[s.age && `${s.age} yrs`, s.school_name].filter(Boolean).join(' · ') || '—'}
        </div>
        {s.excerpt && <div className="text-xs text-slate-600 mt-1.5 line-clamp-2">{s.excerpt}</div>}
        {s.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {s.tags.slice(0, 3).map((t, i) => (
              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={onView}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center justify-center gap-1"
            data-testid={`view-story-${s.id}`}
          >
            <Eye className="w-3 h-3" />
            View
          </button>
          {isAdmin && (
            <>
              <button
                onClick={onEdit}
                className="text-xs px-2 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
                data-testid={`edit-story-${s.id}`}
                title="Edit"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="text-xs px-2 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700"
                data-testid={`delete-story-${s.id}`}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StoryModal = ({ initial, isEdit, onClose, onSaved, getAuthHeaders }) => {
  const [form, setForm] = useState({ ...emptyForm, ...initial, age: initial.age ?? '', level: initial.level || 1 });
  const [tagInput, setTagInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const imageRef = useRef(null);
  const fileRef = useRef(null);

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large (max 10MB)'); return; }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'images');
      const res = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      upd('image_url', res.data.url);
      toast.success('Image uploaded');
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingImage(false); e.target.value = ''; }
  };

  const uploadAttachment = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFile(true);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} too large (max 10MB)`); continue; }
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: file.name, url: res.data.url, type: file.type }] }));
      } catch { toast.error(`Failed: ${file.name}`); }
    }
    setUploadingFile(false);
    e.target.value = '';
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) upd('tags', [...form.tags, t]);
    setTagInput('');
  };

  const addLink = () => {
    const l = linkInput.trim();
    if (!l) return;
    if (!form.evidence_links.includes(l)) upd('evidence_links', [...form.evidence_links, l]);
    setLinkInput('');
  };

  const removeTag = (t) => upd('tags', form.tags.filter(x => x !== t));
  const removeLink = (l) => upd('evidence_links', form.evidence_links.filter(x => x !== l));
  const removeAttach = (idx) => upd('attachments', form.attachments.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!form.student_name.trim()) { toast.error('Student name required'); return; }
    if (!form.image_url) { toast.error('Please upload an image'); return; }
    if (!form.story || form.story === '<p></p>') { toast.error('Please write the story'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age === '' ? null : Number(form.age),
        level: Number(form.level),
      };
      if (isEdit) {
        await axios.patch(`${API}/success-stories/${initial.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Story updated');
      } else {
        await axios.post(`${API}/success-stories`, payload, { headers: getAuthHeaders() });
        toast.success('Story published');
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const selectedLevel = LEVEL_MAP[Number(form.level)] || LEVELS[0];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="story-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Success Story' : 'Add Verified Success Story'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Photo <span className="text-red-500">*</span></label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url ? (
                <div className="relative group">
                  <img src={form.image_url} alt="" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
                  <button
                    onClick={() => upd('image_url', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    data-testid="remove-image-btn"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
                  <Upload className="w-6 h-6" />
                </div>
              )}
              <div>
                <input ref={imageRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" data-testid="story-image-input" />
                <Button onClick={() => imageRef.current?.click()} disabled={uploadingImage} variant="outline" size="sm" data-testid="upload-image-btn">
                  {uploadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {form.image_url ? 'Replace' : 'Upload photo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Student name <span className="text-red-500">*</span></label>
              <Input value={form.student_name} onChange={(e) => upd('student_name', e.target.value)} data-testid="story-name-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Age</label>
              <Input type="number" min={5} max={25} value={form.age} onChange={(e) => upd('age', e.target.value)} data-testid="story-age-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">School (optional)</label>
              <Input value={form.school_name} onChange={(e) => upd('school_name', e.target.value)} data-testid="story-school-input" />
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Level of Success Story <span className="text-red-500">*</span></label>
            <div className="mt-1 grid grid-cols-5 gap-1.5">
              {LEVELS.map(l => (
                <button
                  key={l.n}
                  onClick={() => upd('level', l.n)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium bg-gradient-to-br ${l.tone} text-white ${Number(form.level) === l.n ? 'ring-2 ring-offset-1 ring-slate-900' : 'opacity-60 hover:opacity-90'}`}
                  data-testid={`level-btn-${l.n}`}
                >
                  <div className="text-[10px] opacity-80">Level {l.n}</div>
                  <div>{l.name}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 italic">{selectedLevel.desc}</div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Excerpt (short teaser for cards)</label>
            <Input
              value={form.excerpt}
              onChange={(e) => upd('excerpt', e.target.value)}
              placeholder="e.g. Won 1st place at CBSE National Robotics Fair"
              maxLength={200}
              data-testid="story-excerpt-input"
            />
          </div>

          {/* Story body — rich text */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Story <span className="text-red-500">*</span></label>
            <div className="mt-1 border border-slate-200 rounded-lg">
              <RichTextEditor
                content={form.story}
                onChange={(html) => upd('story', html)}
                placeholder="Write the full story — what did the student build, how it was verified, why it matters…"
                getAuthHeaders={getAuthHeaders}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Tags</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="e.g. AI, Robotics, Competition"
                data-testid="story-tag-input"
              />
              <Button onClick={addTag} variant="outline" size="sm" data-testid="add-tag-btn">Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    #{t}
                    <button onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Evidence links */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Evidence links (URLs)</label>
            <div className="flex gap-2 mt-1">
              <Input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                placeholder="https://... (competition page, media article, published game)"
                data-testid="story-link-input"
              />
              <Button onClick={addLink} variant="outline" size="sm" data-testid="add-link-btn">Add</Button>
            </div>
            {form.evidence_links.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.evidence_links.map((l) => (
                  <div key={l} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-2 py-1">
                    <a href={l} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {l}
                    </a>
                    <button onClick={() => removeLink(l)}><X className="w-3 h-3 text-slate-400 hover:text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments (certificates, revenue proof, etc.) */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Verification attachments</label>
            <div className="mt-1">
              <input ref={fileRef} type="file" multiple onChange={uploadAttachment} className="hidden" data-testid="story-attachment-input" />
              <Button onClick={() => fileRef.current?.click()} disabled={uploadingFile} variant="outline" size="sm" data-testid="upload-attachment-btn">
                {uploadingFile ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Paperclip className="w-3 h-3 mr-1" />}
                Upload certificates / proof
              </Button>
            </div>
            {form.attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-2 py-1">
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate flex items-center gap-1">
                      <Paperclip className="w-3 h-3 flex-shrink-0" />
                      {a.name}
                    </a>
                    <button onClick={() => removeAttach(i)}><X className="w-3 h-3 text-slate-400 hover:text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Verification notes (internal)</label>
            <textarea
              value={form.verification_notes}
              onChange={(e) => upd('verification_notes', e.target.value)}
              rows={2}
              placeholder="How was this verified? Who verified it? (Not shown publicly.)"
              className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-1"
              data-testid="story-verification-input"
            />
          </div>

          {/* Publish toggle */}
          <label className="flex items-center gap-2 text-sm" data-testid="story-publish-toggle">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => upd('is_published', e.target.checked)}
            />
            Publish to <span className="font-medium">oll.co/success-stories</span> (public site)
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-white pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving} data-testid="story-cancel-btn">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="story-save-btn">
            {saving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…</> : (isEdit ? 'Save changes' : 'Publish story')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ViewStoryModal = ({ story, onClose }) => {
  const lvl = LEVEL_MAP[story.level] || LEVELS[0];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="view-story-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lvl.chip}`}>
              L{story.level} · {lvl.name}
            </span>
            {story.student_name}
          </DialogTitle>
        </DialogHeader>
        {story.image_url && <img src={story.image_url} alt={story.student_name} className="w-full rounded-xl mb-3" />}
        <div className="text-xs text-slate-500">
          {[story.age && `${story.age} years old`, story.school_name].filter(Boolean).join(' · ')}
        </div>
        {story.excerpt && <div className="text-sm text-slate-700 italic mt-2">{story.excerpt}</div>}
        <div
          className="prose prose-sm max-w-none mt-3 text-slate-800"
          dangerouslySetInnerHTML={{ __html: story.story || '' }}
        />
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {story.tags.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{t}</span>)}
          </div>
        )}
        {story.evidence_links?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-1">Evidence</div>
            {story.evidence_links.map(l => (
              <a key={l} href={l} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 underline truncate">
                <ExternalLink className="w-3 h-3 inline mr-1" />{l}
              </a>
            ))}
          </div>
        )}
        {story.attachments?.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-700 mb-1">Attachments</div>
            {story.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 underline truncate">
                <Paperclip className="w-3 h-3 inline mr-1" />{a.name}
              </a>
            ))}
          </div>
        )}
        {story.verification_notes && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
            <span className="font-semibold">Internal verification notes:</span> {story.verification_notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminSuccessStories;
