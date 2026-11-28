import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Users, Phone, Video, Calendar, Clock, CheckCircle2,
  AlertCircle, Search, Filter, Plus, ChevronRight, UserCheck,
  UserPlus, MessageSquare, BarChart3, ArrowUpDown, RefreshCw,
  ExternalLink, Eye, Check, X, Shield, Star, Award, TrendingUp,
  MapPin, Mail, Briefcase, FileText, ChevronDown, Send, ArrowRight,
  Edit, Trash2, CalendarClock, Upload, Download, School, Layers, CheckSquare
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = [
  { value: 'all',            label: 'All Stages',      color: 'bg-slate-100 text-slate-700' },
  { value: 'new',            label: 'New / Fresh',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'contacted',      label: 'Contacted',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'call_scheduled', label: 'Call Scheduled',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'demo_scheduled', label: 'Demo Scheduled',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'demo_completed', label: 'Demo Done',       color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'follow_up',      label: 'Follow-up',       color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'converted',      label: 'Converted (Won)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'lost',           label: 'Lost / Closed',   color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge / IGCSE', 'Other'];
const ROLES = ['Principal', 'Director / Trustee', 'Vice Principal', 'Academic Coordinator', 'Computer / STEM Teacher', 'Admin / Manager', 'Other'];

export default function AdminB2BCRM() {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isManager = isAdmin || Boolean(user?.is_manager);

  // Active view: 'pipeline' | 'tracksheet'
  const [activeTab, setActiveTab] = useState('pipeline');

  // Leads list state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');

  // Multi-select for bulk assign
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Eligible assignees (B2B, Telecallers, BDEs, Managers)
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Tracksheet state
  const [tracksheetData, setTracksheetData] = useState(null);
  const [tracksheetLoading, setTracksheetLoading] = useState(false);
  const [trackDateFilter, setTrackDateFilter] = useState('month'); // today | week | month | custom
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trackUserFilter, setTrackUserFilter] = useState('all');

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null); // single lead or 'bulk'
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // Excel Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importAssignMode, setImportAssignMode] = useState('unassigned'); // unassigned | single | auto
  const [importAssignedTo, setImportAssignedTo] = useState('');
  const [importAutoPool, setImportAutoPool] = useState([]);
  const [importBatchName, setImportBatchName] = useState('');
  const [uploadingImport, setUploadingImport] = useState(false);

  // Call scheduling / log modal
  const [callModalLead, setCallModalLead] = useState(null);
  const [callModalMode, setCallModalMode] = useState('schedule'); // schedule | log
  const [callScheduleTime, setCallScheduleTime] = useState('');
  const [callPurpose, setCallPurpose] = useState('B2B School Presentation & Discussion');
  const [callOutcomeStatus, setCallOutcomeStatus] = useState('completed');
  const [callNotes, setCallNotes] = useState('');
  const [callDuration, setCallDuration] = useState(10);
  const [savingCall, setSavingCall] = useState(false);

  // Demo scheduling / log modal
  const [demoModalLead, setDemoModalLead] = useState(null);
  const [demoModalMode, setDemoModalMode] = useState('schedule'); // schedule | log
  const [demoScheduleTime, setDemoScheduleTime] = useState('');
  const [demoType, setDemoType] = useState('online_meet');
  const [demoLink, setDemoLink] = useState('');
  const [demoOutcomeStatus, setDemoOutcomeStatus] = useState('completed');
  const [demoNotes, setDemoNotes] = useState('');
  const [demoInterestLevel, setDemoInterestLevel] = useState('high');
  const [savingDemo, setSavingDemo] = useState(false);

  // Follow-up modal
  const [followupModalLead, setFollowupModalLead] = useState(null);
  const [followupTime, setFollowupTime] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Lead Details & Activity Timeline Drawer
  const [activeLeadDetails, setActiveLeadDetails] = useState(null);
  const [leadActivities, setLeadActivities] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // New Lead Form state
  const [newLeadForm, setNewLeadForm] = useState({
    school_name: '',
    name: '',
    phone: '',
    email: '',
    role: 'Principal',
    city: '',
    state: 'Maharashtra',
    board: 'CBSE',
    deal_size: '',
    source: 'manual',
    notes: '',
    assigned_to: '',
    demo_session_scheduled: false,
    scheduled_demo_at: '',
    demo_type: 'online_meet',
    followup_scheduled: false,
    next_followup_at: '',
    followup_notes: '',
  });
  const [savingNewLead, setSavingNewLead] = useState(false);

  // Fetch B2B Leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStage && selectedStage !== 'all') params.set('status', selectedStage);
      if (selectedAssignee && selectedAssignee !== 'all') params.set('assigned_to', selectedAssignee);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await axios.get(`${API}/b2b-crm/leads?${params}`, { headers: getAuthHeaders() });
      setLeads(res.data?.leads || []);
      setTotalLeads(res.data?.total || 0);
      setStatusCounts(res.data?.status_counts || {});
    } catch (err) {
      console.error('Failed to load B2B leads:', err);
      toast.error('Failed to load B2B leads');
    } finally {
      setLoading(false);
    }
  }, [selectedStage, selectedAssignee, search, page, getAuthHeaders]);

  // Fetch Assignees
  const fetchAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    try {
      const res = await axios.get(`${API}/b2b-crm/assignees`, { headers: getAuthHeaders() });
      setAssignees(res.data?.assignees || []);
    } catch (err) {
      console.error('Failed to fetch assignees:', err);
    } finally {
      setLoadingAssignees(false);
    }
  }, [getAuthHeaders]);

  // Fetch Tracksheet Report
  const fetchTracksheet = useCallback(async () => {
    setTracksheetLoading(true);
    try {
      const now = new Date();
      let dFrom = '';
      let dTo = now.toISOString().slice(0, 10);

      if (trackDateFilter === 'today') {
        dFrom = dTo;
      } else if (trackDateFilter === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        dFrom = start.toISOString().slice(0, 10);
      } else if (trackDateFilter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dFrom = start.toISOString().slice(0, 10);
      } else if (trackDateFilter === 'custom') {
        dFrom = customFrom || '';
        dTo = customTo || dTo;
      }

      let url = `${API}/b2b-crm/tracksheet?date_from=${dFrom}&date_to=${dTo}`;
      if (trackUserFilter && trackUserFilter !== 'all') {
        url += `&user_id=${trackUserFilter}`;
      }

      const res = await axios.get(url, { headers: getAuthHeaders() });
      setTracksheetData(res.data || null);
    } catch (err) {
      console.error('Failed to load tracksheet:', err);
      toast.error('Failed to load tracksheet report');
    } finally {
      setTracksheetLoading(false);
    }
  }, [trackDateFilter, customFrom, customTo, trackUserFilter, getAuthHeaders]);

  useEffect(() => {
    fetchLeads();
    fetchAssignees();
  }, [fetchLeads, fetchAssignees]);

  useEffect(() => {
    if (activeTab === 'tracksheet') {
      fetchTracksheet();
    }
  }, [activeTab, fetchTracksheet]);

  // Open Lead Details
  const handleOpenLeadDetails = async (lead) => {
    setActiveLeadDetails(lead);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${API}/b2b-crm/leads/${lead.id}`, { headers: getAuthHeaders() });
      setActiveLeadDetails(res.data?.lead || lead);
      setLeadActivities(res.data?.activities || []);
    } catch (err) {
      toast.error('Failed to load lead details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Add Comment to Lead
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !activeLeadDetails) return;
    setSavingComment(true);
    try {
      const res = await axios.post(
        `${API}/b2b-crm/leads/${activeLeadDetails.id}/comments`,
        { text: newCommentText.trim() },
        { headers: getAuthHeaders() }
      );
      if (res.data?.comment) {
        setActiveLeadDetails(prev => ({
          ...prev,
          comments: [...(prev.comments || []), res.data.comment],
        }));
      }
      setNewCommentText('');
      toast.success('Note added');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  // Quick Status Update
  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      await axios.patch(
        `${API}/b2b-crm/leads/${leadId}/status`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchLeads();
      if (activeLeadDetails?.id === leadId) {
        setActiveLeadDetails(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Assign Single or Bulk Leads
  const handleAssignSubmit = async () => {
    if (!selectedAssigneeId) {
      toast.error('Please select a salesperson or caller');
      return;
    }
    setSavingAssign(true);
    try {
      if (showAssignModal === 'bulk') {
        const res = await axios.post(
          `${API}/b2b-crm/leads/bulk-assign`,
          {
            lead_ids: selectedLeadIds,
            assigned_to: selectedAssigneeId,
            assignment_note: assignmentNote,
          },
          { headers: getAuthHeaders() }
        );
        toast.success(`Assigned ${res.data?.assigned_count || selectedLeadIds.length} leads to ${res.data?.assigned_to_name}`);
        setSelectedLeadIds([]);
      } else {
        const lead = showAssignModal;
        const res = await axios.post(
          `${API}/b2b-crm/leads/${lead.id}/assign`,
          {
            assigned_to: selectedAssigneeId,
            assignment_note: assignmentNote,
          },
          { headers: getAuthHeaders() }
        );
        toast.success(`Lead assigned to ${res.data?.lead?.assigned_to_name}`);
      }
      setShowAssignModal(null);
      setSelectedAssigneeId('');
      setAssignmentNote('');
      fetchLeads();
      fetchAssignees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setSavingAssign(false);
    }
  };

  // Schedule or Log Call
  const handleCallSubmit = async () => {
    if (!callModalLead) return;
    setSavingCall(true);
    try {
      if (callModalMode === 'schedule') {
        if (!callScheduleTime) {
          toast.error('Please pick a date & time for the call');
          return;
        }
        await axios.post(
          `${API}/b2b-crm/leads/${callModalLead.id}/schedule-call`,
          {
            scheduled_call_at: callScheduleTime,
            call_purpose: callPurpose,
            notes: callNotes,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Call scheduled successfully');
      } else {
        await axios.post(
          `${API}/b2b-crm/leads/${callModalLead.id}/log-call`,
          {
            call_status: callOutcomeStatus,
            call_notes: callNotes || 'Call completed',
            duration_minutes: Number(callDuration) || 5,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Call logged successfully');
      }
      setCallModalLead(null);
      setCallNotes('');
      setCallScheduleTime('');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process call');
    } finally {
      setSavingCall(false);
    }
  };

  // Schedule or Log Demo
  const handleDemoSubmit = async () => {
    if (!demoModalLead) return;
    setSavingDemo(true);
    try {
      if (demoModalMode === 'schedule') {
        if (!demoScheduleTime) {
          toast.error('Please pick date & time for the presentation / demo');
          return;
        }
        await axios.post(
          `${API}/b2b-crm/leads/${demoModalLead.id}/schedule-demo`,
          {
            scheduled_demo_at: demoScheduleTime,
            demo_type: demoType,
            demo_link: demoLink,
            demo_notes: demoNotes,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Demo scheduled successfully');
      } else {
        await axios.post(
          `${API}/b2b-crm/leads/${demoModalLead.id}/log-demo`,
          {
            demo_status: demoOutcomeStatus,
            demo_notes: demoNotes || 'Presentation completed',
            interest_level: demoInterestLevel,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Demo logged successfully');
      }
      setDemoModalLead(null);
      setDemoNotes('');
      setDemoLink('');
      setDemoScheduleTime('');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process demo');
    } finally {
      setSavingDemo(false);
    }
  };

  // Schedule Follow-up
  const handleFollowupSubmit = async () => {
    if (!followupModalLead || !followupTime) {
      toast.error('Please select follow-up date & time');
      return;
    }
    setSavingFollowup(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${followupModalLead.id}/schedule-followup`,
        {
          next_followup_at: followupTime,
          followup_notes: followupNotes,
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Follow-up scheduled');
      setFollowupModalLead(null);
      setFollowupTime('');
      setFollowupNotes('');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule follow-up');
    } finally {
      setSavingFollowup(false);
    }
  };

  // Create Single B2B Lead Submit
  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast.error('Contact person name and phone number are required');
      return;
    }
    setSavingNewLead(true);
    try {
      await axios.post(`${API}/b2b-crm/leads`, newLeadForm, { headers: getAuthHeaders() });
      toast.success('B2B Lead added and synced with Telecalling successfully');
      setShowAddLeadModal(false);
      setNewLeadForm({
        school_name: '',
        name: '',
        phone: '',
        email: '',
        role: 'Principal',
        city: '',
        state: 'Maharashtra',
        board: 'CBSE',
        deal_size: '',
        source: 'manual',
        notes: '',
        assigned_to: '',
        demo_session_scheduled: false,
        scheduled_demo_at: '',
        demo_type: 'online_meet',
        followup_scheduled: false,
        next_followup_at: '',
        followup_notes: '',
      });
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add B2B lead');
    } finally {
      setSavingNewLead(false);
    }
  };

  // Excel Import Submit (Specifically for B2B Leads)
  const handleExcelImportSubmit = async () => {
    if (!importFile) {
      toast.error('Please select an Excel file (.xlsx)');
      return;
    }
    if (importAssignMode === 'single' && !importAssignedTo) {
      toast.error('Please choose a salesperson to assign the imported leads');
      return;
    }
    if (importAssignMode === 'auto' && importAutoPool.length === 0) {
      toast.error('Please select at least one salesperson for auto-assignment');
      return;
    }

    setUploadingImport(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('assign_mode', importAssignMode);
      if (importAssignMode === 'single') fd.append('assigned_to', importAssignedTo);
      if (importAssignMode === 'auto') fd.append('auto_pool', importAutoPool.join(','));
      if (importBatchName.trim()) fd.append('batch_name', importBatchName.trim());

      const res = await axios.post(`${API}/b2b-crm/import-excel`, fd, { headers: getAuthHeaders() });
      const dup = res.data?.duplicates ? `, ${res.data.duplicates} duplicates skipped` : '';
      toast.success(`Imported ${res.data?.inserted || 0} B2B leads into "${res.data?.batch_name}"${dup}`);
      setShowImportModal(false);
      setImportFile(null);
      setImportBatchName('');
      setImportAssignedTo('');
      setImportAutoPool([]);
      fetchLeads();
      fetchAssignees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Excel import failed');
    } finally {
      setUploadingImport(false);
    }
  };

  const downloadSampleTemplate = async () => {
    try {
      const r = await axios.get(`${API}/b2b-crm/sample-template.xlsx`, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'b2b-leads-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Sample B2B template downloaded');
    } catch (e) {
      toast.error('Failed to download template');
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <AdminLayout title="B2B CRM — Schools & Institutions">
      <div className="space-y-5" data-testid="b2b-crm-container">

        {/* ── Top Header Bar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                B2B School &amp; Institutional CRM
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Live Sync
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Manage B2B school leads, demos, follow-ups, and sales conversions. Synchronized with telecalling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'pipeline'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid="b2b-tab-pipeline"
              >
                <Users className="w-3.5 h-3.5" /> Leads Pipeline ({totalLeads})
              </button>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setActiveTab('tracksheet')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'tracksheet'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  data-testid="b2b-tab-tracksheet"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Track Sheet Report
                </button>
              )}
            </div>

            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
              data-testid="b2b-import-excel-btn"
            >
              <Upload className="w-4 h-4" /> Import Excel
            </Button>

            <Button
              onClick={() => setShowAddLeadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
              data-testid="b2b-add-lead-btn"
            >
              <Plus className="w-4 h-4" /> Add B2B Lead
            </Button>
          </div>
        </div>

        {/* ── KPI Stat Highlights (Click to Filter) ──────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="b2b-kpis">
          <div
            onClick={() => setSelectedStage('all')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'all'
                ? 'bg-slate-800 text-white border-slate-900 ring-2 ring-slate-400'
                : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
            title="Show All Leads"
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Total Leads</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'all' ? 'text-white' : 'text-slate-900'}`}>{totalLeads}</p>
          </div>
          <div
            onClick={() => setSelectedStage('new')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'new'
                ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300'
                : 'bg-white border-blue-200 bg-blue-50/20 hover:border-blue-400'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'new' ? 'text-blue-100' : 'text-blue-700'}`}>Fresh / New</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'new' ? 'text-white' : 'text-blue-900'}`}>{statusCounts['new'] || 0}</p>
          </div>
          <div
            onClick={() => setSelectedStage('demo_scheduled')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'demo_scheduled'
                ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-300'
                : 'bg-white border-purple-200 bg-purple-50/20 hover:border-purple-400'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'demo_scheduled' ? 'text-purple-100' : 'text-purple-700'}`}>Demo Scheduled</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'demo_scheduled' ? 'text-white' : 'text-purple-900'}`}>{statusCounts['demo_scheduled'] || 0}</p>
          </div>
          <div
            onClick={() => setSelectedStage('demo_completed')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'demo_completed'
                ? 'bg-teal-600 text-white border-teal-700 ring-2 ring-teal-300'
                : 'bg-white border-teal-200 bg-teal-50/20 hover:border-teal-400'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'demo_completed' ? 'text-teal-100' : 'text-teal-700'}`}>Demo Done</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'demo_completed' ? 'text-white' : 'text-teal-900'}`}>{statusCounts['demo_completed'] || 0}</p>
          </div>
          <div
            onClick={() => setSelectedStage('follow_up')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'follow_up'
                ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300'
                : 'bg-white border-orange-200 bg-orange-50/20 hover:border-orange-400'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'follow_up' ? 'text-orange-100' : 'text-orange-700'}`}>Follow-ups</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'follow_up' ? 'text-white' : 'text-orange-900'}`}>{statusCounts['follow_up'] || 0}</p>
          </div>
          <div
            onClick={() => setSelectedStage('converted')}
            className={`p-3.5 rounded-xl border shadow-sm cursor-pointer transition ${
              selectedStage === 'converted'
                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                : 'bg-white border-emerald-200 bg-emerald-50/20 hover:border-emerald-400'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${selectedStage === 'converted' ? 'text-emerald-100' : 'text-emerald-700'}`}>Converted (Won)</p>
            <p className={`text-xl font-bold mt-0.5 ${selectedStage === 'converted' ? 'text-white' : 'text-emerald-900'}`}>{statusCounts['converted'] || 0}</p>
          </div>
        </div>

        {/* ── View 1: Lead Pipeline ──────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by school, contact person, phone, email, city..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 h-9 text-xs"
                    data-testid="b2b-search-input"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Stage dropdown filter */}
                <select
                  value={selectedStage}
                  onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none"
                  data-testid="b2b-stage-select"
                >
                  {STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                {/* Assignee filter */}
                <select
                  value={selectedAssignee}
                  onChange={(e) => { setSelectedAssignee(e.target.value); setPage(1); }}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none max-w-[200px]"
                  data-testid="b2b-assignee-select"
                >
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                  ))}
                </select>

                <Button
                  onClick={fetchLeads}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs text-slate-600 hover:text-slate-900"
                  title="Refresh list"
                  data-testid="b2b-refresh-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Bulk Actions Banner */}
            {selectedLeadIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-sm animate-in fade-in" data-testid="b2b-bulk-bar">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">{selectedLeadIds.length} B2B Leads selected</span>
                  <button onClick={() => setSelectedLeadIds([])} className="text-blue-700 underline text-[11px] ml-1">
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {isManager && (
                    <Button
                      size="sm"
                      onClick={() => setShowAssignModal('bulk')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                      data-testid="b2b-bulk-assign-btn"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign to Salesperson...
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Leads Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" data-testid="b2b-leads-table">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                          onChange={toggleSelectAll}
                          className="rounded text-blue-600"
                        />
                      </th>
                      <th className="p-3">School / Organization</th>
                      <th className="p-3">Contact Person</th>
                      <th className="p-3">City &amp; Board</th>
                      <th className="p-3">Stage / Status</th>
                      <th className="p-3">Assignee</th>
                      <th className="p-3">Next Action / Activity</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
                          Loading B2B leads...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700">No B2B leads found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or click &ldquo;Import Excel&rdquo; / &ldquo;Add B2B Lead&rdquo; to add leads.</p>
                        </td>
                      </tr>
                    ) : (
                      leads.map(lead => {
                        const stageMeta = STAGES.find(s => s.value === lead.status) || STAGES[1];
                        const isSelected = selectedLeadIds.includes(lead.id);

                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                            data-testid={`b2b-lead-row-${lead.id}`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectLead(lead.id)}
                                className="rounded text-blue-600"
                              />
                            </td>

                            {/* School / Org */}
                            <td className="p-3">
                              <button
                                onClick={() => handleOpenLeadDetails(lead)}
                                className="font-semibold text-blue-700 hover:underline text-left block"
                              >
                                {lead.school_name || lead.organization_name || 'School / Lead'}
                              </button>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span>{lead.source || 'Direct Entry'}</span>
                                {lead.deal_size && <span className="bg-slate-100 px-1 rounded text-slate-600">{lead.deal_size}</span>}
                              </div>
                            </td>

                            {/* Contact Person */}
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{lead.name}</div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline flex items-center gap-0.5 font-mono">
                                  <Phone className="w-3 h-3" /> {lead.phone}
                                </a>
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-slate-600" title={lead.email}>
                                    <Mail className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* City & Board */}
                            <td className="p-3">
                              <div className="font-medium text-slate-700">{lead.city || '—'}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                {lead.role && <span>{lead.role}</span>}
                                {lead.role && lead.board && <span>•</span>}
                                {lead.board && <span className="font-medium text-slate-600">{lead.board}</span>}
                              </div>
                            </td>

                            {/* Stage / Status */}
                            <td className="p-3">
                              <select
                                value={lead.status || 'new'}
                                onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                                className={`h-7 px-2 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${stageMeta.color}`}
                                data-testid={`b2b-status-select-${lead.id}`}
                              >
                                {STAGES.filter(s => s.value !== 'all').map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* Assignee */}
                            <td className="p-3">
                              {lead.assigned_to_name ? (
                                <div className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-medium">
                                  <UserCheck className="w-3 h-3 text-blue-600" />
                                  <span className="truncate max-w-[120px]">{lead.assigned_to_name}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowAssignModal(lead)}
                                  className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold hover:bg-amber-100"
                                >
                                  + Assign Caller
                                </button>
                              )}
                            </td>

                            {/* Next Action / Activity */}
                            <td className="p-3">
                              {lead.scheduled_demo_at ? (
                                <div className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  <span>Demo: {new Date(lead.scheduled_demo_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ) : lead.next_followup_at ? (
                                <div className="text-[11px] text-orange-700 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Follow-up: {new Date(lead.next_followup_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No task pending</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => { setCallModalLead(lead); setCallModalMode('schedule'); }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                  title="Schedule or Log Call"
                                  data-testid={`b2b-call-btn-${lead.id}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setDemoModalLead(lead); setDemoModalMode('schedule'); }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                                  title="Schedule Presentation / Demo"
                                  data-testid={`b2b-demo-btn-${lead.id}`}
                                >
                                  <Video className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setFollowupModalLead(lead); }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
                                  title="Schedule Follow-up"
                                  data-testid={`b2b-followup-btn-${lead.id}`}
                                >
                                  <CalendarClock className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenLeadDetails(lead)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  title="View Details"
                                  data-testid={`b2b-details-btn-${lead.id}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalLeads > 50 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Showing page {page} of {Math.ceil(totalLeads / 50)} ({totalLeads} total B2B leads)</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page * 50 >= totalLeads}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── View 2: Performance Track Sheet ───────────────────────── */}
        {activeTab === 'tracksheet' && (
          <div className="space-y-4" data-testid="b2b-tracksheet-section">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase">Period:</span>
                {[
                  ['today', 'Today'],
                  ['week', 'Past 7 Days'],
                  ['month', 'This Month'],
                  ['custom', 'Custom Range'],
                ].map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setTrackDateFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      trackDateFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {trackDateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-xs" />
                  <span className="text-xs text-slate-400">to</span>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-xs" />
                  <Button size="sm" onClick={fetchTracksheet} className="h-8 text-xs bg-blue-600">Apply</Button>
                </div>
              )}

              <select
                value={trackUserFilter}
                onChange={e => setTrackUserFilter(e.target.value)}
                className="h-8 px-2 text-xs border rounded-lg bg-white"
              >
                <option value="all">All Team Members</option>
                {assignees.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {tracksheetLoading ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
                Calculating B2B performance metrics...
              </div>
            ) : tracksheetData ? (
              <>
                {/* Aggregate Totals */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-800 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase">Calls Logged</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_calls_logged || 0}</p>
                  </div>
                  <div className="bg-indigo-700 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-indigo-200 font-semibold uppercase">Calls Scheduled</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_calls_scheduled || 0}</p>
                  </div>
                  <div className="bg-purple-700 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-purple-200 font-semibold uppercase">Demos Scheduled</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_demos_scheduled || 0}</p>
                  </div>
                  <div className="bg-teal-700 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-teal-200 font-semibold uppercase">Demos Done</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_demos_completed || 0}</p>
                  </div>
                  <div className="bg-orange-700 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-orange-200 font-semibold uppercase">Follow-ups Done</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_followups_done || 0}</p>
                  </div>
                  <div className="bg-emerald-700 text-white p-3.5 rounded-xl">
                    <p className="text-[11px] text-emerald-200 font-semibold uppercase">B2B Won</p>
                    <p className="text-2xl font-bold mt-1">{tracksheetData.totals?.total_conversions || 0}</p>
                  </div>
                </div>

                {/* Per-User Summary Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" /> Caller &amp; Salesperson Performance Breakdown
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b">
                        <th className="p-3">Team Member</th>
                        <th className="p-3 text-center">Calls Logged</th>
                        <th className="p-3 text-center">Demos Scheduled</th>
                        <th className="p-3 text-center">Demos Completed</th>
                        <th className="p-3 text-center">Follow-ups</th>
                        <th className="p-3 text-center">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(tracksheetData.user_summaries || []).map(u => (
                        <tr key={u.user_id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{u.user_name}</span>
                            <span className="text-[10px] text-slate-400 block">{u.user_role}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{u.calls_logged}</td>
                          <td className="p-3 text-center font-bold text-purple-700">{u.demos_scheduled}</td>
                          <td className="p-3 text-center font-bold text-teal-700">{u.demos_completed}</td>
                          <td className="p-3 text-center font-bold text-orange-700">{u.followups_done}</td>
                          <td className="p-3 text-center font-bold text-emerald-700">{u.converted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Modal: Import Excel (B2B Leads) ────────────────────────── */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-md" data-testid="b2b-import-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Upload className="w-5 h-5 text-blue-600" />
                Import B2B Leads from Excel (.xlsx)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                <span className="text-xs text-blue-900 font-medium">Download the standard B2B Excel template</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadSampleTemplate}
                  className="h-7 text-xs bg-white text-blue-700 border-blue-200"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Template
                </Button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spreadsheet File (.xlsx) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                  data-testid="b2b-import-file-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Campaign Name</label>
                <Input
                  placeholder="e.g. Maharashtra Schools Q4 2026"
                  value={importBatchName}
                  onChange={e => setImportBatchName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {isManager && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Imported Leads</label>
                  <div className="flex gap-2">
                    {[
                      ['unassigned', 'Leave Unassigned'],
                      ['single', 'Single Salesperson'],
                      ['auto', 'Round-Robin Pool'],
                    ].map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setImportAssignMode(m)}
                        className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                          importAssignMode === m
                            ? 'bg-blue-50 text-blue-700 border-blue-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {importAssignMode === 'single' && (
                    <div className="mt-2">
                      <select
                        value={importAssignedTo}
                        onChange={e => setImportAssignedTo(e.target.value)}
                        className="w-full h-9 px-3 text-xs border rounded-lg bg-white"
                      >
                        <option value="">Select team member...</option>
                        {assignees.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {importAssignMode === 'auto' && (
                    <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                      {assignees.map(a => (
                        <label key={a.id} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={importAutoPool.includes(a.id)}
                            onChange={() => setImportAutoPool(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                            className="rounded text-blue-600"
                          />
                          <span>{a.name}</span>
                          <span className="text-[10px] text-slate-400">({a.category})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                ⚡ All imported B2B leads will automatically appear in <b>Telecalling</b> under the B2B tab and will be synced two-way.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleExcelImportSubmit}
                  disabled={uploadingImport || !importFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="b2b-import-submit-btn"
                >
                  {uploadingImport ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  Import B2B Leads
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Add Single B2B Lead ─────────────────────────────── */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="b2b-add-lead-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Plus className="w-5 h-5 text-blue-600" /> Add B2B School / Institutional Lead
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3.5 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School / Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. St. Xavier's High School"
                    value={newLeadForm.school_name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, school_name: e.target.value })}
                    className="h-9 text-xs"
                    data-testid="b2b-add-school"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Dr. Ramesh Gupta"
                    value={newLeadForm.name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    className="h-9 text-xs"
                    data-testid="b2b-add-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. 9876543210"
                    value={newLeadForm.phone}
                    onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="h-9 text-xs"
                    data-testid="b2b-add-phone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    placeholder="principal@school.edu"
                    value={newLeadForm.email}
                    onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation / Role</label>
                  <select
                    value={newLeadForm.role}
                    onChange={e => setNewLeadForm({ ...newLeadForm, role: e.target.value })}
                    className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Board / Affiliation</label>
                  <select
                    value={newLeadForm.board}
                    onChange={e => setNewLeadForm({ ...newLeadForm, board: e.target.value })}
                    className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                  >
                    {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City <span className="text-rose-500">*</span></label>
                  <Input
                    required
                    placeholder="e.g. Mumbai"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Student Strength / Deal Size</label>
                  <Input
                    placeholder="e.g. 1500 students, ₹3 Lakhs"
                    value={newLeadForm.deal_size}
                    onChange={e => setNewLeadForm({ ...newLeadForm, deal_size: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Caller</label>
                  <select
                    value={newLeadForm.assigned_to}
                    onChange={e => setNewLeadForm({ ...newLeadForm, assigned_to: e.target.value })}
                    className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                  >
                    <option value="">Leave Unassigned</option>
                    {assignees.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Demo Scheduling section */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-900">
                  <input
                    type="checkbox"
                    checked={newLeadForm.demo_session_scheduled}
                    onChange={e => setNewLeadForm({ ...newLeadForm, demo_session_scheduled: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  <span>Schedule Demo / Presentation Session right now</span>
                </label>

                {newLeadForm.demo_session_scheduled && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-semibold text-purple-800 mb-0.5">Demo Date &amp; Time</label>
                      <Input
                        type="datetime-local"
                        value={newLeadForm.scheduled_demo_at}
                        onChange={e => setNewLeadForm({ ...newLeadForm, scheduled_demo_at: e.target.value })}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-purple-800 mb-0.5">Mode</label>
                      <select
                        value={newLeadForm.demo_type}
                        onChange={e => setNewLeadForm({ ...newLeadForm, demo_type: e.target.value })}
                        className="w-full h-8 px-2 text-xs border rounded-lg bg-white"
                      >
                        <option value="online_meet">Online Google Meet</option>
                        <option value="in_person_school">In-Person School Visit</option>
                        <option value="presentation">Auditorium Presentation</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Curriculum Requirements</label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Interested in Coding & AI curriculum for Classes 1 to 8, robotics lab quote requested..."
                  value={newLeadForm.notes}
                  onChange={e => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddLeadModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={savingNewLead} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {savingNewLead ? 'Saving...' : 'Save & Sync Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Assign Lead(s) ─────────────────────────────────── */}
        <Dialog open={Boolean(showAssignModal)} onOpenChange={() => setShowAssignModal(null)}>
          <DialogContent className="max-w-md" data-testid="b2b-assign-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <UserPlus className="w-5 h-5 text-blue-600" />
                {showAssignModal === 'bulk' ? `Assign ${selectedLeadIds.length} B2B Leads` : 'Assign Lead'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Salesperson / Caller</label>
                <select
                  value={selectedAssigneeId}
                  onChange={e => setSelectedAssigneeId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border rounded-lg bg-white font-medium"
                >
                  <option value="">Select team member...</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.category} ({a.assigned_leads_count || 0} active leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Note (optional)</label>
                <Input
                  placeholder="e.g. High priority school, follow up by tomorrow"
                  value={assignmentNote}
                  onChange={e => setAssignmentNote(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowAssignModal(null)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAssignSubmit}
                  disabled={savingAssign || !selectedAssigneeId}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingAssign ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Call Scheduling / Log ─────────────────────────── */}
        <Dialog open={Boolean(callModalLead)} onOpenChange={() => setCallModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Phone className="w-5 h-5 text-blue-600" />
                {callModalMode === 'schedule' ? 'Schedule B2B Call' : 'Log B2B Call Outcome'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCallModalMode('schedule')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${callModalMode === 'schedule' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}
                >
                  Schedule Next Call
                </button>
                <button
                  type="button"
                  onClick={() => setCallModalMode('log')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${callModalMode === 'log' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}
                >
                  Log Call Done
                </button>
              </div>

              {callModalMode === 'schedule' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Call Date &amp; Time</label>
                    <Input
                      type="datetime-local"
                      value={callScheduleTime}
                      onChange={e => setCallScheduleTime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Call Purpose</label>
                    <Input
                      value={callPurpose}
                      onChange={e => setCallPurpose(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome</label>
                    <select
                      value={callOutcomeStatus}
                      onChange={e => setCallOutcomeStatus(e.target.value)}
                      className="w-full h-9 px-3 text-xs border rounded-lg bg-white"
                    >
                      <option value="completed">Completed / Connected</option>
                      <option value="no_answer">No Answer / Busy</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={callDuration}
                      onChange={e => setCallDuration(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call Notes / Discussion</label>
                <Textarea
                  rows={2}
                  placeholder="Discussion points, Principal's feedback, next steps..."
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setCallModalLead(null)}>Cancel</Button>
                <Button size="sm" onClick={handleCallSubmit} disabled={savingCall} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {savingCall ? 'Saving...' : 'Save Call'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Demo Scheduling / Log ─────────────────────────── */}
        <Dialog open={Boolean(demoModalLead)} onOpenChange={() => setDemoModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Video className="w-5 h-5 text-purple-600" />
                {demoModalMode === 'schedule' ? 'Schedule Presentation / Demo' : 'Log Demo Result'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDemoModalMode('schedule')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${demoModalMode === 'schedule' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  Schedule Demo
                </button>
                <button
                  type="button"
                  onClick={() => setDemoModalMode('log')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${demoModalMode === 'log' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
                >
                  Log Demo Done
                </button>
              </div>

              {demoModalMode === 'schedule' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Demo Date &amp; Time</label>
                    <Input
                      type="datetime-local"
                      value={demoScheduleTime}
                      onChange={e => setDemoScheduleTime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Presentation Type</label>
                      <select
                        value={demoType}
                        onChange={e => setDemoType(e.target.value)}
                        className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                      >
                        <option value="online_meet">Google Meet</option>
                        <option value="in_person_school">School Visit</option>
                        <option value="presentation">Auditorium Session</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Link / Venue</label>
                      <Input
                        placeholder="https://meet.google.com/..."
                        value={demoLink}
                        onChange={e => setDemoLink(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Demo Outcome</label>
                    <select
                      value={demoOutcomeStatus}
                      onChange={e => setDemoOutcomeStatus(e.target.value)}
                      className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                    >
                      <option value="completed">Completed / Presented</option>
                      <option value="no_show">No Show</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Level</label>
                    <select
                      value={demoInterestLevel}
                      onChange={e => setDemoInterestLevel(e.target.value)}
                      className="w-full h-9 px-2 text-xs border rounded-lg bg-white"
                    >
                      <option value="high">High (Ready for Proposal)</option>
                      <option value="medium">Medium (Evaluating)</option>
                      <option value="low">Low (Budget issues)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Presentation Notes / Feedback</label>
                <Textarea
                  rows={2}
                  placeholder="Key topics presented, questions asked by Principal/Teachers..."
                  value={demoNotes}
                  onChange={e => setDemoNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setDemoModalLead(null)}>Cancel</Button>
                <Button size="sm" onClick={handleDemoSubmit} disabled={savingDemo} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {savingDemo ? 'Saving...' : 'Save Demo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Follow-up ─────────────────────────────────────── */}
        <Dialog open={Boolean(followupModalLead)} onOpenChange={() => setFollowupModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CalendarClock className="w-5 h-5 text-orange-600" />
                Schedule Follow-up with {followupModalLead?.school_name || followupModalLead?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Date &amp; Time</label>
                <Input
                  type="datetime-local"
                  value={followupTime}
                  onChange={e => setFollowupTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Agenda / Note</label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Check if management approved lab quotation, send revised proposal..."
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setFollowupModalLead(null)}>Cancel</Button>
                <Button size="sm" onClick={handleFollowupSubmit} disabled={savingFollowup} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {savingFollowup ? 'Scheduling...' : 'Schedule Follow-up'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Lead Details & Activity Timeline Drawer ───────── */}
        <Dialog open={Boolean(activeLeadDetails)} onOpenChange={() => setActiveLeadDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {activeLeadDetails && (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {activeLeadDetails.school_name || activeLeadDetails.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contact: <span className="font-semibold text-slate-800">{activeLeadDetails.name}</span> ({activeLeadDetails.role || 'Representative'}) • City: {activeLeadDetails.city} • Board: {activeLeadDetails.board || 'CBSE'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${STAGES.find(s => s.value === activeLeadDetails.status)?.color}`}>
                      {STAGES.find(s => s.value === activeLeadDetails.status)?.label}
                    </span>
                  </div>
                </div>

                {/* Contact Quick Call Bar */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Contact</span>
                    <div className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                      <a href={`tel:${activeLeadDetails.phone}`} className="hover:underline flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {activeLeadDetails.phone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Salesperson</span>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      {activeLeadDetails.assigned_to_name || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">Change Pipeline Stage:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.filter(s => s.value !== 'all').map(st => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => handleQuickStatusChange(activeLeadDetails.id, st.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          activeLeadDetails.status === st.value
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes & Discussions */}
                <div className="border-t pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Notes &amp; Activity Log
                  </h3>

                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add an internal note or update..."
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={savingComment || !newCommentText.trim()}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Post Note
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(activeLeadDetails.comments || []).slice().reverse().map((c, i) => (
                      <div key={c.id || i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700">{c.user_name}</span>
                          <span>{new Date(c.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
