export const SUGGESTED_ACTIONS = [
  {
    id: 'follow_up',
    title: 'Show me all follow-up leads',
    subtitle: 'Pipeline review & pending tasks',
    iconType: 'users',
    iconSet: 'Feather',
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
    id: 'schedule_meeting',
    title: 'Schedule a demo meeting',
    subtitle: 'Set up presentation with Principal',
    iconType: 'calendar',
    iconSet: 'Feather',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    prompt: 'Schedule a demo meeting with the Principal',
  },
  {
    id: 'my_tasks',
    title: 'Show my tasks & deadlines',
    subtitle: 'Mission Control tasks & approvals',
    iconType: 'check-square',
    iconSet: 'Feather',
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    prompt: 'Show my tasks',
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
    nextActions: ["Schedule Reminders", "Download Pipeline PDF"],
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
      notes: "Lead registered for ABC International High School. Met with Dr. Arvind Mehta (Principal). In discussion for K-12 Agentic AI lab partnership. Demonstration requested.",
    },
    nextActions: ["Add School Lead", "Generate Custom Proposal"],
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
    nextActions: ["Export PDF Proposal", "Edit Price Quote"],
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

  schedule_meeting: {
    text: "📅 Ready to book a demonstration meeting. Which date, time, and meeting type (online/offline) would you like to schedule?",
    nextActions: ["Mark Meeting Done", "Generate Proposal Quote"],
  },
};
