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
 *   • `[text](https://url)`  AND  bare `https://…` URLs (auto-linked)
 *   • `- bullet`  OR  `* bullet`  (unordered list)
 *   • `1. item`                   (ordered list)
 *   • blank-line separated paragraphs
 *   • single `\n` inside a paragraph → `<br/>`
 */
// Placeholders used to carry formatting tags across the HTML-escape step.
const BR_SENTINEL = '\u0001BR\u0001';

export const mdToHtml = (raw = '') => {
  if (!raw) return '';
  const text = String(raw).replace(/\r\n?/g, '\n').trim();
  const blocks = text.split(/\n{2,}/);
  const out = [];

  for (const block of blocks) {
    const lines = block.split('\n');

    // YouTube iframe short-circuit: if a block is ONLY a YouTube URL (ignoring
    // optional surrounding whitespace or a leading "Video:" / "- " marker),
    // render it as a responsive iframe instead of a text link.
    const ytMatch = block.trim().match(
      /^(?:(?:Video|Watch)\s*:\s*|[-*]\s*)?(https?:\/\/(?:www\.)?(?:youtu\.be|youtube\.com|youtube-nocookie\.com)\/\S+?)\s*$/,
    );
    if (ytMatch) {
      const vid = youtubeIdFromUrl(ytMatch[1]);
      if (vid) {
        out.push(
          `<div class="faq-yt-embed" style="position:relative;width:100%;padding-bottom:56.25%;margin:12px 0;border-radius:12px;overflow:hidden;background:#000;">
            <iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1"
              style="position:absolute;inset:0;width:100%;height:100%;border:0;"
              title="YouTube video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
          </div>`,
        );
        continue;
      }
    }

    const isUl = lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOl = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (isUl) {
      const items = lines.map((l) => inline(l.replace(/^\s*[-*]\s+/, '')));
      out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`);
    } else if (isOl) {
      const items = lines.map((l) => inline(l.replace(/^\s*\d+\.\s+/, '')));
      out.push(`<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`);
    } else {
      // Replace newlines with a sentinel BEFORE escape, then restore as <br/>
      // AFTER escape so the raw '<', '>' characters that live inside '<br/>'
      // don't get HTML-escaped into '&lt;br/&gt;'. This was a visible bug —
      // bot replies showed literal '<br/>' in the chat bubble.
      const withSentinel = block.replace(/\n/g, BR_SENTINEL);
      const inlined = inline(withSentinel).split(BR_SENTINEL).join('<br/>');
      out.push(`<p>${inlined}</p>`);
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
  // Markdown links [text](url) — reject anything that isn't http(s) to block js:
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  // Auto-link bare URLs. Must NOT match URLs that already live inside an
  // href="…" attribute above — we check that the match isn't immediately
  // preceded by `"` or `=`.
  s = s.replace(
    /(^|[^"=>])(https?:\/\/[^\s<)]+[^\s<).,!?;:'"])/g,
    (m, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
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
