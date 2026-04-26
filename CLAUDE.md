# CLAUDE.md -- Agentic Coding Operating Manual
_Last updated: 2026-04-27_

---

# 1) What this file is for

This file defines how Claude should operate in this repository so the output stays:
- clean
- safe
- reviewable
- production-minded
- consistent with the repo

---

# 2) Core operating rules

## Do this
- Explore first, then plan, then code.
- Prefer small, reviewable diffs.
- Reuse existing repo patterns before creating new abstractions.
- Preserve behavior during refactors unless the task explicitly changes behavior.
- Run the appropriate checks before considering work complete.
- Be explicit about assumptions and uncertainty.
- If something is unclear from the repo, ask a focused question instead of guessing.

## Do NOT do this
- Do not use subagents unless explicitly asked.
- Do not launch background agents or fan out across repos automatically.
- Do not switch branches unless explicitly asked.
- Do not modify secrets, credentials, runtime config, or infra auth unless explicitly approved.
- Do not overwrite existing config blindly.
- Do not make architecture changes without explaining the tradeoff first.
- Do not pretend external integrations are configured if they still need manual auth or approval.

---

# 3) Session rules

- Work in **this repo only**.
- Do **not** inspect sibling repos automatically.
- Do **not** use helper agents/subagents/background tasks unless asked.
- If something in another repo matters, tell me first.

At the start of any non-trivial task, state:
- repo name
- current branch
- what checks will be run

---

# 4) Quality gates

## For this Python backend
- `cd backend && source venv/bin/activate`
- `python -c "import server"` (import check)
- `uvicorn server:app --port 8000` (startup check)
- `curl http://localhost:8000/api/health` (health check)

## For this React frontend
- `cd frontend && npm start` (dev server)
- `npm run build` (production build check)

---

# 5) Code quality rules

The code should avoid:
- `any` unless explicitly justified
- swallowed exceptions
- dead code
- hardcoded secrets or Emergent URLs
- magic strings/constants where they should be centralized
- inconsistent patterns across similar files

The code should favor:
- explicit error handling
- predictable naming
- separation of concerns
- reuse of existing patterns
- env vars for all external URLs and API keys

---

# 6) Security and secret handling rules

Do not:
- commit .env files or API keys to git
- rotate credentials without approval
- modify secret storage without approval

---

# 7) Branch and Git rules

Do not:
- switch branches
- rebase
- merge
- stash
- clean untracked files

unless explicitly asked.

---

# 8) THINGS TO NEVER DO (project-specific)

- Never modify the eventmate-19 production data exports -- they're the source of truth
- Never hardcode Emergent URLs -- always use env vars
- Never commit .env files or API keys to git
- Never deploy directly to production -- always test at staging URL first
- Never delete the Emergent projects until 2+ weeks after successful cutover

---

# 9) Project-specific section

## What this project is
OLL (Omni Learning Labs) -- skill education platform for schools in India.
Migrating off Emergent (managed AI hosting) to self-hosted: Railway + Vercel + Atlas + R2.

## Stack
- Backend: FastAPI, Python 3.11, MongoDB (motor), uvicorn
- Frontend: React 19, CRA via craco, react-router 7.5
- Database: MongoDB (local for dev, Atlas for prod)
- Payments: Cashfree
- Email: Resend
- Images: Cloudinary
- WhatsApp: AiSensy
- LLM: Anthropic (Claude) -- replaced emergentintegrations

## Commands
```bash
# Backend
cd backend && source venv/bin/activate && uvicorn server:app --reload --port 8000

# Frontend
cd frontend && npm start

# MongoDB
mongosh "mongodb://localhost:27017/oll_production"
```

## Critical areas
- `backend/server.py` -- 14,796 lines, main routes + logic
- `backend/routes/payments.py` -- Cashfree payment sync
- `backend/routes/ai_chat.py` -- AI sales assistant
- `frontend/src/App.js` -- 47 public + 29 admin routes

## External systems
- GitHub: shreygod2025/clone
- Cloudflare: DNS for oll.co
- Cashfree: payment gateway
- Resend: transactional email
- Cloudinary: image hosting

## Non-negotiables
- Payment data integrity (5,500+ payment records)
- Admin auth must work after migration
- No data loss during cutover

## Deployment / rollout cautions
- Test at staging URL before any DNS changes
- Keep Emergent running 2+ weeks after cutover
- Monitor for 48 hours post-cutover
