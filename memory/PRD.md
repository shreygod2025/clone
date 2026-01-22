# OLL - Skill Education Platform PRD

## Latest Changes (Jan 2026)

### Admin Educators Section Reorganization ✅
**Changed Status Flow:**
- `new` → New Applications
- `demo_scheduled` → Demo Scheduled  
- `onboarding` → Onboarding (previously "demo_completed")
- `active` → Active Educators (previously "onboarded")
- `archived` → Archived

**Onboarding Section Features:**
- **Inline Progress Overview** - Shows when "Onboarding" tab is selected
- **Direct Onboard button** - Only visible in Onboarding section
- **Progress cards** for each educator showing:
  - Completion percentage and steps (e.g., "25% - 2/8 steps")
  - "Docs Verified" or "Docs Pending" status
  - "View Details" button

**Document Verification:**
- Admin can view uploaded documents (Profile Photo, Aadhar, PAN, Bank)
- Verify/Reject documents with optional notes
- Educators can only be activated after document verification
- API: `POST /api/admin/educators/{id}/verify-documents`

### Educator Onboarding Fixes ✅
**Bug Fixes:**
- ✅ Fixed file upload endpoint (was `/upload-file`, now `/upload`)
- ✅ Fixed file path response (was `file_path`, now `url`)
- ✅ Made Aadhar Card upload mandatory (red border, "Required" text)
- ✅ Step 3 validation now requires Aadhar document

**Status Redirect Logic:**
- Educators with `onboarding` OR `onboarded` status → Check onboarding completion
- If onboarding not completed → Redirect to `/educator-onboarding`
- If onboarding completed → Show dashboard

---

### Educator Onboarding System - Complete ✅
**URL:** `/educator-onboarding`

**8-Step Flow:**
1. Welcome Video
2. Profile (photo, bio)
3. Personal Details (T-shirt, address, emergency contact, Aadhar*, PAN)
4. Bank Details
5. Contract Signing
6. Training Videos + Quiz (70% pass)
7. Curriculum + Assessment (70% pass)
8. Complete (ID Card, Certificate)

**Admin Features:**
- View onboarding progress inline in Onboarding section
- Direct onboard educators (skip selection)
- Verify documents before activation
- "Activate" button only works after document verification

---

## Status Flow
```
NEW → DEMO_SCHEDULED → ONBOARDING → ACTIVE → (ARCHIVED)
                                ↓
                        Document Verification Required
```

---

## Completed Features

| Feature | Status |
|---------|--------|
| Admin Onboarding Section | ✅ |
| Document Verification | ✅ |
| File Upload Fix | ✅ |
| Aadhar Mandatory | ✅ |
| Status Rename (onboarded→active) | ✅ |
| Inline Progress View | ✅ |

---

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Educator (in onboarding):** 7777777777 (OTP: 1111)
- **Test OTP:** 1111

## Key URLs
- Admin Educators: /admin/educators (click "Onboarding" tab)
- Educator Onboarding: /educator-onboarding

## ⚠️ MOCKED
- Training videos are placeholder YouTube embeds
- ID Card/Certificate generation (placeholder buttons)
