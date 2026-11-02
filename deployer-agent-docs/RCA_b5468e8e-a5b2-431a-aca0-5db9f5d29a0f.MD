# RCA — Techfest submission-portal OTP delivery (oll.co)

**Deployment:** eventmate-19 · **Active run:** b5468e8e-a5b2-431a-aca0-5db9f5d29a0f (redeploy, success, promoted 2026-11-02 09:46:38Z)
**Live URL:** https://eventmate-19.emergent.host (custom domains oll.co / www.oll.co verified) · frontend_type: cloudflare

## 1. Is the latest deploy live and does it contain the new code? — YES
- Active run b5468e8e is live and serving (preview_health_check / → 200).
- Verified the deployed source (eph pod on the active run's image) contains the new code:
  - `backend/routes/techfest_submission_portal.py`
    - L106 `async def _send_otp_whatsapp(phone, name, code)`
    - L117 `"campaignName": "otp"`  ✓
    - L128 `logger.warning("techfest portal OTP whatsapp rejected for %s: %s %s", ...)`  ✓
    - L258 `logger.warning("techfest portal OTP email not sent to %s: %s", ...)`  ✓
  - `backend/routes/techfest.py`
    - L32 `_dispatch_email(...)` — tries Gmail first, Resend fallback (L61–77).

## 2. Backend logs for your request-otp call ({"email":"e1-notif@oll.co"}) — EMAIL FAILED
Exact log line (run b5468e8e):
```
2026-11-02 09:59:29,111 - routes.techfest_submission_portal - WARNING - techfest portal OTP email not sent to e1-notif@oll.co: {'provider': 'none', 'success': False, 'gmail_error': 'GMAIL_APP_PASSWORD missing', 'resend_error': 'API key is invalid'}
```
- `_dispatch_email` did **NOT** succeed via Resend. Resend returned **"API key is invalid"** (the 401 message) — same failure as the previous RCA.
- Gmail path also unavailable: `GMAIL_APP_PASSWORD missing`.
- The POST returned HTTP 200 (`POST /api/techfest/submission-portal/request-otp 200 OK`) because the endpoint generates/stores the OTP synchronously; delivery is a separate step and failed.

### Secret state (active run)
- `RESEND_API_KEY`: present (is_empty=false) but the live value is **still INVALID** — Resend rejects it with "API key is invalid". Not fixed.
- `GMAIL_APP_PASSWORD`: **empty** (is_empty=true, matches_expected="" confirmed).

## 3. Real request-otp calls with phone / AiSensy result — NONE in window
- Over the last 720 min the only request-otp call was the single email request to e1-notif@oll.co. No phone-based request-otp calls.
- No `techfest portal OTP whatsapp rejected` lines and no AiSensy "Campaign does not exist" lines were produced. The WhatsApp channel (campaignName "otp") is deployed correctly but was **not exercised** by live traffic, so pass/fail cannot be confirmed from production logs.

## Verdict per channel
- **Email: FAIL** — Resend 401 "API key is invalid"; Gmail password empty. No provider delivered.
- **WhatsApp: UNTESTED** — correct code deployed, but no phone request-otp traffic to confirm AiSensy 200 vs "Campaign does not exist".

## Fix
- **User (Secrets):** Replace `RESEND_API_KEY` in Deployment Panel → Secrets with a valid Resend key (current one is rejected with 401), OR set `GMAIL_APP_PASSWORD` (currently empty) to enable the Gmail primary path. Redeploy after. Until then email OTP delivery will keep failing.
- **To verify WhatsApp:** make a real request-otp call with a phone number and re-check logs for `techfest portal OTP whatsapp rejected` / AiSensy campaign "otp" response.
