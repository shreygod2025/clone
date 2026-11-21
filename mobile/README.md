# OLL CRM AI Mobile Frontend (React Native & Expo)

A mobile frontend application for **OLL CRM AI Assistant**, built with **React Native** and **Expo**.

## ✨ Features

- **Pixel-Perfect AI Chat Landing Page**:
  - Forest Emerald Header (`#063D2E`) with OLL stylized badge, GPT-5 pill, and animated glowing "Agentic AI Live" status dot.
  - "+ New Chat" button and user avatar ("YL").
  - Quick action bar with "Connect WhatsApp" and "Mumbai Region" indicator.
  - Centered glowing AI assistant gradient squircle with animated floating effect.
  - "SUGGESTED ACTIONS" & "⚡ Tap to run" header.
  - 5 interactive suggested action cards with custom tinted icon boxes and external link icons:
    1. *Show me all follow-up leads* (Pipeline review & pending tasks)
    2. *Create a new lead for ABC School* (Auto-fill Mumbai location & contact)
    3. *Generate a proposal for a school* (Draft customized curriculum quote)
    4. *What are my active schools?* (View enrolled campuses & tiers)
    5. *Send introduction email to a school* (AI personalized pitch template)
  - Pro Tip banner with sample Minutes of Meeting (MOM) auto-fill.
  - Floating bottom chat pill with attachment, voice dictation toggle, and up-arrow send button.

- **Interactive Agentic AI Conversation Flow**:
  - Tap any suggested action card or type custom prompts/MOM notes to experience realistic streaming Agentic responses.
  - Displays rich CRM UI components: School Lead details, Priority Follow-Up pipeline cards, Curriculum Proposal quotations, Active Schools lists, and Email drafts.
  - Animated bouncing typing indicator dots.
  - Tap "+ New Chat" at any time to reset back to the suggestions landing page.

- **Animated Coming Soon Screen**:
  - For "Dashboard", "My Space", and "Schools" tabs in the bottom navigation.
  - Features smooth looping pulse and floating glowing badges, tab-specific details, "Notify When Live" reminder button, and a quick "Return to AI Chat" button.

- **Bottom Navigation Bar**:
  - 4 tabs: Dashboard, AI Chat (active with green indicator dot), My Space, and Schools.

---

## 🚀 How to Run

Navigate into the `mobile` folder:

```bash
cd mobile
```

### 1. Run in Web Browser
```bash
npm run web
```
*Or:*
```bash
npx expo start --web
```

### 2. Run on Physical Phone (iOS / Android)
```bash
npm start
```
Scan the displayed QR code using:
- **Expo Go** app on Android
- **Camera** app on iOS (with Expo Go installed)
