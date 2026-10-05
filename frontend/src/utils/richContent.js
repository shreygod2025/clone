/**
 * Tiny, dependency-free Markdown → safe HTML renderer.
 *
 * We only need a *subset* of Markdown for product descriptions coming
 * from the vendor panel: paragraphs, bullet lists, numbered lists,
 * bold/italic/code spans and links.  Pulling in react-markdown + rehype
 * for this would add ~90KB gzipped for zero benefit.
 *
 * SAFETY: output is intended for `dangerouslySetInnerHTML`.  We escape
 * every raw character, THEN re-introduce the formatting tags we support.
 * No `<script>`, no inline event handlers, no raw `<` can survive the
 * escape step.  Links are forced to rel="noopener noreferrer" and
 * target="_blank" since vendor-authored URLs are untrusted.
 */

const escapeHtml = (s = '') =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Convert a tiny subset of Markdown into HTML.
 * Supported:
 *   • `**bold**`, `__bold__`
 *   • `*italic*`, `_italic_`
 *   • `` `code` ``
 *   • `[text](https://url)`
 *   • `- bullet`  OR  `* bullet`  (unordered list)
 *   • `1. item`                   (ordered list)
 *   • blank-line separated paragraphs
 */
export const mdToHtml = (raw = '') => {
  if (!raw) return '';
  const text = String(raw).replace(/\r\n?/g, '\n').trim();
  const blocks = text.split(/\n{2,}/);
  const out = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const isUl = lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOl = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (isUl) {
      const items = lines.map((l) => inline(l.replace(/^\s*[-*]\s+/, '')));
      out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`);
    } else if (isOl) {
      const items = lines.map((l) => inline(l.replace(/^\s*\d+\.\s+/, '')));
      out.push(`<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`);
    } else {
      out.push(`<p>${inline(block.replace(/\n/g, '<br/>'))}</p>`);
    }
  }
  return out.join('');
};

const inline = (txt) => {
  // Escape first so no raw HTML sneaks in from the vendor doc
  let s = escapeHtml(txt);
  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold **text** or __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic *text* or _text_   (after bold so ** isn't greedy)
  s = s.replace(/(^|[\s(])\*([^\s*][^*]*?)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^\s_][^_]*?)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
  // Links [text](url) — reject anything that isn't http(s) to block js:
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  return s;
};

/**
 * Extract an 11-character YouTube video id from the many URL formats the
 * vendor might paste in (watch?v=, youtu.be/, youtube.com/embed/, shorts/).
 * Returns null when the URL is empty or unrecognisable, so the caller can
 * conditionally render.
 */
export const youtubeIdFromUrl = (url = '') => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Already an id?
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
};
