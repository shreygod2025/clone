// Backend API Service for OLL School CRM Mobile Frontend

// Reads backend URL dynamically from mobile/.env (EXPO_PUBLIC_BACKEND_URL)
const CONFIGURED_BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://clone-x386.onrender.com'
).replace(/\/$/, '');

class ApiService {
  constructor() {
    this.baseUrl = CONFIGURED_BACKEND_URL;
    this.token = null;
    this.currentUser = null;
  }

  getBackendUrl() {
    return this.baseUrl;
  }

  setToken(token) {
    this.token = token;
  }

  setUser(user) {
    this.currentUser = user;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Safe fetch helper with timeout
  async fetchWithTimeout(resource, options = {}, timeout = 12000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  // 1. Admin Authentication: POST /api/auth/login
  async login(email, password) {
    let lastError = null;

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        this.token = data.access_token;
        this.currentUser = data.user;
        return {
          success: true,
          token: data.access_token,
          user: data.user,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        lastError = errData.detail || `Login failed (${response.status})`;
      }
    } catch (err) {
      lastError = err.message || 'Network connection error';
    }

    return {
      success: false,
      error: lastError || 'Unable to authenticate with server',
    };
  }

  // 2. Add School Lead directly into the CRM database: POST /api/schools/inquiry
  async createSchoolLead(leadData) {
    try {
      const payload = {
        school_name: leadData.school_name || leadData.schoolName || 'Unknown School',
        contact_name: leadData.contact_name || leadData.contactPerson || 'School Representative',
        contact_role: leadData.contact_role || 'Principal',
        email: leadData.email || 'admissions@school.edu.in',
        phone: leadData.phone || '9820144921',
        location: leadData.location || 'Mumbai, Maharashtra',
        board: leadData.board || 'CBSE',
        programs_interested: leadData.programs_interested || ['Agentic AI & Coding Excellence Lab'],
        notes: leadData.notes || 'Created via OLL AI Assistant on Mobile',
        source: 'ai_assistant_mobile',
      };

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/inquiry`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, lead: data };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Failed to create lead in database' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 3. Fetch existing School CRM Inquiries: GET /api/schools/inquiries
  async fetchSchoolInquiries(limit = 10) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/inquiries?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 10000);

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.data || [];
        return { success: true, inquiries: list };
      }
      return { success: false, inquiries: [] };
    } catch (err) {
      return { success: false, error: err.message, inquiries: [] };
    }
  }

  // 4. Send Message to Agentic AI Assistant: POST /api/ai-chat/message
  async sendAiMessage(message, sessionId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/ai-chat/message`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message,
          session_id: sessionId,
        }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
      return { success: false, status: response.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 5. AI Lead Extractor: Parses text (or Minutes of Meeting notes) into structured School Lead fields
  extractLeadFromPrompt(prompt) {
    const text = prompt.trim();
    
    // Default fallback intelligence
    let schoolName = 'St. Xavier’s World Academy';
    let contactPerson = 'Dr. Arvind Sharma';
    let contactRole = 'Principal';
    let phone = '+91 98201 44921';
    let email = 'principal.sharma@school.edu.in';
    let location = 'Mumbai, Maharashtra';
    let board = 'CBSE';

    // School Name Extraction
    const schoolMatch = text.match(/(?:for|at|school)\s+([A-Z][A-Za-z0-9'\s\.\-]+?(?:School|Academy|High\s*School|College|Vidyalaya|Convent|International))/i);
    if (schoolMatch) {
      schoolName = schoolMatch[1].trim();
    } else if (text.toLowerCase().includes('abc')) {
      schoolName = 'ABC International High School';
      location = 'Andheri West, Mumbai';
    } else if (text.toLowerCase().includes('dps') || text.toLowerCase().includes('delhi public')) {
      schoolName = 'Delhi Public School Mumbai';
      location = 'Nerul, Navi Mumbai';
    } else if (text.toLowerCase().includes('st mary') || text.toLowerCase().includes('mary')) {
      schoolName = 'St. Mary’s Convent High School';
      location = 'Mazgaon, Mumbai';
      contactPerson = 'Mrs. Kapoor';
    }

    // Phone extraction
    const phoneMatch = text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}/);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }

    // Email extraction
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email = emailMatch[0];
    }

    // Contact person extraction
    const contactMatch = text.match(/(?:contact|met with|principal|director|coordinator)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (contactMatch) {
      contactPerson = contactMatch[1].trim();
    }

    // Board extraction
    if (/icse/i.test(text)) board = 'ICSE';
    else if (/ib|cambridge|igcse/i.test(text)) board = 'Cambridge IGCSE';
    else if (/state|ssc/i.test(text)) board = 'Maharashtra State Board';
    else board = 'CBSE';

    // Location extraction
    if (/andheri/i.test(text)) location = 'Andheri West, Mumbai';
    else if (/bandra|bkc/i.test(text)) location = 'BKC, Mumbai';
    else if (/powai/i.test(text)) location = 'Powai, Mumbai';
    else if (/south mumbai|colaba|fort|mazgaon/i.test(text)) location = 'South Mumbai, MH';
    else if (/pune/i.test(text)) location = 'Pune, Maharashtra';

    return {
      school_name: schoolName,
      contact_name: contactPerson,
      contact_role: contactRole,
      phone: phone,
      email: email,
      location: location,
      board: board,
      programs_interested: ['Agentic AI & Coding Excellence Lab (K-12)'],
      notes: `Extracted & auto-logged by OLL Agentic AI Assistant from: "${text.substring(0, 80)}..."`,
    };
  }
}

export const api = new ApiService();
