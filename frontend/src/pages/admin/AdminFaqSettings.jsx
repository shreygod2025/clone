/**
 * AdminFaqSettings — /admin/faq-settings
 *
 * Lets admins edit the knowledge base that OLLBot (the chatbot at /faq)
 * uses to answer users, without a code deploy.
 *
 * Reads/writes a single doc in the `faq_settings` MongoDB collection via
 * GET/PUT /api/admin/faq-settings.
 *
 * Structure matches the backend FaqSettings pydantic model:
 *   techfest / shop / programs / support / core_facts  — big textareas
 *   suggestions                                         — list of starter chips
 *   include_live_products                               — toggle
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Save, Loader2, Trophy, ShoppingBag, GraduationCap, LifeBuoy, Globe,
  Sparkles, Plus, X, RefreshCw, ExternalLink, Building2, MapPin, FileDown,
} from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SECTIONS = [
  {
    key: 'techfest',
    title: 'Techfest 2026',
    desc: 'Rules, dates, arena/track specs, team sizes, prize pool, regional round venues.',
    icon: Trophy,
    rows: 18,
  },
  {
    key: 'shop',
    title: 'Shop & Kits',
    desc: 'Shop URL, 4 categories, delivery, flagship kits + the strict "no external sellers" policy.',
    icon: ShoppingBag,
    rows: 16,
  },
  {
    key: 'school_products',
    title: 'School Products (B2B)',
    desc: 'Robotics Lab Setup, Future Skills (ICSE/CBSE), AI Center, Group 3 Subject, Entrepreneurship — the full school programs catalog.',
    icon: Building2,
    rows: 20,
  },
  {
    key: 'programs',
    title: 'B2C Learning Programs & Camps',
    desc: 'AI Foundations, Summer Camp, Continuous Learning, Workshops, Future Skills.',
    icon: GraduationCap,
    rows: 14,
  },
  {
    key: 'centers',
    title: 'OLL Centers (physical labs)',
    desc: 'Context about centers, batches, how to join. The LIVE centers list below is injected automatically.',
    icon: MapPin,
    rows: 10,
  },
  {
    key: 'brochures',
    title: 'Brochures & PDF downloads',
    desc: 'Direct links to downloadable PDFs — problem statements, program brochures, kit datasheets.',
    icon: FileDown,
    rows: 10,
  },
  {
    key: 'support',
    title: 'Support Policy',
    desc: 'Response SLAs, contact channels, escalation flow.',
    icon: LifeBuoy,
    rows: 10,
  },
  {
    key: 'core_facts',
    title: 'Core Facts & Sitemap',
    desc: 'Company facts + the master URL list the bot pastes when users ask "where is X?".',
    icon: Globe,
    rows: 16,
  },
];

const LIVE_TOGGLES = [
  { key: 'include_live_products', label: 'Inject live OLL Shop catalog',
    desc: 'Pulls every product currently visible on /shop (name, category, ₹price, correct SEO slug URL). Prevents the bot from inventing broken product links.' },
  { key: 'include_live_centers', label: 'Inject live Centers list',
    desc: 'Pulls name / address / phone / email / maps-link for every active OLL center so the bot can direct users precisely.' },
  { key: 'include_live_offerings', label: 'Inject live School Offerings catalog',
    desc: 'Pulls every B2B school program (Robotics Lab, Future Skills, AI Center…) with its canonical URL.' },
  { key: 'include_live_blogs', label: 'Inject recent Blogs',
    desc: 'Pulls up to 25 most-recent published blog titles + slugs so the bot can share articles when relevant.' },
];

const AdminFaqSettings = () => {
  const { getAuthHeaders } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newChip, setNewChip] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/faq-settings`, { headers: getAuthHeaders() });
      setSettings(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load FAQ settings');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const addChip = () => {
    const t = newChip.trim();
    if (!t) return;
    if ((settings?.suggestions || []).includes(t)) {
      toast.error('Already in the list');
      return;
    }
    update('suggestions', [...(settings?.suggestions || []), t]);
    setNewChip('');
  };

  const removeChip = (idx) => {
    update('suggestions', (settings?.suggestions || []).filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/faq-settings`, settings, { headers: getAuthHeaders() });
      toast.success('FAQ chatbot updated — changes are live now');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <AdminLayout title="FAQ Chatbot Settings">
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="FAQ Chatbot Settings">
      <div className="space-y-6" data-testid="admin-faq-settings">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D63031]">
              <Sparkles className="w-3.5 h-3.5" /> OLLBot knowledge base
            </div>
            <h2 className="text-lg font-black text-[#0A1F44] mt-1">Edit what the chatbot knows</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Every section below is injected into the chatbot&apos;s system prompt on
              every request. Save and the next question will use the fresh content —
              no code deploy, no restart.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/faq"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1F44] bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2"
              data-testid="admin-faq-open-live"
            >
              Open live chatbot <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Button
              variant="outline"
              onClick={load}
              disabled={saving}
              data-testid="admin-faq-reload"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-[#D63031] hover:bg-[#B91C1C] text-white"
              data-testid="admin-faq-save"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save changes
            </Button>
          </div>
        </div>

        {/* Live-data injection toggles */}
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {LIVE_TOGGLES.map((t) => (
            <div key={t.key} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#0A1F44] text-sm">{t.label}</div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">{t.desc}</p>
              </div>
              <Switch
                checked={!!settings[t.key]}
                onCheckedChange={(v) => update(t.key, v)}
                data-testid={`admin-faq-toggle-${t.key}`}
              />
            </div>
          ))}
        </div>

        {/* Starter chips */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-bold text-[#0A1F44] text-sm">Starter questions (chips shown on /faq)</div>
          <p className="text-xs text-slate-500 mt-1">
            The first-visit suggestion chips. 4–8 is ideal.
          </p>
          <div className="mt-3 flex flex-wrap gap-2" data-testid="admin-faq-chips">
            {(settings.suggestions || []).map((s, idx) => (
              <span
                key={`${s}-${idx}`}
                className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700"
              >
                {s}
                <button
                  onClick={() => removeChip(idx)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${s}`}
                  data-testid={`admin-faq-chip-remove-${idx}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={newChip}
              onChange={(e) => setNewChip(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
              placeholder="Add a starter question (press Enter)"
              className="max-w-md"
              data-testid="admin-faq-chip-input"
            />
            <Button variant="outline" onClick={addChip} data-testid="admin-faq-chip-add">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </div>
        </div>

        {/* Knowledge sections */}
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <div key={sec.key} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`admin-faq-section-${sec.key}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#0A1F44]/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#0A1F44]" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[#0A1F44] text-sm">{sec.title}</div>
                  <p className="text-xs text-slate-500">{sec.desc}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {(settings[sec.key] || '').length} chars
                </span>
              </div>
              <Textarea
                value={settings[sec.key] || ''}
                onChange={(e) => update(sec.key, e.target.value)}
                rows={sec.rows}
                className="font-mono text-xs leading-relaxed"
                data-testid={`admin-faq-textarea-${sec.key}`}
              />
            </div>
          );
        })}

        {/* Footer save bar */}
        <div className="sticky bottom-4 flex justify-end z-20">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#D63031] hover:bg-[#B91C1C] text-white shadow-xl"
            data-testid="admin-faq-save-bottom"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save changes
          </Button>
        </div>

        {settings.updated_at && (
          <div className="text-[11px] text-slate-500 text-right">
            Last updated {new Date(settings.updated_at).toLocaleString()}
            {settings.updated_by ? ` by ${settings.updated_by}` : ''}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFaqSettings;
