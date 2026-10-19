## 2026-02-10 — Techfest Bulk Email broadcaster (Admin → Competitions)

- **New backend route** `routes/techfest_bulk_email.py` with:
  - `GET /api/admin/techfest/bulk-email/default-template` — the OLL × Techfest "Important Checklist" HTML + subject.
  - `POST /api/admin/techfest/bulk-email/preview` — audience count + sample for filters `{types[], zones[], competitions[]}`.
  - `POST /api/admin/techfest/bulk-email/send-sample` — one-off test (default `shreyaan@oll.co`).
  - `POST /api/admin/techfest/bulk-email/send` — background blast, logs to new `techfest_bulk_campaigns` collection.
  - `GET /api/admin/techfest/bulk-email/campaigns` — history (last 50).
- **Audience source**: `techfest_registrations` collection, filtered by `type ∈ {student,school,educator}` + optional `zone` + `selected_competitions`. De-dup by lowercase email.
- **Email render**: reuses the branded `_shell` from `routes/techfest_emails.py` (OLL × Techfest IIT Bombay 2026 masthead). Personalisation tokens: `{{first_name}}`, `{{name}}`, `{{school}}`.
- **Checklist template** matches the exact copy requested by the user: deadline card, registration guide buttons, WhatsApp CTA, kit purchase+video pairs, submission guide, regional rounds table, finale callout, help/FAQ footer.
- **Frontend**: new `pages/admin/TechfestBulkEmailDialog.jsx` + "Email Blast" (Megaphone icon) button in the Admin Competitions toolbar. Dialog has:
  - Audience chips with live count + per-type tally; "Custom segment" expander for zones + competitions.
  - Compose / Preview tabs (preview rendered in sandboxed iframe).
  - Prefilled subject + HTML body, "Reset to default" link.
  - "Send sample" with tester email prefilled to `shreyaan@oll.co`.
  - "Send to N recipients" with explicit confirmation modal.
  - Toggleable History panel showing recent campaigns, status, sent/total/failed counts.
- **Verified**: sample email delivered to `shreyaan@oll.co` (Resend ID `01a12051-c501-72a4-ac81-c574f97a6dd9`). Audience preview returns 8 recipients (4 schools + 4 educators) from the current test data.


# OLL Backend Changelog

## 2026-10-09 — My Bookings loader fix + Shop Orders tab + Login type rework
**Status: COMPLETE · backend + frontend verified**

### 1) `/my-bookings` stuck on "Loading your bookings…"
- Root cause: the `useEffect` only called `fetchBookings` when `user.phone` existed. For accounts without a phone on file (common for email-login learners), the fetch never fired and the initial `loading=true` state hung forever.
- Fix (`MyBookingsPage.jsx`): a second branch — if logged-in but phone is missing, `setLoading(false)` immediately and still kick off `fetchShopOrders` so the learner at least sees their shop activity.

### 2) Shop Orders inside My Bookings
- New backend endpoints in `routes/shop.py`:
  - `GET /api/shop/my-orders?email=…&phone=…` returns PAID shop orders for the signed-in learner (matches by `customer.email` OR `customer.phone`). Payload includes a `refund_requests` array per order so the UI can show "requested" state without a second roundtrip.
  - `POST /api/shop/refund-request { order_id, reason, email, phone }` — validates ownership against the stored customer email/phone, enforces 10-char-min reason, blocks duplicate open requests, and flags `shop_orders.refund_requested=true` so admins see it in `/admin/shop`.
- New frontend state + fetcher `fetchShopOrders` in `MyBookingsPage.jsx` + a **Shop Orders** tab button (visible only when the account has at least one paid order).
- Each order card shows: order id, date, total, item count, status, tracking button (opens the shiprocket URL in a new tab), invoice link, and a **Request refund** button that opens a modal with a textarea; a refund request already in flight renders a "Refund requested" pill instead of the button.

### 3) Login page: Learner · School · Educator
- Replaced the 3-way `Learner / School · Educator · Summer Camp Parent` picker with the requested `Learner · School · Educator` layout.
- "Learner" now explicitly mentions bookings + sessions + shop orders; "School" uses the Building2 icon + emerald tint and routes to the same `/my-bookings` page (the page already surfaces school receipts).
- Removed all `summer_camp` branches in the LoginPage (routing, prompts, footer link, Sun icon import). Educator → `/educator-dashboard`, everyone else → `/my-bookings`.
- Added `data-testid`s: `login-type-learner`, `login-type-school`, `login-type-educator`.

### Verification
- `GET /api/shop/my-orders?email=…` returns `{orders:[]}` for an unknown email → 200.
- Frontend compiles cleanly (1 unrelated hook-deps warning).


## 2026-10-09 — FAQ Analytics: AI reply inline + thumbs-up / thumbs-down training
**Status: COMPLETE · verified end-to-end via curl**

### Scope
Reworked the admin FAQ analytics dashboard to show each question's AI reply inline, let admins approve or correct it, and short-circuit the public chat with those admin-trained answers next time the same question is asked.

### Backend (`routes/faq_chat.py`)
- **Log full answer** — `_log_chat` now stores `answer_text` (up to 20k chars) alongside the 500-char `answer_preview` so the admin UI can show the entire reply.
- **Analytics aggregation extended** — `/admin/faq-chat/analytics` now groups by `question_normalised` (which already collapses same-session follow-ups + near-duplicate wording) and returns per-row `latest_answer`, `latest_source`, `latest_log_id`, `session_count`, plus any admin-trained `canonical_answer` / `canonical_verdict` / `canonical_updated_at` overlaid from the new collection.
- **Canonical-answer endpoints**:
  - `POST /api/admin/faq-chat/canonical-answer { question, answer, verdict: approved|corrected, log_id? }` — upserts into `faq_canonical_answers` keyed on `question_normalised`.
  - `DELETE /api/admin/faq-chat/canonical-answer?question=…` — removes a trained override.
- **Fast path 0 in public chat** — before pre-canned and cache lookups, the public `/faq-chat` endpoint now checks `faq_canonical_answers` for the normalised question. If present, it returns the admin-trained answer verbatim (zero LLM cost, `source='pre_canned'`).

### Admin UI (`AdminFaqAnalytics.jsx`)
- Each row is a question card: click to expand and see the AI reply rendered as sanitised markdown HTML.
- Collapsed preview still shows the first ~180 chars of the reply alongside the question.
- **Thumbs-up** → saves the current reply as `approved` canonical answer (next visitors get it instantly).
- **Thumbs-down** → opens an inline textarea pre-filled with the current reply so the admin edits in place → saves as `corrected` canonical answer.
- Rows that already have a trained override show a pill badge ("Approved" / "Trained · corrected") and a "Remove override" action to revert.
- Sort options unchanged (most asked / least asked / latest / oldest / most liked / most disliked) — all were already present.
- Session count and source (`llm` / `cache` / `pre_canned`) shown in the expanded footer for context.

### Verification
- `POST /admin/faq-chat/canonical-answer` returns `{ok:true, verdict:'corrected'}` and persists to `faq_canonical_answers`.
- Subsequent public `/faq-chat` for the same question returns `source='pre_canned'` with the admin-trained text — confirmed via curl against the local backend.


## 2026-10-09 — Blog save failure fix (duplicate slug + opaque error toast)
**Status: COMPLETE · verified via curl**

### Root cause
`blogs.slug` has a unique Mongo index. When the admin saved a blog whose slug (auto-generated from the title or manually entered) already existed, Mongo raised `DuplicateKeyError` → FastAPI returned a generic 500 → the frontend swallowed the real reason behind `toast.error('Failed to save content')`. From the admin's perspective, there was no actionable signal.

### Fix
- **Backend** (`routes/educators.py`): wrapped both `POST /blogs` and `PATCH /blogs/{id}` in `try: … except DuplicateKeyError` → `HTTPException(409, detail="A blog with this slug already exists. Please change the slug and try again.")`. Also removed a leftover duplicate `update_one` call that was accidentally re-saving after the error path.
- **Frontend** (`AdminBlogs.jsx :: handleSubmit`): the catch now unpacks `error.response.data.detail` (string OR Pydantic array OR fallback `.message`) and shows it inside the toast — so admins see the real reason (duplicate slug, validation failure, etc.) instead of the generic "Failed to save content".

### Verification
- `POST /api/blogs` with duplicate slug now returns `409` and body `{"detail":"A blog with this slug already exists…"}`.
- Fresh creates still return `200` with the full blog payload including the new CTA/eyebrow fields.


## 2026-10-08 — Blog uploads, hero redesign, CTA system, YouTube iframe fix
**Status: COMPLETE · backend verified end-to-end · frontend compiles cleanly**

### Admin form upgrades (`AdminBlogs.jsx` + new `ImageUploadField`)
- Cover Image + OG Image fields swapped from text inputs to a new `ImageUploadField` component that supports click-to-upload, drag-and-drop, and (behind a toggle) a "paste URL instead" fallback.
- New `Header & Hero CTA Buttons` section:
  - `hero_eyebrow` — small uppercase label above the hero title.
  - `navbar_ctas[]` — up to 2 pills on the sticky top navbar.
  - `hero_ctas[]` — up to 2 big buttons in the navy hero.
  - Each CTA has label + url + variant (`primary` red / `secondary` dark). Repeater UI with Add / Trash controls.

### Rich editor (`RichTextEditor.jsx`)
- New toolbar button → opens an **Insert CTA Button** modal (label + URL + style preview). Inserts `<a class="blog-cta blog-cta-{variant}">` so the admin never touches HTML.
- Image upload flow unchanged (click → file picker → modal with alt + caption + link).

### Public blog page (`BlogDetailPage.jsx` — full rewrite)
- Navy gradient hero with the admin-configurable OLL **pill navbar** (white rounded shell + CTAs on the right).
- Hero content: breadcrumbs, eyebrow badge, title, excerpt, date / read-time / author row, and up to 2 hero CTAs.
- Right-side **sticky TOC** ("On this page") replaces the inline TOC — appears when ≥ 2 H2/H3 headings exist.
- YouTube URLs that TipTap didn't convert to iframes are **post-processed into responsive 16:9 iframes** before DOMPurify runs (handles both `youtu.be/<id>` and `youtube.com/watch?v=<id>`, bare or `<a>`-wrapped).
- DOMPurify sanitize profile unchanged — `blog-cta` + `callout` classes already survive via `ALLOWED_URI_REGEXP` + attribute allowlist. CTA buttons styled via a global `blog-prose a.blog-cta-*` CSS rule.

### Backend (`routes/educators.py`)
- Blog model extended with `hero_eyebrow`, `navbar_ctas: List[CTAItem]`, `hero_ctas: List[CTAItem]` where `CTAItem = { label, url, variant }`. Verified round-trip via curl POST.

### Hardcoded ICSE / RoboSumo blog pages
- Not auto-migrated — the two existing JSX pages (`ICSECode66BlogPage.jsx`, `RoboSumoBuildGuideBlog.jsx`) are 1400+ line React landing pages with bespoke components, animations and layout that would lose fidelity if blindly converted to HTML. They remain code-managed. A dedicated migration task can port each one section-by-section into DB blogs when the user is ready.


## 2026-10-08 — Blog admin polish — sidebar + upload-first + text colour
**Status: COMPLETE · frontend compiles cleanly**

### 1) "Blogs" tab missing from admin sidebar
- `AdminDashboard.jsx` had Blogs commented out and moved to Settings → Blogs tab. Added it back as a top-level sidebar entry: `{ path: '/admin/blogs', icon: FileText, label: 'Blogs', permission: 'blogs' }`. Super_admin (admin@oll.co) sees it automatically; scoped admins need the `blogs` permission.

### 2) Image insertion is now upload-first, modal-second
- `RichTextEditor.jsx :: handleImageUpload` no longer silently inserts the uploaded image. Instead it opens the Image modal pre-filled with the server URL AND a smart default `alt` derived from the filename, so admins can polish alt + caption + optional link before the image lands in the body.
- Toolbar now shows the Upload button (file picker) prominently; the small 🔗 icon next to it opens the "Insert from URL" path for pasting a remote URL. The modal is identical for both flows.

### 3) Text colour picker
- Added `@tiptap/extension-text-style` + `@tiptap/extension-color` to the editor. The toolbar now has a Palette chip (native `<input type=color>` overlay) that applies colour on change plus a reset button. Marks round-trip through `getHTML()` as inline `<span style="color:…">` which DOMPurify already permits in the published renderer.
- Named exports (`{ TextStyle }` / `{ Color }`) — the 3.26.1 build changed from default to named exports; using the default import crashed webpack.


## 2026-10-08 — Permanent Blog system (CRUD + rich editor + SEO + rendering)
**Status: COMPLETE · backend verified end-to-end · frontend compiles cleanly**

### Scope
Replaced the half-finished blog subsystem with a permanent, SEO-first setup across backend model, admin UI, rich-text editor, and public rendering.

### Backend (`/app/backend/routes/educators.py`)
- Blog model extended with `meta_title`, `meta_description`, `canonical_url`, `keywords[]`, `og_image`, and `reading_time_minutes` (auto-computed from word count on create/update when admin leaves it 0).
- Cache invalidated on create + delete (list cache was already cleared on update).

### Rich text editor (`/app/frontend/src/components/RichTextEditor.jsx`)
TipTap-powered with new extensions:
- **Highlight** (coloured text background, multicolor-enabled) — yellow by default; mark saved as `data-color` for lossless round-trip.
- **Callout** block Node (`/app/frontend/src/components/tiptap/Callout.js`) with 4 variants — info (blue), success (green), warning (amber), note (purple). Rendered as `<div class="callout callout-{variant}" data-variant="{variant}">…</div>` with a left border + tinted background.
- **SeoImage** extension (`/app/frontend/src/components/tiptap/SeoImage.js`) that extends `@tiptap/extension-image` to require `alt`, accept `title` (caption/hover tooltip), and optionally wrap the `<img>` in an `<a>` when a `linkHref` is provided (common SEO pattern for citing sources).
- Image modal rewritten to collect `src` + `alt` (required) + `title` + optional `linkHref`.
- Toolbar gains buttons for Highlight, 4 Callout variants, and "Insert Image from URL" (next to the existing file-upload button).
- Editor styles updated to visually preview callouts and highlights so admins see the final rendering while editing.

### Admin UI (`/app/frontend/src/pages/admin/AdminBlogs.jsx`)
Added a collapsible **SEO & Social Preview** section inside the create/edit form with char-counted inputs for meta_title (0/70) and meta_description (0/170), canonical URL, keywords (comma-separated), and OG image preview thumbnail. `resetForm` + `openEditForm` carry the new fields through.

### Public blog page (`/app/frontend/src/pages/BlogDetailPage.jsx`)
Full rewrite:
- Uses the shared `Navbar` + `Footer`.
- DOMPurify-sanitized HTML output with a strict allowlist (iframes + img + anchor + callout div with `data-variant` + mark/code/pre). Blocks `javascript:` payloads via `ALLOWED_URI_REGEXP`.
- Full `<Helmet>` block: `<title>`, meta description, `<link rel="canonical">`, Open Graph (`og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `article:*`), Twitter card, and a JSON-LD `BlogPosting` script with publisher, author, dates and keywords.
- Automatic TOC (table-of-contents) from H2/H3 headings when the post has ≥ 3 of them, with anchor links.
- Prose styles mirror the editor so previews match published pages. Callouts, highlights, iframes, images, blockquotes, code blocks all render with the exact same look & feel as inside the editor.

### Navbar (`/app/frontend/src/components/Navbar.jsx`)
`Blog` menu item now routes to the in-app `/blogs` page (previously it was a hard link to the WordPress mirror). The admin-managed posts are the canonical source going forward.

### Dependencies
`yarn add dompurify @tiptap/extension-highlight@3.26.1` — pinned to match the installed `@tiptap/core@3.26.1`; a floating `^3.26` picked up 3.31 which broke build with a missing `isValidCSSStyleValue` export.

### Verification
- Backend: POST `/api/blogs` with every new SEO field persists correctly and auto-computes `reading_time_minutes=1` from the body. Returned payload includes all fields verbatim.
- Frontend: webpack compiled with 1 warning (unrelated hook-deps), 0 errors after cache clear.


## 2026-10-08 — Techfest Submission Portal + 4k+ student import
**Status: COMPLETE · backend verified end-to-end via curl**

### 1) Submission confirmation page + OTP-gated self-service portal
Students can now access and edit their Techfest submission any time until **20 Oct 2026 11:59 PM IST** without an account.

**New backend module** `/app/backend/routes/techfest_submission_portal.py` adds:
- `POST /api/techfest/submission-portal/request-otp` → 6-digit code, SHA-256-hashed in `techfest_portal_otps` with a 10-minute TTL and 30-second resend cooldown. Email delivered via Resend; WhatsApp sent best-effort via **AiSensy** (`AISENSY_API_KEY` + `AISENSY_OTP_TEMPLATE=techfest_portal_otp`) when the submission has a phone on file.
- `POST /api/techfest/submission-portal/verify-otp` → issues a 24-hour JWT (scope `techfest_submission_portal`) signed with `JWT_SECRET`.
- `GET  /api/techfest/submission-portal/my` → list this email's submissions with `edit_cutoff_utc` + `edit_window_open`.
- `PATCH /api/techfest/submission-portal/submission/{id}` → whitelisted update, blocks when cutoff passed, enforces email match on the record.

**Frontend**
- `TechfestSubmitPage.jsx` success state now shows the submission reference ID, confirms the email was sent, and surfaces a prominent **"View / Update Submission"** CTA linking to the portal.
- New page `/techfest/my-submission` (`TechfestSubmissionPortalPage.jsx`) implements the 3-step flow: email → OTP → list/edit form. Token + email persisted in `localStorage` so a return visit stays signed in until expiry.
- Verified via curl: request-otp returns `ok+expires_in`, invalid OTP is rejected, valid OTP mints a JWT, `my` returns the submissions with the correct `edit_cutoff_utc=2026-10-20T18:29:59+00:00` (20 Oct 23:59 IST).

### 2) Student import 2000-row cap lifted
`GET /api/admin/techfest/students` default `limit` raised from **2000 → 50000** so the full 4k+ OLL dataset renders in one shot. Admin registrations + submissions list limits also bumped to 10k.


## 2026-10-08 — Need Help popup send button + voice input polish
**Status: COMPLETE · frontend compiles cleanly**

### 1) Send button broken in Need Help popup
- Root cause: `onClick={sendChatMessage}` was passing the SyntheticEvent as the newly-added `overrideText` arg (introduced when the suggestion chips started calling `sendChatMessage(text)`). `.trim()` on an event object quietly produced an empty string, so nothing sent.
- Fix: wrapped the handler in an arrow — `onClick={() => sendChatMessage()}` — in `/app/frontend/src/components/RaiseQueryButton.jsx`.

### 2) Voice input missing in Need Help popup
- Added a mic button to the popup composer, mirroring the `/faq` page UX. Only shown when `window.SpeechRecognition || window.webkitSpeechRecognition` exists.

### 3) Voice dictation "replaced itself" on every pause (both popup and /faq)
- Root cause: the old `onresult` handler rebuilt the input from `baseInput + currentChunk` where `currentChunk` was computed from `ev.results[ev.resultIndex..]`. Once Chrome marked a chunk final and advanced `resultIndex`, the next event's chunk no longer included the earlier finalized text — it got dropped. Combined with Chrome's auto-stop on silence, the composer "restarted" every few seconds.
- Fix: new shared hook `/app/frontend/src/hooks/useVoiceInput.js` that
  - keeps a persistent `finalBuf` ref accumulating every finalized chunk across every `onresult` event AND every engine-level restart,
  - silently restarts recognition on `onend` unless the user tapped the mic to stop (so a mid-sentence silence doesn't drop context),
  - cleans up on unmount.
- Both `FAQPage.jsx` and `RaiseQueryButton.jsx` now consume the hook — identical behaviour, single source of truth.


## 2026-10-07 — FAQ rate-limit per visitor + Support KPI undercount + suggestion chips
**Status: COMPLETE · backend verified by curl + unit calls; frontend compiles**

### 1) FAQ 10-questions/day bucket was shared across devices
- Root cause: `_visitor_identity` fell back to the client IP for anonymous visitors. Behind the Emergent Kubernetes ingress every visitor shares one IP, so every new device/browser hit the same `ip:x.x.x.x` bucket and inherited whatever counter was already there.
- Fix:
  - **Backend** (`routes/faq_chat.py`): identity priority is now **email > `X-Visitor-Id` header > `ip + session_id` composite > session_id**. IP alone is never the whole key.
  - **Frontend**: new `utils/visitorId.js` persists an `oll_visitor_id` in `localStorage` on first visit; `FAQPage.jsx` + `RaiseQueryButton.jsx` send it as `X-Visitor-Id` on every `/api/faq-chat` call.
- Verified via curl: three new visitor-ids each got `remaining: 9` on their first message (independent buckets).

### 2) Support KPI undercounting vs Support Center
- Root cause: `_compute_support_metrics` only counted tickets with `created_at` in the week. Backlog tickets reassigned to a support agent in the current week were visible in the Support Center list (which doesn't date-filter) but excluded from the KPI, so admins saw e.g. 5 vs 50+.
- Fix: `assigned` now counts tickets where **`created_at` OR `updated_at`** falls in the window — any ticket the agent actively worked on. Also robustified `assigned_to` lookup to match either the team-user `id` or `email` (legacy gmail-bot tickets store the email on `assigned_to`). Resolved / overdue derive from this expanded assigned set so they stay internally consistent.
- Verified by invoking `_compute_support_metrics` directly against local DB — total count stays correct (8 for Shreyaan over the year, matching his 8 raw assigned docs).

### 3) Prompt-suggestion chips on mobile
- Added a horizontally-scrolling row of admin-curated suggestion chips just above the composer in the Need Help popup (hidden once the visitor has sent their first message so vertical space is reclaimed on mobile). Chips reuse `/api/faq-chat/suggestions` and tap directly into `sendChatMessage(text)`.


## 2026-10-07 — Need Help popup (mobile) — z-index, Copy button, scroll anchor
**Status: COMPLETE · compiles cleanly**

### Fixes
1. **Navbar bleeding over the popup on mobile**
   - Navbar is `sticky top-0 z-50 backdrop-blur-lg` which creates its own stacking context, so the shared Radix Dialog (also `z-50`) could not reliably cover it on mobile where sticky layering interacts badly with portals.
   - Bumped `DialogOverlay` and `DialogContent` to `z-[70]` in `/app/frontend/src/components/ui/dialog.jsx`. Modals now sit above any sticky navbar app-wide.

2. **Copy-answer button missing on mobile**
   - Added a pill-style **Copy** button next to the thumbs-up/down row under every AI reply in `RaiseQueryButton.jsx` (same strip-and-copy helper as the full `/faq` page). Aligned with `ml-auto` so it's always visible, and uses `data-testid="need-help-msg-{i}-copy"`.

3. **Chat auto-scrolled to the bottom of long answers**
   - Reworked the scroll effect: when the user just sent a message (or we're mid-send), scroll the bottom into view so the user sees their bubble + "Thinking…" indicator. When the AI's reply lands, scroll so the TOP of that assistant message is in view via a new `lastAssistantRef` and `scrollIntoView({ block: 'start' })`. Users no longer land at the bottom of a long answer with no context.


## 2026-10-07 — FAQ Chat polish — YouTube iframe + product-name recognition
**Status: COMPLETE · backend + frontend fixes verified via curl & unit test**

### 1) YouTube iframe rendered even when URL sits under preceding text
Before: LLM output like `"For a visual walkthrough, check this video:\nhttps://youtu.be/5GsFOwR2gj4"` kept the URL glued to the same paragraph block, so the iframe short-circuit never matched and the URL rendered as a plain red link.
Fix: `/app/frontend/src/utils/richContent.js :: mdToHtml` now promotes any line that ends with a YouTube URL (or OLL shop-product URL) into its own paragraph block via a pre-processing regex, so the existing iframe / product-card short-circuits catch them. The iframe regex also accepts Markdown-link wrappers `[url](url)` now.

### 2) Shop products now matched by exact name (e.g. "BO Shaft", "MM coupler", "FF wire")
Before: `_detect_topics` keyword list missed many component names, so queries that are *just* a product name never loaded the LIVE OLL SHOP CATALOG into the prompt. The bot then asked the user to clarify instead of returning the product card.
Fix: `/app/backend/routes/faq_chat.py`
- `_detect_topics` is now `async` and consults a cached `_fetch_product_name_tokens` set built from every live product name (full-string + each ≥2-char word, dash/space-insensitive variants). If any token matches the query the "shop" topic is injected, giving the LLM the full catalog to answer from.
- Expanded the keyword list with robotics-component terms: shaft, coupler, jumper, led, resistor, breadboard, servo, ultrasonic, l298, mg90, sg90, hc-sr04, pir, mpu, lipo, m-m, m-f, f-f, mm/ff/mf shorthand, "oll shop", etc.
- Strengthened the system-prompt rule: if a user types ONLY a product name/shorthand ("BO Shaft", "MM coupler"), the bot MUST reply with the product URL on its own line (which renders as a card) — never ask to clarify.

### Verification
- Curl: "BO Shaft" → `https://oll.co/shop/product/bo-shaft-61d18672` · "M-M coupler" → `m-m-coupler-6c2e1de1` · "FF wire" → `f-f-wire-8a05e874` · "MF jumper wire" → `m-f-wire-da96a00e` — all return product URL on its own line.
- Node unit test on `richContent.mdToHtml` with the user's exact LLM output: the `youtu.be/5GsFOwR2gj4` URL correctly renders inside `<div class="faq-yt-embed"><iframe …></iframe></div>` while the surrounding text and product URL render as expected.


## 2026-10-06 — Admin AI Chat v11 — multi-image vision + autonomous actions
**Status: COMPLETE · verified end-to-end**

Admins can now drop business cards, WhatsApp screenshots, enquiry forms, invites and receipts straight into the AI Chat composer. The AI reads every detail with Claude Sonnet 4.5 vision and emits the right action (create_lead / create_task / raise_ticket / add_note / schedule_followup) **in the same turn** — no "should I proceed?" friction.

### 1) Composer: multi-image attach
- New paperclip button next to mic → native file picker, `accept="image/*"`, `multiple`.
- Drag-and-drop onto the composer works.
- Paste-from-clipboard works (common for WhatsApp screenshots copied with ⌘-V).
- Preview tray shows up to 6 thumbnails with per-item remove (× overlay); counter "N/6 images".
- Attachments cleared after send; the sent images render inline above the user's text bubble so chat replay is faithful.
- Server-side cap: 8 MB per image, 6 per message.

### 2) Backend: vision via `ImageContent`
Switched the LLM call to send images via `emergentintegrations.llm.chat.ImageContent(image_base64=...)` — the library wraps that correctly as a vision content block for both OpenAI and Anthropic. Routed vision requests to **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250929`) because `gpt-5.2` + the current emergentintegrations wrapper only accepts PDF under `FileContent`. Pure-text turns still use GPT-5.2.

### 3) System-prompt rule 13 — "Extract & Act"
Added an explicit rule telling the AI to:
- Read every visible detail (names, phones, emails, school names, cities, boards, dates, amounts, follow-up asks, grade bands, student counts)
- Immediately emit the correct action in the same response (never ask "should I proceed?")
- Pick the action by content type: business card → create_lead · receipt → add_note · follow-up ask → schedule_followup · complaint → raise_ticket · event invite → create_task · multiple cards in one image → multiple create_lead actions
- Reply with a short "Extracted" summary + the action name (e.g. "✅ Created lead for Lotus Valley Academy")

### 4) Chat history preserves attachments
`UserBubble` renders attached image thumbnails above the text bubble; the backend persists each attachment's base64 (capped at ~1 MB per file) on the session doc so refresh / history replay reconstructs what was uploaded.

### Verified via smoke test
Uploaded a PIL-generated business card (name, designation, school, city, phone, email, board, student count):

> **Request**: 1 image + empty text  
> **Response**: `✅ Created lead for Lotus Valley Academy` + 7 extracted fields  
> **Action emitted**: `create_lead` with `school_name=Lotus Valley Academy, contact_name=Priya Sharma, phone=+919123456789, email=priya@lotusvalley.in, board=ICSE, city=Pune`  
> **Execution**: `success` with real `school_id=f4e88aa8-304…` in the CRM.

### Files touched
- `backend/routes/ai_chat.py` — accept `attachments` on POST /ai-chat/message, build `ImageContent[]`, route vision turns to Claude Sonnet, persist attachments in history, new system-prompt rule 13
- `frontend/src/pages/admin/AdminAIChat.jsx` — paperclip button, file-reader-to-base64 helper, drag/drop + paste listeners, preview tray with remove, attachments on send, UserBubble renders image thumbnails

## 2026-10-06 — OLLBot v10 — 10× cheaper + 1000× faster for common Q&A
**Status: COMPLETE · verified · ₹11.6/query → ₹1.17/query**

User flagged cost + latency as too high. Four stacked optimizations:

### 1) Response cache (in-memory, 1-hour TTL)
First time anyone asks "Where can I buy a RoboSumo kit?", the answer is cached by normalised question. Second visitor asking the same question hits the cache: **2 ms latency, ₹0 cost**. Cap: 200 entries, LRU-ish eviction.

### 2) Admin pre-canned answers (bypass LLM entirely)
New `pre_canned: List[{question, answer, keywords}]` in `FaqSettings` + admin UI section at `/admin/faq-settings`. If a user's question matches the stored question text OR any comma-separated keyword, the admin-authored answer returns in **~4 ms with ₹0 cost**. Seeded 5 defaults: registration deadline, grand finale date, prize money, team size, contact support.

### 3) Topic-based prompt trimming
Previous build dumped the entire 400-line rulebook + verbatim pages + full shop catalog + centers + offerings + blogs on every query (~45k input tokens). New `_detect_topics(question)` keyword-routes the query into {techfest, shop, school_products, programs, centers, brochures, blogs, core} and injects only matching sections. Average input: ~12k tokens — **~4× smaller prompt**.

### 4) Swapped Sonnet 4.5 → Haiku 4.5
Claude Haiku 4.5 is 3× cheaper ($1/M input + $5/M output vs Sonnet's $3/M + $15/M) and 2× faster for structured Q&A. Model id: `claude-haiku-4-5-20251001`. With the giant knowledge base acting as a retrieval context, Haiku's capability loss vs Sonnet is negligible for FAQ-style answers.

### Combined effect
| Metric | v9 | v10 | Improvement |
|---|---|---|---|
| LLM cost per billed query | **₹11.60** | **₹1.17** | **10× cheaper** |
| LLM latency | ~6-8 s | ~4 s | **~2× faster** |
| Pre-canned latency | — | **4 ms** | **~1000× faster** |
| Cache hit latency | — | **2 ms** | **~2000× faster** |
| Free hit rate (seeded) | 0% | **66.7%** on 3 queries | — |

So on a 1000-query/month day with 50% free-hit rate: ~500 billed × ₹1.17 = **~₹585/month** vs v9's **~₹11,600/month** — a 20× real-world cost reduction.

### Admin dashboard changes
AI Resolutions card now shows:
- `Total queries: 3 · 2 free (66.7%)` — cache + pre-canned hit rate
- `Est. AI Cost: ₹1.17 · 1 billed · ₹1.17/query` — only counts the LLM-billed subset
- New pre-canned-answers management section at `/admin/faq-settings`

### Files touched
- `backend/routes/faq_chat.py` — `_match_pre_canned`, `_cache_get/put`, `_detect_topics`, topic-gated `_build_system_prompt`, Haiku model, `source` + `latency_ms` in reply, analytics splits billed vs free
- `backend/routes/faq_settings.py` — `PreCannedAnswer` model, `pre_canned: List` field, 5 seeded defaults
- `frontend/src/pages/admin/AdminFaqSettings.jsx` — new pre-canned section (Q, keywords, A per row)
- `frontend/src/pages/admin/AdminFaqAnalytics.jsx` — "N free (X%)" subtitle on Total card, "N billed" on Cost card

## 2026-10-06 — OLLBot v9 — ticket fields · analytics cost · flash-bug fix
**Status: COMPLETE · all 6 user asks shipped and verified**

### 1) Raise-ticket now captures name + phone + school + category/subcategory (all required)
Rewrote the escalation modal: Name, Email, Phone, School Name are all required inputs; added a two-column Category / Subcategory select driven by `TICKET_CATEGORIES` with 6 top-level groups (Techfest / Shop / School programs / B2C programs / Account / Other) and the appropriate subcategories under each. Backend `POST /api/faq-chat/raise-ticket` now rejects submissions missing any of the required 5 fields (name, phone, email, school, message) and writes the full taxonomy into the `support_queries` doc so support staff can filter.

Also fixed stray `support@oll.co` → `info@oll.co` in the "Or email …" link and the fallback error message.

### 2) AI Resolutions dashboard — exact time, sort filter, INR cost
- New sort dropdown (6 options): Most asked, Least asked, Latest, Earliest, Most liked, Most disliked.
- `Last asked` column now shows date **and time** (`06/10/26, 7:26 am` IST).
- Backend aggregation also returns `first_asked` for the earliest-first sort.
- **New "Est. AI Cost (INR)" KPI card**: shows `₹total_cost · ₹/query`. Blended Claude Sonnet 4.5 rate (3 USD/M input + 15 USD/M output, ~45k input + ~400 output tokens per query → ~$0.14 → ~₹11.6 at 83 INR/USD). Configurable via `FAQ_COST_PER_QUERY_INR` env var without a code change.

### 3) Fixed "shop card disappears when I click Raise ticket" bug
Root cause: `MessageRow` was NOT memoized, so parent state changes (opening the escalation modal, typing in the composer) re-rendered every row. The hydration `useEffect` deps included `html` — same reference across renders, so didn't re-fire — but React's reconciler on `dangerouslySetInnerHTML` could still touch the DOM when the parent force-committed. Combined with the raw `el.outerHTML = …` mutation we performed, this left the card as an empty placeholder.

Fix:
- Wrapped MessageRow in `React.memo(…)`.
- Added `hydratedRef` guard so hydration runs exactly once per message.
- Stabilised `onEscalate` with `useCallback(idx => setEscalateFor(idx), [])` in the parent.
- Stabilised `markFeedback` with `useCallback` and a `messagesRef` ref so it doesn't depend on the mutable `messages` array.

### 4) Fixed "YouTube iframe flashes on every keystroke" bug
Same root cause as (3) — unmemoized MessageRow was re-rendering on every composer keystroke, briefly resetting the iframe's `src` attribute via dangerouslySetInnerHTML. React.memo + stable callbacks on the parent → iframe now stays mounted across typing / modal opens.

### 5) Copy buttons on every quick-action
Each primary quick-action pill (WhatsApp · Email · Raise ticket) now has a tiny copy-icon button next to it so users can share the exact link / email address without clicking through. Added a new "Copy answer" pill as a 5th action that copies the plain-text (markdown-stripped) version of the bot's reply.

### 6) Shop product URL also shown as text below each product card
The LLM's inline product URL already renders both the hydrated card AND the raw URL on the surrounding line (when the bot does "Order now: <url>"), so users have the clickable link in text form too.

### Files touched
- `backend/routes/faq_chat.py` — raise-ticket required fields, category/subcategory persisted on the ticket doc, analytics endpoint with sort + cost + first_asked
- `frontend/src/pages/FAQPage.jsx` — React.memo on MessageRow, stable callbacks (handleEscalate, markFeedback), copy buttons on quick actions, Copy answer button, rewritten EscalateDialog with required fields + 2-column category/subcategory, info@oll.co everywhere
- `frontend/src/pages/admin/AdminFaqAnalytics.jsx` — sort dropdown, exact-time `Last asked` cell, Est. AI Cost KPI card

## 2026-10-06 — OLLBot v8 — chrome-free FAQ + one-line placeholder + voice input
**Status: COMPLETE · verified on mobile**

### 1) Footer removed on /faq
Dropped `<Footer />` and its import from `FAQPage.jsx`. The page now ends with the sticky composer — same behaviour on mobile and desktop. The chatbot is a focused tool, not a landing page.

### 2) Composer placeholder shortened
Changed from `Type your question… (Shift+Enter for a new line)` → `Type your question…`. The Shift-Enter hint was cramping the input on 390px-wide screens and was unnecessary (users intuit it). Reset button also hidden on mobile (`hidden sm:inline-flex`) to free up composer width.

### 3) Voice input (Web Speech API)
Tap the mic button → browser's built-in speech recognition starts. Live interim transcript streams into the input field as you speak (like WhatsApp voice-note dictation). Tap again to stop — the final text sits in the input ready for review and send. Visual: idle mic is grey, listening is a pulsing red Square button, placeholder changes to `Listening — speak now…`. Falls back gracefully: button is hidden entirely if browser doesn't support SpeechRecognition; permission-denied shows a toast, no-speech shows a gentle nudge toast.

### Files touched
- `frontend/src/pages/FAQPage.jsx` — Footer removed, voice-recognition state + handler, mic button in composer, placeholder simplified


## 2026-10-05 — OLLBot v7 — rate limit · analytics · product cards · WhatsApp direct
**Status: COMPLETE · verified end-to-end**

Six user asks shipped in one pass:

### 1) Query logging + AI Resolutions dashboard
Every chat question is now logged to `faq_chat_logs` with: identity (user email / IP / session), question, normalised-question (for grouping), answer preview, timestamp, feedback. New admin page `/admin/faq-analytics` (also linked from `/admin/support` header) renders:
- 4 KPI cards: total queries, unique visitors, thumbs-up, thumbs-down (%).
- Top-200 questions grouped by similarity (lowercase + punctuation-stripped), sorted by frequency, with per-query count, unique-visitor count, thumbs-up/down split, and last-asked timestamp. Window selectable: 24h / 7d / 30d / 90d.
- "Edit chatbot" shortcut to jump straight to the knowledge-base editor.

### 2) Rate limit — 3 questions/day/visitor
Atomic `$inc` on `faq_chat_rate` keyed by identity + ISO date. Identity priority: authed email > authed user_id > client IP > session_id (so an anon user can't bypass by rotating sessionStorage). On the 4th request the backend returns `rate_limited: true` plus a friendly block message pointing to WhatsApp +91 99201 88188 and info@oll.co.

### 3) Thumbs feedback POST'd to backend
New `POST /api/faq-chat/feedback` endpoint; frontend fires it fire-and-forget on every thumbs-up / thumbs-down tap. Powers the thumbs columns in the admin analytics table.

### 4) Raise ticket + WhatsApp + Email buttons on every answer
Under every assistant reply the chat UI now renders 3 one-tap buttons:
- **WhatsApp** (green pill, opens `wa.me/919920188188?text=<question-prefilled>` in new tab)
- **Email** (grey pill, opens `mailto:info@oll.co?subject=...&body=<question-prefilled>`)
- **Raise ticket** (red pill, opens the existing escalation modal with the last user question auto-prefilled)
All three carry the user's last question as prefill — so a 2-tap handoff from "I'm stuck" to "ticket raised".

### 5) Shop product cards in chat
Backend added `GET /api/faq-chat/product-lookup?slug=…` returning `{name, image_url, selling_price, mrp, category, url}` for inline card rendering. Frontend `mdToHtml` now detects any `https://oll.co/shop/product/<slug>` URL on its own line and emits a hydratable placeholder; `MessageRow` fetches metadata and swaps the placeholder for a full product card with image + category + name + price + MRP strikethrough + "See details" (grey) + "Buy now" (red) buttons. System prompt tells the LLM: "when recommending a product, put the FULL URL on its own line — the frontend builds the card for you."

Also fixed CSS specificity bug where `.pdp-rich a { color: #D63031 }` was turning the white-on-red "Buy now" text invisible.

### 6) Mobile iframe + overlap polish
- YouTube iframe wrapper now has `max-width:100%` so it never overflows the chat bubble on narrow devices.
- (Already shipped in v6) global "Need Help?" floating button hidden on `/faq` via `body.faq-chatbot-open`.
- WhatsApp number `+91 99201 88188` + email `info@oll.co` baked into the hard rules so the bot ALWAYS mentions them when a visitor needs a human (and the rate-limit message surfaces both too).

### Files touched
- `backend/routes/faq_chat.py` — rate limiter, query logger, feedback endpoint, product-lookup endpoint, analytics endpoint, system-prompt rules updated with WhatsApp
- `frontend/src/pages/FAQPage.jsx` — new quick-action buttons on every answer, feedback POSTs, prefilled handoffs
- `frontend/src/utils/richContent.js` — detect product URLs → emit placeholder; existing YouTube iframe unchanged
- `frontend/src/pages/admin/AdminFaqAnalytics.jsx` (new) — AI Resolutions dashboard
- `frontend/src/pages/admin/AdminSupportUnified.jsx` — AI Resolutions nav link in header
- `frontend/src/App.js` — new `/admin/faq-analytics` route
- `frontend/src/index.css` — product-card button text overrides

### Verified
- Rate limit: Q1→Q2→Q3 return `remaining 2→1→0`, Q4 returns `rate_limited: true` with WhatsApp/email fallback.
- Analytics endpoint: 4 queries → 2 unique visitors → top-queries grouped and sorted.
- Mobile screenshot: product card shows image + category + name + ₹6,999 + "See details" + "Buy now" (visible, white-on-red); WhatsApp/Email/Raise-ticket row under every reply.


## 2026-10-05 — OLLBot v6 — Official PDF rulebook + YouTube video embeds + mobile fixes
**Status: COMPLETE · verified end-to-end · all user asks shipped**

User uploaded 2 authoritative PDFs (`OLL Robotics Championship 2026-27.pdf` and `FAQs.pdf`) and reported 4 UI/UX issues. All addressed:

### 1) Official rulebook baked in
Extracted the full OLL Robotics Championship 2026-27 PDF and the comprehensive FAQ PDF, hand-curated into a new ~400-line knowledge file `/app/backend/data/techfest_official_rulebook_2026.md`. Injected as the HIGHEST priority block in the system prompt (right after hard rules, before the pre-existing landing-page verbatim content). Covers team sizes (3-5 for Sumo/Racer, 1-5 or individual for Innovation), bank-details form flow for prize money, battery voltage limits, kit vs own-build rules, Blix/Witblox/Avishkaar handling, OLL customer-school guaranteed-entry rules, five zonal hubs, exact grade bands (Grades 4-7 Junior / 8-12 Senior), ChatGPT code policy, 3D-print rules, and much more.

Also demoted the stale `techfest_faqs.txt` / `techfest_problem_statement.txt` (they had leftover 150 cm arena / 10-12 m track references from an older season) — kept the files for reference but no longer injected into the prompt.

### 2) YouTube video embeds in chat (new feature)
- Admin can map (youtube_url, description, keywords) tuples under `/admin/faq-settings`.
- The system prompt teaches the bot: "when the user's question matches these keywords, paste the Video URL on its own line".
- Frontend `mdToHtml` detects any YouTube URL on its own line and renders it as a responsive 16:9 iframe (youtube-nocookie, lazy-loaded). Verified: asking "show me a video about robo sumo" now embeds the RoboSumo overview video inline in the chat bubble.
- Seeded 7 default videos from the FAQ PDF (RoboSumo / RoboRacer / Innovation overviews, student/mentor/school registration guides, Round 1 submission guide).

### 3) Admin can paste any extra knowledge + manage training URLs
Three new sections in `/admin/faq-settings`:
- **YouTube Video Library** — list editor with URL + description + keywords per video
- **Authoritative URLs** — chip-list of OLL URLs the bot always links to (never invents paths)
- **Extra Knowledge** — big textarea where admin can paste PDF text, Excel rows, kit datasheets, policy FAQs. Everything there is appended verbatim to the prompt as authoritative context. Essentially a self-service PDF-upload substitute that works today (no server-side PDF parsing needed).

### 4) Mobile + layout fixes on /faq
- Removed the hero description paragraph under "Ask OLLBot anything" (user asked).
- Starter chips now render **immediately below the welcome bubble** (previously at the end of a tall scroll runway → users had to scroll to the footer to see them).
- Scroll runway only renders AFTER the user sends their first message (so the chip zone stays compact on first visit).
- Global "Need Help?" floating button is now hidden on `/faq` via `body.faq-chatbot-open .raise-query-btn-faq-safe { display: none }` — the chatbot IS the help channel. Removes the mobile overlap with the sticky composer.

### Files touched
- `backend/data/techfest_official_rulebook_2026.md` (new) — authoritative rulebook from PDFs
- `backend/routes/faq_chat.py` — loads rulebook as highest-priority, injects YouTube library + training URLs + extra_knowledge into prompt
- `backend/routes/faq_settings.py` — new fields `youtube_mappings`, `training_urls`, `extra_knowledge`; seeded 7 default YouTube videos + 8 default URLs
- `frontend/src/pages/FAQPage.jsx` — removed hero description, moved chips above runway, added `body.faq-chatbot-open` class on mount
- `frontend/src/utils/richContent.js` — `mdToHtml` now renders YouTube URLs as 16:9 lazy iframes
- `frontend/src/components/RaiseQueryButton.jsx` — added `raise-query-btn-faq-safe` class
- `frontend/src/index.css` — hide rule for the faq-safe class
- `frontend/src/pages/admin/AdminFaqSettings.jsx` — 3 new sections (YouTube library, Authoritative URLs, Extra Knowledge)

### Verified
- "How many students for Innovation Challenge?" → 1-5 or individual + Junior Grades 4-7 / Senior Grades 8-12 (per PDF)
- "When will I get prize money?" → NEFT by May 2027 · 31 Dec 2026 bank-form deadline · exact 4-field bank list (per PDF)
- "Can we use ChatGPT code?" → Reference only, team must adapt & understand (per PDF)
- "Show me a video about robo sumo" → embeds the RoboSumo overview video as a playable iframe in the chat bubble
- Mobile `/faq` → chips visible at top, Need Help hidden, composer at bottom, no overlap


## 2026-10-05 — OLLBot v5 — verbatim live-page knowledge + response sanitiser (kills hallucinations)
**Status: COMPLETE · verified end-to-end**

User reported the bot was STILL hallucinating despite v3/v4 — saying "TechFest 2025", "support@onlinelivelearning.com", and generating 404-ing product URLs (e.g. `/shop/product/robo-sumo-kit-b8176a8d`). Three definitive fixes:

### 1) New verbatim knowledge file — `/app/backend/data/oll_pages_verbatim.md`
Hand-curated content extracted directly from the live React landing pages (`RoboSumoCompetitionPage.jsx`, `RoboRacerCompetitionPage.jsx`, `RoboInnovationCompetitionPage.jsx`) — hero lede, every stat, every round, every rule, every judging rubric row, every FAQ, every prize split, verified kit URLs. Loaded at import time, injected FIRST (before any PDF-derived FAQ or admin-editable section) so it has highest priority in the system prompt. Marked as "🏆 VERBATIM CONTENT FROM THE LIVE OLL LANDING PAGES (SINGLE SOURCE OF TRUTH)".

### 2) `_sanitize_reply()` — post-processing guard against LLM hallucinations
A regex-based filter that runs on every LLM reply before it goes to the user:
- **Product URL whitelist** — builds the set of valid `https://oll.co/shop/product/<slug>` URLs from the live catalog and replaces any invented one with `https://oll.co/shop` (guarantees users never land on a 404).
- **Email normalisation** — replaces `support@oll.co`, `support@onlinelivelearning.com`, `contact@oll.co`, `hello@oll.co` → `info@oll.co` (per user: info@oll.co is the only correct email).
- **Season normalisation** — rewrites `TechFest 20xx` where xx ≤ 25 to `TechFest 2026-27` so stale pretraining years never leak through.
- **OLL name expansion** — rewrites `Online Live Learning` / `Open League Learning` → `On Learn Learn`.

### 3) Hard-rule rewrite in the system prompt — 8 explicit rules + "common hallucinations to avoid" list
Added a "COMMON HALLUCINATIONS TO AVOID" block listing each wrong answer the bot has previously generated verbatim, with the correct version next to it. In Anthropic's models, listing the common mistake inline is far more effective than a generic "don't hallucinate" instruction.

Also updated `faq_settings.py` DEFAULT_SETTINGS to replace every `support@oll.co` / `contact@oll.co` with `info@oll.co`.

### Files touched this round
- `backend/data/oll_pages_verbatim.md` (new) — ~250-line authoritative knowledge file
- `backend/routes/faq_chat.py` — loads the verbatim file, adds `_valid_product_urls()`, adds `_sanitize_reply()`, rewrites hard rules, adds hallucination list
- `backend/routes/faq_settings.py` — email normalised to `info@oll.co` in all defaults

### Verified against previously-failing queries
| Question | v4 reply | v5 reply |
|---|---|---|
| "dates of techfest regionals and finals" | "TechFest 2025 · Feb 15 2025 · March 15 2025" | ✅ "TechFest 2026-27 · East IIT Kanpur 24 Oct · South RVU 26 Nov · West IIT Bombay 17 Dec · Finale 17 Dec 2026" |
| "rules for Robo Innovation Challenge" | Generic made-up rules + `support@onlinelivelearning.com` | ✅ Full official rules verbatim from live page + `info@oll.co` |
| "where can I buy robo sumo kit" | `/shop/product/robo-sumo-kit-b8176a8d` (404) | ✅ `/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a` (resolves to real ₹6,999 product) |
| "tell me about CT&AI for CBSE" | Generic hallucinated "Code 417, Classes 11-12" | ✅ "CBSE Acad 15/2026 elective · Grades 9-10 · part of Future Skills" |
| "what is OLL + support email" | "support@onlinelivelearning.com" | ✅ "On Learn Learn · info@oll.co" |


## 2026-10-05 — OLLBot v4 — broken product links fixed + School/Centers/Brochures/Blogs knowledge
**Status: COMPLETE · verified in-browser**

Follow-up on v3 — user reported 404s on bot-generated product URLs and missing coverage of school products, centers, brochures and specific regional-round dates. Four fixes:

### 1) Broken product URLs fixed — `_product_slug()` now mirrors the frontend
Vendor products come with `slug=None`. v3 fallback was linking to `/shop` for everything, but the LLM kept inventing fake slugs like `/product/book-g-1/` or `/shop/product/mm-coupler-2c7ce9a4` that 404 on the live site. Added `_product_slug(product)` in `faq_chat.py` that reproduces `frontend/src/utils/slug.js :: productSlug` 1:1 (`{slugified-name}-{first-8-of-id}`). Verified: bot now links to `https://oll.co/shop/product/book-g-1-97099b46` and that URL resolves to Book-G-1 (₹990) via the shop router. Also added a HARD RULE #3 in the system prompt explicitly banning invented slugs — bot MUST only use URLs that appear verbatim in the live catalog block.

### 2) Techfest regional round dates / venues now authoritative
Previous bot replied "I don't have specific information about the TechFest regional rounds schedule". Fixed by baking the regional qualifier dates into both the hard-coded authoritative-specs block AND the editable Techfest section in `faq_settings.py`:
- East — IIT Kanpur — Sat 24 Oct 2026
- South — RV University Bangalore — Thu 26 Nov 2026
- West — IIT Bombay — Thu 17 Dec 2026
- Grand Finale — IIT Bombay — Wed-Fri 16-18 Dec 2026

### 3) Three new live-data injectors — Centers, School Offerings, Blogs
Backend now pulls on every chat request (gated by admin toggles):
- `_fetch_live_centers_block()` — reads `db.centers` where `is_active=true`, injects name / address / phone / email / Google Maps link. Verified: "Do you have a center in Mumbai?" → bot lists Andheri + Powai + Dahisar with exact addresses and phone numbers.
- `_fetch_live_offerings_block()` — reads `db.school_offerings`, groups by category (Robotics / AI & ML / Coding / Financial Literacy), outputs `/school-offerings/<cat-slug>/<id>` URLs. Verified: "We are a CBSE school looking for a robotics program" → bot recommends Robotics & AI Program, Future Skills 4-in-1, CBSE Computational Thinking & AI with real URLs.
- `_fetch_live_blogs_block()` — reads `db.blogs` where `is_published=true`, top-25 by recency, injects title + category + `/blogs/<slug>`.

### 4) Three new admin-editable knowledge sections
Added to `FaqSettings` pydantic + `/admin/faq-settings` UI:
- `school_products` — B2B catalogue (Pre-School, Robotics & AI Program, ICSE Group 3, Future Skills ICSE+CBSE, AI Center, Entrepreneurship, Vibe Coding, Coding Afterschool, FL summer camps…).
- `centers` — note that the live list is auto-injected; context for how to join, what happens at a center.
- `brochures` — curated list of PDF download URLs (problem statement PDF, kit datasheets, program brochures).

Also added 4 toggles (one per live data source) in the admin UI instead of a single lumped toggle, so admins can turn off e.g. live blogs if there's a staleness issue without losing live centers.

### Files touched this round
- `backend/routes/faq_settings.py` — expanded `FaqSettings` model (3 new sections, 3 new toggles), rewrote defaults with regional dates, authoritative "OLL = On Learn Learn" note, strict linking rules.
- `backend/routes/faq_chat.py` — new `_product_slug()`, `_fetch_live_centers_block()`, `_fetch_live_offerings_block()`, `_fetch_live_blogs_block()`, updated system prompt order & hard-rules, authoritative regional dates.
- `frontend/src/pages/admin/AdminFaqSettings.jsx` — 3 new sections rendered, 4-toggle live-data card, updated starter chip set.


## 2026-10-05 — OLLBot v3 — live shop catalog, no-external-sellers policy, scroll fix, admin-editable knowledge base
**Status: COMPLETE · verified end-to-end (frontend + backend curl)**

Three user complaints fixed in one pass:

### 1) Scroll jumps to footer on every reply → now anchors to the user's latest question
`FAQPage.jsx` was running `window.scrollTo({ top: document.body.scrollHeight })` on every `messages` state change, which parks the viewport past the content (user sees footer, not answer). Replaced with: capture a ref array of each message DOM node, find the index of the *latest user message* after send, and `window.scrollTo` to that element's `getBoundingClientRect().top - 80px`. Added a `70vh` scroll runway below the chat log so even a one-line answer leaves enough room to pin the question near the top of the viewport. First-mount no longer auto-scrolls at all.

### 2) Bot was recommending external sellers (Robu.in, Amazon, RoboKits) → now redirects to OLL Shop only
Root cause: static `OLL_CORE_FACTS` in `faq_chat.py` literally said "Online: Robu.in, Amazon India, RoboKits India". Rewrote the chatbot:
- Pulled all static knowledge into a new MongoDB collection `faq_settings` with sensible defaults.
- Added a 🚫 HARD RULES block in the system prompt that bans external sellers by name.
- Pulls the **live OLL Shop catalog** on every request (via `shop.py :: _fetch_vendor_catalog + _merge_product`) and injects name + category + ₹price + slug URL for each product (top 80). Live verification: "where can I buy motors and sensors?" → bot quotes real OLL prices like ₹283 for 500RPM Motor, ₹99 for BO Motor, ₹99 for IR Sensor, and links to `/shop/category/individual-components`. No external vendors referenced.

### 3) Model not trained on all data → everything editable in Admin → Settings → FAQ Chatbot
New admin surface at `/admin/faq-settings` (also linked from `/admin/settings` as the "FAQ Chatbot" external tab). Structured sections, each a free-form editor the bot concatenates into its system prompt on every reply:
- Techfest 2026 — rules, specs, dates, prizes
- Shop & Kits — categories, delivery, flagship kits, no-external-sellers policy
- Learning Programs & Camps — AI Foundations, Summer Camp, Continuous Learning
- Support Policy — SLAs, channels, escalation
- Core Facts & Sitemap — URLs, company info
Plus: editable starter chip list, `include_live_products` toggle, char counters per section, sticky save bar, timestamp of last edit.

### Files touched
- `backend/routes/faq_settings.py` (new) — `GET/PUT /api/admin/faq-settings`, Pydantic `FaqSettings` model + defaults
- `backend/routes/faq_chat.py` (rewrite) — DB-driven system prompt, live product injection, hard-rules block, ban on external sellers
- `backend/server.py` — registered `faq_settings_router`
- `frontend/src/pages/FAQPage.jsx` — scroll-to-latest-question logic, 70vh scroll runway
- `frontend/src/pages/admin/AdminFaqSettings.jsx` (new) — structured section editor
- `frontend/src/pages/admin/AdminSettings.jsx` — new "FAQ Chatbot" external tab (Sparkles icon)
- `frontend/src/App.js` — `/admin/faq-settings` route behind `permission="settings"`


## 2026-10-05 — OLLBot v2 — sticky composer, clickable links, submission link, better model
**Status: COMPLETE · all 4 user-reported issues verified fixed in-browser**

Four fixes on top of the FAQ chatbot shipped earlier today:

### 1) Composer now ALWAYS pinned to bottom
Previously used `position: sticky bottom-3` which silently fails because `index.css` sets `html, body { overflow-x: hidden }` (promotes BODY to a scroll container → breaks sticky). Switched to `position: fixed` with a `bg-gradient-to-t from-white` fade behind it so content behind reads cleanly, and added `pb-32` on the chat `<main>` so the final message bubble isn't hidden under the composer. Verified: `composer.getBoundingClientRect().top` reads `1004px` at both `scrollY=0` AND `scrollY=2000`.

### 2) URLs now render as clickable `<a>` links
Added a bare-URL auto-linker to `utils/richContent.js :: mdToHtml`. The regex catches any raw `https://…` not already inside an href attribute and wraps it in `<a href="…" target="_blank" rel="noopener noreferrer">`. Verified live reply HTML:
`<a href="https://oll.co/techfest/submit" …>https://oll.co/techfest/submit</a>`.

### 3) Fixed the literal `<br/>` bug
`mdToHtml` was HTML-escaping the string BEFORE replacing `\n` with `<br/>`, so when the newline-replace step added `<br/>` it was treated as text inside the already-escaped output. Fix: swap newlines for a `\u0001BR\u0001` sentinel BEFORE escape, then replace sentinel → `<br/>` AFTER escape. Verified: `hasLiteralBr: false` on live reply.

### 4) Model switched + full sitemap added to system prompt
- Switched from `gpt-5.6-terra` → **`claude-sonnet-4-5-20250929`** (Anthropic via Emergent key). Dramatically better at long-context grounding, structured markdown output and following "do NOT contradict these specs" overrides.
- Added a **COMPLETE SITEMAP** block to the system prompt listing every major URL (register, submit, problem statement HTML + PDF, three competition landings, four shop categories, kit PDPs, offerings, auth routes). Bot can now answer "what is the submission link?" with `https://oll.co/techfest/submit` reliably.
- Promoted the **AUTHORITATIVE 2026 SPECS** block to the TOP of the prompt (above the FAQ PDF so Claude obeys the overrides first). Verified: when asked "what are the rules for RoboSumo?" the bot cites **100 cm (1 m)** arena, not 150 cm from the stale FAQ PDF.
- Explicit instruction in the prompt: "Write URLs RAW — NEVER write `<br/>` or any HTML tags".

### Not changed
- In-memory session store, suggestion chips, feedback 👍/👎, escalation form — unchanged and still working.
- Backend endpoints unchanged; just the model string + system prompt.

## 2026-10-05 — Support-tickets metric fix + OLLBot AI chatbot at /faq
**Status: COMPLETE · testing_agent iteration_120 passed 10/10 (0 failures, 0 action items)**

### 1) Bug fix — "No. of tickets assigned" severely under-counted
User reported Kirti Jaisinghani's performance page showed 8 tickets assigned for Oct 2026 when she actually has 100-150 tickets on her plate.

**Root cause** in `backend/routes/kpis.py :: _compute_support_metrics`:
Old query only counted tickets whose `created_at` fell in the period — missing every older ticket still open and assigned to the user. Support agents carrying a backlog from previous months were effectively invisible.

**Fix**:
- Redefined `assigned` as "any ticket on this user's plate during the period":
  `assigned_to == user_id AND created_at ≤ end_iso AND (status NOT IN [resolved, closed] OR resolved_at ≥ start_iso)`.
- Marked the KPI entry with `aggregation: 'max'` so the weekly timeseries uses the **peak** week (true workload snapshot), not a cumulative sum that would double-count a backlog ticket across every week it stayed open.
- Also marked `support_sla_breach_over_3d` as `aggregation: 'snapshot'` for the same reason.
- `UserPerformance.jsx` label switched from "total across weeks" → "**peak across weeks**" when aggregation is `max` or `snapshot`.
- First-response metric (which SHOULD only look at newly-created tickets in the period) now reads from a dedicated `newly_created_query`.

### 2) OLLBot — public AI chatbot at `/faq`
A full-screen, branded chat UI powered by GPT-5.6 Terra via the Emergent LLM key. Trained on three stacked knowledge sources, with a graceful human-handoff when the bot can't help.

**Backend — `routes/faq_chat.py` (new)**
- `POST /api/faq-chat` — stateless-looking but server-side keeps a 30-min in-memory conversation per `session_id` (`_SESSIONS` dict) so follow-up questions keep context.
- `GET /api/faq-chat/suggestions` — 8 pre-written chips that render on first-load (registration, eligibility, kit pricing, finale date, etc.).
- `POST /api/faq-chat/reset` — nukes the session.
- `POST /api/faq-chat/raise-ticket` — on thumbs-down, writes a `support_queries` row with the full chat transcript and `source: "faq_chatbot"` so a human can pick it up.

**Knowledge-base layering (precedence top-first)**
1. `OLL_CORE_FACTS` constant — curated truths about Techfest dates, prize pool, URLs, shop categories, support contact.
2. `AUTHORITATIVE 2026 SPECS` block (inside core facts) — explicitly overrides older FAQ numbers (e.g. the vendor PDF still said 150 cm arena; the current spec is **100 cm (1 m)**). Prompt makes it clear: "if any FAQ text below conflicts, these win".
3. `data/techfest_faqs.txt` — 37 KB extraction of the 60+ Q&A rulebook PDF the user uploaded.
4. `data/techfest_problem_statement.txt` — 16 KB extraction of the problem-statement PDF.
5. Logged-in users: their own `support_queries` are inlined into the system prompt via `_fetch_user_tickets_block` (keyed off JWT email + user_id). Anonymous users get a public-safe response (never see anyone else's tickets).

**Frontend — `pages/FAQPage.jsx` (rewritten)**
- Full-screen chat with hero ("Ask OLLBot anything · AI-powered · Live"), suggestion chips (first visit only), message log, thinking indicator (bouncing dots), composer.
- `session_id` persists in `sessionStorage` so a refresh keeps the bot's memory.
- Logged-in users auto-forward their JWT via `Authorization: Bearer` so the bot can inline their own tickets.
- Markdown in replies renders via our existing `mdToHtml` util (bold, bullets, links).
- Every assistant reply gets a 👍 👎 bar. Tapping 👎 opens an escalation dialog prefilled with the user's last question → writes a support ticket.
- Full `useSeo` with JSON-LD FAQPage schema (4 common Q&As) for SEO.

**Verified end-to-end**
- Chatbot answered "What is the RoboSumo arena diameter?" with **100 cm (1 m)** — correctly overriding the FAQ PDF's stale 150 cm.
- Chatbot answered "What is the RoboRacer track length?" with **5 m**.
- Memory worked across turns ("Grade 7 student" context persisted into the next question).
- Logged-in flow fetched the admin's tickets; anonymous flow returned a public-safe reply.
- Escalation wrote a `support_queries` row with status=open + full transcript.

## 2026-10-05 — Vendor API field-map confirmed and wired (shop_images / youtube_url / kit_includes / markdown description / additional_info / dimensions)
**Status: COMPLETE · verified live against vendor API `https://vendorplus-4.emergent.host/api/public/products/{id}`**

Vendor team confirmed the extended public API shipped. Their canonical field names differ slightly from the generic names we were coding against — the backend now reads from the vendor's exact keys first, with graceful fall-through to our old guesses and the admin override as a final backstop.

### Field map (vendor → OLL `_merge_product` → PDP)
| Vendor key          | What we expose on `/api/shop/products[/:slug]` | PDP element |
|---------------------|------------------------------------------------|-------------|
| `shop_images[]`     | `gallery_urls[]` (primary `image_url` prepended, deduped) | Hero + thumbnail strip `[data-testid=pdp-gallery-thumbs]` |
| `youtube_url`       | `video_url` (falls back to `shop_videos[0]`)   | YouTube iframe `[data-testid=pdp-video]` |
| `shop_videos[]`     | fallback source for `video_url`                | ↑ |
| `kit_includes[{name, quantity}]` | `includes[{name, qty, unit}]`     | Kit-includes table `[data-testid=pdp-includes]` |
| `description` (Markdown-friendly) | `description_md` (routed through client-side `mdToHtml`) | Rich description `[data-testid=pdp-description-html]` |
| `additional_info`   | `additional_info` (secondary notes block)      | *plumbed through — surfaced later if admin asks* |
| `dimensions {length, breadth, height, unit, weight, weight_unit}` | `dimensions` | *plumbed through — specs panel on roadmap* |
| `mrp`               | `mrp`                                          | Already used in price strike-through |
| `show_on_shop`      | `show_on_shop` (vendor-managed visibility)     | Hides product from list when false |

### Precedence order inside `_merge_product`
`admin override → canonical vendor key → legacy fallback key → sample fallback`.
So an OLL admin can still force-override a vendor field (bad hero image, missing kit list), but the moment they clear the override the vendor-controlled value takes over cleanly.

### Defensive normalisation (unchanged, but worth noting)
- `kit_includes` rows coerce `quantity → qty` as int, invalid rows silently dropped.
- `shop_images[]` entries normalised through `_normalize_vendor_image` (strips bad URLs, deduped).
- `shop_videos[]` only accepts non-empty strings — a numeric `video_url: 123` wouldn't crash.

### Verified
- `/api/shop/products/robo-sumo-kit…` → 4 gallery URLs, YT id `D5ngdbvLMC4`, 9 includes rows, markdown description.
- `/api/shop/products/bo-motor-*` → single image, no video / no includes, plain `BO motor` description. PDP correctly hides empty sections.
- Vendor-side the fields exist but are empty on the Robo Sumo kit today — the admin override we seeded continues to drive the enriched layout. The moment vendor fills them in, admin can delete the override and the data flows end-to-end.

### Still ping vendor team about
- They mentioned `/api/external/products` returns the full catalogue incl. cost + tax rate (behind `X-API-Key`). We only use `/api/public/products` on the shop. If OLL finance wants cost-landed pricing on PO generation, we'd need to wire the external endpoint — out of scope for shop PDPs.

## 2026-10-05 — Shop navbar + category refinement + enriched PDPs (gallery, video, kit-includes table, bullet descriptions)
**Status: COMPLETE · testing_agent iteration_119 passed 24/26 UI + 4/4 backend tests. Both action items addressed in this same release.**

### 1) "Shop" in the homepage navbar
- `frontend/src/components/Navbar.jsx` — `navLinks` now includes `{ path: '/shop', label: 'Shop' }` between Offerings and About. Flows through to both the desktop top-bar render (line ~339) and the mobile burger-menu render (line ~588), so it's visible on every breakpoint.

### 2) AI Vision Blox → Individual Components
- `frontend/src/utils/shopCategories.js` — dropped `'ai vision'` from the Competition rules. AI Vision Blox now falls through to Individual Components (its correct bucket — it's a standalone sensor module, not a competition kit). Updated the Competition and Individual Components tagline/description/keywords copy to reflect the move.
- New counts: Competition 5 (was 6), Individual Components 61 (was 60).

### 3) Vendor-rich PDP — gallery, YouTube video, kit-includes table, bullet-formatted description
User chose: **wire fields from the vendor public API when it exposes them, keep an admin-override escape hatch in the meantime.** Both paths now work end-to-end.

**Backend — `routes/shop.py :: _merge_product`**
- Added five new fields on every product payload (both `/api/shop/products` and `/api/shop/products/:slug`):
  - `gallery_urls: string[]` — vendor `images[]` / `image_urls[]` / `gallery[]`, or override `gallery_urls` / `images`. Normalised via `_normalize_vendor_image`, de-duped, with the primary `image_url` guaranteed as `gallery[0]`.
  - `video_url: string | null` — vendor `video_url` / `youtube_url` / `video`, or override `video_url`.
  - `includes: {name, qty, unit}[]` — vendor `includes` / `kit_includes` / `whats_included`, or override. Rows coerced to the structured shape; malformed rows are silently dropped (defensive — tested with `includes:[['string','string']]` and `video_url: 123`).
  - `description_html: string | null` — vendor rich HTML (future-proof when their editor outputs HTML).
  - `description_md: string | null` — vendor Markdown or override `long_description`.

**Frontend — `pages/ProductDetailPage.jsx`**
- New state `activeImageIdx` + derived memos `gallery`, `youtubeId`, `includes`, `descriptionHtml`.
- Hero image replaced with a **gallery**: main image + horizontally-scrollable thumbnail strip under it ([data-testid=pdp-gallery-thumbs]). Clicking a thumbnail swaps the hero. Thumbs only render when there are 2+ images (bare products stay single-image).
- New **YouTube section** [data-testid=pdp-video] below the hero — lazy-loaded iframe to `youtube-nocookie.com/embed/{id}` with strict referrer policy. Hidden entirely when `youtubeId` is null.
- New **"What's in the box" table** [data-testid=pdp-includes] — card with sticky-styled header + one row per item showing `× qty UNIT`. Hidden entirely when `includes.length === 0`.
- **Description section** now routes through a tiny md→HTML renderer (`utils/richContent.js`) that supports paragraphs, bullets, ordered lists, bold, italic, inline code and `[text](url)` links. Safety: every raw character is HTML-escaped before formatting tags are reinserted — a `<script>` in a vendor description cannot survive. Links are forced `rel="noopener noreferrer" target="_blank"`. Falls back to plain `<p>` for products that have no rich description.

**Supporting**
- `frontend/src/utils/richContent.js` — new. `mdToHtml()` and `youtubeIdFromUrl()` (handles watch?v=, youtu.be/, embed/, shorts/, nocookie, raw 11-char id).
- `frontend/src/index.css` — hand-rolled `.pdp-rich` typography (bullets/bold/links). We intentionally don't ship `@tailwindcss/typography` for size.
- Seeded a demo override on `shop_product_overrides` for the Robo Sumo kit (3 gallery images, YouTube `D5ngdbvLMC4`, 9 kit-includes rows, markdown description with two bullet lists) so the enriched PDP is already viewable in production without waiting on the vendor API extension.

### Awaiting vendor team
- Vendor to extend `/api/public/products/{id}` to return `images[]`, `video_url`, `includes[]`, `description_html` or `description_md`. Our backend already looks for these fields under multiple reasonable key names and merges them in with correct precedence (vendor → override → sample fallback), so once vendor ships, every product auto-enriches without any code change on OLL side.

### Verified in browser
- `/` navbar shows `Offerings · Shop · About · Centers · Techfest · Blog`.
- `/shop/category/competition-and-advanced-kits` shows exactly 5 kits (no AI Vision Blox).
- `/shop/category/individual-components` includes AI Vision Blox.
- `/shop/product/robo-sumo-kit…` renders: 4-thumbnail gallery, YouTube iframe `D5ngdbvLMC4`, 9-row kit-includes table (× qty + unit), rich description with `<strong>` + `<ul><li>` bullets.
- `/shop/product/<any-bare-product>` cleanly hides the three new sections — no empty tables.

## 2026-10-05 — Robotics Shop refresh (4 category landings, fixed navbar, same-category "You may also like", per-product SEO)
**Status: COMPLETE · testing_agent iteration_118 passed 11/13; both remaining items addressed in this same release.**

### 1) Fixed (sticky) navbar on `/shop` and `/shop/product/*` — mobile AND desktop
- Diagnosed the root cause: `/app/frontend/src/index.css` line 10 sets `html, body { overflow-x: hidden; max-width: 100vw; }` which silently promotes BODY to a scroll container and breaks `position: sticky` everywhere it was used. User's "navbar is not sticky on mobile" bug.
- Fix: switched the shop + PDP navbars from `sticky top-0` to **`fixed top-0 left-0 right-0`** and added `pt-[64px] sm:pt-[72px]` on the outer wrappers to compensate. The navbars now stay pinned to viewport-top on every viewport width.

### 2) Four big category landing pages
Each is its own crawlable SEO page with hero / description / full product grid + CollectionPage + BreadcrumbList JSON-LD:
- `/shop/category/curriculum-books` — targets "robotics textbook", "AI textbook class 7 8 9 10", "IoT book school curriculum" (14 products)
- `/shop/category/curriculum-robotic-kits` — targets "grade 1 robotics kit", "grade 9 robotics kit", "school robotics kit India" (10 products)
- `/shop/category/competition-and-advanced-kits` — targets "robosumo kit", "roboracer kit", "techfest IIT Bombay 2026 kit", "drone kit for school" (6 products incl. RoboSumo, RoboRacer, Drone, Aeromodel, 3D Pen, AI Vision Blox)
- `/shop/category/individual-components` — targets "bo motor", "esp32 s3 chip", "ir sensor", "oll blox" (60 products)
- New file: `frontend/src/utils/shopCategories.js` — defines all 4 categories (slug, name, icon, accent colour, tagline, SEO title/description/keywords) + a `getShopCategorySlug(product)` classifier that puts BOOKS first in rule order so "Book-G-9 IOT /AI Vision" lands under Curriculum Books (not Competition where the "ai vision" needle used to match).
- New route in `App.js`: `<Route path="/shop/category/:categorySlug" element={<ShopPage />} />`.

### 3) `/shop` main page — the 4 big category cards + category stacks
- Below the hero, a `grid-cols-2 lg:grid-cols-4` tile grid with icon (`BookOpen`, `Package`, `Trophy`, `Cpu` from lucide-react), name, tagline and item count — each card is a `<Link>` to its category page. The active category gets a highlighted ring on category pages.
- On the default `/shop` (no filter): each category renders as its own **labelled band** (`CategoryStacks`) with up to 8 products + a "View all N …" CTA, so users SEE products divided under each section without a filter click. On a filtered category page, the band is replaced by a flat 4-col grid of all products in that category.

### 4) `/shop/product/*` — per-product SEO + strict same-category "You may also like"
- Fixed canonical: was `window.location.origin + /shop/product/…` (preview URL) → now **always `https://oll.co/shop/product/…`** (production domain).
- Breadcrumb JSON-LD now uses the shop category (`Home › Shop › Curriculum Books › …`) instead of the raw vendor category. Visible breadcrumb has a clickable `[data-testid=pdp-breadcrumb-category]` link to the category page.
- "You may also like" rail now reads strictly from the shop category: fetches full catalogue, filters by same `shop_category_slug`, excludes current product, slices 8. Heading rewrites to `"More from {Category Name}"`. Verified in-browser: on the Robo Sumo kit page, related = 3D Pen, AI Vision Blox, Aeromodel, Drone, Robo Racer Kit (no Grade kits, no Books).

### 5) SEO plumbing — sitemap + robots
- Added 4 category URLs to both the static `/app/frontend/public/sitemap.xml` and the dynamic backend route (`backend/routes/seo.py`).
- Added `scripts/rebuild_product_sitemap.py` — fetches the live `/api/shop/products` catalogue and splices every PDP URL into the static sitemap (idempotent, marked with `Shop product PDPs (auto-generated …)` block). Ran once this release → **159 total URLs** in sitemap.xml (69 base + 90 product PDPs).
- robots.txt unchanged — `/shop/category/*` is implicitly allowed, `/shop?filter=…` remains disallowed.

### Verified in browser
- `/shop` navbar `bounding.top = 0` after `window.scrollTo(0, 1500)`.
- `/shop` 4-card category grid rendering with correct counts (14 / 10 / 6 / 60).
- `/shop/category/curriculum-books` canonical = `https://oll.co/shop/category/curriculum-books`, title = "Robotics, AI & IoT Curriculum Books for Grades 1–10 | OLL Shop".
- `/shop/product/robo-sumo-kit…` canonical hardcoded to production, "You may also like" shows only competition peers.
- `sitemap.xml` serves 159 URLs including every PDP.

## 2026-10-05 — SEO consolidation (www/http redirect, noindex private pages, 3× competition landing pages, PDF→HTML Problem Statement)
**Status: COMPLETE · tested by `testing_agent` iteration_117, 19 of 22 checks pass, remaining 3 are test-design limitations (noindex is correctly set in DOM; test measured post-redirect URL)**

Fixes five Search Console issues reported by the user: www vs non-www duplication, private pages indexed, Problem-Statement PDF ranking without HTML variant, and missing competition landing pages for "robo sumo" / "robo race" / "robo innovation" queries.

### 1) Canonical-host enforcement (www/http → https://oll.co)
- `frontend/public/index.html` — new pre-React inline script. If hostname is `www.oll.co` OR protocol is `http:` on apex `oll.co`, immediately `window.location.replace()`s to `https://oll.co` preserving path + query + hash. True 301 at DNS/CDN layer still has to be configured once in Cloudflare — flagged in Next Action Items.
- `frontend/src/hooks/useSeo.js` — hardened the canonical pipeline. Every page now goes through `normaliseCanonical()` which forces `https://`, strips `www.`, rewrites `/blog/*` → `/blogs/*`, drops tracking params (`utm_*`, `ref`, `fbclid`, `gclid`, `mc_*`, `igshid`, `yclid`) and trims trailing slash. Pass `canonical: 'auto'` for a self-referencing canonical derived from `window.location`.
- `frontend/src/App.js` — new `BlogSlugRedirect` catches `/blog/*` (splat) and 302s to `/blogs/*`, kills the `www.oll.co/blog/…` SERP variant.

### 2) Private-page noindex coverage
- New `frontend/src/components/NoIndexMeta.jsx` — drops in anywhere, writes `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` on mount, restores previous meta on unmount.
- `App.js` `ProtectedRoute` auto-wraps every admin route in `<NoIndexMeta/>`.
- Public-but-private flows explicitly wrapped: `/receipt`, `/receipts`, `/student/pay/:id`, `/student/payment/success`, `/school-pay/:schoolId`, `/school-payment-success/:schoolId`, `/school-payment-tracker-public/:schoolId`, `/pay/:token`, `/shop/checkout`, `/shop/success`, `/summer-camp/book|success|portal`, `/ai-foundations/book|success`, `/future-skills/book|success`, `/workshops/*/success`, `/social-media-intern/apply|success`, `/mycoursedetail/:id` and both `/login` + `/admin/login`.
- `ShopCheckoutPage.jsx` additionally calls `useSeo({ robots: 'noindex, nofollow' })` so the meta is in `<head>` instantly even in the empty-cart redirect window.
- `/shop?category=…` and `/shop?search=…` — `ShopPage.jsx` migrated from react-helmet-async to `useSeo` with canonical pinned to `https://oll.co/shop` regardless of query string, kills filter duplication Search Console was flagging.

### 3) robots.txt + sitemap.xml hardening
- Both the backend route (`/app/backend/routes/seo.py`) and the static files (`/app/frontend/public/robots.txt`, `sitemap.xml`) are now in sync.
- Added Disallow entries for `/receipt`, `/receipts`, `/mycoursedetail*`, `/school-pay/`, `/school-payment-success/`, `/school-payment-tracker-public/`, `/student/pay/`, `/pay/`, `/shop/checkout`, `/shop/success`, `/workshops/*/success`, `/social-media-intern/apply|success`, `/discover`, `/friendship-day/success`, `/public/lms-report/`, `/center`, `/techfest/submit`, `/blog/` (legacy prefix), `/shop?` (filtered variants), `/*?fbclid=`, `/*?gclid=`.
- Static sitemap.xml extended with the 4 new Techfest competition URLs (hub + 3 track pages + problem-statement).

### 4) Problem Statement PDF → HTML landing page
- New route `/techfest-iitbombay/problem-statement` (`frontend/src/pages/techfest/ProblemStatementPage.jsx`). Full HTML version of the official rulebook with per-track spec blocks (RoboSumo arena 100 cm, Robo Race 5 m track · 20×20×15 cm, Innovation Challenge 2 rounds + judging rubric). Two prominent "Download the official PDF" CTAs preserve the original download. JSON-LD: `Article` + `BreadcrumbList`.
- `TechfestPage.jsx` — the "Read the full Problem Statement" link in all three track panels now points at the new HTML page (previously pointed at the raw PDF, which was ranking at 1.5% CTR per Search Console).

### 5) Three new competition landing pages (/techfest-iitbombay/…)
- New shared layout `frontend/src/pages/techfest/CompetitionLandingLayout.jsx` — mobile-first, keyword-rich scaffold with Hero + Stats + Why Compete + Video + Rounds + Rules + Judging + Prizes + Kit callout + FAQ + Related rail. JSON-LD per page: `Event` (grand finale at IIT Bombay, 17 Dec 2026) + `BreadcrumbList` + `FAQPage`.
- `/techfest-iitbombay/robo-sumo-competition` — targets "robo sumo", "robosumo". Interlinks to Robo Sumo kit PDP (already 243 clicks, 20% CTR) + build-guide blog.
- `/techfest-iitbombay/robo-race-competition` — targets "robo race competition 2026", "roboracer". Interlinks to Robo Racer kit PDP.
- `/techfest-iitbombay/robo-innovation-competition` — targets "robotics innovation challenge". No kit callout (hardware-agnostic track).
- 301 aliases registered so legacy slugs still land: `/techfest-iitbombay/robosumo-competition` and `/techfest-iitbombay/roboracer-competition`.

### Verified in browser
- `/techfest-iitbombay/robo-sumo-competition` → canonical `https://oll.co/techfest-iitbombay/robo-sumo-competition`, robots `index, follow`, Event schema valid.
- `/techfest-iitbombay/problem-statement` → full HTML page with PDF download buttons.
- `/shop?category=robotics` → canonical pinned to `https://oll.co/shop`.
- `/blog/how-to-build-robosumo-robot-iit-bombay-techfest` → auto-redirects to `/blogs/…`.
- `/receipt`, `/admin/login`, `/login`, `/mycoursedetail/123` → `robots: noindex, nofollow, noarchive, nosnippet`.
- Homepage `/` and `/techfest` still `index, follow` — no regression on public pages.

### Still awaiting user action (cannot do from code)
- **DNS/CDN-level 301** for `www.oll.co` → `oll.co` and `http://oll.co` → `https://oll.co`. This is the true-301 that Google loves most; client-side redirect in `index.html` covers real-user browsers and JS-rendering crawlers in the meantime.
- **"Mobile underperforms"** — user chose to defer; waiting for which pages / which metric specifically.

## 2026-10-02 — Techfest rules + Robo Sumo/Racer kit inclusions refresh
**Status: COMPLETE · Verified in preview browser**

### 1) Techfest landing page — rules copy update (`TechfestPage.jsx`)
- RoboSumo Arena stat → **100 cm (1m) circular diameter** (was 150 cm).
- RoboRacer Track stat → **5 m · 2 lanes** (was 10–12 m).
- RoboRacer Bot Size stat → **20 × 20 × 15 cm** (was 20 × 15 × 15 cm).

### 2) Robo Sumo kit page — Kit Includes rewrite (`ProductDetailPage.jsx` → `TechfestDeepDive`)
New inclusions reflect the real shipping bill-of-materials:
Metal Body (20×25), 2 High-Grip Wheels, 2 High-Torque 300 RPM Johnson Motors, 2 High Power Motor Drivers, ESP32 S3 Wireless Controller, 20 F-F Wires, 1 × LIPO Battery, Lipo Battery Charger, Soldering Iron 25W + Soldering Wire, Sumo Arena Mat (150 cm), Structure Components. Also updated the ribbon strapline (`multi-motor drive`) and the Arena spec panel (100 cm ring).

### 3) Robo Racer kit page — Making-of video + Kit Includes rewrite
- New **"Making of the Kit"** section inserted between the hero ribbon and the body grid (parallel to the existing Sumo build-tutorial block) — embeds `youtube-nocookie.com/embed/n24iJFNf0C0` with lazy-load + strict referrer policy. `data-testid="pdp-roboracer-video"`.
- New inclusions: 1 × RC Chassis, 1 × ESP32 S3, 1 × Castor Wheel, 2 × Motors, 2 × Motor Drivers, 2 × Wheels, 1 × LIPO Battery, Lipo Battery Charger, User Manual, 5m Racing Track.
- Ribbon strapline updated to `1v1 racing kit · 5m racing track · battery included · out-of-box race.` and Arena spec panel to `5 m straight · 2 parallel lanes` + `20 × 20 × 15 cm max`.

### 4) Inclusion list UI polish
- The subtitle `<div>` now only renders when a subtitle string exists — items without a subtitle (e.g. `20 F-F Wires`, `1 × LIPO Battery`) render as a single tight bold row instead of leaving an empty line.

### Verified in browser
- `/techfest` RoboRacer stats row shows `5 M · 2 LANES` and `20 × 20 × 15 CM`.
- `/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a` — new Sumo inclusions list rendering with checkmarks.
- `/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc` — "Making of the RoboRacer Kit" video section + new Racer inclusions list + updated Arena & Bot Rules panel.

### Not run this session (carry-over to next)
- Full-regression `testing_agent` sweep (user opted to skip). Previous session's Twilio sandbox webhook / server-side PDF / Admin Shop XLSX / blog routing still awaiting automated QA.
- "Sync Expenses from check-in" manual-trigger button inside Admin Expenses tab (requested earlier, still not implemented).

## 2026-09-30 — Related-blogs rail, homepage callouts, admin orders XLSX + growth-partners polish
**Status: COMPLETE · All four asks verified in-browser**

### 1) Related-blogs rail (RoboSumo ↔ ICSE Code 66)
- New reusable `components/RelatedBlogsRail.jsx` — light-weight, dependency-free, drops in via `<RelatedBlogsRail exclude="…" />`. Renders each remaining post with a 16:9 cover, keyword eyebrow, keyword-rich H3, 2-line excerpt and read-time chip.
- Wired into both `RoboSumoBuildGuideBlog.jsx` and `ICSECode66BlogPage.jsx` just before the Footer, with proper `exclude` slug so each blog only shows the *other* one.
- Verified: rail appears with the expected cross-link on both pages (`related-blog-icse-code66-guide` on the RoboSumo blog, `related-blog-robosumo-build-guide` on the ICSE blog).

### 2) RoboSumo blog card on Homepage
- Replaced the single ICSE Code 66 callout on `LandingPage.jsx` with a **2-card "From the OLL blog / Deep dives, built for schools & makers" grid** — RoboSumo build guide + ICSE Code 66 side-by-side, each linking to its blog. Scoped CSS collapses to a single column on ≤760 px.

### 3) Admin Robotics Shop orders — XLSX export + filters + sorting + inline product name
File: `frontend/src/pages/admin/AdminShopPanel.jsx`
- **Inline product name** in the Items column: shows the primary item title (with "+ N more" suffix if multi-item) and the total unit count on a second row.
- **Product filter dropdown** — auto-populated from the distinct item titles across all currently-loaded orders (`shop-orders-product-filter`).
- **Sorting dropdown** — Order Date newest/oldest and Product A→Z / Z→A (`shop-orders-sort`).
- **Search now includes product titles** (was: order#, email, phone, name only).
- **Export XLSX button** (`shop-orders-export`, emerald pill next to "Sync from Vendor") — dynamically imports `xlsx` at click-time (no bundle bloat), builds a 13-column workbook (Order #, Order Date, Customer, Email, Phone, City, State, Pincode, **Product Name**, Units, Total, Payment Status, Tracking Links) with sensible column widths, and downloads `oll-shop-orders-YYYY-MM-DD.xlsx`. Exports **the currently filtered/sorted view** so admins can slice → export in one flow.

### 4) Growth Partners — Add Growth Partner modal
File: `frontend/src/pages/admin/AdminGrowthPartners.jsx`
- Swapped the plain City `<Select>` for the existing `CitySearch` component (backed by `/api/cities`, search-as-you-type + keyboard nav).
- Replaced the old Interest Type options `[Franchise, Partnership, Investment, Reseller, Other]` with the four now-canonical values you asked for: **Business Partner · Influencer Partner · Referral Partner · Centre Franchise**.

### Files
- `frontend/src/components/RelatedBlogsRail.jsx` (new)
- `frontend/src/pages/blogs/RoboSumoBuildGuideBlog.jsx` — rail
- `frontend/src/pages/blogs/ICSECode66BlogPage.jsx` — rail
- `frontend/src/pages/LandingPage.jsx` — 2-card blog callout grid
- `frontend/src/pages/admin/AdminShopPanel.jsx` — XLSX + filters + sorting + inline product name
- `frontend/src/pages/admin/AdminGrowthPartners.jsx` — CitySearch + new INTEREST_TYPES



## 2026-09-30 — RoboSumo & ICSE blog polish + Techfest CTA reshuffle
**Status: COMPLETE · All 4 asks verified in-browser**

### RoboSumo build-guide blog
- **YouTube video now the hero** — moved the `youtube-nocookie` iframe (video `qCyF9I3IXCM`) directly under the H1 and killed the old "Watch the Full Tutorial" section. New hero caption: "Fig. 1 — Full build walkthrough."
- **Circuit diagram moved down** — placed inside "Step 11-12 · Connect the BTS7960 to the ESP32", right after the ESP32-S3 board photo and just above the pin-map code block.
- Removed the `video` section from the TOC.

### Both blogs — sticky right-nav no longer hidden
- Old `sticky top-6` (24 px from viewport top) was being partially covered by the pill-nav (~72 px tall + 12 px offset = 84 px total).
- Bumped both TOC wrappers to explicit `style={{ position: 'sticky', top: '100px' }}` with `max-h-[calc(100vh-8rem)]` so the TOC clears the pill-nav on every scroll position. Verified: at `scrollY=4000` (RoboSumo) and `scrollY=5000` (ICSE), `getBoundingClientRect().top === 100` on both.

### ICSE Code 66 blog — image placement matches the PDF
- New **hero banner** `icse-code66-hero-banner.png` (downloaded from user upload) placed as Fig. 1 under H1, replacing the ecosystem infographic.
- The former hero (`oll-code66-program-ecosystem.jpg`) has been **moved down to the "Connect every practical to a concept" section**, replacing the older CICSE cycle image there.
- Updated Article JSON-LD `image[]` and og:image accordingly.

### Techfest page — CTA reshuffle
- **Removed** "Build Guide" from the pill-nav (`techfest-nav-build-guide` gone, verified false).
- **Added** it right next to the primary hero CTA "Get the Official {track} Kit" — only on the Sumo track (`techfest-cta-build-guide-sumo`).
- **Added** it inside the RoboSumo card in the "The Techfest-Ready Kits" section (`techfest-kit-sumo-build-guide`). The `KitCard` component was refactored to accept an optional `buildGuideHref` prop; only the Sumo kit passes it. `KitCard` is now a `<div>` wrapper (was `<Link>`) so the extra "Build Guide" link is separately clickable.

### RoboSumo Kit product page (`/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-…`)
- Injected a **YouTube build tutorial block** inside `TechfestDeepDive`, right below the "Robo Sumo · Battle-Ready Kit" ribbon and above the gallery. Displays only when `isSumo === true`.
- 16:9 responsive iframe (`youtube-nocookie/embed/qCyF9I3IXCM`) with a short lead-in paragraph and a text link to the full written build guide (`data-testid="pdp-robosumo-blog-link"`).

### Files
- `frontend/src/pages/blogs/RoboSumoBuildGuideBlog.jsx` — hero video, circuit moved down, sticky top: 100
- `frontend/src/pages/blogs/ICSECode66BlogPage.jsx` — new hero banner, ecosystem moved to concept-practical, sticky top: 100
- `frontend/public/blog-assets/icse-code66/icse-code66-hero-banner.png` (new)
- `frontend/src/pages/TechfestPage.jsx` — build guide moved to hero CTA & kit card
- `frontend/src/pages/ProductDetailPage.jsx` — RoboSumo kit page YouTube tutorial



## 2026-09-30 — RoboSumo blog polish + new ICSE Code 66 pillar blog
**Status: COMPLETE · Visual + sticky TOC verified in-browser**

### RoboSumo blog updates
- Replaced the generic site Navbar with the **same sticky pill-nav** used on `/techfest` (OLL logo · Techfest logo · Buy Kit · Register) — brand continuity for the Techfest funnel.
- Content now sits on a **white sheet inside the navy gradient** with generous side padding (`px-5 sm:px-8 lg:px-10`) so text no longer bleeds into the right-rail.
- Body copy up to **18 px / 1.85 line-height**, H2s to **26–32 px** — noticeably easier long-form read.
- **Fixed the broken sticky right-rail TOC**: the global stylesheet sets `html, body { overflow-x: hidden; }` which silently creates a body-level scroll container and kills `position: sticky` for descendants. Page-scoped override switches these to `overflow: clip` — same overflow behaviour but without a scroll container, so sticky works again. Verified: at `scrollY=2500`, TOC `getBoundingClientRect().top === 24` — pinned under the pill-nav.
- Added `data-testid="rs-toc-sidebar"` + `max-h-[calc(100vh-6rem)] overflow-y-auto` on the sticky wrapper so long TOCs never spill off-screen.

### Techfest page CTA
- New pill-nav button **"Build Guide"** (`data-testid="techfest-nav-build-guide"`) and a final-section CTA **"How to Make a RoboSumo Robot"** (`data-testid="techfest-final-build-guide"`) both linking to the RoboSumo blog.

### New: ICSE Robotics & AI Code 66 pillar blog
- Route: `/blogs/icse-robotics-ai-code-66-classes-9-10-guide` (registered before catch-all `/blogs/:slug`).
- File: `frontend/src/pages/blogs/ICSECode66BlogPage.jsx` (~800 LOC).
- Content: 17 sections mirroring the OLL SEO brief — CISCE aims, decision framework, 6 school responsibilities, board assessment format (100+100), minimum-assignments infographic, 7-stage year plan, per-grade assignment lists, digital+physical lab layer, kit-components infographic, Concept→Practical→Application→Assessment cycle with fees table, 5-question provider checklist (with OLL scoring ✓ on every row), Class 9 + Class 10 curriculum grids, book recommendations, teacher-selection guidance, OLL Code 66 program summary + CTA card, real 100/100 topper results table, adopting schools, readiness checklist, and a 5-question FAQ.
- All 7 verified CISCE infographics from `Archive 5.zip` uploaded to `/blog-assets/icse-code66/` with keyword-rich alt text.
- Same SEO stack as RoboSumo: `useSeo` for title/description/canonical/og/twitter, imperative `useEffect` for `article:*` + `hreflang` extras, **Article + BreadcrumbList + FAQPage** JSON-LD, single H1, matching sticky pill-nav, matching sticky right-rail TOC with scroll-spy.
- Registered in `App.js`, added to `BlogsPage` `DEFAULT_BLOGS` (top position), and added to both the backend dynamic sitemap and static `public/sitemap.xml` with priority 0.9.

### Cross-links from Home & ICSE 9-10 landing
- **Homepage** (`LandingPage.jsx`): new blog callout card just above the footer with the Code 66 ecosystem infographic + red "Read the guide →" CTA (`data-testid="home-icse-blog-callout"`).
- **ICSE 9-10 landing** (`RoboticsICSE910Landing.jsx`): new blog callout section after `SchoolRelatedPrograms` with the same layout (`data-testid="icse-blog-callout"`).

### Files
- `frontend/src/pages/blogs/RoboSumoBuildGuideBlog.jsx` — pill-nav, sticky TOC fix, typography, margins
- `frontend/src/pages/blogs/ICSECode66BlogPage.jsx` (new)
- `frontend/public/blog-assets/icse-code66/*.jpg` (8 new infographics)
- `frontend/src/pages/TechfestPage.jsx` — 2 new build-guide CTAs
- `frontend/src/pages/LandingPage.jsx` — homepage blog callout
- `frontend/src/pages/school/RoboticsICSE910Landing.jsx` — landing blog callout
- `frontend/src/pages/BlogsPage.jsx` — new default card
- `frontend/src/App.js` — new route
- `backend/routes/seo.py` + `frontend/public/sitemap.xml` — sitemap entries



## 2026-09-30 — Server-side proposal PDF renderer + WhatsApp attachment
**Status: COMPLETE · End-to-end tested (signed webhook → TwiML `<Media>` → 200 PDF)**

Fixes the "WhatsApp replies with a text wall instead of a real PDF" issue.

- **New module** `backend/routes/proposal_pdf.py` renders a Robotics & AI proposal to A4 PDF using **reportlab** — mirrors the frontend jsPDF layout (navy header band, "OLL Robotics and AI Program Proposal" title, program-details rounded box, bullet deliverables, fees table with alternating rows, estimated-total line, page 2 requirements + next-steps box + contact line).
- **Two endpoints**:
  - `GET /api/proposals/{school_id}/share-url` (auth) — returns `{url, filename}`
  - `GET /api/public/proposals/{school_id}.pdf?sig=<hmac>` (public, signed) — streams the freshly rendered PDF. Auto-expires end of the next UTC day (accepts today's OR yesterday's HMAC) so cross-midnight WhatsApp taps still work.
- **Signature**: `HMAC-SHA256(PROPOSAL_LINK_SECRET, "{school_id}|{yyyy-mm-dd}")[:32]`. Secret falls back to `JWT_SECRET` if `PROPOSAL_LINK_SECRET` isn't set.
- **WhatsApp webhook now attaches the PDF as `<Media>`**: when a `generate_proposal` action succeeds, the webhook builds the signed public URL from the request's `X-Forwarded-*` origin and returns two TwiML `<Message>` bodies — first the summary, then `"📄 Proposal PDF attached below."` with `<Media>{url}</Media>`. Twilio fetches the PDF over HTTPS and forwards it to WhatsApp as a real document.
- `_twiml()` helper extended to accept `{"body": str, "media": [urls…]}` dicts alongside plain strings.
- Verified: signed URL returns 200 + `application/pdf` + valid `%PDF-1.4` header + 5.5 KB file. Rendered pages inspected visually — matches OLL brand.

### Files
- `backend/routes/proposal_pdf.py` (new)
- `backend/routes/whatsapp_twilio.py` — imports `build_public_proposal_url`, attaches media
- `backend/server.py` — registered `proposal_pdf_router`



## 2026-09-30 — WhatsApp fixes: memory, session visibility, PDF deep-links
**Status: COMPLETE · End-to-end tested via signed curl (2-turn pronoun test passed)**

Three issues from live WhatsApp use:

1. **Sessions weren't showing in admin AI Chat sidebar**
   - Root cause: `_resolve_user_for` looked at `db.users` but `admin@oll.co` lives in `db.team_users`. It fell through to a synthesised identity with `id="whatsapp-admin"`, which doesn't match the admin's real user_id used by `/api/ai-chat/sessions` (filters by `user_id`).
   - Fix in `routes/whatsapp_twilio.py`: try `team_users` FIRST for both the phone-match and the `WHATSAPP_ADMIN_USER_EMAIL` fallback; require `id` to exist on the resolved doc.
   - One-time migration ran: existing `wa-*` sessions with `user_id="whatsapp-admin"` were re-parented to the real admin id (5668d09f…).

2. **No memory across process restarts**
   - Root cause: `LlmChat` from `emergentintegrations` stores conversation only in process-local memory — every hot-reload (or Twilio-webhook cold-start) wiped it.
   - Fix in `routes/ai_chat.py::run_ai_chat_turn`: load the last 30 turns from `ai_chat_sessions.messages` and pass them as `initial_messages=` to `LlmChat`. Verified: pronoun resolution ("generate a proposal for **this school**") correctly picked up "Shreyaan Daga school" from a prior turn even across a process restart.

3. **No PDF over WhatsApp**
   - Root cause: `generate_proposal` / `generate_mou` / `generate_invoice` actions all return `status: frontend_action` — the admin UI renders the PDF client-side via jsPDF; there's no server-side renderer.
   - Interim fix in `routes/whatsapp_twilio.py`: for those 3 action types, append a deep-link `📄 Open the CRM to download the {label} PDF: https://oll.co/admin/school-crm?school={id}` to the WhatsApp reply so the user can grab the PDF one tap away.
   - Also widened success detection (`frontend_action` now shows ✅ instead of ⚠️).
   - **Future work**: build a server-side PDF renderer (reportlab/weasyprint) that mirrors the jsPDF output so proposals can be attached directly via TwiML `<Media>` — noted as backlog.

### Files
- `backend/routes/whatsapp_twilio.py` — user resolution + PDF deep-link
- `backend/routes/ai_chat.py` — `initial_messages` loaded from DB



## 2026-09-30 — Twilio WhatsApp inbound webhook for AI Chat (prototype)
**Status: COMPLETE · End-to-end tested via curl**

- New route `POST /api/whatsapp/twilio/webhook` (+ `GET /whatsapp/twilio/health`) in `backend/routes/whatsapp_twilio.py`.
- Extracted the AI-Chat core into a reusable `run_ai_chat_turn(session_id, user_text, user)` coroutine so the WhatsApp webhook shares the exact same logic (LLM prompt, pronoun resolution, action executor) as the in-app chat.
- Signature verification: every request is verified against `TWILIO_AUTH_TOKEN` using Twilio's `RequestValidator`. Reconstructs the full public URL from `X-Forwarded-Proto` + `X-Forwarded-Host` (k8s ingress rewrites `request.url` to an internal cluster hostname, which was breaking the initial signature check — fixed).
- Allow-list: only numbers in `WHATSAPP_ALLOWED_NUMBERS` (comma-sep E.164) can hit the bot. Any other number gets a friendly private-beta reply.
- Session persistence: one thread per phone in `whatsapp_threads` collection so context carries across messages. `/reset` (or `clear`, `new chat`) starts a fresh session.
- Reply formatting: splits > 1500-char replies into multiple TwiML `<Message>` bodies (Twilio hard-caps single messages at 1600). Appends a compact status list of any CRM actions executed (`✅ create_lead — Sunshine School`).
- User resolution: matches the WhatsApp number against `team_users.phone` (last-10-digit fuzzy match), else falls back to `WHATSAPP_ADMIN_USER_EMAIL` (default `admin@oll.co`). This drives all permissions and audit trail.
- Config in `backend/.env`:
  ```
  TWILIO_ACCOUNT_SID=AC…
  TWILIO_AUTH_TOKEN=…
  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
  WHATSAPP_ADMIN_USER_EMAIL=admin@oll.co
  WHATSAPP_ALLOWED_NUMBERS=+919699188188
  ```
- Dependency: `twilio==9.11.2` (added to requirements.txt).

### Files
- `backend/routes/whatsapp_twilio.py` (new)
- `backend/routes/ai_chat.py` — extracted `run_ai_chat_turn`
- `backend/server.py` — registered router
- `backend/.env` — credentials + allow-list
- `backend/requirements.txt` — twilio



## 2026-09-29 — Student bulk import now skips duplicates cleanly
**Status: COMPLETE · Tested with curl**

- Fix in `backend/routes/techfest.py::import_techfest_students_csv`:
  - **Dedup upfront in a single query** — preloads compi_reg_id, techfest_id, email and (name, phone) indexes from `techfest_student_registrations` into memory so each CSV row is checked in O(1) instead of hammering Mongo with N `find_one` calls. That per-row query storm is almost certainly what was causing the earlier "Import failed" toast on large uploads (ingress timeout).
  - **New default behavior: SKIP duplicates**, only insert genuinely new students. Returns a distinct `skipped` counter alongside `inserted` / `updated`.
  - Added a `?update_existing=true` opt-in for admins who want to overwrite matched records.
  - Whole per-row block now sits inside a `try/except` — even a poison row can't crash the whole import; instead it's collected into `errors[]`.
  - Same in-memory index is updated after each insert so duplicates *within* the same CSV are also skipped correctly.
- Verified via curl (admin token) with a 3-row CSV containing 1 in-file duplicate:
  - 1st run: `inserted=2, skipped=1` (in-file dup caught)
  - 2nd run: `inserted=0, skipped=3` (all existing) ✅
- Frontend `AdminCompetitions.jsx::handleImportFile` already displays `skipped` in the success toast (`Imported: X new · Y updated · Z skipped`) — no frontend change required.

### Files
- `backend/routes/techfest.py` — `import_techfest_students_csv` refactored (~1262–1440).



## 2026-09-29 — RoboSumo SEO Blog + Techfest + Kit funnel
**Status: COMPLETE**

- Shipped a long-form SEO pillar blog at `/blogs/how-to-build-robosumo-robot-iit-bombay-techfest` (`pages/blogs/RoboSumoBuildGuideBlog.jsx`, ~750 LOC).
- 15-step build guide from a national RoboSumo winner (chassis → wedge → LiPo → BTS7960 → ESP32 → firmware → testing), with 5 copy-able ESP32 code blocks (`#include`s, pin map, motor mixer, phone-cmd endpoint, failsafe loop).
- YouTube embed via privacy-first `youtube-nocookie.com` iframe (`data-testid="youtube-embed"`).
- Full SEO stack via the codebase's imperative `useSeo` hook (Helmet-async is broken on React 19): unique title, meta description, keywords, canonical, robots (max-image-preview:large), og:type=article + og:image (wsrv-proxied 1200×630), Twitter summary_large_image, en-IN + x-default hreflang, article:published_time / modified / author / section / tag, preconnects to YouTube/i.ytimg.
- Structured data: **Article + HowTo (15 steps) + BreadcrumbList + FAQPage** JSON-LD — verified 4 blocks land in DOM alongside the site-wide EducationalOrganization + WebSite.
- 13 unique product/build photos uploaded to `/app/frontend/public/blog-assets/robosumo/` (hero circuit diagram, wedge dims, chassis views, BTS7960 pinout, ESP32-S3, LM2596, XT60, LiPo, Johnson motor, bracket) — every `<img>` has descriptive alt text with keywords + explicit width/height + `loading="lazy"`.
- Internal linking to `/techfest` (championship page) and the RoboSumo shop kit PDP (3 CTAs: hero, body, footer).
- Sticky right-rail ToC (17 entries) with IntersectionObserver-driven active highlight; on-page ordered ToC and semantic breadcrumbs.
- Added URL to both the backend dynamic sitemap (`routes/seo.py`, priority 0.9, weekly) and the static `public/sitemap.xml`.
- Registered a specific `/blogs/how-to-build-robosumo-robot-iit-bombay-techfest` route BEFORE the catch-all `/blogs/:slug` in `App.js`, plus a card entry at the top of the blog listing page (`BlogsPage.jsx`).

### Files
- `frontend/src/pages/blogs/RoboSumoBuildGuideBlog.jsx` (new)
- `frontend/public/blog-assets/robosumo/*.{jpg,png}` (13 new images)
- `frontend/src/App.js` — lazy import + route
- `frontend/src/pages/BlogsPage.jsx` — new blog card at top of `DEFAULT_BLOGS`
- `backend/routes/seo.py` — new STATIC_URLS entry
- `frontend/public/sitemap.xml` — new `<url>` block



## 2026-09-29 — Timetable / Edit-Session modals unclickable (Radix focus-trap conflict)
**Status: COMPLETE**

- Root cause: the **New / Edit Timetable** modal (and the **Edit Session Full** modal) in `AdminSchoolCRM.jsx` were plain `<div className="fixed inset-0 z-[70]">` elements rendered *inside* a Radix `<Dialog>` (Sessions / Edit School / Onboarding Workflow). Radix Dialog installs a focus trap + `aria-hidden` on everything outside its own content — clicks on our nested modal were being swallowed and the page felt hung.
- Fix: `createPortal(...)` both modals to `document.body`, escaping the Radix DOM tree entirely. Bumped z-index to `z-[100]` for good measure.
- Verified live: Mon/Fri day pills, date inputs, dropdowns and Create button are all interactive again. Selecting Mon + Fri correctly opens per-day time-slot editors underneath.

### Files
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` — `createPortal` import + wrap on both modals.


## 2026-09-29 — Growth Partners fixes + assignee cache + expense-driven GP share sync
**Status: COMPLETE**

### 1 · Influencer / Referral Partner — City field is now a picker
- Replaced the plain text `<Input>` with the shared `<CitySearch>` component in `SimplePartnersSection.jsx`. Type-ahead lists real cities (e.g. typing "Mumbai" surfaces "Mumbai · Maharashtra" + "Navi Mumbai"). Prevents typos that were breaking city-wise partner grouping.

### 2 · Assign Schools modal — "0 shown" fixed
- The frontend was calling `/api/school-inquiries?limit=1000` (hyphen), which 404'd and was silently caught by `.catch()`. The real endpoint is `/api/schools/inquiries` (slash) → returns 180 schools. Switched to the correct path; assign-schools modal now populates.

### 3 · Simple partners visible on Central Database
- `central_database.py` `by-city` endpoint was only reading `db.growth_partners`. Extended it to also merge `db.simple_partners` (Referral + Influencer) into the same `growth_partners` city bucket — with a `role` of `referral_partner` or `influencer_partner` and useful `meta` (partner type, social handle, linked schools count) so the row is disambiguated in the UI.

### 4 · GP Share expense → school modal + GP earnings
- Root cause: when an admin created a `gp_share` expense from `/admin/expenses` and only picked the school by **name** (no id), the resulting expense had `school_id = ""` → the reverse-sync `_resync_school_share_from_expenses` was a no-op → `onboarding_data.gp_share_amount` stayed at zero → school edit modal AND GP earnings both looked broken.
- Fix in `POST /api/school-expenses`: when `school_id` is empty but `school_name` is given, auto-resolve to a `school_inquiries.id` (case-insensitive exact match; falls back to unique substring). Silent no-op only if truly ambiguous. Reverse-sync now fires consistently → GP share amount shows in the school modal AND rolls into the GP earnings widget.

### 5 · Assignee cache — "OLL" showing even after reassignment
- Root cause: frontend PATCH sends only `assigned_to: <userId>` — the backend never refreshed the cached `assigned_to_name` field, so cards displayed the previous / seed name (e.g. "OLL").
- Fix in `PATCH /api/schools/inquiry/{id}`: whenever `assigned_to` changes we now look up the new user in `team_users` and refresh `assigned_to_name` in the same update. Unassign clears it. Cards + list now reflect the new owner immediately.

### Files
- `backend/routes/schools.py` — assignee_name auto-refresh
- `backend/routes/expenses.py` — school_id auto-resolution from school_name
- `backend/routes/central_database.py` — merge simple_partners into growth_partners bucket
- `frontend/src/pages/admin/growth-partners/SimplePartnersSection.jsx` — CitySearch + correct schools endpoint


## 2026-09-29 — Educator Salary → Ledger materialization (7th of next month)
**Status: COMPLETE — 93 line items materialized on first backfill**

### Diagnostic first
- `/api/school-expenses/pnl-summary` was already returning `teacher_cost` correctly for **31 of 47 schools** via the live CheckIn sync. The 16 zeros are educators whose CheckIn `school_name` didn't match any `school_inquiries` row (spelling drift like "St. Gregorios High School" vs "St Gregorios High School"). Those are surfaced in `checkin_sync.unmatched` on the P&L API response.

### New module — `backend/routes/educator_salary_sync.py`
- `POST /api/school-expenses/import-educator-salaries?since_month=YYYY-MM&up_to_month=YYYY-MM`
  Pulls CheckIn earnings, groups by (educator × school × month), and **upserts one `school_expenses` row per group** with:
  - `category: teacher_cost`
  - `amount: sum of realised earnings for that group`
  - `expense_date: 7th of the following month` (Aug earnings → 2026-09-07)
  - `salary_month: YYYY-MM`
  - `sync_key` — deterministic ID for idempotent re-runs
  - `sync_source: checkin_auto`
  - `vendor_name`, `educator_name`, `educator_id`, `educator_email` all populated
  - unmatched rows land under `"General (no timetable)"` or `"Unmatched · <school name>"` so nothing is lost.
- `POST /api/cron/educator-salary-materialize` — cron endpoint (protected by `WEBHOOK_CRON_SECRET`). Materializes only the **previous month**.
- `GET /api/school-expenses/educator-salary-sync-status` — returns per-month row counts and totals.

### Cron
- Added an entry to `.emergent/crons.yml`:
  `cron: "0 4 7 * *"` (IST, i.e. 04:00 on the 7th of every month).

### UI
- New **"Materialize Salaries → Ledger"** button in `AdminExpenses.jsx` (P&L header, next to the existing CheckIn sync summary). Confirmation modal explains what it does. Fires the backfill and refreshes.

### First-run stats (verified live)
- **93 new line items** across May–Aug 2026 (April had zero earnings in CheckIn).
- **Total materialized: ₹16.77L** — matches the P&L-side computed value.
- **₹2.12L** unmatched (educators with no timetable) landed in "General" so the ledger stays complete.
- Re-run produced `inserted: 0, updated: 0, skipped: 93` → **idempotent**.
- Sample row: *Aakash Dalvi · Green Lawns High School · Aug 2026 · ₹19,575 · expense_date 2026-09-07*.

### Files
- `backend/routes/educator_salary_sync.py` (new)
- `backend/server.py` (router + import)
- `.emergent/crons.yml`
- `frontend/src/pages/admin/AdminExpenses.jsx`


## 2026-09-29 — CheckIn sessions filter bug on Live Dashboard
**Status: COMPLETE**

- Root cause: `_sessions_block()` in `live_dashboard.py` was calling `GET /sessions?per_page=500&page=N` with **no date filter**, then filtering locally against `session_date == today`. Upstream returns oldest-first, so 4 pages × 500 rows never reached today's data → the card always showed `0/0`.
- Fix: pass `date=YYYY-MM-DD` to `/sessions` (the correct param name — NOT `session_date`), break early when a batch returns less than `per_page`, keep a client-side `session_date == today` re-filter as a safety net.
- Verified live: sessions block now returns `total: 36, on_time: 29, late: 1, upcoming: 6` for 2026-09-29.

### Files
- `backend/routes/live_dashboard.py`

## 2026-02-04 — Live Dashboard, Support "new today", Telecalling batches + bulk ops
**Status: COMPLETE**

### Live Dashboard · School CRM card
- **Total Converted Schools** is now the star metric: renders in a big 3xl violet number over a `/ 500` goal, with a right-aligned live percentage badge and a gradient progress bar (violet → fuchsia → emerald). Progress clamped 0–100%.

### Live Dashboard · Support "New" definition
- `_support_block` in `live_dashboard.py` now counts **New Today** as *any* query whose `created_at` falls in today's IST window — regardless of status — matching what the user sees in Support Center. Previously it counted "open + not overdue" which produced smaller / stale numbers.

### Telecalling · Assignee bug
- **Root cause**: `import_contacts` and every reassign/bulk endpoint looked users up in `db.users`, which is empty in this project — real users live in `db.team_users`. Fixed all six lookups.
- The bulk-import endpoint now also raises 400 when the selected assignee cannot be found (was silently un-assigning).

### Telecalling · Batches (imported sheets → tabs)
- New collection **`telecalling_batches`** stores `{id, name, file_name, row_count, extra_columns[], created_by, created_at}`.
- Endpoints: `GET /api/telecalling/batches`, `PATCH /api/telecalling/batches/{id}` (rename), `DELETE /api/telecalling/batches/{id}` (deletes tab + all its contacts).
- Every imported row now carries `batch_id`, `batch_name`, and `extra_fields` — a dict of the unmapped CSV columns preserved verbatim.
- Import modal now accepts an optional **Tab / Sheet name** (falls back to filename without extension).
- `list_contacts` accepts `batch_id=` (`all` = show everything).

### Telecalling · Auto-dedupe on import
- Duplicate detection normalises phone numbers (digits only, last 10). Skips any row whose phone already exists in the DB OR appears twice in the same import. Import response now returns `duplicates` count in addition to `inserted` / `skipped`.

### Telecalling · Bulk operations (admin only)
- `POST /api/telecalling/contacts/bulk-delete` — accepts `{ids: [str]}`.
- `POST /api/telecalling/contacts/bulk-assign` — accepts `{ids: [str], assigned_to: str | null}`.
- Frontend: checkbox column + header select-all, indigo bulk-toolbar showing "N selected · Select all X · [Assign…] [Delete] [✕]", and a modal picker for the bulk-assign target user.

### Telecalling · Queue UI upgrades
- **Batch tab bar** at the top of Queue: "All Contacts" (permanent, indigo) + one tab per import batch, showing live contact counts. Admins can double-click / click the pencil to rename, or click the trash to remove a whole tab.
- **Email column** now visible in the queue (was mapped by backend but never surfaced).
- **Extra columns** — every unknown CSV header (e.g. "Techfest ID", "Team ID", "Zonal City") is preserved and rendered as its own truncated column, ordered by the batch's original column order when a specific tab is active.

### Files
- `backend/routes/telecalling.py`
- `backend/routes/live_dashboard.py`
- `frontend/src/pages/admin/AdminTelecalling.jsx`
- `frontend/src/pages/admin/AdminLive.jsx`


## 2026-02-04 — AI-Chat MoM → Bulk Tasks + Field-Reports Deletes + Live Dashboard polish
**Status: COMPLETE**

### AI Chat — Minutes of Meeting → bulk task creation
- Added a dedicated **MINUTES OF MEETING → BULK TASK CREATION** section to `AI_SYSTEM_PROMPT` (`ai_chat.py`). The model now recognises MoM/action-items patterns and emits ONE `create_task` action per line in the same turn — no confirmation prompt, no blocking on missing fields.
- Per task the model extracts: `title` (concise), `description` (context), `assigned_to_name` (matched against team list; else flagged), `due_date` (parses "by Friday", "next Monday", "Feb 20", "EOD" etc.), `priority` (`high` for "urgent/critical/asap/P0", `low` for "when free/P2", else `medium`).
- After executing, the assistant response lists which tasks are missing owner / due date / priority so the user can reply with a single follow-up ("1 → Ankit, Friday; 2 → Priya") — the model then emits `update_task` for the referenced items.
- Input placeholder in `AdminAIChat.jsx` updated so users know to try MoM paste.
- **Verified end-to-end**: pasted 4-line MoM → created TASK-000057 to TASK-000060, correctly flagged owners not in team + missing due dates in the message.

### Field Reports — delete controls
- Two new endpoints in `field_reports.py` (both **admin OR owner**):
  - `DELETE /api/field-reports/{report_id}` — kills the entire check-in session and all its visits.
  - `DELETE /api/field-reports/{report_id}/school-visits/{visit_id}` — removes a single visit.
- `AdminFieldReports.jsx` — `VisitRow` gained a trash icon; every check-in header gained a **"Delete check-in"** button. Wired into both the day-group view and the multi-user grouped view. Also added a trash button next to today's visits on `My Field Day`. Non-admins only see the buttons for their own records.

### Live Dashboard
- Clock now renders in **12-hour format** (e.g. `3:14:17 pm`).
- Header layout re-arranged so the **day (WEDNESDAY)** and **date (28 February 2026)** appear on their own lines to the *left* of the timer — day bigger than date, both slightly smaller than the timer. Border-left separator + `IST` label above the timer.
- Support card now shows a new bottom row **"Avg Resolution Time"** with the total resolved sample size — driven by a new `avg_resolution_hours` / `avg_resolution_display` field in `_support_block` (computed from `resolved_at − created_at − paused_seconds` across all resolved tickets; formatted as `Nm`, `N.Nh`, or `N.Nd`).

### Team Member PDF Reports
- Removed the "CRM Highlights" section from both the frontend (`teamMemberReportPdf.js`) and the backend cron (`team_reports_cron.py`). Field-visit / call metrics remain visible in the earlier KPI blocks — the standalone CRM table was redundant.

### Files
- `backend/routes/ai_chat.py`
- `backend/routes/field_reports.py`
- `backend/routes/live_dashboard.py`
- `backend/routes/team_reports_cron.py`
- `frontend/src/pages/admin/AdminAIChat.jsx`
- `frontend/src/pages/admin/AdminFieldReports.jsx`
- `frontend/src/pages/admin/AdminLive.jsx`
- `frontend/src/utils/teamMemberReportPdf.js`


## 2026-02-04 — Product tag "Techfest, IIT Bombay" + School Logo + Closed Requirements
**Status: COMPLETE**

### Telecalling & Field Reports
- Added new product option **Techfest, IIT Bombay** (`techfest_iit_bombay`) to `OLL_PRODUCTS` in `AdminTelecalling.jsx` and `AdminFieldReports.jsx` — surfaces in the Interested Lead popup and the Field Visit form once "Lead Interested = Yes".
- Telecalling queue now has a dedicated **Products** column next to Interested? — renders emerald chips of the selected product labels only when `lead_interested === 'yes'`.

### School CRM · School Logo
- Backend `SchoolInquiryUpdate` (`schools.py`) accepts new `logo_url` & `logo_filename` fields.
- New `SchoolLogoUploader` sub-component in `AdminSchoolCRM.jsx`: uploads via `/api/upload?type=images` (Cloudinary), 5 MB max, PNG/JPG/WEBP/SVG. Preview thumbnail + Upload / Replace / Download / Remove.
- Logo state flows through all three `setEditOnboardData` branches (embedded, fetched onboarding, new-from-school-doc) and is included in the PATCH payload on Save.
- Download button fetches the Cloudinary asset as a blob and saves it as `<school-slug>-logo.<ext>` — fallback opens it in a new tab.

### Educator Applications · Requirements tab
- `/api/requirements` now accepts `include_inactive=true` (admin frontend passes it).
- The Requirements tab in `AdminEducators.jsx` splits requirements into two sections:
  1. **Active Requirements** grid (top, with count badge).
  2. A **CLOSED REQUIREMENTS · N** divider (horizontal rule + centred label) followed by a muted grid of closed cards.
- The status badge for closed cards reads **Closed** (was "Inactive"). Tab counter in the sidebar now shows only active count.

### Files
- `backend/routes/schools.py`, `backend/routes/educators.py`
- `frontend/src/pages/admin/AdminTelecalling.jsx`
- `frontend/src/pages/admin/AdminFieldReports.jsx`
- `frontend/src/pages/admin/AdminSchoolCRM.jsx`
- `frontend/src/pages/admin/AdminEducators.jsx`


## 2026-02-04 — Shop Coupon Codes (checkout discount + admin CRUD)
**Status: COMPLETE**

### What shipped
- **New collection**: `shop_coupons` — `{code, discount_type ('percent'|'amount'), discount_value, product_ids[], expires_at, is_active, max_uses, usage_count, created_at, updated_at}`.
- **Public endpoint** `POST /api/shop/coupons/validate` — used by checkout to preview the discount without holding an order.
- **Admin CRUD** at `/api/admin/shop/coupons` (list/create/patch/delete, admin-only).
- **Order flow** — `POST /api/shop/orders` now accepts `coupon_code`; the backend re-validates server-side, applies the discount to eligible line items, stores `coupon_code`, `coupon` snapshot and `discount_amount` on the order, and subtracts from the total *before* delivery is added. Coupon `usage_count` bumps on the payment-paid flip (idempotent).
- **Auto-seed OLLSCHOOL** — 10% off Robo Sumo & Robo Racer kits, resolves product IDs from vendor catalog at startup (idempotent).

### Frontend
- `ShopCheckoutPage.jsx` — coupon input + "Apply" button inside Order Summary; green applied-chip with ✕ removes it. Discount line renders under Subtotal; total re-computes live and re-validates whenever the cart changes.
- New **`CouponsSection.jsx`** — admin Settings → new "Coupons" tab. Create/edit modal supports percent or flat-amount, expiry date, max uses, active toggle, and multi-select of eligible products (fetched from `/admin/shop/products`).

### Files
- `backend/routes/coupons.py` (new)
- `backend/routes/shop.py` (order create + finalise paid)
- `backend/server.py` (router + startup seed)
- `frontend/src/pages/ShopCheckoutPage.jsx`
- `frontend/src/pages/admin/CouponsSection.jsx` (new)
- `frontend/src/pages/admin/AdminSettings.jsx` (new tab)


## 2026-02-04 — Competitions Students Tab: Full Field Display
**Status: COMPLETE**

### Bug fix
Bulk-imported competition students had 12+ fields silently missing from the admin panel view.
- Backend `techfest_student_registrations` correctly stored all CSV fields (Techfest ID, Gender,
  Pincode, State, Country, Address, Team ID/Name/Role, Team Leader Name/Email/Phone, Team Joined
  Date, Registration Date) — but the frontend table only had columns for a subset AND referenced
  wrong keys (`school_name`/`school_or_institute` instead of `school`, `created_at` instead of
  `registration_date`, `school_address` instead of `address`).
- Added a **dedicated horizontally-scrollable Students table** in `AdminCompetitions.jsx` with
  24 columns covering every imported field. School/Educator tabs retain their compact layout.
- Search filter now covers all imported student fields (Techfest ID, Team ID, Team Leader details,
  address, state, pincode, country, gender, competition metadata, zonal info).

### Files
- `frontend/src/pages/admin/AdminCompetitions.jsx` — new student-tab table branch + widened filter.


## 2026-09-27 — Telecalling Excel Grid + Field Reports Distance Tracking
**Status: COMPLETE**

### Telecalling table — Excel-grade UX
- **Follow-up popover** now renders with `position: fixed` outside the table clip — auto-positions above the button when there isn't room below. No more scrolling to see it.
- **Follow-up chip** is a single `whitespace-nowrap` line: "05 Oct 02:00 pm" (no more 4-line wrapping).
- **Serial number column** on the far left (auto-numbered after current sort).
- **Date Added column** with click-to-toggle sort (↓ = newest first, default; ↑ = oldest first).
- **Status column** — dropdown pill (color-coded):
  - `New` (slate) → default on import
  - `Follow-up` (indigo) → auto-set when `followup_at` is added
  - `No Answer` (amber) → auto-set when `call_picked = no`
  - `Interested` (emerald) → auto-set when `lead_interested = yes`
  - Manual override always wins.
- **Excel-like grid lines** on every cell (right + bottom borders) via `CELL` / `HEAD` classes.
- Status filter dropdown now offers the same 4 statuses.

### Field Reports — distance tracking
- Backend: `CheckOutIn` now accepts `latitude` + `longitude`. New helpers:
  - `_haversine_km(a_lat, a_lon, b_lat, b_lon)` — great-circle distance in km.
  - `_report_distance_km(report)` — sums check-in → visits (in order) → check-out with `_haversine_km`.
- Every report writes a `distance_km` field on:
  - **checkout** (recomputed once with all data)
  - **adding a school visit** (recomputed so the live counter updates)
- Frontend: check-out now silently captures GPS with `getCoords()` and posts to the endpoint. The **My Field Day** live card shows a rose "X.X km so far" chip. Every day-group card and every session row shows the same chip. New **Distance (km)** KPI added to the Reports strip.
- Ready for petrol-cost calc: multiply `distance_km` × per-km rate from the user's role settings.

### Files
- Modified: `/app/backend/routes/telecalling.py` (new `status` field + auto-derive on state transitions; `new/follow_up/no_answer/interested` filter values)
- Modified: `/app/backend/routes/field_reports.py` (`CheckOutIn.latitude/longitude`, `_haversine_km`, `_report_distance_km`, recompute in checkout + add-visit)
- Modified: `/app/frontend/src/pages/admin/AdminTelecalling.jsx` (fixed-position `FollowupCell`, Excel `CELL`/`HEAD` styles, `#` column, sortable Date Added, Status column with STATUS_OPTIONS)
- Modified: `/app/frontend/src/pages/admin/AdminFieldReports.jsx` (checkout sends GPS, distance chip on live card & sessions, Distance KPI card, day-group km chip)

### Verification
- `PATCH /telecalling/contacts/{id}` with `{"status":"follow_up"}` → persists ✓
- `_haversine_km(19.0760,72.8777, 28.7041,77.1025)` (Mumbai↔Delhi) → **1153.24 km** (actual ~1148) ✓
- `_report_distance_km` on a simulated 4-point path → **11.17 km** ✓
- Screenshots: Excel grid with #/Contact/Phone/School/City/**Date Added ↓**/**Status pill**/Picked?/Interested?/Note/Follow-up/Assignee/CRM columns; follow-up popover floats above the row.


## 2026-09-27 — Telecalling Follow-up + Meeting-Mode/Contacts + Field Reports Inline Actions + View/Edit Visit
**Status: COMPLETE**

### Telecalling — inline Follow-up column
- New **Follow-up** column in the queue table.
- One-click presets: **Today EOD (6 PM)**, **Tomorrow same time**, **+2 days**, **+3 days**, plus a **Custom** datetime picker + Clear.
- Chip shows the set date; turns rose-red when overdue.
- Backend field `followup_at` added to `ContactPatch`.

### Telecalling — Interested Lead popup (v2)
- **Primary Contact** section (Name / Phone / Email + **Role dropdown** synced with School CRM roles).
- **Board dropdown** (CBSE / ICSE / IB / IGCSE / State Board / Other) — no more free-text typos.
- **Products interested in** chips unchanged.
- **More contacts** — add/edit multiple contacts inline with Role dropdown.
- **Schedule Meeting** is now a collapsible action point with:
  - Datetime picker (existing)
  - **Mode toggle**: Online / Offline
  - If Online → **Meeting Link** field
  - If Offline → **Address** textarea
- All fields propagate to the auto-created `school_inquiry` on Save (school_contacts, meeting_mode, meeting_link, meeting_address).

### Field Reports — action points moved inline (pre-save)
- Removed the post-save "Saved — what next?" screen.
- New **Action points** section inside the Log-Visit form (before Save button):
  - Follow-up date + note (auto-patches the linked inquiry if `Lead Interested = Yes`; otherwise skipped with a helpful warning).
  - Create Proposal helper text (opens after CRM link, from the row's CRM chip).
  - **Send Email** checkbox → template picker + recipient input → sent via Resend right after the visit saves.
- Save button now closes the modal after running all action-point side-effects.

### Field Reports — View & Edit visit
- Every visit row (in **Today's visits** on My Field Day and in every day-group expansion under Reports) now has:
  - **View (eye)** icon → opens `ViewVisitModal` with the photo + full details rendered read-only (uses the same `VisitRow` component).
  - **Edit (pencil)** icon → reopens the same rich form pre-filled, with `editMode` flag; save PATCHes the visit.
- Backend: new `PATCH /field-reports/{report_id}/school-visits/{visit_id}` endpoint. Preserves `id`, `at`, `meeting`, and existing `school_inquiry_id`. If `lead_interested` flipped from no → yes, still auto-promotes to CRM.

### Files
- Modified: `/app/backend/routes/telecalling.py` (new followup_at + meeting_mode/link/address + contacts + role on ContactPatch; inquiry-promotion payload upgraded)
- Modified: `/app/backend/routes/field_reports.py` (new PATCH endpoint for visits; conditional inquiry seeding on edit)
- Modified: `/app/frontend/src/pages/admin/AdminTelecalling.jsx` (FollowupCell popover; upgraded InterestedLeadModal with primary-contact role, board dropdown, more contacts, meeting-mode)
- Modified: `/app/frontend/src/pages/admin/AdminFieldReports.jsx` (inline pre-save action strip, ViewVisitModal, editMode support, View/Edit icons on all visit rows)

### Verification (end-to-end)
- `PATCH /telecalling/contacts/{id}` with `{followup_at, meeting_mode, meeting_link, contacts:[{role}]}` → all fields persisted ✓
- Screenshot: queue shows Follow-up column with chip on Anita, "Set" on Ravi; popover opens with 4 presets + Custom picker.
- Screenshot: Interested Lead popup shows Primary Contact + Role + Board dropdown (CBSE) + More contacts + Schedule Meeting collapsible.
- Screenshot: Field Reports day expansion shows View + Edit icons next to every visit row.


## 2026-09-27 — Telecalling Module + Field-Visit Conditional CRM Link
**Status: COMPLETE**

### Field-Visit → School CRM linking is now conditional
Previously, every field school-visit auto-created a `school_inquiry` — cluttering the pipeline with "dead" leads. Now:
- `POST /field-reports/{id}/school-visits` only creates/links a `school_inquiry` when `lead_interested === "yes"`.
- The visit's `products_interested` list is passed through to the new inquiry's `programs_interested` so the CRM row lands with proper context.
- Everything else (visit history, photos, contacts, meeting notes) still lives on the field report.

### New Telecalling / Cold-Calling module
**Backend** — new `routes/telecalling.py`:
- `POST /telecalling/import` — bulk XLSX upload with header aliasing (name / phone (required) / alt_phone / email / school_name / city / board / notes / source). Supports **single-user assignment** or **auto-assign round-robin** across a picked pool.
- `GET /telecalling/sample-template.xlsx` — downloadable sample with 2 example rows.
- `GET /telecalling/contacts` — list with status + search + assignee filters. Non-admins see only rows assigned to them.
- `PATCH /telecalling/contacts/{id}` — inline updates. Auto-logs activity for `call_made / call_picked / lead_interested / meeting_booked`. When `lead_interested = yes` → transparently promotes the row to a `school_inquiry` (source=`telecalling`) with products, meeting date as followup_date.
- `POST /telecalling/reassign` — bulk reassign (admins only).
- `DELETE /telecalling/contacts/{id}` — admins only.
- `GET /telecalling/reports?month=YYYY-MM` — per-user daily + monthly rollup of the 4 event types.

**Frontend** — new `AdminTelecalling.jsx`:
- Excel-like queue table: Contact · Phone (click-to-copy) · School · City · **Picked? Y/N** · **Interested? Y/N** · Note (inline editable) · Assignee (admins) · CRM link · Delete.
- Toggling **Interested = Yes** opens the rich lead popup (name/school/products chips/meeting datetime/notes) which patches the row and creates the CRM inquiry.
- KPI strip: Calls Made / Picked / Interested / Meetings Booked.
- Filter bar: status (unworked, picked, not_picked, interested, not_interested), assignee (admin only), free-text search.
- Admin Import modal with sample-template download + single/auto-assign chooser + auto-assign pool checkboxes (limited to users who have the `telecalling` permission).
- Reports tab: Month picker + expandable per-user card showing daily breakdown.

**Access control**
- New `telecalling` permission in the permission catalog (`AdminUsers.jsx`) — admins toggle it per user; users then see the sidebar item + the module.
- Backend enforces: non-admins can list/patch only their assigned rows; only admins can import, reassign, delete.
- Sidebar item added to `AdminDashboard.jsx` with `permission: 'telecalling'`.

### KPI catalog — new Telecalling category
- `tc_calls_made`, `tc_calls_picked`, `tc_leads_interested`, `tc_meetings_booked`.
- New `_compute_telecalling_metrics(user_id, start, end)` reads from `telecalling_activity`.
- Admin can now attach these KPIs to a Telecaller role via Users & Roles.

### Files
- Created: `/app/backend/routes/telecalling.py`
- Created: `/app/frontend/src/pages/admin/AdminTelecalling.jsx`
- Modified: `/app/backend/routes/field_reports.py` (conditional inquiry creation)
- Modified: `/app/backend/routes/kpis.py` (Telecalling KPI category + compute)
- Modified: `/app/backend/server.py` (router registration)
- Modified: `/app/frontend/src/App.js` (lazy import + route)
- Modified: `/app/frontend/src/pages/admin/AdminDashboard.jsx` (sidebar entry)
- Modified: `/app/frontend/src/pages/admin/AdminUsers.jsx` (permission catalog entry)

### Verification (end-to-end curl)
- `GET /telecalling/sample-template.xlsx` → 200, 5.1KB xlsx ✓
- `POST /telecalling/import` (2-row template) → 2 inserted, 0 skipped ✓
- `PATCH /telecalling/contacts/{id}` with `call_picked=yes` then `lead_interested=yes + products + meeting_at` → returns `school_inquiry_id` (auto-promoted) ✓
- `GET /telecalling/reports` → 1 row with `{call_made:1, call_picked:1, lead_interested:1, meeting_booked:1}` ✓
- Screenshots confirm: Queue rendering, Import modal, Reports rollup


## 2026-09-27 — Live Camera Capture + School-Visit Form Reordering
**Status: COMPLETE**

### Live camera (not upload picker)
Rebuilt photo capture end-to-end. Both **Check-in** and **Log School Visit → Click Photo** now open a new `CameraCaptureModal` that:
- Requests `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })` — real live camera preview inside the modal on desktop AND mobile.
- **Flip** button toggles front/back camera.
- **Capture** button draws the current video frame to a canvas, converts to JPEG blob → uploads → sets `photo_url`.
- Falls back to the `<input type=file capture="environment">` shim only when `getUserMedia` is unavailable or permission is denied. No more silent file-picker.

### School-Visit form — reordered per user spec
1. Photo → Location → School Name
2. **Did you get entry? Yes/No** (immediately below school name)
3. City / Board / Students / Fees
4. **Who did you meet?** (moved above contacts)
5. **Contacts** (moved above robotics — matches primary interview flow)
6. **Has Robotics? Yes/No** (with conditional "Provided by")
7. **Lead Interested? Yes/No** (moved below Has Robotics)
8. **Product Interested In** — only rendered when `lead_interested === 'yes'` (otherwise hidden). Selecting No auto-clears any previously chosen products so stale selections never sneak through.
9. Notes → Save

### CheckIn API — writes confirmed working
Verified `POST /api/timetables` on the new key returns **201 with a fresh timetable id**. The earlier "read-only" diagnosis was because the preview app was temporarily down (all endpoints returning 404 from the Cloudflare edge). It's back up now. `_compute_checkin_teacher_costs()` and `create_or_update_timetable` both work end-to-end:
  - GET educators → 200
  - POST /schools/{sid}/timetable via our backend → `{"success": true, "timetable_id": "…"}` ✓

### Files
- Modified: `/app/frontend/src/pages/admin/AdminFieldReports.jsx` (new `CameraCaptureModal`, reordered fields, dual-mount on check-in and visit modals)

### Verification
- Screenshot: SchoolVisitModal renders with fields in the correct order (Did you get entry → City → Board → Students → Fees → Who did you meet → Contacts → Has Robotics → Lead Interested → Notes) ✓
- Screenshot: Live camera modal opens with a real `getUserMedia` video feed + Flip + Capture buttons ✓
- curl: POST timetable via backend returns 201 + timetable_id ✓


## 2026-09-27 — Field Reports: Camera Capture, Rich School Visit Form, Day-wise Reports, Team Filter & Calendar + New KPI Category
**Status: COMPLETE**

### Camera capture everywhere
- Check-in and Add School Visit now open the phone camera via `<input type=file capture="environment">`. Both photos are mandatory now (empty → toast + block save).
- File-upload fallback still works on desktop.

### School Visit modal — expanded
- Below the school name: **Did you get entry? Yes/No** + **Lead Interested? Yes/No** (color-coded YesNo toggles).
- **Who did you meet?** free-text.
- **Product Interested In** — multi-select chips from the canonical OLL Products catalog (Robotics Lab, Individual Kit, STEM Curriculum, After School, Teacher Training, Future Skills, Exhibition, Competition).
- **Role** on each contact is now a dropdown synced with `PRIMARY_CONTACT_ROLES` from School CRM (Principal, Coordinator, Trustee/Owner, etc.).
- **Notes** field (was buried in an unrelated place before).
- **Capture Location** now reverse-geocodes via Nominatim and auto-fills City (only when empty — never overwrites admin input).
- **Post-save action strip**: Add Follow-up (PATCHes the auto-created school inquiry), Create Proposal (opens School CRM in new tab), Send Email (in-modal template picker → Resend send via new `/api/emails/send` endpoint).

### Reports section — day-wise, filtered, with KPIs
- New tabs: **My Field Day / Reports / Calendar**.
- **Reports** tab: month picker + team-member dropdown, then a KPI strip (Days on Field, Schools Visited, Entries Gained, Schools Interested) + day-grouped cards with expandable visits. Each visit row shows entry/interest chips, met_with, products, contacts, notes, photo, meeting.
- **Calendar** tab: month grid with dot-per-visit and up-to-three team-member initials avatars per day. Visit count in the cell footer.

### KPI catalog — new Field Ops category
Backend `kpis.py`:
- Added `field_days_on_ground`, `field_schools_visited`, `field_schools_interested`, `field_entries_gained` (unit=count).
- New `_compute_field_metrics(user_id, start_iso, end_iso)` wired into `_compute_selected_metrics`. Roles can now assign these KPIs to team members via Users & Roles just like any other KPI.

### Backend model
`field_reports.py::SchoolVisitIn` extended with: `photo_url`, `got_entry`, `lead_interested`, `met_with`, `products_interested[]`. New endpoint `POST /api/emails/send` with Resend integration + audit trail in a new `email_outbox` collection.

### Files
- Modified: `/app/backend/routes/field_reports.py` (extended model, new email send endpoint)
- Modified: `/app/backend/routes/kpis.py` (new Field Ops KPI category + compute + wiring)
- Rewritten: `/app/frontend/src/pages/admin/AdminFieldReports.jsx` (camera capture, rich visit form, day-wise + calendar tabs, filters, KPI strip)

### Verification
- `GET /api/kpis/catalog` includes 4 Field Ops KPIs ✓
- Screenshots: all 3 tabs render, month picker + team filter present, KPI strip shows real counts, calendar dots + initials avatars visible.


## 2026-09-27 — Teacher Training step: embedded timetable + graceful CheckIn write fallback
**Status: COMPLETE**

### Timetable UI merged into Teacher Training step
Per user feedback the earlier change (adding a whole new `timetable_finalization` step for teacher-training schools) was too heavy. Reverted and instead embedded a compact **Training Timetable** panel inside the existing `teacher_training` step block. Adds an "Add Timetable" / "Manage Timetable" button that opens the same standalone CheckIn-synced builder we use elsewhere — so writes go straight through `POST /api/schools/{sid}/timetable`.

### Fixed "Resource not found in CheckIn API"
Root cause: the school had a stale `checkin_timetable_id` from an older CheckIn instance; PUT to that id returned 404, which the frontend surfaced as a raw error and discarded the admin's form data.

Fix chain:
- **`checkin_api.py::create_or_update_timetable`** — if PUT 404s, transparently fall through to POST (create-fresh) and drop the stale id from the school record.
- If BOTH PUT and POST fail (e.g. preview CheckIn instance is read-only), no longer raise. Instead:
  - Persist a `pending_checkin_timetable` snapshot on the school record.
  - Return `{success: False, timetable_id: null, saved_locally: true, warning: "…"}` with 200 so the frontend keeps the form data.
- **`AdminSchoolCRM.jsx::saveTimetableToCheckin`** — always writes to `onboarding_workflow.steps.timetable_finalization.data` so the admin's work is preserved. Shows a `toast.warning` with the actionable message when CheckIn didn't accept the write.

### Files
- Modified: `/app/backend/routes/schools.py` (reverted teacher_training → timetable_finalization coupling)
- Modified: `/app/backend/routes/checkin_api.py` (stale-id fallback + write-failure "save-locally" flow + datetime import)
- Modified: `/app/frontend/src/pages/admin/AdminSchoolCRM.jsx` (Training Timetable panel inside teacher_training step; warning-aware save handler)

### Verification
- `POST /schools/{sid}/timetable` now returns `{success:false, saved_locally:true, warning:"..."}` instead of 4xx when CheckIn is read-only ✓
- Screenshot: Teacher Training step shows the new "Training Timetable" panel with Add Timetable button, opens the CheckIn-synced builder ✓



### Calendar Making step: structured event editor
Replaced the free-text textarea with a proper multi-event editor:
- **Add Event** button spawns a row per event.
- **Event Type** dropdown (color-coded): Holiday, Workshop, Exhibition, Competition, Exam.
- **Date Mode** toggle: Single vs Multi — Multi lets admin pick multiple non-contiguous dates using `CalendarComponent mode="multiple"`.
- **Reason / Title** input with contextual placeholder ("e.g. Diwali, Independence Day", "e.g. Robotics Workshop", etc.).
- Selected dates render as inline chips ("15 Aug 2026", etc.) with truncation past 8 dates.
- Overall Notes textarea preserved at the bottom.
- Backend `calendar_making.data` schema tightened from `{holidays, competitions, exhibitions, special_events, notes}` to a single `{events: [{id, type, reason, date_mode, dates: [YYYY-MM-DD], notes}], notes}` array.

### Files
- Modified: `/app/backend/routes/schools.py` (`DEFAULT_ONBOARDING_STEPS.calendar_making`, `generate_dynamic_onboarding_steps`)
- Modified: `/app/frontend/src/pages/admin/AdminSchoolCRM.jsx` (new inline calendar-event editor replacing the textarea in the `calendar_making` step block)

### Verification
- `POST /api/schools/{sid}/regenerate-workflow` on a teacher-training-only converted school now returns steps including `timetable_finalization` ✓
- Screenshot shows the new calendar UI (event-type dropdown, single/multi toggle, date picker) rendering correctly inside the onboarding modal ✓


## 2026-09-27 — CheckIn Educator Earnings → School P&L Teacher Cost Sync
**Status: COMPLETE**

### What was built
- Rotated `CHECKIN_BASE_URL` to `https://repo-explorer-196.preview.emergentagent.com/api` and `CHECKIN_API_KEY` to the new working key (`oll_aQcehU...`). Verified 200 on `/invoices`, `/sessions`, `/attendance`, `/earnings`, `/schools`, `/timetables`, `/educators`.
- New helper `_compute_checkin_teacher_costs()` in `expenses.py` pulls all timetables + earnings + educators once, splits each educator's monthly earning across schools (weighted by number of active timetables per school), and returns a `{sid: amount}` map plus an `unmatched` array with reason codes.
- Matching precedence: `checkin_timetable_ids` on school → exact `school_name` (case-insensitive) → fuzzy prefix match (handles branch suffixes like "Green Lawns High School, Warden Road" vs "Green Lawns High School").
- `GET /school-expenses/pnl-summary` now merges the CheckIn map into `teacher_cost` via `MAX(manual_entry, checkin_amount)` so admin overrides are never reduced.
- Added `GET /school-expenses/checkin-teacher-costs` preview endpoint.
- Backfill: schools that have CheckIn earnings but no revenue or manual expenses are still surfaced in the P&L (so unrecovered teacher salaries stay visible).
- UI: pill in P&L header shows `CheckIn: ₹X · N schools · M unmatched`. Clicking opens a modal listing every unmatched earning with reason ("No timetable" / "School not in CRM") so admin can fix upstream.

### Live numbers (as of sync)
- ₹4,13,703 in educator earnings synced across 13 matched schools (16 unique educators)
- 12 unmatched earnings surfaced (mostly missing timetables on the CheckIn side, plus 2 test schools + 2 not-onboarded schools)

### Files
- Modified: `/app/backend/.env` (rotated CheckIn URL + key)
- Modified: `/app/backend/routes/expenses.py` (+~200 lines: `_compute_checkin_teacher_costs`, backfill, merge in P&L row builder, checkin_sync in response payload)
- Modified: `/app/frontend/src/pages/admin/AdminExpenses.jsx` (CheckIn sync pill + unmatched modal in PnLSheet)

### Verification
- `curl /api/school-expenses/checkin-teacher-costs` → 13 schools + 12 unmatched
- `curl /api/school-expenses/pnl-summary` → `totals.teacher_cost = 413703`, matching schools populated
- Screenshot: badge visible, modal enumerates unmatched educators


## 2026-09-27 — Live TV Dashboard (`/admin/live`)
**Status: COMPLETE**

### What was built
- New **Command Center** dashboard designed for a wall-mounted office TV (1920×1080, 16:9, auto-refresh every 30s).
- Full-screen dark UI with grid overlay, neon accent glows, live IST clock, "LIVE" pulse indicator, and a scrolling activity ticker at the bottom.
- Dark India map (ESRI Dark Gray tiles, no API key) with pulsing city dots (double-ring CSS animation via `L.divIcon`) — cyan for cities with 50+ entities, violet otherwise. Reuses the existing `/central-database/by-city` aggregation so map data stays in sync.
- KPI cards for **Success Stories** (Levels 1–5 bar chart), **Today's Sessions** (on-time / late / absent / upcoming — from CheckIn API), **Today's Support Queries** (new / overdue / resolved), **Today's School CRM** (new / meeting done / converted), **Today's Student & Future Skills CRM** (new / demo done / converted, with sub-breakdown).
- Coverage segment chart (schools, students, FS leads, teachers, growth partners, centres).

### Files Created
- `/app/backend/routes/live_dashboard.py` — single admin-only endpoint `GET /api/live-dashboard/snapshot` that runs all six aggregations concurrently via `asyncio.gather` (success stories, support, school CRM, student+FS CRM, CheckIn sessions, central-DB map, activity feed). All bucketing is IST-aware.
- `/app/frontend/src/pages/admin/AdminLive.jsx` — TV dashboard React page, gated to admin/super_admin.

### Files Modified
- `/app/backend/server.py` — mounted `live_dashboard_router`.
- `/app/frontend/src/App.js` — added route `/admin/live` (Protected).
- `/app/frontend/src/components/RaiseQueryButton.jsx` — hide "Need Help?" widget on `/admin/live` for a clean TV view.

### Notes
- CheckIn's `/sessions?session_date=` query param is silently ignored upstream, so `_sessions_block` fetches ~2000 recent sessions and filters `session_date == today (IST)` locally, classifying via `admin_status` (`punctual_*` → on-time, `late_*` → late, etc.).
- Successfully tested with admin credentials (`admin@oll.co`) — grand total 454 humans across 13 mapped cities, 273 overdue tickets rendered, live clock ticking, map pulses animating.

---

## 2026-09-26 — Homepage: Techfest + WordPress Blogs · ICSE 9-10 Flipbook Popup 📚

### ✨ ICSE Class 9 & 10 Landing (`RoboticsICSE910Landing.jsx`)
- **New PDF** — `CURRICULUM_PDF` swapped to the freshly uploaded
  `Curriculum Brochure - ICSE Group 3 Subject - Code 66...compressed.pdf`.
- **Sample-book flipbooks** — Grade 9 & Grade 10 covers on the comparison
  table now open the Heyzine flipbook (`efa1276f3a` / `815aa37f68`) in a
  full-screen lightbox modal identical to the Beginner Robotics pattern.
  Covers gain hover lift + drop-shadow glow + a "✨ Flip through sample →"
  callout. Mobile covers reuse the same flipbook.

### ✨ Homepage: Techfest IIT Bombay Section (`LandingPage.jsx`)
- New dark, red-accent section between "Schools we work with" and the
  Future Skills band.
- Left column: eyebrow, SEO-rich H2 ("Techfest, IIT Bombay 2026. Where
  student bots take centre stage."), a 3-line SEO copy block, 4 stat
  chips and two CTAs — **Know More →** `/techfest` and **Register your
  team →** `/techfest/register`.
- Right column: auto-playing muted trailer clip that opens the full
  `hero-video.mp4` in the existing homepage media lightbox on click.
- Below: 3 competition cards (RoboSumo, RoboRacer, Robotics Innovation
  Challenge) with track-tag + sub-copy.

### ✨ WordPress Blogs — Hybrid SEO Integration
- New `WordPressBlogsSection.jsx` component pulls the latest 6 posts
  from `https://oll.co/blogs/wp-json/wp/v2/posts?_embed` and renders them
  as teaser cards on the homepage (thumbnail, category chip, date, title,
  excerpt).
- Every card links OUT to the canonical WP-rendered post at
  `oll.co/blogs/[slug]/` — Google indexes the SSR WP pages (best SEO)
  and the React SPA never duplicates blog content.
- Section fails silently when the WP endpoint is unreachable (no impact
  on homepage rendering).
- Navbar (all 3 variants — pill, About, mobile) gets a new **Blog** link
  that opens `oll.co/blogs/` in a new tab.
- No `/blogs` React route is added on purpose — that would produce a
  thin-content duplicate and hurt SEO.

### Notes
- The AiSensy `techfest_submission_confirmed` campaign still needs to be
  created in the AiSensy dashboard for WhatsApp confirmations.
- WordPress: once your posts are live on `oll.co/blogs/`, they'll auto-
  populate the homepage strip on next visit — no code changes needed.



## 2026-09-23 — Techfest: Auto-fill Permission Letter + Submission Confirmations 📩

### ✨ Auto-filled School Permission Letter
- New backend module `routes/techfest_permission_letter.py` builds a `.docx` via `python-docx` matching the sample template wording.
- New public endpoint `POST /api/techfest/permission-letter` accepts current submission form data and streams back a filled `.docx` (headed "OLL-Techfest-Permission-Letter-<school>.docx").
- Auto-fills: date, school name, competition, zone, age category, team lead + up to 5 team members (name, DOB, contact), and OLL coordinator.
- Frontend `TechfestSubmitPage.jsx`: "Download sample template" static link replaced with a **"Download pre-filled letter"** button that POSTs current form state and downloads the generated file (with graceful fallback to blank placeholders if the form is empty).

### 📤 Submission Confirmation Email + WhatsApp
- `POST /api/techfest/submissions` now fires a background fan-out to team lead **plus every team member** that supplied contact info.
- **Email:** new `submission_confirmed_html()` template in `techfest_emails.py` — includes reference ID, competition, zone, age category, drive link, and team roster. Dispatched via existing `_dispatch_email` (Gmail → Resend fallback).
- **WhatsApp:** new campaign key `techfest_submission_confirmed` in `WHATSAPP_TEMPLATES`. Fires with params `[name, competition, zone, reference_id]`. Gracefully no-ops when AiSensy campaign isn't configured (verified — AiSensy returns 400 "Campaign does not exist" until the user creates the template on the AiSensy dashboard, at which point it starts sending).

### Dependency
- Added `python-docx==1.2.0` (+ `lxml==6.1.3`) to `backend/requirements.txt`.



## 2026-02-07 (part 5) — Unified toolbar + payment reconciliation + inline row controls 💳

### 🐛 Bug fix — "customer paid but not moved to Active Customers"
Trial-payment-link and renewal-payment-link customers were sometimes left stuck at `crm_status='subscription_lead'` when the Cashfree webhook couldn't reach the backend (e.g. running behind ingress) or the customer closed the tab before the success page's verify poll.

**Backend** — new endpoint `POST /api/admin/future-skills/reconcile-payments` walks every subscription with `crm_status !== 'active'` + an `order_id`, calls Cashfree `PGFetchOrder`, and promotes any `PAID` order to `crm_status='active'` (stamps `paid_at`, `subscription_start`, `reconciled_at`, `reconciled_by`).

**Frontend fix** — `FutureSkillsSuccessPage.jsx` now runs the verify poll for both `type=trial` AND `type=subscription` whenever a `subscription_id` is present (was skipping trial entirely).

**Manual override** — new "Sync Payments" button in the toolbar on Free Trials / Active Customers / Renewals tabs; one click reconciles all pending payments. Toast reports "Moved N paid customers to Active".

### UX — Unified toolbar
Everything now lives in ONE panel:
- Row 1: Search (left) · optional Sync Payments (middle) · Import CSV + Add Lead / Add Customer / Add Free Trial (right)
- Row 2: `Sort & Date:` — sort dropdown · **new "Filter by month" dropdown** (This month / Last month / last-12-month picker) · From / To date inputs · count "N of M shown"
- Row 3 (Leads only): Status chips — `All · New · Follow-up · No Answer · Interested`

Old separate panels for Sort/Date and Status chips are gone.

### Row-level polish
- **Phone cell → click-to-popover**: `Copy number` and `WhatsApp <FirstName>` (opens wa.me link in new tab)
- **Status cell → click-to-dropdown**: change status inline without opening the drawer. PATCHes `/leads/{id}` with the new status.
- **"Mark Lost" → "Lost"**: shorter button label, same rose color
- **All actions in one row** with `flex-nowrap` so Trial · Followup · Edit · Lost · Delete never wrap
- **Uniform `text-xs` font** across Added, Name, Phone, Source, Centre, Status columns
- **Filter icon changed from ⛭ to a `ChevronDown`** arrow on Source / Centre / Status column headers

### Bulk selection UI
- "N of M selected" counter (was "N selected")
- New **"Select All"** button that flips to **"Deselect All"** when everything is selected

### Files touched
- `backend/routes/future_skills.py` — new `/reconcile-payments` route + kept webhook route.
- `frontend/src/components/SortFilterBar.jsx` — added `<select>` "Filter by month" with This-month / Last-month / rolling 12-month options.
- `frontend/src/components/admin/ExcelSheet.jsx` — filter icon → `ChevronDown` lucide icon.
- `frontend/src/pages/admin/AdminFutureSkills.jsx` — new `PhoneCell` + `StatusCell` components, toolbar consolidation, `syncPendingPayments` handler, `handleUpdateLeadStatus`, unified font sizes on cells + actions.
- `frontend/src/pages/FutureSkillsSuccessPage.jsx` — verify poll runs for trial too when subscription_id is present.

### Verified
- Reconcile endpoint: `checked=7, updated=0, errors=0` (no stuck payments right now, but code path works) ✅
- Unified panel visible with all 3 rows ✅
- 64 Phone popover triggers + 64 Status dropdown triggers rendered ✅
- Month dropdown shows in Sort & Date row ✅
- Chevron down icon on Source / Centre / Status filter buttons ✅


## 2026-02-07 (part 4) — Future Skills CRM final polish 🎯

### Backend
- **Incorrect Number outcome** now drops the lead straight to the Lost bucket (`status='lost'`, `lost_reason='incorrect_number'`, `lost_reason_category='Incorrect Number'`) instead of parking it in the pipeline. Verified: lead disappears from `/leads` list immediately.
- **Interested outcome** now bumps status to `interested` (previously "interested" wasn't a real status). Included in `ACTIVE_STATUSES` and returned in `stats.interested`.
- `stats.incorrect_number` removed (no longer a valid state).

### Frontend
- **Auto row colors driven by status** — no more manual color picker. `STATUS_TINT` map in `ExcelSheet.jsx`: `new → sky-50 (blue)`, `followup → yellow-50`, `no_answer → rose-50 (red)`, `interested → emerald-50 (green)`. Trials / customers use their `crm_status` / `renewal_bucket` for the same palette.
- **`FSL-XXXX` reference numbers removed** from the Leads sheet (Added column now shows only the timestamp).
- **Row number cell doubles as selector** — click `#` to select/deselect. Selected rows get a blue inset ring. Footer row shows `n/total selected` with a Select-All toggle. Old checkbox column is gone.
- **Column-header sort + filter** (Excel style):
  - `Added` and `Name` headers are clickable to cycle asc → desc → off (`SheetSortTh`).
  - `Source`, `Centre · Batch`, `Status` headers have a funnel icon that opens a dropdown of unique values with counts (`SheetFilterTh`). Selecting one filters the sheet client-side.
- **Icons removed** from Phone and Centre cells (per request — less clutter).
- **Bigger Trial + Followup buttons** with icons + text (`text-[11px] px-3 py-1.5`) — visually match the Mark Lost button.
- **Toolbar simplified** — search on the left, primary Add Lead / Add Customer / Add Trial buttons pushed to the right via `ml-auto`. The old `All (N)` status select and `All Centres` dropdown removed (their function moved to the column-header filters).
- **Bar order flipped** — `Sort & Date` bar rendered FIRST, then `Status` chips below. New chip layout: `All · New · Follow-up · No Answer · Interested`. Wrong Number chip removed.
- Removed `handleSaveRowColor` handler and `RowColorPicker` component; ExcelSheet.jsx no longer exports either.

### Files touched
- `backend/routes/future_skills.py` — `_record_followup` outcome map, `ACTIVE_STATUSES`, stats block.
- `frontend/src/components/admin/ExcelSheet.jsx` — status-based `rowTintClass`, new `SheetSortTh` + `SheetFilterTh`, removed `RowColorPicker` + `ROW_COLORS`.
- `frontend/src/pages/admin/AdminFutureSkills.jsx` — LEAD_STATUSES + STATUS_FILTER_OPTIONS, StatusBadge, LeadsTable (whole header + row selector + no FSL), TrialsTable/CustomersTable/RenewalsTable (color column removed), toolbar layout, `filteredRows` with source/centre column filters.

### Verified via Playwright + backend curl
- Incorrect Number outcome → `status=lost`, gone from leads list ✅
- Interested outcome → `status=interested`, stats.interested increments ✅
- Row 1 (NEW) tinted blue, row 2 (FOLLOW-UP) tinted yellow ✅
- Add Lead moved to right, Search on left ✅
- Source filter dropdown opens with counts (`Instagram ads (1) · Instagram (60)`) ✅
- Name column click → alphabetical sort ✅
- Row # click → row selected with blue ring, "1 selected" counter ✅
- FSL text no longer visible on the page ✅


## 2026-02-07 (part 3) — Excel-style redesign of Future Skills CRM 📗

**Zero functional changes** — pure UI overhaul that keeps every existing action, modal, PATCH endpoint and data-testid.

### New shared UI kit — `/app/frontend/src/components/admin/ExcelSheet.jsx`
- `<SheetTabs />` — Excel workbook-tab strip (active tab lifted on white with green underline, inactive tabs sit lower on gray).
- `<SheetTable />` + `<SheetTh />` + `<SheetTd />` — grid look with thin `border-slate-200` cell borders, tight padding, `text-[12px]` font.
- `<RowColorPicker />` + `ROW_COLORS` + `rowTintClass()` — 7-color palette (`yellow · green · red · blue · purple · pink · gray` + `None`). Small dot at the far-right of every row opens a popover; picking a color tints the row bg (`bg-*-50`) and persists to the doc's `row_color` field.

### Backend additions (all optional Field)
- `LeadUpdate`, `TrialUpdate`, `SubscriptionUpdate` now accept `row_color: Optional[str]`. Same PATCH endpoints (`/admin/future-skills/leads/{id}`, `/trials/{id}`, `/subscriptions/{id}`) — no new routes.

### Applied to (all rewritten as `SheetTable`)
- `LeadsTable` — `#` (row number) · Added · Name · Phone · Source · Centre/Batch · Status · Notes · Actions · 🎨
- `TrialsTable` — `#` · Ref · Student · Parent · Centre/Batch · Scheduled · Status · Actions · 🎨
- `CustomersTable` — `#` · Ref · Student · Centre/Batch · Plan · Paid · Renewal · Actions · 🎨
- `RenewalsTable` — `#` · Ref · Student · Centre/Batch · Plan · Renewal · Status · Actions · 🎨
- `LostTable` — `#` · Ref · Name · Type · Reason · Lost At

### Kept intentionally untouched
- Every existing modal (Followup, MarkLost, BookTrial, Convert, Reschedule, etc.).
- Status chip filter row on Leads tab.
- SortFilterBar (introduced earlier in this session).
- Inline notes textarea per row.
- Reports metric cards.
- KPI dashboards on Centres/Economics/Reports sub-sheets.

### Verified (Playwright screenshots)
- Sheet tabs render with lifted active tab and counts (Leads 64, Trials 11, Customers 10, Renewals 7, Lost 6).
- 66 row-color pickers on the Leads sheet. Palette popover opens on click. Picking yellow on row 1 → row tinted yellow → survives page reload.
- Every previously-shown tab now renders through `<SheetTable />` with row numbers + grid borders.

Files touched:
- `frontend/src/components/admin/ExcelSheet.jsx` (new)
- `frontend/src/pages/admin/AdminFutureSkills.jsx` (5 tables + sheet tabs + row-color save handler)
- `backend/routes/future_skills.py` (`row_color` on 3 update models)


## 2026-02-07 (part 2) — Followup modal polish 🎯

- **"Called" → "Call Back"** in the outcome dropdown.
- **Not Interested** now opens the existing Mark-Lost modal so the admin can pick a real reason (was silently flipping status to `lost` before). Any note typed in the followup is carried forward into the Lost modal's "Other" field so nothing is lost.
- **Quick-date presets**: `Today Evening · Tomorrow · Day After · Weekend · Next Week` chips above the Note field. **Tomorrow is auto-selected** on open.
- **Followup note mirror**: after saving a followup, the modal also `PATCH`es the top-level `notes` field on the lead (timestamped) so it appears in the inline Notes textarea on the row. Previously the note only lived in the followup history array.
- **Row actions cleanup**: the redundant `Notes` action button was removed (inline textarea replaces it). **Mark Lost** button now has full text (`XCircle + "Mark Lost"`) and larger padding — matches the visual weight of Trial / Followup buttons.
- **Status column single-line**: `whitespace-nowrap` added to the `StatusBadge` so "WRONG NUMBER" and "NO ANSWER" don't wrap.

Files touched:
- `frontend/src/pages/admin/AdminFutureSkills.jsx` (FollowupModal, MarkLostModal, LeadsTable actions, StatusBadge)


## 2026-02-07 — Sort A→Z / date-range filter across CRMs + Add Customer + Invoice address 🔤📅

**Status: COMPLETE — verified by testing agent (100% frontend flows)**

### What changed

**New reusable component** — `/app/frontend/src/components/SortFilterBar.jsx`
- Exports `<SortFilterBar />` (sort dropdown + From/To date pickers + Clear) and helper `applySortFilter(list, sort, dateFrom, dateTo, { nameFields, dateFields })`.
- Sort options: Default order · Name (A→Z) · Name (Z→A) · Latest→Oldest · Oldest→Latest.

**Summer Camp CRM** (`AdminStudentCRM.jsx`)
- `filteredSortedCampBookings` = `applySortFilter(filteredCampBookings, campSort, campDateFrom, campDateTo)` — applies across every KPI/status tab (All · Form Filled · Leads · Hot Lead · Broadcast · ₹500 Reserved · Converted · Lost).
- Sort & Date row (`data-testid="camp-sort-filter"`) added to the Bookings toolbar.
- Converted view now has a green **"+ Add Customer"** shortcut (`data-testid="add-customer-converted-btn"`) that opens the Add Lead modal in "customer mode" — modal title becomes "Add Customer" and after the booking is created the front-end issues `PATCH /api/summer-camp/bookings/{id}` with `crm_status="converted"` so the new row lands directly in the Converted bucket.

**Future Skills CRM** (`AdminFutureSkills.jsx`)
- `filteredRows` (useMemo) applies sort + date-range on top of `rows`, passed to LeadsTable / TrialsTable / CustomersTable / RenewalsTable / LostTable.
- Sort & Date row (`data-testid="fs-sort-filter"`) rendered only on list tabs (leads, trials, customers, renewals, lost).
- Sort/date state resets on tab or status change.

**Orders → Student Payments** (`AdminOrders.jsx`)
- `sortedPayments` now runs `applySortFilter` when `activeTab === 'student'`.
- Sort & Date row (`data-testid="student-payments-sort-filter"`) shown only inside the Student Payments tab; hidden on School Payments.
- Works across Home Classes / Summer Camp / Future Skills sub-tabs.

**Invoice PDF address** (`/app/frontend/src/utils/invoicePdfGenerator.js`)
- `COMPANY.name` → `Clonefutura Live Solutions Pvt Ltd.`
- `COMPANY.address` → `103 1st floor - Kshitij building, Veera Desai Rd, Dattaguru Nagar, Azad Nagar, Andheri West, Mumbai, Maharashtra 400053`.
- Header now uses `splitTextToSize` to wrap the long address across up to 2 lines so it never overflows.

### Files touched
- `frontend/src/components/SortFilterBar.jsx` (new)
- `frontend/src/pages/admin/AdminStudentCRM.jsx`
- `frontend/src/pages/admin/AdminFutureSkills.jsx`
- `frontend/src/pages/admin/AdminOrders.jsx`
- `frontend/src/utils/invoicePdfGenerator.js`

### Known caveat (from testing agent code review)
- `applySortFilter` drops rows that lack every candidate date field whenever From/To is set. Not an issue today (all our leads/bookings have `created_at`), but future collections should include the field or the util should treat missing dates as "include".


## 2026-08-04 (round 11) — P&L expense fix + allocation + Software Subscription 💰
**Status: COMPLETE — P&L now shows the real all-time expense total**

### Root cause
`/admin/reports/expenses-summary` was reading only `expenses` + `future_skills_expenses` collections (2 rows / ₹8,500). The /expenses page's actual data lives in `school_expenses` (16 rows / ₹4,02,195). Plus the date filter was hiding older rows on the P&L card even when set to Year.

### What changed

**Backend (`routes/reports.py`)**
- `_expenses_summary` now includes `school_expenses` too — merges rows from all three collections.
- Adds `all_time_total`, `all_time_count`, `all_time_by_category` in the response so the P&L card always shows the grand total that matches the /expenses page regardless of the top-level date filter.

**Backend (`routes/expenses.py` + `routes/team.py`)**
- Added `Software Subscription` category (`software_subscription`) with sub-categories: SaaS, Productivity, AI/LLM, Analytics, Communication, Storage. Now available in both `/school-expenses/categories` and `/expenses/categories`.
- `school_expenses` POST now accepts + stores allocation fields (`allocation_type`, `allocation_ref_id`, `allocation_ref_label`, `allocation_program`).
- `ExpenseCreate` / `ExpenseUpdate` / `Expense` models in team.py updated with the same fields.

**Frontend (`AdminReports.jsx`)**
- P&L Total Expenses / Net Profit / Profit Margin cards now use `all_time_total` (fallback → `total` → local totalExpenses).
- **Expense Breakdown card** renamed to "**Expense Breakdown (All-Time)**" and lists every category with amount + percent.
- When the selected-period total differs from all-time, a small "In selected period" line appears at the bottom for context.

**Frontend (`AdminExpenses.jsx`)**
- New **"Spent Against"** allocation section at the top of the Add/Edit Expense modal — 4 buttons: **B2B (School) · B2C (Batches) · Project · Office**.
- Picking **B2C** reveals a Program dropdown (Future Skills / Student CRM / Summer Camp). For Future Skills a batch dropdown auto-loads from `/future-skills/batches`; for the other two a free-text cohort/batch name input.
- Data-testids for QA: `expense-allocation`, `expense-alloc-b2b/b2c/project/office`, `expense-alloc-program`, `expense-alloc-fs-batch`, `expense-alloc-cohort-name`.

### Verification
- `/admin/reports/expenses-summary` returns `all_time_total: 4,10,695` across 18 rows with proper breakdown ✅
- P&L screenshot shows Total Expenses ₹4,10,695.4 · Salary 55.3% · Kit Cost 27.2% · Printing 12.2% · etc ✅
- `Software Subscription` visible in `/school-expenses/categories` response ✅


## 2026-08-04 (round 10) — Add-Lead Batch Type + Orders sub-tabs 👥
**Status: COMPLETE — verified backend + frontend**

### Student CRM Add-Lead modal (`AdminStudentCRM.jsx`)
- **Demo Scheduling section is now hidden** when Starting Status ≠ Lead (was showing even for Converted / Demo Completed which was noisy).
- **Batch Type toggle** (Group Batch / 1-on-1 Batch) appears above the name block **only** when Starting Status = Converted.
- **Group Batch flow**: shows `No. of students` input + N rows of `{name, phone, email}` inputs (min 2, max 30). Auto-resizes the array when the count changes.
- On save, patches the inquiry with `batch_type`, `group_size`, `group_students`. Blank student rows are filtered out before sending.

### Backend (`routes/students.py`, `routes/orders.py`)
- `StudentInquiryUpdate` model extended with `batch_type`, `group_size`, `group_students`.
- `_mirror_inquiry_to_order` now labels the mirrored order product as `<Skill> · Group Batch (N students)` or `<Skill> · 1-on-1`, and copies the `group_students` array onto the order document.
- New `GET /api/orders/summer-camp-payments` — returns 73 rows from `summer_camp_bookings` shaped like the existing student-payments API.
- New `GET /api/orders/future-skills-payments` — returns 22 rows from `future_skills_subscriptions`.

### Orders page (`AdminOrders.jsx`)
- **New sub-tabs under Student Payments**: Home Classes · Summer Camp · Future Skills. Data source of the table auto-routes via a `rawPayments` React.useMemo hook that swaps between the three arrays based on `studentSubTab`. Stats cards + search + status filter all continue to work.
- Data-testids: `student-sub-tab-home`, `student-sub-tab-summer_camp`, `student-sub-tab-future_skills`.

### Verification
- Group Batch save → inquiry has `batch_type=group`, `group_size=3`, 3 group_students; mirrored order product = "Robotics · Group Batch (3 students)", ₹18,000, status paid ✅
- Orders → Student Payments → Summer Camp screenshot shows 31 orders / 7 pending / ₹55,013 receivables with OLL NSCI South Mumbai (₹8,500) and other Mira Road / Bulk Parent rows ✅
- Future Skills sub-tab returns 22 subscriptions with ₹1,37,000 total paid ✅


## 2026-08-04 (round 9) — Student CRM edit/delete + Orders mirror + revenue dedup 🛒
**Status: COMPLETE — verified backend + frontend end-to-end**

### Backend (`routes/students.py`)
- New `_mirror_inquiry_to_order(inquiry)` helper: any inquiry with `status=converted` writes/updates a row in the `orders` collection (idempotent, keyed by `inquiry_id`). `product` inferred from skill; `payment_status` = `paid` when amount > 0.
- `PATCH /students/inquiry/{id}` now auto-mirrors to `orders` when status flips to converted.
- New `DELETE /students/inquiry/{id}` — hard-deletes inquiry + cascades removal of the mirrored order.
- New `POST /admin/students/backfill-orders` (admin only) — one-shot backfill for historical converted inquiries. Ran once → created 9 orders totalling ₹4,693 from existing DB.
- Extended `StudentInquiryUpdate` model to accept `payment_amount`, `skill`, `age_group`, `learning_mode`, `learning_goal`, `city`, `payment_receipt_url` so all fields are editable from the CRM.

### Revenue de-duplication (`routes/reports.py`)
- `_b2c_student_crm_stats` and revenue-split's Home Classes bucket now source revenue **exclusively** from `orders` (single source of truth). Previously they summed both `student_inquiries.payment_amount` AND `orders.amount`, double-counting.
- Verified: after backfill, `/b2c-consolidated` shows Student CRM revenue = ₹4,693 (no longer ₹9,386), and total revenue = ₹1,45,691 across all funnels.

### Frontend (`AdminStudentCRM.jsx`)
- **Add-Lead modal**: new "Starting Status" selector at top (Lead default / Demo Completed / Converted Customer). Selecting Converted reveals a required Payment Amount ₹ field. On submit, creates the inquiry, then PATCHes it to the chosen status — order is auto-mirrored.
- **Row actions**: `Edit` (opens view-modal in edit-mode) + `Delete` (opens confirm dialog) buttons added to `baseButtons` so they show up on **Lead**, **Demo Completed**, **Converted**, and **Archived** rows. Data-testids: `edit-inquiry-{id}` / `delete-inquiry-{id}` / `confirm-delete-inquiry`.
- New delete-confirmation dialog wired to `handleDeleteInquiry` — calls the new DELETE endpoint, refreshes list, cascade-removes the linked order.
- Imported `Edit2` icon.

### Verification
- Backfill created 9 orders → Home Classes revenue correctly ₹4,693 ✅
- Convert-with-amount flow: PATCH stores `payment_amount:9900` → mirrored order (`STU-DFDC334A · amount:9900 · status:paid`) ✅
- Delete cascade: DELETE inquiry removes both `student_inquiries` row and its linked `orders` row ✅
- UI screenshot shows Starting Status selector + Edit / Delete buttons on every inquiry row ✅


## 2026-08-04 (round 8) — Reports revamp: consolidated B2C + Centres/Batches + Expenses fixed 📊
**Status: COMPLETE — 4 new endpoints, B2C tab redesigned, P&L expenses render**

### New backend endpoints (`routes/reports.py`)
- `GET /api/admin/reports/b2c-consolidated` — union of Student CRM, Future Skills and Summer Camp funnels: `totals.leads / demos / customers / revenue` + a `breakdown` per source. Verified: 241 leads · 98 demos · 24 customers · ₹1,45,691 revenue over full DB window.
- `GET /api/admin/reports/centers-batches` — Future Skills centres + batches + per-batch fill percentage. Sorted least-filled first so ops sees which batches need marketing push.
- `GET /api/admin/reports/revenue-split` — 3-way split: **Summer Camp** (SC paid bookings) · **Home Classes** (Student CRM converted + student orders) · **Center Classes** (FS paid subscriptions), with percent share.
- `GET /api/admin/reports/expenses-summary` — union of `expenses` ledger + Future Skills centre economics rows; returns `total`, per-category breakdown with percent, month-over-month trend, and last 100 rows.

### Frontend (`AdminReports.jsx`)
- Rewrote the entire **B2C tab**: header cards read from the consolidated endpoint (Total Leads / Demos / Customers / Revenue). Added a source-breakdown table (Student CRM · Future Skills · Summer Camp), a Revenue Split card (SC · Home · Center Classes) and a Centres/Batches/Filling table with color-coded fill bars.
- **P&L tab** now reads `expensesSummary` — total expense card, per-category breakdown card with % of total, and a bar-chart month-over-month trend row. Fixes "Expenses not visible" by falling back to `expensesSummary.total` when the local date-scoped ledger comes back empty.
- Dead-code `__UNUSED_RENDER_B2C_LEGACY` block trimmed from the file.

### Backend KPI fix (`routes/kpis.py`)
- `_compute_future_skills_metrics` was reading `amount_paid` and `subscribed_at` which don't exist on subscription docs. Now uses `amount` + `created_at` + `payment_status="paid"` — brings the FS KPIs (fs_revenue / fs_aov / fs_profit_margin) back to real values.

### Verification
- All 4 new endpoints tested via curl — return real data ✅
- B2C tab screenshot: Total Leads/Demos/Customers/Revenue + breakdown table + revenue split cards + centres/batches table + fill bars ✅
- P&L tab screenshot: Total Expenses ₹8,500 · Marketing ₹5,000 (58.8%) + Operations ₹3,500 (41.2%) + month-over-month bar chart ✅


## 2026-08-04 (round 7) — Age display cleanup + FS KPIs moved to Performance 🎯
**Status: COMPLETE — 6 new KPIs assignable per role, gate removed from CRM**

### What changed

**Age display (`AdminFutureSkills.jsx`)**
- Leads + Trials tables now show just the age/age-group number below the name (`3-7`, `8-11`, `12`) — no more `Age group ...` / `Age ...` prefix wording.

**Roles refactor — FS KPIs out of "features", into "performance"**
- Removed 6 `future_skills.kpi.*` permissions from `PERMISSIONS_CATALOG` in `AdminUsers.jsx` (they were sub-toggles under the Future Skills CRM feature).
- Backend `KPI_CATALOG` (`routes/kpis.py`) now includes 6 new items under a **Future Skills** category: `fs_leads_generated`, `fs_lead_to_trial`, `fs_trial_to_paid`, `fs_revenue`, `fs_aov`, `fs_profit_margin`.
- New `_compute_future_skills_metrics(start, end)` computes those from `future_skills_leads`, `future_skills_trials`, `future_skills_subscriptions`, `future_skills_expenses`. Wired into `_compute_selected_metrics` via `fs_` prefix.
- `AdminFutureSkills.jsx` KPI card gates simplified — anyone with the `future_skills` feature sees all cards on the Reports tab. Granular visibility is now driven exclusively through the role's KPI assignment (Users & Roles → Manage KPIs).
- `UserPerformance.jsx` gains a sky-blue Future Skills theme + matching icon.

### Verification
- `/api/kpis/catalog` returns the new `Future Skills` group with 6 items ✅
- Assigned all 6 to a test role → `/api/users/{id}/performance` returns real values (62 leads · 33.9% Lead→Trial in DB-wide window) ✅
- User Performance page renders all 6 cards in sky-blue category theme with sparklines ✅
- Age columns removed from Leads + Trials tables; age shows as bare number below name ✅


## 2026-08-04 (round 6) — Trial funnel polish: names, dates, 12h clock, lead-on-dropoff 🎯
**Status: COMPLETE — verified end-to-end (helpers + UI + admin CRM)**

### What changed

**Public booking (`FutureSkillsBookingPage.jsx`)**
- Removed the Parent's Name field entirely — step 1 is now Phone + Child's Name only.
- Child's Name is still sent as `parent_name` (fallback) AND `student_name` so trials always land in CRM with a human-readable identifier.

**Backend (`routes/future_skills.py`)**
- New helpers: `_fmt_time_12h("17:00") → "5pm"`, `_build_batch_label(batch) → "Robotics · Mon,Wed · 5pm-6pm"`, `_next_session_scheduled_at(batch)` picks the next matching weekday in IST at the batch's start_time and returns UTC ISO.
- `register_trial`, `admin_lead_book_trial`, `admin_create_trial`, `admin_trial_reschedule`, `admin_convert_to_customer`, and the leads-import all use the new 12h-formatted batch_label + auto-derived `scheduled_at`.
- `booking-intent` now creates a `future_skills_leads` row (once per phone) so a parent who drops out mid-funnel still appears in the CRM as a fresh lead with source and phone.
- `TrialUpdate` PATCH model now accepts `student_name`, `age_group`, `source` so those fields can be edited from the admin CRM.

**Admin CRM (`AdminFutureSkills.jsx`)**
- Leads table: removed the standalone Age column; age group / child age now shows below the name in the Name column.
- Trials table: same treatment — age shows below student name.
- Trial detail drawer: `student_name`, `age_group`, `source` are now editable dropdown/input fields at the top. Removed the read-only Email + Grade + Parent Name blocks (parent name intentionally not collected any more). Scheduled is displayed in a human-readable format (`fmtDateTime`).

### Verification
- Unit-tested `_fmt_time_12h` (`17:00→5pm`, `17:30→5:30pm`, `09:00→9am`, `12:00→12pm`) and `_next_session_scheduled_at` for a Fri-batch @ 17:00 → next Friday 5pm IST as UTC ISO ✅
- End-to-end curl: booking-intent for `918111000222` → `future_skills_leads` row created as FSL-0219 named "Aditya Test" ✅
- Book trial with a real batch → `batch_label="Friday Aftrtnoon · Fri · 5pm-6pm"`, `scheduled_at="2026-08-07T11:30:00+00:00"`, `student_name="Arjun"`, `source="instagram"`, `crm_status="scheduled"` ✅
- Admin trials tab screenshot shows age-group below student name; blank-name rows now display italicised "no name" so they're easy to spot for backfill ✅


## 2026-08-04 (round 5) — Free-trial bookings now save parent/child name in CRM 📝
**Status: COMPLETE — name fields added to step 1, WhatsApp fired for 9028666246**

### Root cause of "bookings not showing in CRM"
The public trial-booking wizard (`/future-skills/book`) only collected: phone, age group, city, centre, batch. It never asked for parent/student name, so `future_skills_trials` rows landed with `parent_name=""` and `student_name=""` — making the Trials tab a wall of anonymous phone numbers. On top of that, dedup logic in `register_trial` returned early for any existing phone (skipping WhatsApp) — which is why triggering a resend for `9028666246` initially came back as `is_existing:true` with no send.

### What changed (`/app/frontend/src/pages/FutureSkillsBookingPage.jsx`)
- Added `parentName` + `studentName` state, two new inputs on Step 1 (below the phone field) with kebab-cased `data-testid` (`parent-name-input`, `student-name-input`).
- Step-1 validation blocks progression if either name is blank ("Please enter the parent's/child's name").
- Both fields now flow into `POST /future-skills/booking-intent` (so mid-funnel drop-offs get a WhatsApp with the right first name) and `POST /future-skills/register-trial` (so the CRM row is properly identified from the first save).

### Verification
- Delete existing FST-0029 row → re-book 9028666246 with `parent_name="Shreyaan"` + `student_name="Shreyaan"` → AiSensy queued `fs_trial_booked_confirmation` (id `ac741aab-fbd1-4e7e-ae51-9e1a8ff34435`).
- UI screenshot confirms the two new fields render on step 1 above the Continue button.

### Known still-open
User reported previous fs template deliveries still showing **Failed** on AiSensy despite Meta approval — awaiting the exact per-message error text from AiSensy dashboard to determine whether the header/button variables need adjustments beyond the 5 body params.


## 2026-08-04 (round 4) — Trial WhatsApp params fixed to match Meta template 💬
**Status: COMPLETE — verified against real template body from AiSensy dashboard**

### Real root cause (why previous fix didn't deliver)
AiSensy dashboard showed **100% Failed / ₹0 credits used** for the `free trial booking confirmation` campaign — Meta was rejecting every send at delivery. The `confirmation` template body actually has **5 DISTINCT variables**, not 5 copies of the parent name:
```
Hello {{1}}, ...
📍 Venue: [{{2}}]
📅 Date: [{{3}}]
🕒 Time: [{{4}}]
🗺️ Google Maps: [{{5}}]
```
We were sending `[first_name, first_name, first_name, first_name, first_name]` → Meta refused because a URL slot got plain text, and the rendered body was gibberish.

### What changed (`/app/backend/routes/future_skills.py`)
- New `_build_fs_trial_wa_params(trial)` helper that resolves the trial's center document (by `center_id` or fallback name) to pull `google_maps_link` + area/city, and parses `scheduled_at` into IST-formatted date (`7th August, 2026`) and time (`11am`), with graceful fallbacks (`your nearest OLL centre` / `we'll share the time shortly` / a valid oll.co URL) so Meta never sees a blank slot.
- Both `_send_trial_booking_confirmation` and `check_fs_trial_24h_reminders` now call the helper and send `[name, venue, date, time, maps_url]` matching the template exactly.
- 24h reminder query projection now includes `center_id`, `preferred_center`, `batch_label` so the helper can fill venue/time even for older trial records.
- `fs_booking_tried` kept at 1 param (name) — that template's body is simpler.

### Verification
- Unit-tested `_build_fs_trial_wa_params` across 3 scenarios (center+scheduled_at, batch_label only, minimal) — all produce sane 5-tuples.
- Live booking via admin CRM → AiSensy queued the send. Meta delivery will now succeed because param shape matches the approved template.


## 2026-08-04 (round 3) — Future Skills trial WhatsApp gaps fixed 💬
**Status: COMPLETE — verified end-to-end (4 endpoints + 24h reminder cron)**

### Root cause
The public `POST /future-skills/register-trial` was the ONLY endpoint firing the `fs_trial_booked_confirmation` WhatsApp. Every admin-side trial-creation path (`admin_create_trial`, `admin_lead_to_trial`, `admin_lead_book_trial`) silently skipped the WhatsApp, so parents booked from the CRM never got a confirmation. Separately the 24h-reminder cron built its query with `datetime.isoformat()` (produces `+00:00`) but many `scheduled_at` values in DB end with `Z` or have no offset at all — Mongo's lexicographic string comparison silently misses those rows.

### What changed (`/app/backend/routes/future_skills.py`)
- Extracted `_send_trial_booking_confirmation(trial)` helper (5-param AiSensy template, fire-and-forget). Called from all 4 trial-creation endpoints so parents get the WhatsApp whether booking is done from the public form or the admin CRM.
- Rewrote `check_fs_trial_24h_reminders()` to fetch every scheduled trial and compute the delta in Python (`datetime.fromisoformat` + `Z→+00:00` normalisation). Now robust to mixed formats: `2026-08-05T10:00:00Z`, `2026-08-05T10:00:00+00:00`, and naive strings. Also excludes `converted` trials.
- On reschedule (`admin_trial_reschedule`), reset `reminder_24h_sent=False` and unset `reminder_24h_sent_at` so the new trial time gets its own reminder.

### Verification (curl + manual cron run)
- Admin trial creation (`POST /admin/future-skills/trials`) → AiSensy queued `fs_trial_booked_confirmation` ✅
- Lead → convert-to-trial → AiSensy queued ✅
- Lead → book-trial with center + scheduled_at → AiSensy queued ✅
- 24h reminder cron correctly picks trials with `Z`-suffix AND `+00:00` suffix formats and queues `fs_trial_24h_reminder` via AiSensy ✅


## 2026-08-04 (round 2) — Social Media KPIs in Roles + Daily Report 📣
**Status: COMPLETE — verified via API + UI + email HTML build**

### What changed
- `/app/backend/routes/kpis.py`: added 4 KPIs under a new **Social Media** category (`social_ig_follower_growth`, `social_ig_engagement_growth`, `social_yt_subscriber_growth`, `social_yt_engagement_growth`) + new compute helper `_compute_social_media_metrics(start, end)` that reads `social_media_snapshots` and returns baseline-vs-current deltas (falls back to earliest in-range snapshot when no prior baseline exists). Wired into `_compute_selected_metrics` via `social_` prefix.
- `/app/backend/routes/daily_report.py`: new `fetch_social_media_data()` (7-day baseline vs today), `build_social_media_email()` with signed growth pills, and 8th section wired into `build_consolidated_email` + `send_daily_reports`.
- `/app/frontend/src/pages/admin/UserPerformance.jsx`: added Social Media theme (`#db2777` pink) + icon mapping so the new KPI group renders with matching color.

### Verification
- KPI catalog exposes the 4 new items under **Social Media** category ✅
- Role editor auto-shows the new group (frontend `AdminUsers.jsx` reads `/api/kpis/catalog`) ✅
- Assigned to a test role → `/api/users/{id}/performance?month=8&year=2026` returns real deltas (IG +40, YT +20, engagement %s) ✅
- User Performance UI renders all 4 sparkline cards in the pink Social Media section ✅
- Daily report consolidated HTML contains "Social Media Report" section with @oll.co_ Instagram + OLL YouTube stats and 7-day growth pills ✅


## 2026-08-04 — YouTube Analytics fixed with API key auth ▶️
**Status: COMPLETE — verified via API + UI**

### What changed
- `/app/backend/routes/social_media.py`: swapped Service Account credentials → `developerKey` (API key) in `_build_yt_client`; removed all Service-Account-specific scopes/paths and its error-branch about YouTube Studio permissions.
- `/app/backend/.env`: replaced `YOUTUBE_SERVICE_ACCOUNT_FILE` with `YOUTUBE_API_KEY=AIzaSyDeGsrFiqoSZhn4lr-3YCgmMA6MPlxXyh0`; `YOUTUBE_CHANNEL_ID=UCwQyfX_lsVCLBUV5Or-rZ8g` retained.
- Backend restarted, snapshot job triggered → seeded 1 trend data point.

### Verification
- `GET /api/admin/reports/social-media/youtube` → 200 with OLL channel: 2,270 subscribers · 165,942 views · 319 videos · latest 12 videos.
- `POST /api/admin/reports/social-media/youtube/snapshot` → `{ok: true}`, trend endpoint returns 1 bucket.
- Admin Reports → Social Media tab now renders the YouTube section end-to-end.



## 2026-02-23 (round 2) — Tasks module WhatsApp notifications 🔔
**Status: COMPLETE — full E2E verified (all 3 flows call AiSensy with correct payloads)**

### What was built
- New helper `_notify_task_whatsapp(task, template_key, assigner_id)` in `/app/backend/routes/tasks.py` — silently no-ops for self-assignment or when the assignee has no phone, otherwise fires an AiSensy campaign with 6 params:
  `{{1}} assignee_name` · `{{2}} task_title` · `{{3}} priority (UPPERCASE)` · `{{4}} due_date` · `{{5}} assigned_by_name` · `{{6}} task_link (deep link)`.
- Wired into three flows:
  - `POST /api/tasks` → `task_assigned`
  - `PATCH /api/tasks/{id}` with new `assigned_to` → `task_reassigned`
  - `PATCH /api/tasks/{id}` with new `due_date` (and no reassignment) → `task_due_date_updated` (also fires in-app notification)
- Extended `_find_user_display()` to also return `phone` from `team_users`/`admins` collections.
- Added the three template keys (`task_assigned`, `task_reassigned`, `task_due_date_updated`) to `routes/notifications.py` (canonical) + `server.py` mirror.
- `os` import added; `FRONTEND_URL` env used to build `/admin/tasks?open=<task_id>` deep link.

### AiSensy campaigns to create (5-min one-time setup)
Suggested body (identical for all 3 with different intro):
> Hi {{1}}, [task_assigned: A new task has been assigned to you] · Title: {{2}} · Priority: {{3}} · Due: {{4}} · Assigned by: {{5}} · Open: {{6}}



## 2026-02-23 — Educators → Applicants: Demo Priority, WhatsApp Reminders, Mandatory Bio + City 👩‍🏫
**Status: COMPLETE — iteration 107 · 13/13 backend pytest PASSED · frontend flows verified**

### What was built
- **Today's Demo Priority section** (`AdminEducators.jsx` — Applicants tab). Renders only when there are demos scheduled for today's date; sorted by `demo_time` ASC (Amarja 10:00 → Himanshi 11:00 → Rajani 15:00), numbered pills, live "Join" links + per-row reminder button. Header carries a bulk **"Send all reminders"** button.
- **WhatsApp Demo Reminders** — new `jobs.py` endpoints:
  - `POST /api/jobs/send-educator-applicant-demo-reminders` (admin OR JOB_SECRET cron) — for every applicant with `demo_date=today` and status in ('new','demo_scheduled'), sends WhatsApp to the applicant AND to the assigned Educator HR (`team_users.phone` / `users.phone`). Idempotent per day via `applicant_demo_reminder_sent_on`.
  - `POST /api/jobs/send-educator-applicant-demo-reminder/{app_id}` — admin-only per-applicant trigger for the inline row button.
  - Two new AiSensy template keys added to both `server.py` and `jobs.py` (`educator_applicant_demo_reminder`, `educator_applicant_demo_reminder_hr`) — user must create matching AiSensy campaigns with params `[applicant_name, demo_date, demo_time, meeting_link]`.
- **Mandatory Bio + City** at application time — `EducatorApplicationCreate.model_validator` rejects payloads with `bio<30 chars` or empty `city` UNLESS the application is requirement-linked (`requirement_id`) or admin-added (`added_by`). Enforced on both `/api/educators/apply` and `/api/educators/apply-verified`. Client-side `EducatorFunnel.handleProceedToOTP` blocks OTP send with a targeted toast before making the API call.
- **Incomplete Profile flag & filter** — Applicants tab now has an `AlertTriangle` chip **"Incomplete Profile (N)"** that filters to applicants missing bio/city. Every card in any Applicants view carries an amber **"Incomplete"** badge (with tooltip listing missing fields) when applicable.
- Applicant `bio` field is now persisted on re-application and on `apply-verified` (previously silently dropped in the update path).



## 2026-02-21 (round 3) — Proxy Domain Pattern for Cashfree preview 🔐
**Status: COMPLETE — verified via live PGFetchOrder + preview navigation smoke test**
- Cashfree v3 SDK strictly enforces the browser origin against the merchant whitelist. Preview subdomains cannot be self-serve whitelisted. Implemented the industry-standard **Proxy Domain Pattern**:
  - New static file `/app/frontend/public/friendship-day-checkout.html` — hosted on the whitelisted `oll.co` domain, loads Cashfree v3 SDK and invokes `checkout({ paymentSessionId })` from a trusted origin.
  - New static file `/app/frontend/public/friendship-day-return.html` — after successful payment Cashfree redirects here (still on oll.co), which then bounces the parent back to the originating preview host via `?target=<url>` (safelist: oll.co, *.emergentagent.com/.net/.host, localhost).
  - `friendship_day.py` now dynamically sets `return_url` to `https://oll.co/friendship-day-return.html?target=...&order_id=...` when the request originates from a non-whitelisted host, and inline (no proxy) when the origin is already oll.co.
  - `FriendshipDayLanding.jsx` on preview navigates directly to `https://oll.co/friendship-day-checkout.html?sid=...&mode=production` instead of running the SDK locally.
- "As Seen On" logos enlarged 2× (h-24 sm:h-32 md:h-40 · max-w-[180/220/280px]).
- Env knobs added: `CASHFREE_PROXY_BASE_URL` (default `https://oll.co`), `CASHFREE_NOTIFY_BASE_URL` (default `https://oll.co`).
- Requires a single **Deploy** to `oll.co` so the two proxy HTML files exist on the whitelisted origin — after that, preview payments work end-to-end for any preview subdomain forever.

## 2026-02-21 (round 2) — Friendship Day updates 💛
**Status: COMPLETE — iteration 106 · 6/6 backend PASS · frontend all flows verified**
- Hero image replaced with the official Friendship Day flyer (hotlinked from customer-assets).
- Date normalised to **Sunday, 2nd August 2026** across landing, event details, form, order summary and success page — all references to "Saturday" / "1 Aug" removed.
- "As Seen On" section added (Kaun Banega Crorepati, Shark Tank India, STEM Accredited) using the user-provided transparent PNGs; equal height, hover scale + drop-shadow, fully responsive.
- Cashfree "Broken Link" issue mitigated: `return_url` now forced to `CASHFREE_RETURN_BASE_URL` (default `https://oll.co` — the whitelisted domain). On preview builds Cashfree checkout opens in a `_modal` (rather than `_self` full-page redirect) so the broken-link screen stays contained in the modal and the app remains functional. Production behaviour unchanged.
- Student CRM mirror hardened: `_mirror_paid_to_student_crm` helper called from webhook, `/verify/{order_id}`, and admin PATCH. Upsert by `{email, phone}` + `$addToSet` on `workshop_history` (workshop, workshop_name, center, center_name, amount, payment_status, campaign, registered_at, paid_at, registration_id).

## 2026-02-21 — OLL Friendship Day Workshop Landing Page & CRM 💛
**Status: COMPLETE — testing_agent iteration 105 · 19/19 backend pytest PASSED · frontend end-to-end verified**

### What was built
- **Public landing page** at `/friendship-day` (`/app/frontend/src/pages/FriendshipDayLanding.jsx`) — mobile-first, sticky CTA, hero, 3 workshop cards (Bracelet ₹499 / Digital Card ₹499 / Combo ₹799 with "Best value" badge), highlights, center listings, FAQ accordion. RegistrationModal with strict client-side validation (10-digit phone, age 3-18, valid email, required workshop + center), live "Order summary" panel, `knows_oll` / `participated_before` optional survey with reveal for `previous_workshop`.
- **Success page** at `/friendship-day/success` (`/app/frontend/src/pages/FriendshipDaySuccess.jsx`) — polls `/api/friendship-day/verify/{order_id}` with a Cashfree fallback fetch, shows confirmed booking or pending state.
- **Backend** `/app/backend/routes/friendship_day.py` — 8 endpoints, wired via `api_router.include_router(friendship_day_router)`:
  - Public: `GET /friendship-day/catalog`, `POST /register` (dedupe by email+phone; 409 on paid re-register; workshop_history log), `POST /initiate-payment` (Cashfree PGCreateOrder), `POST /webhook` (HMAC `x-webhook-signature` REQUIRED — 401 without), `GET /verify/{order_id}` (with Cashfree PGFetchOrder fallback + mirror into `student_inquiries` on paid).
  - Admin: `GET /admin/friendship-day/summary` (total/paid/pending/revenue + by_workshop + by_center breakdowns), `GET /admin/friendship-day/registrations` (filters: q, workshop, center, payment_status, start_date, end_date), `PATCH /admin/friendship-day/registrations/{id}` (status transitions), `GET /admin/friendship-day/registrations.csv` (attachment).
- **Student CRM integration** (`AdminStudentCRM.jsx`) — added `friendship_day_workshop` section with rose-500 pill; renders new `FriendshipDayCRMTab` (`/app/frontend/src/pages/admin/FriendshipDayCRMTab.jsx`) featuring stat cards, workshop & center breakdown cards, status filter tabs (All/Pending/Paid/Failed), search + workshop + center dropdowns, refresh, Export CSV, and inline status dropdown per row.

### Security
- Cashfree webhook enforces HMAC signature (SEC-002 pattern) — verified 401 without headers.
- Admin endpoints gated by `_admin` dependency (rejects non-admin roles with 403).

### Follow-ups noted
- Cashfree merchant dashboard must whitelist the preview domain for the final SDK redirect to render in preview builds — production checkout works after `Deploy`.
- Hero image is a placeholder Unsplash URL — swap `HERO_IMG` constant in `FriendshipDayLanding.jsx` when official flyer is provided.
- Workshop dates constant `WORKSHOP_DATES` set to "Saturday, 1 Aug & Sunday, 2 Aug 2026" — edit the constant to match confirmed schedule.



## 2026-07-03 (round 12) — Verified Success Stories 🏆
**Status: COMPLETE — smoke tested (backend + admin UI + dashboard widget + public page all rendering)**

### Concept
"A Verified Success Story is a measurable, externally validated achievement that demonstrates a child has applied their skills to create real-world value." OLL Success Ladder — Level 1 Creator → Level 2 Published → Level 3 Recognition → Level 4 Impact → Level 5 Transformation (flagship).

### Backend
- NEW `/app/backend/routes/success_stories.py` — full CRUD (`POST/GET/PATCH/DELETE /api/success-stories`), stats (`/api/success-stories/stats`), public list (`/api/public/success-stories`, `/api/public/success-stories/{id}`, `/api/public/success-stories/stats/summary`). Write ops gated to `role == "admin"`; list is available to any authenticated team member; `/public/*` requires no auth. Fields: student_name, age, school_name, image_url, level (1-5), story (HTML), excerpt, tags[], attachments[], evidence_links[], verification_notes (internal), is_published, is_flagship (auto-true for Level 5), level_name (auto), created_by/created_by_name/created_at/updated_at.
- Registered `success_stories_router` in `server.py`.
- `/api/dashboard/stats` — added `success_stories_count` (published only) to both team-member and admin payloads so every logged-in user sees the count.

### Frontend
- **Sidebar nav item** — `Success Stories` added under Support Center in `AdminLayout` sidebar (`icon: Trophy`, no permission required — visible to every team member).
- **Dashboard widget** — new `SuccessStoriesWidget` rendered between `MyKpisWidget` and `TodaysTasksWidget` for every user (team + admin). Shows total tile + one tile per level (Creator/Published/Recognition/Impact/Transformation), each linking into the admin page pre-filtered by level.
- NEW `/app/frontend/src/pages/admin/AdminSuccessStories.jsx` at `/admin/success-stories` — level cards (act as filters), search, story grid, Add Story button (admin only), Edit + Delete + View controls per card. `StoryModal` supports image upload (Cloudinary via `/api/upload`), multiple attachment uploads (certificates/proofs), evidence URL list, tag list, rich text story body via existing `RichTextEditor` (Tiptap), and publish toggle.
- NEW `/app/frontend/src/pages/SuccessStoriesPage.jsx` at public `/success-stories` — hero, level ladder (interactive filter), Flagship section for Level 5, main grid, story detail modal with evidence links, full CTA, `Navbar` + `Footer`. Includes `<Helmet>` SEO metadata + canonical `https://oll.co/success-stories`.
- Routes registered in `App.js`: `/success-stories` (public) + `/admin/success-stories` (protected).

### Data-testids added
`success-stories-widget`, `success-stories-view-all`, `stat-success-stories`, `success-stories-level-{n}`, `admin-success-stories-page`, `add-success-story-btn`, `level-filter-{n}`, `success-stories-search`, `success-stories-level-select`, `success-stories-loading`, `success-stories-empty`, `story-card-{id}`, `view-story-{id}`, `edit-story-{id}`, `delete-story-{id}`, `story-modal`, `story-name-input`, `story-age-input`, `story-school-input`, `story-excerpt-input`, `story-tag-input`, `story-link-input`, `story-verification-input`, `story-image-input`, `upload-image-btn`, `remove-image-btn`, `upload-attachment-btn`, `story-attachment-input`, `add-tag-btn`, `add-link-btn`, `level-btn-{n}`, `story-publish-toggle`, `story-cancel-btn`, `story-save-btn`, `view-story-modal`, `public-story-card-{id}`, `public-level-filter-{n}`, `public-clear-filter`, `public-story-detail`, `public-story-close`.



## 2026-07-03 (round 11) — Per-School Session & Attendance Reports 📊
**Status: COMPLETE — smoke tested (both endpoint + UI)**

### External integration migration
- **Old**: Supabase Edge Function CheckIn API (`X-API-Key: dlp_...`)
- **New**: FastAPI CheckIn API at `https://repo-explorer-196.preview.emergentagent.com/api`
  - Auth: `X-API-Key: oll_alOS9HbyYNnZMGXJDXKURe7FnUdxZhR60GrRPXkJqho`
  - Scopes on this key: `attendance:read/write`, `sessions:read/write`, `educators:read/write`, `timetables:read/write`
  - Verified working: `/sessions`, `/educators`, `/attendance`, `/timetables` (all with `X-API-Key`)
  - Server-side filters: `?timetable_id=` (works), `?user_id=` (works on attendance), `?session_id=` (works). `school_name`, `start_date`, `end_date` filters are IGNORED by the API → we filter client-side.

### Backend
- `.env` — added `CHECKIN_BASE_URL`, updated `CHECKIN_API_KEY` to new value
- `checkin_api.py` — `CHECKIN_BASE_URL` now reads from env (falls back to legacy Supabase URL if unset)
- **NEW endpoint**: `GET /api/schools/{school_id}/reports`
  - Merges CheckIn sessions + attendance for the school
  - Resolves timetables via school's stored `checkin_timetable_ids` (or fallback to case-insensitive `school_name` match against all timetables)
  - Enriches each session with: `educator` (name/email), `backup_educator` (from `original_educator_id`), `actual` block (`reached_time`, `checkout_time`, `late_minutes`, `location_name`, `photo_path`), and `attendance_status` (`on_time`/`late_lt_15`/`late`/`early`/`absent`/`no_data`)
  - Returns `stats`: total / completed / on_time / late / absent / reassigned
  - Supports `status`, `start_date`, `end_date` query params + pagination

### Frontend
- **NEW page** `/app/frontend/src/pages/admin/SchoolReports.jsx` at route `/admin/schools/:schoolId/reports`
  - Header w/ school name + Back button
  - 6-tile stat bar (Total / Completed / On time / Late / No check-in / Reassigned)
  - Filters: search (educator/date/location), attendance status dropdown, date range picker
  - Desktop table + Mobile card layout
  - CSV export
  - Pagination
- `AdminSchoolCRM.jsx` — new shared `reportsButton` that appears in the action row for `converted`, `active`, and `renewed` status cards. Auto-disabled with tooltip when the school has no linked `checkin_timetable_id(s)`.

### Data-testids added
`school-reports-page`, `reports-back-btn`, `reports-school-name`, `reports-refresh-btn`, `reports-export-csv-btn`, `reports-search-input`, `reports-status-filter`, `reports-start-date`, `reports-end-date`, `reports-clear-filters`, `reports-{schoolId}` (list button), `stat-total`, `stat-completed`, `stat-on-time`, `stat-late`, `stat-absent`, `stat-reassigned`, `session-row-{id}`, `session-card-{id}`, `reports-prev-page`, `reports-next-page`


## 2026-07-03 (round 10) — My Team page (Manager + Admin view) 👥
**Status: COMPLETE — screenshots verified**

### Backend
- New endpoint `GET /api/team/my-team` in `/app/backend/routes/users.py`:
  - **Admin** → returns every active team_user
  - **Manager** (any user with `reports_to == current_user.id`) → returns those direct reports
  - **Regular member** → returns empty (`scope: "none"`)
  - Each member enriched with real-time counts: `tasks_assigned_open`, `tasks_pending_approval`, `tasks_completed`, `projects_leading`, `projects_member_of`, plus role name and manager name
- `GET /api/tasks?assignee={user_id}` now accepts an explicit `assignee` filter. Admins can view any user's tasks; managers can view their reports; anyone else → 403

### Frontend
- New page `/app/frontend/src/pages/admin/AdminMyTeam.jsx` at route `/admin/team`:
  - Header shows "Team Overview" (admin) or "My Team" (manager)
  - Search input (name/email/role) + 4 summary tiles (Open / Pending Review / Completed / Leading)
  - Each member rendered as a **card** with avatar + role + contact info + "Lead" badge + 6-cell stats grid + three action buttons:
    - **Assign Task** → opens `TaskCreateModal` with the assignee chip pre-filled via new `defaultAssigneeId` prop
    - **View Tasks** → deep-links to `/admin/tasks?assignee={id}` (tasks list scoped to that user)
    - **Performance** icon → opens `/admin/users/{id}/performance` (existing per-user performance page)
- `AdminTasks.jsx` reads the `?assignee=` URL param and forwards it to the tasks endpoint
- `TaskCreateModal.jsx` accepts `defaultAssigneeId` prop
- Sidebar: added "My Team" (Users icon) link between Projects and My Performance, `permission: null` so both managers and admins see it

### Files touched
- `/app/backend/routes/users.py` (new endpoint at bottom)
- `/app/backend/routes/tasks.py` (assignee query param)
- `/app/frontend/src/pages/admin/AdminMyTeam.jsx` (new)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (loadTasks reads ?assignee)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (sidebar link)
- `/app/frontend/src/components/tasks/TaskCreateModal.jsx` (defaultAssigneeId prop)
- `/app/frontend/src/App.js` (route + lazy import)



## 2026-07-03 (round 9) — Categorized Performance + Project-window KPIs + Weekly Task Widget 🎨
**Status: COMPLETE — screenshots verified**

### Performance page — categorized layout with color theming
- KPIs are now **grouped by category** into individual sections. Each section has a colored dot + title + `N metrics` pill.
- Chart strokes, gradient fills, and icon backgrounds now use the **category color**:
  - Tasks & Responsibilities → blue (`#3b82f6`)
  - Support Center → amber (`#f59e0b`)
  - Sales — B2B → emerald (`#10b981`)
  - Sales — B2C → cyan (`#06b6d4`)
  - HR → purple (`#a855f7`)
  - Educator HR → pink (`#ec4899`)
  - Growth Partners → orange (`#f97316`)
- KPI catalog category renamed `Task & Project Delivery` → `Tasks & Responsibilities`

### Projects KPI — active-window overlap
`projects_member_of` + `projects_leading` no longer return an all-time snapshot. For each time bucket, a project is counted only when its `start_date` ≤ `bucket_end` and (`end_date` is null OR `end_date` ≥ `bucket_start`). Aggregation changed from `snapshot` to `max` so the header display shows peak concurrent projects during the scope (not the sum).

### Dashboard — "This Week's Tasks" (was "Today's Tasks")
Backend `/api/tasks/today` now returns three arrays:
- `today` — due today
- `this_week` — due later this week (Mon–Sun, excluding today)
- `overdue` — due < today AND not completed

Widget rendered as a full-width card list using the shared `<TaskCard>` component — same rich design as the Tasks page (priority dot, overdue chip, due-date pill, status pill, Start/Complete actions, 3-dot menu with Edit/Delete). Overdue rows appear first, then today, then rest of week.

### Files touched
- `/app/backend/routes/kpis.py` (category rename, project window overlap logic, `max` aggregation)
- `/app/backend/routes/tasks.py` (`/tasks/today` returns `today` + `this_week` + `overdue`)
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (category grouping + theming)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (widget uses shared `TaskCard`)



## 2026-07-03 (round 8) — Added 12 new KPIs (Renewal, HR, Educator HR, Growth Partners) 📊
**Status: COMPLETE — verified end-to-end via direct compute functions**

### New KPI catalog entries in `/app/backend/routes/kpis.py`

**Sales — B2B (2 new):**
- `b2b_renewal_rate` — `(customers − lost) / customers × 100 %`  (unit: %)
- `b2b_lost_schools` — count of schools with status ∈ {archived, lost, churned}

**HR (3 new, org-wide):**
- `hr_team_openings` — `team_requirements` created in period
- `hr_openings_filled` — `team_applications` with status ∈ {hired, onboarded, onboarding} created in period
- `hr_openings_over_deadline` — `team_requirements` still `is_active=True` and `created_at > 30 days ago` (**snapshot**)

**Educator HR (3 new, org-wide):**
- `edu_requirements` — `open_requirements` created in period
- `edu_requirements_fulfilled` — `educator_onboarding` docs created in period
- `edu_requirements_over_deadline` — active `open_requirements` older than 30 days (**snapshot**)

**Growth Partners (3 new, per-user if `assigned_to` exists on doc, else org-wide):**
- `gp_leads` — `growth_partners` created in period
- `gp_onboarded` — status ∈ {onboarding, active, converted}
- `gp_conversions` — status ∈ {converted, active}

### Compute functions added
- `_compute_b2b_metrics` extended with renewal / lost math
- `_compute_hr_metrics` (new)
- `_compute_educator_hr_metrics` (new)
- `_compute_growth_partner_metrics` (new)
- Dispatcher `_compute_selected_metrics` now routes prefixes `hr_`, `edu_`, `gp_`

### Verified via direct backend call
- HR: openings=1, filled=5, over_deadline=1
- Educator HR: requirements=2, fulfilled=0, over_deadline=2
- Growth Partners: leads=31, onboarded=17, conversions=4
- B2B renewal rate=15.0%, lost_schools=17

Existing Users & Roles UI consumes `/api/kpis/catalog` dynamically, so all 12 new KPIs are now selectable when configuring a role.



## 2026-07-03 (round 7) — Performance Picker + Snapshot KPIs + Dashboard Slider 📈
**Status: COMPLETE — verified end-to-end**

### 1. Ref-date picker on Performance page
- **Month scope** → Month + Year dropdowns
- **Quarter scope** → Quarter (Q1–Q4) + Year dropdowns
- **Year scope** → Year dropdown only
- Each change re-fetches with the correct `ref=YYYY-MM-DD` query string, so users can drill into any past period.

### 2. Fixed "Projects assigned to" (and similar snapshot KPIs)
- Added `aggregation` field to KPI catalog entries. New value `"snapshot"` used for KPIs whose queries don't have a time filter:
  - `tasks_overdue` — real-time snapshot of currently-overdue open tasks
  - `projects_member_of` — all-time count of projects the user is a member of OR leads
  - `projects_leading` — all-time count of projects the user leads
- In `_timeseries_payload`, snapshot KPIs use the **last-bucket value** for `display_value` (no summing).
- **Also fixed the query** for `projects_member_of` to include both `member_ids` and `lead_id` (previously missed leads-only projects).

### 3. Dashboard — one-line horizontal KPI slider
- Replaced the responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`) with a `flex overflow-x-auto snap-x` horizontal scrolling strip.
- Each card is `w-[210px]` with `snap-start` — swipe or scroll horizontally on any device.

### Files touched
- `/app/backend/routes/kpis.py` (KPI catalog + timeseries snapshot logic + member/lead OR query)
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (month/quarter/year pickers + ref builder)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (dashboard KPI horizontal slider)



## 2026-07-03 (round 6) — My Performance Page with Time-Series Charts 📊
**Status: COMPLETE — verified end-to-end**

### Backend
Added two endpoints to `/app/backend/routes/kpis.py`:
- `GET /api/me/performance/timeseries?scope=month|quarter|year` — current user
- `GET /api/users/{user_id}/performance/timeseries?scope=...` — admin/manager view
Response contains:
- `buckets`: array of `{label, sub}` (weeks / months / quarters)
- `kpis`: per-KPI series `{id, label, category, unit, series: [{label, sub, value}], trend, total, avg, display_value}`

Bucket logic (`_buckets_for_scope`):
- **month** → weekly buckets (Wk 1..N) clipped to the calendar month, Mon-Sun aligned
- **quarter** → 3 monthly buckets (Jan/Feb/Mar or Apr/May/Jun etc.) for the quarter containing `ref`
- **year** → 4 quarterly buckets (Q1..Q4) for the year containing `ref`

### Frontend — `UserPerformance.jsx` rewritten
- Component accepts `mode="admin"` (default, reads `:id` from URL) or `mode="me"` (uses logged-in user)
- **Scope tabs** (Month / Quarter / Year) as pill-style toggle in a rounded container
- Each KPI renders as a Card with:
  - Icon + category + label
  - **Trend pill** with % change (green ↑ up, red ↓ down, slate = no change)
  - Large display value (sum for counts/currency, average for %/hours)
  - **Recharts AreaChart** with gradient fill, colored by trend direction, hover tooltip
- Fully responsive (`grid-cols-1 lg:grid-cols-2`, mobile-friendly paddings)

### Routing & sidebar
- Added route `/admin/me/performance` → `<UserPerformance mode="me" />`
- Added sidebar link **"My Performance"** (BarChart3 icon, `permission: null` so all team members see it)

### Files touched
- `/app/backend/routes/kpis.py`
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (rewritten)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (sidebar item)
- `/app/frontend/src/App.js` (new route)



## 2026-07-03 (round 5) — Task Cards: Edit + Start + Shared Component + Mobile 🎯
**Status: COMPLETE — verified end-to-end**

### Features
1. **Edit task** — `TaskCreateModal` now doubles as an **edit modal** via a new `existingTask` prop:
   - Header switches to "Edit task"
   - Fields pre-filled from the task
   - Footer button becomes "Save Changes" (`⌘+ENTER TO SAVE`)
   - Submits via `PATCH /api/tasks/:id` (backend `TaskUpdate` now supports `assigned_to` in the update loop)
   - "Edit task" appears as the top item in the 3-dot menu (visible to assignee, assigner, and admin)
2. **Start task** — dedicated `Play` icon button appears on pending tasks assigned to the current user. One click → PATCH `status: in_progress`.
3. **Reordering** — status pill → **Start (▶)** → **Complete (✓)** → assignee → menu. Both action buttons are now next to the status pill (as requested).
4. **Removed** the empty left status circle on task cards (visual clutter; the priority dot alone is enough).

### Shared component
- `TaskCard` and `FloatingMenu` are now `export`ed from `AdminTasks.jsx`.
- `AdminProjectDetail.jsx` **reuses `TaskCard` directly** for its Tasks section — same design, same functionality (edit, start, complete, delete, sub-task).
- Added a prominent **"Add Task"** button (blue, matching Tasks page) in the project's Tasks section header.

### Mobile responsive
- Task cards ship two layouts:
  - **≥ sm**: multi-column row with fixed-width slots
  - **< sm**: stacked layout — title + description → chips (project/status/date) → assignee + action buttons + menu
- Container paddings reduced on mobile (`p-4 sm:p-6`)
- Search input becomes full-width on mobile

### Bug fixed
- `FloatingMenu` clicks (Add sub-task, Edit, Delete) were being killed by the document-level `mousedown` outside-click handler race. Added `onMouseDown={e => e.stopPropagation()}` on the popup wrapper so mousedown never bubbles to `document`. The menu now closes only on genuine outside clicks.

### Files touched
- `/app/backend/routes/tasks.py` (added `assigned_to` to update loop)
- `/app/frontend/src/components/tasks/TaskCreateModal.jsx` (edit mode via `existingTask`)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (rewritten TaskCard: no left circle, mobile layout, Start/Edit actions, FloatingMenu bugfix, exports)
- `/app/frontend/src/pages/admin/AdminProjectDetail.jsx` (imports shared `TaskCard`, Add Task button)



## 2026-07-03 (round 4) — Project Detail: Stacked Sections + In-Place Task Modal 🗂️
**Status: COMPLETE — verified**

### Changes
1. **AdminProjectDetail.jsx** — removed the tab strip (Overview / Tasks / Milestones / Knowledge Base). All four sections now render **stacked vertically** on the same page with a `<SectionHeader>` per section (title + count). Users can scroll through everything without switching contexts.
2. **Add task from project** — was `<Link to="/admin/tasks?new=1">` which navigated away. Replaced with in-place `<TaskCreateModal>` triggered by an "+ Add task" button. Uses `defaultProjectId={id}` so the project is pre-selected in the modal chip. On create, calls `load()` to refresh the tasks list.
3. **Project name chip on task cards** — 
   - Backend `_enrich_task()` now returns `project_name` and `project_color` when `project_id` is set
   - `AdminTasks.jsx` `TaskCard` shows a small colored pill next to the task title (background = project color at 20% opacity, dot in solid color) with `data-testid="task-project-{id}"`

### Files touched
- `/app/backend/routes/tasks.py` (project enrichment)
- `/app/frontend/src/pages/admin/AdminProjectDetail.jsx` (tabs → stacked sections, inline modal)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (project chip in card)



## 2026-07-03 (round 3) — Task Menu / Ownership / Alignment Fixes 🔧
**Status: COMPLETE — verified end-to-end**

### Bugs fixed
1. **Add sub-task & Delete task buttons dead in 3-dot menu**
   - Root cause: `FloatingMenu`'s document `mousedown` listener closed the popup before the child `click` handler could fire (because the popup wasn't in the anchor's DOM subtree)
   - Fix: added `popupRef` and skipped close when the mousedown target is inside the popup itself
   - Removed stray `onClick={e => e.stopPropagation()}` on the wrapper (no longer needed)

2. **Assigner/admin should NOT be able to mark someone else's task complete**
   - Rule now enforced: **the assignee is the OWNER of the task**
     - Self-assigned (assignee === assigner) → assignee marks complete directly
     - Someone-else assigned → assignee **submits for approval** → assigner or admin **approves** (only when status = `pending_approval`)
     - Assigner viewing an in-progress task no longer sees the Complete icon
   - `canComplete` (row + detail modal) now requires either:
     - `currentUserId === task.assigned_to` (assignee), OR
     - `task.status === 'pending_approval' && (isApprover || isAdmin)` (approver on submitted task)
   - Detail modal's Mark Complete button only shows for self-assigned tasks

3. **Row alignment broken when due date / status missing**
   - Root cause: conditional rendering caused columns to reflow horizontally per row
   - Fix: converted trailing columns into **fixed-width slots** with `w-[76px]` (due date), `w-[130px]` (status), `w-[180px]` (assignee), `w-[32px]` (complete), `w-[28px]` (menu). Empty cells still occupy the slot.

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx`



## 2026-07-03 — Task Page: Menu Fix + Assignment Display + Sorting 📋
**Status: COMPLETE — Screenshot verified**

### Fixes
1. **3-dot popup no longer clipped** — introduced `<FloatingMenu>` that renders with `position: fixed` at button's `getBoundingClientRect()`, escaping any `overflow-hidden` parent. Also removed `overflow-hidden` from `StatusSection` container.
2. **Assigner can now complete someone else's task**:
   - Row card: `completeTask()` now allows `isApprover || isAdmin` → direct PATCH `status: 'completed'`
   - Detail modal: `canComplete` expanded to include `currentUserId === task.assigned_by || isAdmin`
   - `canComplete` is now gated on `canAct` (assignee || approver || admin) to prevent unauthorized clicks
3. **Card layout enrichment**:
   - **Description snippet** (first line, up to 140 chars) shown below title with `line-clamp-1`
   - **Big assignee name** (semibold, `text-sm`) with avatar + `(you)` badge when applicable
   - **Small "by X" line** (`text-[10px]` slate-400) below assignee — hidden when self-assigned
4. **Scope filter overhaul**:
   - Non-admin default changed from `my` → `all` (tasks assigned to me + by me)
   - "My direct reports" option **removed**; replaced with "All Tasks" as the first option
   - Admin filter options unchanged (All Team / Assigned to me / Assigned by me)
5. **Sort order**: due-date ASC (nulls last), then priority DESC (urgent > high > medium > low)
6. Search now also matches inside the task description

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (FloatingMenu component, TaskCard rewrite, TaskDetailModal canComplete fix, filterOptions update, sort logic)



## 2026-07-03 — Task Attachments + UX Refinements 🎯
**Status: COMPLETE — Backend + Frontend verified end-to-end**

### Backend (`/app/backend/routes/tasks.py`)
- Added `attachments: List[dict]` field to `TaskCreate` + `TaskUpdate` models
- Attachments persist on create + update (`PATCH /api/tasks/:id`)
- Each attachment: `{name, url, kind: 'file'|'link', size?}`

### Frontend UX changes (per user request)
1. **Hide task IDs (TSK-XXXX codes)** — removed from list cards and detail modal header
2. **Move due date outside** — now a prominent bordered pill on the right side of each card (red variant when overdue)
3. **Direct-complete flow** with smart routing:
   - **Self-assigned** (`assigned_to === assigned_by`) → PATCH `status: 'completed'` directly (no approval)
   - **Assigned by someone else** → POST `/tasks/:id/submit` (goes to `pending_approval`)
   - **Approver clicks complete on pending_approval** → POST `/tasks/:id/approve`
4. **Complete icon** (`CheckCircle2`) added per-row, visible on hover
5. **Delete moved to 3-dot menu** (was already there; removed the redundant status-advance action)
6. **Attachments panel** in TaskCreateModal is now fully functional:
   - "Upload file" → posts to `/api/upload?type=task` (Cloudinary, 10MB limit)
   - "Add link" → inline URL input with optional label
   - Files listed with type icon (📄 file / 🔗 link), click to open in new tab, trash-icon to remove
   - "Voice Note" section removed
7. **Attachments in TaskDetailModal** — view + add + remove after task creation (auto-saves on change)
8. **Attachment count** shown on each task card (paperclip icon)

### Verified
- Backend: created task with 2 attachments (file + link) — round-trip preserved
- Frontend: detail modal displays both, upload/add-link buttons visible, Mark Complete button present for self-assigned
- Direct-complete PATCH → status `completed` + `completed_at` stamp



## 2026-07-02 — Task Page UI Redesign (Card/List Hybrid) 🎨
**Status: COMPLETE — Screenshot verified**

### What was done
- Redesigned `/app/frontend/src/pages/admin/AdminTasks.jsx` from a table to a **card/list hybrid** layout, matching the modern chip-based aesthetic of `TaskCreateModal.jsx`
- **Mission Control** branding label + Sparkles icon in header
- Rich header meta: total count, in-progress count, pending-approval count (color-coded)
- Toolbar overhaul: 2-row toolbar with scope pills (All Team / Assigned to me / Assigned by me) + status filter chips with per-status counts + soft-focus search
- **Grouped-by-status** default view with collapsible sections (Pending Approval → In Progress → Pending → Rejected → Completed); "Ungroup" toggle for flat view
- New **TaskCard** row: clickable status circle (advances status), priority dot, title + code, metadata icons (due date, subtasks, comments, drive link), status pill, initials avatar with deterministic colors, hover-revealed 3-dot menu (start/complete, add sub-task, open detail, delete)
- Nested subtask rendering with left-connector line indent
- Overdue tasks now show a red "Overdue" chip
- Empty-state card with icon + inline CTA
- Detail modal upgraded: blue accents, avatar in header + comments, softer focus rings

### Cleanup
- Deleted iteration-94 automated test data:
  - Project: `TEST_Iter94_Project`
  - Tasks: `Iter94 shortcut test`, `test sub`, `Testing new task`

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (rewritten)
- MongoDB cleanup (projects, tasks)



## 2026-04-03 — server.py Modularization (MAJOR)
**Status: COMPLETE — Tested (34/34 backend tests passed)**

### What was done
- Refactored monolithic `server.py` from **14,805 lines → 4,226 lines** (71% reduction)
- Extracted 387 routes into 20 modular files in `/app/backend/routes/`
- Created new shared utilities in `routes/shared.py` and `routes/notifications.py`

### Files Created
| File | Routes | Description |
|------|--------|-------------|
| routes/users.py | 25 | Auth, Team Users, Roles, Center Users, OTP, User Bookings |
| routes/students.py | 15 | Student Inquiries, Growth Partners, Comments |
| routes/team.py | 25 | Team Applications, Onboarding, Vendor Expenses |
| routes/educators.py | 68 | Educator Applications, Onboarding, FAQs, Blogs |
| routes/support.py | 27 | Support Queries, Tickets, Batches, Sessions |
| routes/schools.py | 42 | School CRM, Onboarding, PO Management, Tracking |
| routes/orders.py | 10 | School/Student Payments, Tracking Tickets |
| routes/misc.py | 48 | Health, Cities, Dashboard, Admin, Upload |
| routes/notifications.py | - | WhatsApp notification helpers (WHATSAPP_TEMPLATES) |
| routes/shared.py | - | DB, JWT helpers, auto_assign, send_educator_email |

### Bug Fixes (during refactor)
- Fixed: `routes/schools.py` missing imports for `transform_tracking_url`, `fetch_po_data`, `fetch_vendor_products`, `match_vendor_product`, `VENDOR_PUBLIC_API` from `routes/expenses.py`
- Fixed: Duplicate `/health` route in `routes/misc.py`

## 2026-04-03 — Invoice URL Migration + GST Fix
**Status: COMPLETE**

- Migration script: `/app/backend/migrate_invoice_urls.py` — set empty-string `invoice_url` → `null` in `school_inquiries.payments`
- Cleared test invoice URLs from Walle, Followup Test 2, Shreshth Daga School
- Fixed GST formula: `exclusive_18` now uses `amount * 18 / 100` instead of `amount * 18 / 118`

## 2026-09-27 — Robotics & AI Lab Landing Page Overhaul + SEO URL
**Status: COMPLETE**

### New canonical URL
- New canonical: `/school/robotics-ai-lab-for-schools-turnkey-solution/`
- Old routes 301-redirected to new: `/school/robotics/beginner`, `/school/robotics/intermediate`, `/school/robotics/advanced`, `/school/robotics/icse`, `/school/cs/icse`
- Updated CANONICAL, TITLE, DESC, KEYWORDS, all schema.org JSON-LD, breadcrumb crumb, and internal cross-links to Grades 1–8

### Homepage (`LandingPage.jsx`)
- Consolidated Beginner/Intermediate/Advanced into a single card: **"Robotics & AI Program for Schools · Grade 1–8 · Turnkey Robotics & AI Lab"** (highlighted)

### Landing page (`RoboticsBeginnerLanding.jsx`)
- **Hero**: New H1 "AI and Robotics Lab for Schools Grade 1 to 8" + SEO intro paragraph ("Introducing OLL's Robotics and AI Labs…")
- **Hero right column**: Removed student WINNERS slider (no student names/images). Replaced with autoplay **"Real Schools, Real Results"** school-video carousel + arrow controls + dots
- **Books section**: Renamed to "A Robotics & AI Book for Grade 1 to Grade 8". Grid changed from 8×1 → 4×2 (all 8 grades)
- **What the school gets**: Heading updated to "Everything you need to start an AI and Robotics Program for School"
- **4 Pillars section**: New title "4 pillars in every Robotics project"; renamed to WitBrix Construction / WitPro Coding Block / AI Vision Blox / Electronics with image placeholders + NEP 2020/NCF 2023 intro paragraph
- **Projects section**: Renamed to "Robotics & AI Projects for Students grade 1 to 10" — replaced 6-item grid with single showreel video placeholder
- **Individual Take-Home Kits**: Added Grade 7 (AI Matrix) and Grade 8 (Human + Machine); grid changed 6×1 → 4×2; every kit card now has an **Unboxing Video** button (links to YouTube)
- **Master Kit section**: Renamed to "Setup a Full Robotics Lab in your school."
- **NEW section — Year Long Teacher Empowerment Program**: 4-step timeline (Month 1: 6 days · Initial Training; Month 3: 3 days · Competition Prep; Month 6: 2 days · Exhibition Prep; Month 8: 2 days · Advanced Refresher) + 4 support cards (Weekly Workshops, 24×7 Doubt Solving, Video Call Support, STEM.org Certification)
- **Real Schools, Real Results**: Replaced "Schools we work with" marquee with a 3-up autoplay carousel + arrow controls + dot navigation. Partner school logos still scroll below
- Removed unused `WINNERS` constant

### Testing
- Verified via screenshot tool: hero, books, kits, teacher empowerment, real schools, pillars, projects video all render correctly
- Verified: old `/school/robotics/beginner` 301s to new URL
- Verified: homepage card text = "Robotics & AI Program for Schools" with correct sub-copy

## 2026-09-28 — Live Ops: Outreach + My Team PDF Reports + Weekly Cron
**Status: COMPLETE**

### 1. Today's Outreach — 2 new tiles
- **Calls Connected**: today's `call_picked` count from `telecalling_activity` + connect rate + interested leads
- **Field Visits**: today's `school_visits` total + entries gained + interested leads + reps count
- Grid changed 2×1 → 2×2 in `AdminLive.jsx`
- `OutreachTile` extended with `gainedLabel` + `engagementLabel` props (backward-compatible for IG/YT tiles)

### 2. My Team — Weekly/Monthly/Quarterly PDF Reports
- New endpoint `GET /api/team/member-report/{user_id}?period=weekly|monthly|quarterly&ref=YYYY-MM-DD` returns:
  - Time-bucketed breakdown (day/week/month based on period)
  - Tasks assigned + tasks completed lists
  - Support queries assigned list
  - CRM roll-up (leads, schools onboarded, student leads)
  - Field/calls totals
- Period pill filter (Weekly / Monthly / Quarterly) added to `AdminMyTeam.jsx` header
- Green **PDF download** button on every MemberCard — client-side `jsPDF` + `jspdf-autotable` renders a branded multi-section report

### 3. Weekly Email Cron — Every Monday 3PM IST
- New file `.emergent/crons.yml` with `weekly-team-report` cron (`0 15 * * 1` in `Asia/Kolkata`)
- New endpoint `POST /api/cron/weekly-team-report` — Bearer `WEBHOOK_CRON_SECRET` auth, idempotent via `X-Webhook-Id`, backgrounded work
- Enumerates every user with direct reports, generates a **ReportLab PDF** per direct report matching the frontend layout, emails each manager one HTML digest with all PDFs attached via Resend
- Manual admin trigger: `POST /api/cron/weekly-team-report/preview` (JWT-authed)
- Preview verified: 2 managers emailed with 6 attachments, 0 failures

### New Env Var
- `WEBHOOK_CRON_SECRET` added to `backend/.env` (auto-generated 32-byte token)

## 2026-06 — Shark Tank YF poster redesign
- Homepage STI6 section: royal-blue doodle/glow poster bg, no white card, large cropped logos (/sti6-logo.png, /sti6-yf-logo.png), new copy + queries line, "Know More" outline CTA.
- /shark-tank-young-founders (now /shark-tank-india-season-6-young-founders-special): sticky pill nav without ST logos; poster hero (big logos + glowing-bulb "Registration Open" block); all sections re-themed blue/yellow/cream with YOUNG accent colours (red/maroon removed); contact line in hero + CTA.
- Shared theme: frontend/src/components/sharkTankTheme.js; Anton + Bebas Neue fonts added in public/index.html.
- 2026-06 follow-up: canonical URL /shark-tank-india-season-6-young-founders-special (old slugs redirect); darker blue bg (#061F6B/#020E3A) for logo contrast; About section concise + Read more toggle; all "Official site/page" CTAs -> "Register Now"; navbar now position:fixed top (sticky was broken by ancestor overflow).
- 2026-06: Homepage + STI page hero descriptions merged to one paragraph; mobile logos smaller; removed "Online Learning Launchpad" (OLL has NO full form) from STI page + shop invoice PDF.
- 2026-06: STI page "Registration Open" glow block -> fit-content pill (fixes desktop text overflow); standard OLL <Footer /> added to STI page.
- 2026-06: Techfest Submissions admin panel — Region/Age/Status(+Duplicates) filters, Approve/Reject with mandatory Judge Remarks (PATCH /api/admin/techfest/submissions/{id}/review; fields review_status, judge_remarks, reviewed_by, reviewed_at, review_history). One-submission-per-Team-ID/Competition-ID rule (case/space-insensitive) on POST /api/techfest/submissions + portal edit -> 409 with standard message. Legacy duplicates flagged is_duplicate/duplicate_of in list API. Component: pages/admin/SubmissionReviewDialog.jsx. Tested iteration_121 (100%).
- 2026-06: Techfest submissions Export XLSX (filtered rows). Project Earnings (db.project_earnings; GET/POST /api/projects/{id}/earnings, PUT/DELETE /api/projects/earnings/{id}; base amount + optional GST%, invoice no + Cloudinary invoice upload) shown on project detail; Projects P&L tab shows Earned/Spent/Net + totals (base excl GST). /admin/live sessions: checked_in = on_time + late (all punctual_*/late* tags), not_checked_in, scheduled total; fixed HH:MM start_time parse. Tested iteration_122 (100%).
- 2026-06: Techfest North Zone qualifier = 21 Nov 2026 · Modern Public School, Shalimar Bagh, Delhi — updated TechfestPage (zones table + FAQs), Sumo/Racer pages, register/submit zone dropdowns, permission letter, techfest emails, bulk email table, FAQ bot prompts (faq_chat + faq_settings default; read_settings splices it into older saved docs).
- 2026-06: South Zone venue renamed to "RVCE College, Bangalore" everywhere (pages, forms, emails, permission letter, FAQ bot + saved-settings splice).
- 2026-06: Homepage "our story" — removed KBC/Shark Tank video cards; added components/home/NewsStrip.jsx (8 newspaper-style auto-scrolling press cards, pause on hover; Entrackr/Vibes of India/Indianweb2 link to Google search of headline until real URLs provided). Playfair Display font added.
- 2026-06: NewsStrip cards now include press photos cropped from user screenshots (/public/press/*.jpg), newspaper-print style (grayscale, colour on hover).
- 2026-06: Vendor panel switched to new backend https://vendor-panel-6kjc.onrender.com/api (env: VENDOR_PUBLIC_API, PO_API_BASE_URL, PROCUREWAY_API_KEY new oll_ext key, PO_TRACKING_URL=https://vendor-panel-1rt3.vercel.app). Timeouts raised to 60s (Render cold start). Old vendorplus-4 /track links rewritten to new panel; product images still served from vendorplus-4 host.
- 2026-06: Vendor images now hosted on vendor-panel-6kjc.onrender.com/api/files; shop.py image host rewrites (oll-procure, vendorplus-4) -> onrender. Verified 103/104 shop images load via weserv.
- 2026-06: Blog detail — sticky pill nav (zero-height sticky wrapper), sticky TOC, cover image/YouTube cover_video in hero (right column), blue→red gradient; cover_video field in admin + routes/educators.py models. Global: html,body overflow-x clip (hidden broke position:sticky). Shop: vendor `category` -> vendor_category, loosely mapped in shopCategories.js. PDP: CTA moved above description, description collapse (150px) Read more, fixed bottom PurchaseBar (mobile always, desktop when inline CTA out of view, not on techfest desktop), Need Help raised on PDP, eyebrow uses shop category name. Tested iteration_123.
- 2026-06: Blog detail side padding increased (px-5/sm:8/md:12/lg:16), article max 760px. Shop orders stats: new GET /api/admin/shop/orders/stats (server aggregate across ALL orders, case-insensitive status; fixes 200-order cap + uppercase PAID miss + refunded counted as pending); list limit 2000, status lowercased; INR formatting 2dp; generic payments stats hidden on Robotics Shop tab.
- 2026-06: Offerings mega-menu (components/OfferingsMegaMenu.jsx, portal, 3 cols incl For Learners) in Navbar default+pill variants. /blogs Success Stories section (components/BlogSuccessStories.jsx, 3 latest). Shared RbAboutOLL + RbRealSchools extracted to components/school/RbTrustSections.jsx, used on Robotics & AI Program + Pre-School (Pre-School LMS now shared LMSSection). CurriculumGateModal (school+phone → /api/schools/inquiry → PDF) on Robotics & AI Program downloads. CBSE CT&AI canonical URL /school/cs/cbse-computational-thinking-ai-books-activities-for-classes-3-to-8 (old slugs redirect, sitemap updated). Tested iteration_124.
- 2026-06: CT&AI brochure PDF updated. Techfest portal /techfest/my-submission: login via Team ID (no OTP), leader phone + OTP (AiSensy WA + email), or email OTP; token carries sids; full SubmissionEditor (components/techfest/SubmissionEditor.jsx) for all fields/members/uploads; per-zone cutoff (east 20 Oct, others 1 Nov 2026 23:59 IST); Edit Submission button on submit page; FAQ bot/settings updated. Shop Export XLSX pages through ALL orders. Fixed CBSE CT&AI + Future Skills brochure lead POST (/schools/register 404 -> /schools/inquiry). Tested iteration_125.
