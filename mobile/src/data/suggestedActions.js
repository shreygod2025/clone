export const SUGGESTED_ACTIONS = [
  {
    id: 'follow_up',
    title: 'Show me all follow-up leads',
    subtitle: 'Pipeline review & pending tasks',
    iconType: 'users',
    iconSet: 'FontAwesome5',
    iconBg: '#E6F7F2',
    iconColor: '#0D9488',
    prompt: 'Show me all follow-up leads for Mumbai region',
  },
  {
    id: 'create_lead',
    title: 'Create a new lead for ABC School',
    subtitle: 'Auto-fill Mumbai location & contact',
    iconType: 'plus-circle',
    iconSet: 'Feather',
    iconBg: '#E8F9F1',
    iconColor: '#059669',
    prompt: 'Create a new lead for ABC International School in Mumbai with primary contact details',
  },
  {
    id: 'generate_proposal',
    title: 'Generate a proposal for a school',
    subtitle: 'Draft customized curriculum quote',
    iconType: 'file-text',
    iconSet: 'Feather',
    iconBg: '#EEF2FF',
    iconColor: '#6366F1',
    prompt: 'Generate an AI & Coding curriculum proposal quotation for St. Xavier’s World Academy',
  },
  {
    id: 'active_schools',
    title: 'What are my active schools?',
    subtitle: 'View enrolled campuses & tiers',
    iconType: 'home',
    iconSet: 'Feather',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    prompt: 'List all currently active partner schools, tier status, and student enrollments',
  },
  {
    id: 'send_intro_email',
    title: 'Send introduction email to a school',
    subtitle: 'AI personalized pitch template',
    iconType: 'send',
    iconSet: 'Feather',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    prompt: 'Draft and prepare a personalized introduction email to Principal Dr. Sharma at Delhi Public School, Mumbai',
  },
];

export const MOCK_RESPONSES = {
  follow_up: {
    text: "Here is your current pipeline review for Mumbai Region. You have **4 priority follow-ups** scheduled for today:",
    data: [
      {
        name: "Bombay Scottish School",
        campus: "Mahim, Mumbai",
        stage: "Proposal Sent",
        value: "₹4,80,000",
        task: "Call Vice Principal Mrs. Deshmukh regarding Robotics curriculum batch approval.",
        urgency: "High",
      },
      {
        name: "Podar International School",
        campus: "Powai, Mumbai",
        stage: "MOM Pending",
        value: "₹6,50,000",
        task: "Send revised fee structure for Grades 6-10 AI Foundations track.",
        urgency: "Medium",
      },
      {
        name: "Dhirubhai Ambani Intl School",
        campus: "BKC, Mumbai",
        stage: "Decision Maker Demo",
        value: "₹12,00,000",
        task: "Confirm live demo setup date for STEM coordinator.",
        urgency: "Urgent",
      },
    ],
    nextActions: ["Schedule Reminders", "Draft WhatsApp Update", "Download Pipeline PDF"],
  },

  create_lead: {
    text: "✅ **New Lead Generated Successfully!** I've gathered school intelligence and auto-filled Mumbai zone details:",
    leadCard: {
      schoolName: "ABC International High School",
      board: "CBSE & Cambridge IGCSE",
      location: "Andheri West, Mumbai, MH",
      contactPerson: "Dr. Arvind Mehta (Principal)",
      email: "principal.arvind@abcschoolmumbai.edu.in",
      phone: "+91 98201 44921",
      studentCount: "1,850 Students",
      recommendedProgram: "Agentic AI & Future Skills Lab (K-12)",
      leadScore: "88/100 (High Intent)",
    },
    nextActions: ["Add to Active CRM", "Generate Custom Proposal", "Send Intro WhatsApp"],
  },

  generate_proposal: {
    text: "📄 **Proposal Draft Ready**: Customized Quotation for **St. Xavier’s World Academy** (Academic Year 2026-27)",
    proposal: {
      title: "Comprehensive Agentic AI & STEM Excellence Lab",
      tier: "Platinum Campus Partnership",
      modules: [
        "Agentic AI & Prompt Engineering for Grades 6-10",
        "Python & Robotics Maker Lab",
        "Teacher Training & LMS Accreditation",
      ],
      pricing: "₹5,40,000 / year (Includes 400 student licenses + trainer support)",
      validity: "Valid until Dec 15, 2026",
    },
    nextActions: ["Export PDF Proposal", "Send via WhatsApp", "Edit Price Quote"],
  },

  active_schools: {
    text: "📊 Here are your **Active Enrolled Schools** in the Western Region:",
    schools: [
      { name: "Delhi Public School (Nerul)", tier: "Tier 1 Enterprise", students: 1200, status: "Active" },
      { name: "Ryan International School (Kandivali)", tier: "Tier 2 Standard", students: 850, status: "Active" },
      { name: "Vibgyor High (Goregaon)", tier: "Tier 1 Enterprise", students: 1100, status: "Active" },
      { name: "Billabong High International", tier: "Tier 2 Standard", students: 620, status: "Renewal Due" },
    ],
    nextActions: ["View School LMS Reports", "Schedule Teacher Refreshers", "Request Invoices"],
  },

  send_intro_email: {
    text: "✉️ Here is the **AI-Personalized Introduction Pitch** prepared for Dr. Sharma at Delhi Public School:",
    email: {
      subject: "Empowering DPS Mumbai Students with Hands-On Agentic AI & STEM (K-12 Collaboration)",
      recipient: "dr.sharma@dpsmumbai.org",
      body: "Respected Dr. Sharma,\n\nI hope this email finds you well. As Delhi Public School continues to lead the benchmark in academic distinction in Mumbai, we would love to collaborate on bringing cutting-edge Agentic AI, Coding, and Future Skills labs to your students for the upcoming term.\n\nOur NEP-aligned curriculum has already empowered 25,000+ students across top campuses in Maharashtra with 100% project-based learning.\n\nWould you be open for a brief 10-minute briefing or campus demonstration next Tuesday at 11:30 AM?\n\nWarm regards,\nOLL CRM Partnerships Team",
    },
    nextActions: ["Send Email Directly", "Copy to Clipboard", "Customize Tone"],
  },
};
