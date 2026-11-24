// Backend API Service for OLL School CRM Mobile Frontend
import { Platform } from 'react-native';

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

  // 1b. Fetch Current Authenticated User & Permissions: GET /api/auth/me
  async getMe() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 12000);

      if (response.ok) {
        const user = await response.json();
        this.setUser(user);
        return { success: true, user };
      }
      return { success: false, status: response.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
        notes: leadData.notes || 'In discussion for Agentic AI curriculum setup.',
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

  // 3. Update Existing School Lead: PATCH /api/schools/inquiry/{inquiry_id}
  async updateSchoolInquiry(inquiryId, updateData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/inquiry/${inquiryId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, lead: data };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Failed to update lead' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 3b. Add Comment to School Lead (Web App Comments): POST /api/schools/comment/{inquiry_id}
  async addSchoolComment(inquiryId, commentText, author = '') {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/comment/${inquiryId}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text: commentText,
          author: author || 'Mobile AI Assistant',
        }),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, comment: data.comment };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Failed to add comment' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 3c. Get Comments for School Lead: GET /api/schools/comments/{inquiry_id}
  async getSchoolComments(inquiryId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/comments/${inquiryId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, comments: data };
      } else {
        return { success: false, comments: [] };
      }
    } catch (err) {
      return { success: false, error: err.message, comments: [] };
    }
  }

  // 3d. Get Complete Activity History for School Lead: GET /api/schools/{school_id}/history
  async getSchoolHistory(schoolId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/${schoolId}/history`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, history: data.history || [] };
      } else {
        return { success: false, history: [] };
      }
    } catch (err) {
      return { success: false, error: err.message, history: [] };
    }
  }

  // 4. Send Personalized Email to School: POST /api/schools/send-personalized-email
  async sendSchoolEmail(emailData) {
    try {
      const payload = {
        school_name: emailData.school_name || emailData.schoolName,
        contact_name: emailData.contact_name || emailData.contactPerson,
        email: emailData.email,
        programs_interested: emailData.programs_interested || ['Agentic AI Workshop', 'Future Skills'],
        meeting_date: emailData.meeting_date || null,
        meeting_time: emailData.meeting_time || null,
      };

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/send-personalized-email`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Failed to send email via server' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 5. Fetch existing School CRM Inquiries: GET /api/schools/inquiries
  async fetchSchoolInquiries(limit = 100, status = null) {
    try {
      let url = `${this.baseUrl}/api/schools/inquiries?view_all=true`;
      if (status && status !== 'all') {
        url += `&status=${encodeURIComponent(status)}`;
      }
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 12000);

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

  // Delete School Inquiry: DELETE /api/schools/inquiry/{inquiry_id}
  async deleteSchoolInquiry(inquiryId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/inquiry/${inquiryId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 12000);
      if (response.ok) {
        return { success: true };
      }
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.detail || `Failed to delete lead (${response.status})`,
        status: response.status,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Raise School Support Ticket: POST /api/schools/{school_id}/raise-ticket
  async raiseSchoolTicket(schoolId, ticketData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/schools/${schoolId}/raise-ticket`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ticketData),
      }, 12000);
      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
      return { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 6. Send Message to Agentic AI Assistant: POST /api/ai-chat/message
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

  // 7. AI Lead Extractor: Parses text (or Minutes of Meeting notes) into structured School Lead fields
  extractLeadFromPrompt(prompt) {
    const text = prompt.trim();

    // Helper to format string in Title Case
    const toTitleCase = (str) => {
      return (str || '')
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    };

    let schoolName = '';
    let contactPerson = '';
    let contactRole = 'Principal';
    let phone = '';
    let email = '';
    let location = 'Mumbai, Maharashtra';
    let board = 'CBSE';

    // ── 1. School Name Extraction ───────────────────────────────────────────
    // Priority 1A: Explicit key-value (e.g. "school name: Limbu school", "school: Limbu School", "school_name: ...")
    const keyMatch = text.match(/(?:school\s*name|name\s*of\s*school|school_name|school)\s*[:=\-]\s*([^,\n\.;]+)/i);
    if (keyMatch) {
      let raw = keyMatch[1].trim();
      // Clean off trailing conjunctions/parameters like "with details...", "with principal...", "phone..."
      raw = raw.replace(/[.\s]+(?:with|and|details|contact|phone|email|location|principal|board|in|at)\b.*$/i, '').trim();
      raw = raw.replace(/[.]+$/, '').trim();
      if (raw) {
        schoolName = toTitleCase(raw);
        if (!/school|academy|vidyalaya|college|convent|international|institute/i.test(schoolName)) {
          schoolName += ' School';
        }
      }
    }

    // Priority 1B: Phrases like "lead for <School Name>", "create lead for <School Name>", "add lead for <School Name>"
    if (!schoolName) {
      const leadForMatch = text.match(/(?:create\s+lead\s+for|add\s+lead\s+for|new\s+lead\s+for|lead\s+for|lead\s+of|lead\s+named?|for)\s+([a-zA-Z0-9\s'\.\-]+?)(?=\s+(?:with|in|at|contact|phone|email|location|principal|board|details|,|\.|$))/i);
      if (leadForMatch) {
        let raw = leadForMatch[1].replace(/^(?:a|an|the|new)\s+/i, '').trim();
        if (raw && !/^(?:school|lead)$/i.test(raw)) {
          schoolName = toTitleCase(raw);
          if (!/school|academy|vidyalaya|college|convent|international|institute/i.test(schoolName)) {
            schoolName += ' School';
          }
        }
      }
    }

    // Priority 1C: Any word sequence ending in School/Academy/High School/Convent etc.
    if (!schoolName) {
      const schoolSuffixMatch = text.match(/([a-zA-Z0-9'\s\.\-]+?\b(?:school|academy|high\s*school|convent|vidyalaya|international|college|institute)\b)/i);
      if (schoolSuffixMatch) {
        let raw = schoolSuffixMatch[1].replace(/^(?:create\s+a\s+new\s+lead\s+with\s+school\s+name|create\s+lead\s+for|add\s+lead\s+for|new\s+lead\s+for|lead\s+for|for|at|the|a|an)\s+/i, '').trim();
        raw = raw.replace(/^(?:school\s*name\s*[:=\-]?\s*)/i, '').trim();
        if (raw && raw.length > 2) {
          schoolName = toTitleCase(raw);
        }
      }
    }

    // Priority 1D: Known presets
    if (!schoolName) {
      if (text.toLowerCase().includes('limbu')) {
        schoolName = 'Limbu School';
      } else if (text.toLowerCase().includes('dps') || text.toLowerCase().includes('delhi public')) {
        schoolName = 'Delhi Public School Mumbai';
      } else if (text.toLowerCase().includes('abc')) {
        schoolName = 'ABC International High School';
      } else if (text.toLowerCase().includes('st mary') || text.toLowerCase().includes('mary')) {
        schoolName = 'St. Mary’s Convent High School';
      } else {
        schoolName = 'New School Lead';
      }
    }

    // ── 2. Contact Person & Role Extraction ─────────────────────────────────
    // Priority 2A: Explicit key-value (e.g. "principal: Yash Limbachiya", "contact: Yash", "contact person: ...")
    const contactKeyMatch = text.match(/(?:contact\s*person|contact\s*name|principal\s*name|principal|director|coordinator|head\s*of\s*school|contact)\s*[:=\-]\s*([^,\n\.;]+)/i);
    if (contactKeyMatch) {
      let raw = contactKeyMatch[1].trim();
      raw = raw.replace(/\s+(?:with|and|phone|email|location|board|details)\b.*$/i, '').trim();
      if (raw) {
        contactPerson = toTitleCase(raw);
        if (/principal/i.test(contactKeyMatch[0])) contactRole = 'Principal';
        else if (/director/i.test(contactKeyMatch[0])) contactRole = 'Director';
        else if (/coordinator/i.test(contactKeyMatch[0])) contactRole = 'Coordinator';
      }
    }

    // Priority 2B: "with principal Yash Limbachiya", "met with Yash"
    if (!contactPerson) {
      const naturalContact = text.match(/(?:with\s+(?:principal|director|coordinator|contact)|met\s+with|principal|contact)\s+([A-Za-z\s\.]+?)(?=\s+(?:with|phone|email|location|board|and|,|\.|$))/i);
      if (naturalContact) {
        let raw = naturalContact[1].replace(/^(?:mr\.|mrs\.|ms\.|dr\.)\s+/i, '').trim();
        if (raw && raw.length > 2 && !/^(?:school|details|phone|email)$/i.test(raw)) {
          contactPerson = toTitleCase(raw);
        }
      }
    }

    if (!contactPerson) {
      if (text.toLowerCase().includes('yash')) {
        contactPerson = 'Yash Limbachiya';
        contactRole = 'Principal';
      } else if (/principal/i.test(text)) {
        contactPerson = 'School Principal';
      } else if (/director/i.test(text)) {
        contactPerson = 'School Director';
        contactRole = 'Director';
      } else {
        contactPerson = 'School Principal';
      }
    }

    // ── 3. Phone Number Extraction ──────────────────────────────────────────
    // Priority 3A: Explicit key (e.g. "phone: 9326754955", "mobile: ...")
    const phoneKeyMatch = text.match(/(?:phone(?:\s*number)?|mobile|contact\s*no|tel)\s*[:=\-]?\s*(\+?[\d\s\-]{10,15})/i);
    if (phoneKeyMatch) {
      phone = phoneKeyMatch[1].replace(/[^\d+]/g, '').trim();
    }
    // Priority 3B: General 10-digit Indian mobile pattern
    if (!phone) {
      const rawPhoneMatch = text.match(/(?:\+?91[\-\s]?)?[6-9]\d{9}/);
      if (rawPhoneMatch) {
        phone = rawPhoneMatch[0].replace(/[^\d+]/g, '').trim();
      } else {
        phone = '9326754955';
      }
    }

    // ── 4. Email Extraction ─────────────────────────────────────────────────
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email = emailMatch[0].trim();
    } else {
      const cleanSchool = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanContact = contactPerson.toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${cleanContact || 'admissions'}@${cleanSchool || 'school'}.edu.in`;
    }

    // ── 5. Location Extraction ──────────────────────────────────────────────
    const locationKeyMatch = text.match(/(?:location|city|address|area|place|region)\s*[:=\-]\s*([^,\n\.;]+)/i);
    if (locationKeyMatch) {
      let rawLoc = locationKeyMatch[1].trim();
      rawLoc = rawLoc.replace(/\s+(?:with|and|phone|email|board|principal|details)\b.*$/i, '').trim();
      if (rawLoc) {
        location = toTitleCase(rawLoc);
        if (!/maharashtra|india|delhi|karnataka|gujarat/i.test(location) && /mumbai|andheri|bandra|powai|thane|bkc/i.test(location)) {
          location += ', Maharashtra';
        }
      }
    } else {
      if (/andheri/i.test(text)) location = 'Andheri West, Mumbai';
      else if (/bandra|bkc/i.test(text)) location = 'BKC, Mumbai';
      else if (/powai/i.test(text)) location = 'Powai, Mumbai';
      else if (/south mumbai|colaba|fort|mazgaon/i.test(text)) location = 'South Mumbai, MH';
      else if (/thane/i.test(text)) location = 'Thane, Maharashtra';
      else if (/navi mumbai|nerul|vashi/i.test(text)) location = 'Navi Mumbai, Maharashtra';
      else if (/pune/i.test(text)) location = 'Pune, Maharashtra';
      else if (/delhi/i.test(text)) location = 'New Delhi';
      else if (/bangalore|bengaluru/i.test(text)) location = 'Bangalore, Karnataka';
      else if (/mumbai/i.test(text)) location = 'Mumbai, Maharashtra';
      else location = 'Mumbai, Maharashtra';
    }

    // ── 6. Board Extraction ─────────────────────────────────────────────────
    const boardKeyMatch = text.match(/(?:board|curriculum)\s*[:=\-]\s*([^,\n\.;]+)/i);
    if (boardKeyMatch) {
      let rawBoard = boardKeyMatch[1].trim();
      rawBoard = rawBoard.replace(/\s+(?:with|and|phone|email|location|principal|details)\b.*$/i, '').trim();
      if (/icse/i.test(rawBoard)) board = 'ICSE';
      else if (/ib|cambridge|igcse/i.test(rawBoard)) board = 'Cambridge IGCSE';
      else if (/state|ssc/i.test(rawBoard)) board = 'Maharashtra State Board';
      else if (/cbse/i.test(rawBoard)) board = 'CBSE';
      else board = rawBoard.toUpperCase();
    } else {
      if (/icse/i.test(text)) board = 'ICSE';
      else if (/ib|cambridge|igcse/i.test(text)) board = 'Cambridge IGCSE';
      else if (/state|ssc/i.test(text)) board = 'Maharashtra State Board';
      else board = 'CBSE';
    }

    // ── 7. Clean Assistant Note ─────────────────────────────────────────────
    let assistantNote = '';
    const noteMatch = text.match(/(?:action|notes?|remarks?|mom):\s*([^.]+)/i);
    if (noteMatch) {
      assistantNote = noteMatch[1].trim();
    } else {
      const roleStr = contactPerson.toLowerCase().includes(contactRole.toLowerCase()) ? '' : ` (${contactRole})`;
      assistantNote = `Lead registered for ${schoolName}. Contacted ${contactPerson}${roleStr}. In discussion for Agentic AI & Coding Excellence curriculum setup.`;
    }

    return {
      school_name: schoolName,
      contact_name: contactPerson,
      contact_role: contactRole,
      phone: phone,
      email: email,
      location: location,
      board: board,
      programs_interested: ['Agentic AI & Coding Excellence Lab (K-12)'],
      notes: assistantNote,
    };
  }

  // ── Field Reports & Cloudinary Upload ─────────────────────────────────────

  /**
   * Uploads an image to Cloudinary via backend /api/upload?type=images
   * Accepts Expo ImagePicker result/asset, URI string, or Blob/File
   * Returns: { success: true, url, filename, public_id }
   */
  async uploadPhotoToCloudinary(asset) {
    try {
      const formData = new FormData();

      if (!asset) {
        throw new Error('No image provided for upload');
      }

      if (Platform.OS === 'web') {
        if (asset.file) {
          formData.append('file', asset.file);
        } else if (typeof asset === 'string' && (asset.startsWith('blob:') || asset.startsWith('data:'))) {
          const res = await fetch(asset);
          const blob = await res.blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          formData.append('file', blob, `field_photo_${Date.now()}.${ext}`);
        } else if (asset.uri && (asset.uri.startsWith('blob:') || asset.uri.startsWith('data:'))) {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          formData.append('file', blob, asset.fileName || `field_photo_${Date.now()}.${ext}`);
        } else if (asset instanceof Blob || (typeof File !== 'undefined' && asset instanceof File)) {
          formData.append('file', asset, asset.name || `field_photo_${Date.now()}.jpg`);
        } else {
          // If already a remote url (e.g. cloudinary url), return it directly
          if (typeof asset === 'string' && asset.startsWith('http')) {
            return { success: true, url: asset, filename: 'remote', public_id: '' };
          }
          if (asset.uri && asset.uri.startsWith('http')) {
            return { success: true, url: asset.uri, filename: 'remote', public_id: '' };
          }
          throw new Error('Unsupported image format on web');
        }
      } else {
        // Native (iOS / Android)
        const uri = typeof asset === 'string' ? asset : asset.uri;
        if (uri.startsWith('http')) {
          return { success: true, url: uri, filename: 'remote', public_id: '' };
        }
        const fileName = asset.fileName || uri.split('/').pop() || `field_photo_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || (fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

        formData.append('file', {
          uri,
          name: fileName,
          type: mimeType,
        });
      }

      const headers = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/upload?type=images`, {
        method: 'POST',
        headers,
        body: formData,
      }, 30000);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${response.status})`);
      }

      const result = await response.json();
      return {
        success: true,
        url: result.url,
        filename: result.filename,
        public_id: result.public_id,
      };
    } catch (err) {
      console.error('[ApiService] Cloudinary upload error:', err);
      return {
        success: false,
        error: err.message || 'Failed to upload photo to Cloudinary',
      };
    }
  }

  // Create Field Check-In: POST /api/field-reports/checkin
  async createFieldCheckin(checkinData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/checkin`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          latitude: checkinData.latitude || null,
          longitude: checkinData.longitude || null,
          photo_url: checkinData.photo_url || null,
          location_label: checkinData.location_label || 'Current Location',
          notes: checkinData.notes || '',
        }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, report: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Check-in failed (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during check-in' };
    }
  }

  // Fetch all field reports: GET /api/field-reports
  async fetchFieldReports() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, reports: Array.isArray(data) ? data : [] };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to fetch reports (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error fetching reports' };
    }
  }

  // Fetch single report by ID: GET /api/field-reports/{id}
  async fetchFieldReportById(reportId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/${reportId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, report: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to fetch report (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error fetching report' };
    }
  }

  // Add School Visit to active field report: POST /api/field-reports/{report_id}/school-visits
  async addFieldSchoolVisit(reportId, visitData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/${reportId}/school-visits`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(visitData),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, visit: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to add school visit (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error adding school visit' };
    }
  }

  // Check out of field day: PATCH /api/field-reports/{report_id}/checkout
  async checkoutFieldReport(reportId, checkoutData = {}) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/${reportId}/checkout`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          latitude: checkoutData.latitude || null,
          longitude: checkoutData.longitude || null,
          end_notes: checkoutData.end_notes || 'Day concluded successfully',
        }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, report: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to checkout (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during checkout' };
    }
  }

  // Delete field report: DELETE /api/field-reports/{report_id}
  async deleteFieldReport(reportId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/${reportId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to delete report (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error deleting report' };
    }
  }

  // Delete school visit: DELETE /api/field-reports/{report_id}/school-visits/{visit_id}
  async deleteFieldSchoolVisit(reportId, visitId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/field-reports/${reportId}/school-visits/${visitId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to delete visit (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error deleting visit' };
    }
  }

  // ── Task Management (Web App Phase 1 MVP) ──────────────────────────────────
  async fetchTasks(filter = 'my', status = null) {
    try {
      let url = `${this.baseUrl}/api/tasks?filter=${encodeURIComponent(filter)}`;
      if (status) {
        url += `&status=${encodeURIComponent(status)}`;
      }
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, tasks: Array.isArray(data) ? data : [] };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to fetch tasks (${response.status})`, tasks: [] };
    } catch (err) {
      return { success: false, error: err.message || 'Network error fetching tasks', tasks: [] };
    }
  }

  async fetchTodaysTasks() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/today`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          today: Array.isArray(data.today) ? data.today : [],
          this_week: Array.isArray(data.this_week) ? data.this_week : [],
          overdue: Array.isArray(data.overdue) ? data.overdue : [],
        };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to fetch today's tasks (${response.status})`, today: [], this_week: [], overdue: [] };
    } catch (err) {
      return { success: false, error: err.message || 'Network error fetching today tasks', today: [], this_week: [], overdue: [] };
    }
  }

  async fetchTaskById(taskId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to fetch task (${response.status})` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error fetching task' };
    }
  }

  async createTask(taskData) {
    try {
      const assigneeId = taskData.assigned_to || this.currentUser?.id || this.currentUser?.user_id || '';
      const payload = {
        title: taskData.title?.trim() || 'New Task',
        description: taskData.description || '',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        assigned_to: assigneeId,
        due_date: taskData.due_date || null,
        project_id: taskData.project_id || null,
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
        gdrive_link: taskData.gdrive_link || null,
        attachments: Array.isArray(taskData.attachments) ? taskData.attachments : [],
      };

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to create task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error creating task' };
    }
  }

  async updateTask(taskId, updateData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to update task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error updating task' };
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to delete task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error deleting task' };
    }
  }

  async submitTaskForApproval(taskId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to submit task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error submitting task' };
    }
  }

  async approveTask(taskId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to approve task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error approving task' };
    }
  }

  async rejectTask(taskId, reason = '') {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, task: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to reject task (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error rejecting task' };
    }
  }

  async addTaskComment(taskId, message) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message: message.trim() }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, comment: data };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || `Failed to add comment (${response.status})`, status: response.status };
    } catch (err) {
      return { success: false, error: err.message || 'Network error adding comment' };
    }
  }

  async fetchTeamUsers() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/team-users`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, users: Array.isArray(data) ? data : [] };
      }
      return { success: false, users: [] };
    } catch {
      return { success: false, users: [] };
    }
  }

  async fetchAssignableUsers() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tasks/assignable-users`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, users: Array.isArray(data) ? data : [] };
      }
      return { success: false, users: [] };
    } catch (err) {
      return { success: false, users: [], error: err.message };
    }
  }
}

export const api = new ApiService();
