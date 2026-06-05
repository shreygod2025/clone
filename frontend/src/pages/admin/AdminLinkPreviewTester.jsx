import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Link2, Search, AlertTriangle, CheckCircle2, ExternalLink,
  Loader2, Image as ImageIcon, Globe, Twitter, Linkedin, Copy, RefreshCw,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESETS = [
  { label: "Father's Day Workshop", url: 'https://oll.co/workshops/fathers-day-robotics' },
  { label: 'Summer Camp',           url: 'https://oll.co/summer-camp' },
  { label: 'AI Foundations',        url: 'https://oll.co/ai-foundations' },
  { label: 'Future Skills',         url: 'https://oll.co/future-skills' },
  { label: 'Homepage',              url: 'https://oll.co/' },
];

const getAuthHeadersDefault = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const AdminLinkPreviewTester = () => {
  const auth = useAuth();
  const getAuthHeaders = auth?.getAuthHeaders || getAuthHeadersDefault;
  const [url, setUrl] = useState('https://oll.co/workshops/fathers-day-robotics');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const inspect = useCallback(async (target = url) => {
    if (!target || !/^https?:\/\//.test(target)) {
      toast.error('Enter an absolute URL (https://…)');
      return;
    }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await axios.get(`${API}/admin/link-preview`, {
        params: { url: target },
        headers: getAuthHeaders(),
      });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to inspect');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const copy = (s) => { navigator.clipboard.writeText(s); toast.success('Copied'); };

  const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-4" data-testid="link-preview-tester">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <Link2 className="w-7 h-7 text-blue-600" />
              Link Preview Tester
            </h1>
            <p className="text-sm text-slate-500 mt-1">Inspect what WhatsApp, Facebook, LinkedIn, X &amp; Google see for any URL.</p>
          </div>
        </div>

        {/* Input + presets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-5">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://oll.co/…"
                className="pl-9 h-11" data-testid="lpt-url-input"
                onKeyDown={e => { if (e.key === 'Enter') inspect(); }} />
            </div>
            <Button onClick={() => inspect()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6" data-testid="lpt-inspect-btn">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Inspect
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400 mr-1 self-center">Presets:</span>
            {PRESETS.map(p => (
              <button key={p.url} onClick={() => { setUrl(p.url); inspect(p.url); }}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 transition"
                data-testid={`lpt-preset-${p.label}`}>{p.label}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 flex items-start gap-2" data-testid="lpt-error">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-400" />
            <p className="text-sm text-slate-500 mt-2">Fetching as a social crawler…</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">
            {/* Status bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="lpt-status-bar">
              <Stat label="Status"  value={data.status_code} ok={data.status_code === 200} />
              <Stat label="Fetch"   value={`${data.fetch_ms}ms`} />
              <Stat label="Image"   value={data.image_check?.status ? `${data.image_check.status} · ${data.image_check.content_type || 'n/a'}` : '—'}
                    ok={data.image_check?.status === 200 && (data.image_check?.content_type || '').startsWith('image/')} />
              <Stat label="Missing tags" value={data.missing.length} warn={data.missing.length > 0} />
            </div>

            {/* Missing checklist */}
            {data.missing.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4" data-testid="lpt-missing">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <strong className="text-sm text-amber-800">Missing recommended tags</strong>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.missing.map(m => (
                    <code key={m} className="text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded">{m}</code>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp / Facebook preview */}
            <Section title="WhatsApp / Facebook preview" icon={<Globe className="w-4 h-4 text-emerald-600" />}>
              <WhatsAppPreview data={data} domain={domainOf(data.final_url)} />
            </Section>

            {/* Twitter card */}
            <Section title="X (Twitter) Card preview" icon={<Twitter className="w-4 h-4 text-sky-500" />}>
              <TwitterPreview data={data} domain={domainOf(data.final_url)} />
            </Section>

            {/* LinkedIn preview */}
            <Section title="LinkedIn preview" icon={<Linkedin className="w-4 h-4 text-[#0a66c2]" />}>
              <LinkedInPreview data={data} domain={domainOf(data.final_url)} />
            </Section>

            {/* Google SERP */}
            <Section title="Google search result preview" icon={<Search className="w-4 h-4 text-slate-700" />}>
              <GooglePreview data={data} domain={domainOf(data.final_url)} />
            </Section>

            {/* Raw tags */}
            <Section title="Raw tags" icon={<Copy className="w-4 h-4 text-slate-500" />} defaultOpen={false} collapsible>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <KV label="<title>"             value={data.title}          onCopy={copy} />
                <KV label='meta description'    value={data.description}    onCopy={copy} />
                <KV label='rel="canonical"'     value={data.canonical}      onCopy={copy} />
                <KV label='html lang'           value={data.lang}           onCopy={copy} />
                <KV label='og:title'            value={data.og.title}       onCopy={copy} />
                <KV label='og:description'      value={data.og.description} onCopy={copy} />
                <KV label='og:image'            value={data.og.image}       onCopy={copy} />
                <KV label='og:image:alt'        value={data.og.image_alt}   onCopy={copy} />
                <KV label='og:image:width'      value={data.og.image_width} onCopy={copy} />
                <KV label='og:image:height'     value={data.og.image_height} onCopy={copy} />
                <KV label='og:type'             value={data.og.type}        onCopy={copy} />
                <KV label='og:site_name'        value={data.og.site_name}   onCopy={copy} />
                <KV label='twitter:card'        value={data.twitter.card}        onCopy={copy} />
                <KV label='twitter:title'       value={data.twitter.title}       onCopy={copy} />
                <KV label='twitter:description' value={data.twitter.description} onCopy={copy} />
                <KV label='twitter:image'       value={data.twitter.image}       onCopy={copy} />
              </div>
            </Section>

            {/* JSON-LD */}
            {data.json_ld.length > 0 && (
              <Section title={`Structured data (JSON-LD · ${data.json_ld.length} block${data.json_ld.length > 1 ? 's' : ''})`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} defaultOpen={false} collapsible>
                <div className="space-y-2">
                  {data.json_ld.map((b, i) => (
                    <details key={i} className="bg-slate-900 text-slate-100 rounded-lg overflow-hidden">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-mono select-none border-b border-slate-700">
                        Block {i + 1} {b.parsed?.['@type'] && <span className="text-emerald-400">— {String(b.parsed['@type'])}</span>}
                      </summary>
                      <pre className="p-3 text-[11px] overflow-x-auto">{b.parsed ? JSON.stringify(b.parsed, null, 2) : `// INVALID JSON\n${b.raw}`}</pre>
                    </details>
                  ))}
                </div>
              </Section>
            )}

            {/* External debug tool shortcuts */}
            <Section title="Force-refresh on real platforms" icon={<ExternalLink className="w-4 h-4 text-slate-500" />}>
              <p className="text-xs text-slate-500 mb-3">After deploying changes, social platforms cache previews for days. Use these to force a re-scrape.</p>
              <div className="flex flex-wrap gap-2">
                <ExternalBtn href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`} label="Facebook / WhatsApp Debugger" />
                <ExternalBtn href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(url)}`} label="LinkedIn Post Inspector" />
                <ExternalBtn href={`https://cards-dev.twitter.com/validator?url=${encodeURIComponent(url)}`} label="X Card Validator" />
                <ExternalBtn href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`} label="Google Rich Results" />
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Small subcomponents ─────────────────────────────────────────────

const Stat = ({ label, value, ok, warn }) => (
  <div className={`rounded-lg border p-3 ${ok ? 'bg-emerald-50 border-emerald-200' : warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
    <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
    <div className="text-sm font-bold text-slate-800 mt-0.5">{value ?? '—'}</div>
  </div>
);

const Section = ({ title, icon, children, defaultOpen = true, collapsible = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center gap-2 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setOpen(o => !o)}>
        {icon}
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      {(open || !collapsible) && <div className="p-4">{children}</div>}
    </div>
  );
};

const KV = ({ label, value, onCopy }) => (
  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
    <div className="flex items-center justify-between mb-1">
      <code className="text-[10px] uppercase tracking-wider text-slate-400">{label}</code>
      {value && <button onClick={() => onCopy(value)} className="text-slate-400 hover:text-slate-700"><Copy className="w-3 h-3" /></button>}
    </div>
    <div className={`text-xs break-all ${value ? 'text-slate-800' : 'italic text-slate-400'}`}>{value || 'not set'}</div>
  </div>
);

const ExternalBtn = ({ href, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
    className="text-xs px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-700 inline-flex items-center gap-1.5">
    {label} <ExternalLink className="w-3 h-3" />
  </a>
);

// ── Platform previews ────────────────────────────────────────────────

const previewTitle = (d) => d.og?.title || d.twitter?.title || d.title || '(no title)';
const previewDesc  = (d) => d.og?.description || d.twitter?.description || d.description || '';
const previewImg   = (d) => d.og?.image || d.twitter?.image;

const PreviewImg = ({ src, alt, className }) => (
  src ? <img src={src} alt={alt} className={className} loading="lazy" />
      : <div className={`${className} bg-slate-200 flex items-center justify-center text-slate-400`}><ImageIcon className="w-6 h-6" /></div>
);

const WhatsAppPreview = ({ data, domain }) => (
  <div className="max-w-md rounded-xl overflow-hidden border border-slate-200 bg-[#ECE5DD] p-3">
    <div className="bg-white rounded-lg overflow-hidden shadow border border-slate-200">
      <PreviewImg src={previewImg(data)} alt="og" className="w-full h-44 object-cover" />
      <div className="p-3">
        <div className="text-[15px] font-semibold text-slate-900 line-clamp-2">{previewTitle(data)}</div>
        <div className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{previewDesc(data)}</div>
        <div className="text-[11px] text-slate-400 mt-1.5 uppercase">{domain}</div>
      </div>
    </div>
  </div>
);

const TwitterPreview = ({ data, domain }) => (
  <div className="max-w-md rounded-2xl overflow-hidden border border-slate-300 bg-white">
    <PreviewImg src={previewImg(data)} alt="tw" className="w-full h-44 object-cover" />
    <div className="p-3 border-t border-slate-100">
      <div className="text-[11px] text-slate-500">{domain}</div>
      <div className="text-[14px] font-semibold text-slate-900 mt-0.5 line-clamp-1">{previewTitle(data)}</div>
      <div className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{previewDesc(data)}</div>
    </div>
  </div>
);

const LinkedInPreview = ({ data, domain }) => (
  <div className="max-w-md rounded-md overflow-hidden border border-slate-200 bg-white">
    <PreviewImg src={previewImg(data)} alt="li" className="w-full h-52 object-cover" />
    <div className="p-3 bg-slate-50">
      <div className="text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">{previewTitle(data)}</div>
      <div className="text-[11px] text-slate-500 mt-1 uppercase">{domain}</div>
    </div>
  </div>
);

const GooglePreview = ({ data, domain }) => (
  <div className="max-w-xl">
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">O</div>
      <div>
        <div className="text-[12px] text-slate-700 font-medium">OLL</div>
        <div className="text-[11px] text-slate-500">{domain} · {data.canonical || data.final_url}</div>
      </div>
    </div>
    <div className="text-[18px] text-[#1a0dab] hover:underline cursor-pointer leading-snug">{data.title || '(no title)'}</div>
    <div className="text-[13px] text-slate-700 mt-1 leading-snug line-clamp-3">{data.description || '(no description)'}</div>
  </div>
);

export default AdminLinkPreviewTester;
