import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Users, Phone, Video, Calendar, Clock, CheckCircle2,
  AlertCircle, Search, Filter, Plus, ChevronRight, UserCheck,
  UserPlus, MessageSquare, BarChart3, ArrowUpDown, RefreshCw,
  ExternalLink, Eye, Check, X, Shield, Star, Award, TrendingUp,
  MapPin, Mail, Briefcase, FileText, ChevronDown, Send, ArrowRight,
  Edit, Trash2, CalendarClock
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = [
  { value: 'all', label: 'All Stages', color: 'bg-slate-100 text-slate-700' },
  { value: 'new', label: 'New / Fresh', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'call_scheduled', label: 'Call Scheduled', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'demo_completed', label: 'Demo Done', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'follow_up', label: 'Follow-up', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'converted', label: 'Converted (Won)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'lost', label: 'Lost / Closed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export default function AdminFranchiseCRM() {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isGPManager = user?.role === 'growth_partner_manager' || 
                      user?.role_id === '8741cb57-bbae-4cb1-9241-c90a9b54cd6d' ||
                      ['growth@oll.co', 'parul.mittal1311@gmail.com'].includes((user?.email || '').toLowerCase());
  const isManager = isAdmin || isGPManager || Boolean(user?.is_manager);

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

  // Eligible assignees (B2C, B2B, BDE, Telecallers)
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

  // Call scheduling / log modal
  const [callModalLead, setCallModalLead] = useState(null);
  const [callModalMode, setCallModalMode] = useState('schedule'); // schedule | log
  const [callScheduleTime, setCallScheduleTime] = useState('');
  const [callPurpose, setCallPurpose] = useState('Franchise Presentation & Discovery');
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

  // New Lead Form state (includes optional demo scheduling)
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: 'Maharashtra',
    occupation: '',
    has_space: 'looking',
    investment_budget: '₹2.5 Lakhs',
    source: 'manual',
    details: '',
    assigned_to: '',
    demo_session_scheduled: false,
    scheduled_demo_at: '',
    demo_type: 'online_meet',
  });
  const [savingNewLead, setSavingNewLead] = useState(false);

  // Edit Lead Modal state
  const [showEditLeadModal, setShowEditLeadModal] = useState(null);
  const [editLeadForm, setEditLeadForm] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    city: '',
    state: 'Maharashtra',
    occupation: '',
    has_space: 'looking',
    investment_budget: '₹2.5 Lakhs',
    source: 'manual',
    details: '',
    status: 'new',
    demo_session_scheduled: false,
    scheduled_demo_at: '',
    demo_type: 'online_meet',
  });
  const [savingEditLead, setSavingEditLead] = useState(false);

  // Lost Lead Modal state
  const [showLostModal, setShowLostModal] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [savingLost, setSavingLost] = useState(false);

  // Delete Confirm Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deletingLead, setDeletingLead] = useState(false);

  // Fetch Leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/franchise-crm/leads?page=${page}&limit=50`;
      if (selectedStage && selectedStage !== 'all') url += `&status=${selectedStage}`;
      if (selectedAssignee && selectedAssignee !== 'all') url += `&assigned_to=${selectedAssignee}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await axios.get(url, { headers: getAuthHeaders() });
      setLeads(res.data?.leads || []);
      setTotalLeads(res.data?.total || 0);
      setStatusCounts(res.data?.status_counts || {});
    } catch (err) {
      console.error('Failed to load franchise leads:', err);
      toast.error('Failed to load franchise leads');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStage, selectedAssignee, search]);

  // Fetch Assignees
  const fetchAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    try {
      const res = await axios.get(`${API}/franchise-crm/assignees`, { headers: getAuthHeaders() });
      setAssignees(res.data?.assignees || []);
    } catch (err) {
      console.error('Failed to load assignees:', err);
    } finally {
      setLoadingAssignees(false);
    }
  }, []);

  // Fetch Tracksheet
  const fetchTracksheet = useCallback(async () => {
    setTracksheetLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      let dFrom = todayStr;
      let dTo = todayStr;

      if (trackDateFilter === 'today') {
        dFrom = todayStr;
        dTo = todayStr;
      } else if (trackDateFilter === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        dFrom = d.toISOString().slice(0, 10);
        dTo = todayStr;
      } else if (trackDateFilter === 'month') {
        const d = new Date();
        d.setDate(1); // 1st of current month
        dFrom = d.toISOString().slice(0, 10);
        dTo = todayStr;
      } else if (trackDateFilter === 'custom') {
        dFrom = customFrom || todayStr;
        dTo = customTo || todayStr;
      }

      let url = `${API}/franchise-crm/tracksheet?date_from=${dFrom}&date_to=${dTo}`;
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
  }, [trackDateFilter, customFrom, customTo, trackUserFilter]);

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
      const res = await axios.get(`${API}/franchise-crm/leads/${lead.id}`, { headers: getAuthHeaders() });
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
        `${API}/franchise-crm/leads/${activeLeadDetails.id}/comments`,
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
      toast.error('Failed to add note');
    } finally {
      setSavingComment(false);
    }
  };

  // Execute Lead Assignment (Single or Bulk)
  const handleExecuteAssign = async () => {
    if (!selectedAssigneeId) {
      toast.error('Please select an executive');
      return;
    }
    setSavingAssign(true);
    try {
      if (showAssignModal === 'bulk') {
        const res = await axios.post(
          `${API}/franchise-crm/leads/bulk-assign`,
          {
            lead_ids: selectedLeadIds,
            assigned_to: selectedAssigneeId,
            assignment_note: assignmentNote,
          },
          { headers: getAuthHeaders() }
        );
        toast.success(`Assigned ${res.data?.count || selectedLeadIds.length} leads to ${res.data?.assigned_to_name}`);
        setSelectedLeadIds([]);
      } else {
        const res = await axios.post(
          `${API}/franchise-crm/leads/${showAssignModal.id}/assign`,
          {
            assigned_to: selectedAssigneeId,
            assignment_note: assignmentNote,
          },
          { headers: getAuthHeaders() }
        );
        toast.success(`Lead assigned to ${res.data?.assigned_to_name}`);
      }
      setShowAssignModal(null);
      setSelectedAssigneeId('');
      setAssignmentNote('');
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Assignment failed');
    } finally {
      setSavingAssign(false);
    }
  };

  // Execute Call (Schedule or Log)
  const handleExecuteCall = async () => {
    if (!callModalLead) return;
    setSavingCall(true);
    try {
      if (callModalMode === 'schedule') {
        if (!callScheduleTime) {
          toast.error('Please select date and time');
          setSavingCall(false);
          return;
        }
        await axios.post(
          `${API}/franchise-crm/leads/${callModalLead.id}/schedule-call`,
          {
            scheduled_call_at: callScheduleTime,
            call_purpose: callPurpose,
            notes: callNotes,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Call scheduled successfully');
      } else {
        if (!callNotes.trim()) {
          toast.error('Please enter discussion notes');
          setSavingCall(false);
          return;
        }
        await axios.post(
          `${API}/franchise-crm/leads/${callModalLead.id}/log-call`,
          {
            call_status: callOutcomeStatus,
            call_notes: callNotes,
            duration_minutes: Number(callDuration) || 5,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Call outcome logged');
      }
      setCallModalLead(null);
      setCallNotes('');
      setCallScheduleTime('');
      fetchLeads();
      if (activeLeadDetails?.id === callModalLead.id) {
        handleOpenLeadDetails(callModalLead);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally {
      setSavingCall(false);
    }
  };

  // Execute Demo (Schedule or Log)
  const handleExecuteDemo = async () => {
    if (!demoModalLead) return;
    setSavingDemo(true);
    try {
      if (demoModalMode === 'schedule') {
        if (!demoScheduleTime) {
          toast.error('Please pick demo date & time');
          setSavingDemo(false);
          return;
        }
        await axios.post(
          `${API}/franchise-crm/leads/${demoModalLead.id}/schedule-demo`,
          {
            scheduled_demo_at: demoScheduleTime,
            demo_type: demoType,
            demo_link: demoLink,
            demo_notes: demoNotes,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Franchise demo scheduled');
      } else {
        if (!demoNotes.trim()) {
          toast.error('Please enter demo feedback / notes');
          setSavingDemo(false);
          return;
        }
        await axios.post(
          `${API}/franchise-crm/leads/${demoModalLead.id}/log-demo`,
          {
            demo_status: demoOutcomeStatus,
            demo_notes: demoNotes,
            interest_level: demoInterestLevel,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('Demo outcome logged');
      }
      setDemoModalLead(null);
      setDemoNotes('');
      setDemoScheduleTime('');
      fetchLeads();
      if (activeLeadDetails?.id === demoModalLead.id) {
        handleOpenLeadDetails(demoModalLead);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally {
      setSavingDemo(false);
    }
  };

  // Execute Follow-up
  const handleExecuteFollowup = async () => {
    if (!followupModalLead) return;
    if (!followupTime || !followupNotes.trim()) {
      toast.error('Please set follow-up time and reminder note');
      return;
    }
    setSavingFollowup(true);
    try {
      await axios.post(
        `${API}/franchise-crm/leads/${followupModalLead.id}/schedule-followup`,
        {
          next_followup_at: followupTime,
          followup_notes: followupNotes.trim(),
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Follow-up scheduled');
      setFollowupModalLead(null);
      setFollowupTime('');
      setFollowupNotes('');
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to schedule follow-up');
    } finally {
      setSavingFollowup(false);
    }
  };

  // Quick Status Update (e.g. Convert to Franchise Partner or Lost)
  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await axios.patch(
        `${API}/franchise-crm/leads/${leadId}/status`,
        { status: newStatus, notes: `Status changed to ${newStatus}` },
        { headers: getAuthHeaders() }
      );
      toast.success(`Lead marked as ${newStatus.replace('_', ' ')}`);
      fetchLeads();
      if (activeLeadDetails?.id === leadId) {
        setActiveLeadDetails(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Create Manual Lead (with optional demo scheduling)
  const handleCreateNewLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim() || !newLeadForm.city.trim()) {
      toast.error('Name, Phone, and City are required');
      return;
    }
    setSavingNewLead(true);
    try {
      const payload = {
        ...newLeadForm,
        name: newLeadForm.name.trim(),
        phone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim(),
        city: newLeadForm.city.trim(),
        demo_session_scheduled: newLeadForm.demo_session_scheduled,
        scheduled_demo_at: newLeadForm.demo_session_scheduled && newLeadForm.scheduled_demo_at ? newLeadForm.scheduled_demo_at : null,
      };
      await axios.post(`${API}/franchise-crm/leads`, payload, { headers: getAuthHeaders() });
      toast.success('Franchise lead added successfully');
      setShowAddLeadModal(false);
      setNewLeadForm({
        name: '',
        phone: '',
        email: '',
        city: '',
        state: 'Maharashtra',
        occupation: '',
        has_space: 'looking',
        investment_budget: '₹2.5 Lakhs',
        source: 'manual',
        details: '',
        assigned_to: '',
        demo_session_scheduled: false,
        scheduled_demo_at: '',
        demo_type: 'online_meet',
      });
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create lead');
    } finally {
      setSavingNewLead(false);
    }
  };

  // Open Edit Lead Modal
  const openEditLead = (lead) => {
    setEditLeadForm({
      id: lead.id,
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      state: lead.state || 'Maharashtra',
      occupation: lead.occupation || '',
      has_space: lead.has_space || 'looking',
      investment_budget: lead.investment_budget || '₹2.5 Lakhs',
      source: lead.source || 'manual',
      details: lead.details || lead.notes || '',
      status: lead.status || 'new',
      demo_session_scheduled: Boolean(lead.scheduled_demo_at || lead.demo_status === 'scheduled'),
      scheduled_demo_at: lead.scheduled_demo_at ? lead.scheduled_demo_at.slice(0, 16) : '',
      demo_type: lead.demo_type || 'online_meet',
    });
    setShowEditLeadModal(lead);
  };

  // Save Edit Lead
  const handleSaveEditLead = async (e) => {
    e.preventDefault();
    if (!editLeadForm.name.trim() || !editLeadForm.phone.trim() || !editLeadForm.city.trim()) {
      toast.error('Name, Phone, and City are required');
      return;
    }
    setSavingEditLead(true);
    try {
      const payload = {
        name: editLeadForm.name.trim(),
        phone: editLeadForm.phone.trim(),
        email: editLeadForm.email.trim(),
        city: editLeadForm.city.trim(),
        state: editLeadForm.state.trim(),
        occupation: editLeadForm.occupation.trim(),
        has_space: editLeadForm.has_space,
        investment_budget: editLeadForm.investment_budget,
        details: editLeadForm.details.trim(),
        status: editLeadForm.status,
        demo_session_scheduled: editLeadForm.demo_session_scheduled,
        scheduled_demo_at: editLeadForm.demo_session_scheduled && editLeadForm.scheduled_demo_at ? editLeadForm.scheduled_demo_at : null,
        demo_type: editLeadForm.demo_type,
      };
      await axios.put(`${API}/franchise-crm/leads/${editLeadForm.id}`, payload, {
        headers: getAuthHeaders(),
      });
      toast.success('Lead details updated successfully!');
      setShowEditLeadModal(null);
      fetchLeads();
      if (activeLeadDetails && activeLeadDetails.id === editLeadForm.id) {
        handleOpenLeadDetails({ ...activeLeadDetails, ...payload });
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
      toast.error(err?.response?.data?.detail || 'Failed to update lead');
    } finally {
      setSavingEditLead(false);
    }
  };

  // Open Schedule Demo Modal directly
  const openScheduleDemo = (lead) => {
    setDemoModalLead(lead);
    setDemoModalMode('schedule');
    setDemoScheduleTime(lead.scheduled_demo_at ? lead.scheduled_demo_at.slice(0, 16) : '');
    setDemoType(lead.demo_type || 'online_meet');
    setDemoLink(lead.demo_link || '');
    setDemoNotes('');
  };

  // Open Demo Done Modal directly
  const openDemoDone = (lead) => {
    setDemoModalLead(lead);
    setDemoModalMode('log');
    setDemoOutcomeStatus('completed');
    setDemoInterestLevel('high');
    setDemoNotes('');
  };

  // Confirm Lost Lead
  const handleConfirmLost = async (e) => {
    e.preventDefault();
    if (!showLostModal) return;
    setSavingLost(true);
    try {
      await axios.patch(
        `${API}/franchise-crm/leads/${showLostModal.id}/status`,
        { status: 'lost', notes: lostReason.trim() || 'Marked as lost lead' },
        { headers: getAuthHeaders() }
      );
      toast.success('Lead marked as Lost');
      setShowLostModal(null);
      setLostReason('');
      fetchLeads();
      if (activeLeadDetails && activeLeadDetails.id === showLostModal.id) {
        setActiveLeadDetails(prev => ({ ...prev, status: 'lost' }));
      }
    } catch (err) {
      console.error('Failed to mark lead as lost:', err);
      toast.error(err?.response?.data?.detail || 'Failed to update lead status');
    } finally {
      setSavingLost(false);
    }
  };

  // Open Delete Modal
  const handleDeleteLead = (lead) => {
    if (!lead) return;
    setShowDeleteModal(lead);
  };

  // Confirm Delete Lead
  const handleConfirmDelete = async () => {
    if (!showDeleteModal) return;
    setDeletingLead(true);
    try {
      await axios.delete(`${API}/franchise-crm/leads/${showDeleteModal.id}`, {
        headers: getAuthHeaders(),
      });
      toast.success('Lead deleted successfully');
      setShowDeleteModal(null);
      if (activeLeadDetails && activeLeadDetails.id === showDeleteModal.id) {
        setActiveLeadDetails(null);
      }
      fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error(err?.response?.data?.detail || 'Failed to delete lead');
    } finally {
      setDeletingLead(false);
    }
  };

  // Helper for status badge
  const renderStatusBadge = (status) => {
    const s = STAGES.find(x => x.value === status) || { label: status, color: 'bg-slate-100 text-slate-700' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <AdminLayout title="Franchise CRM">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Franchise CRM</h1>
                <p className="text-xs text-slate-500">
                  Manage inquiries, assign leads to B2C/BDE telecallers, schedule calls & demos, and inspect track sheet performance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'pipeline'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Leads Pipeline ({totalLeads})
              </button>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setActiveTab('tracksheet')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'tracksheet'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Track Sheet Report
                </button>
              )}
            </div>

            <Button
              onClick={() => setShowAddLeadModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Franchise Lead
            </Button>
          </div>
        </div>

        {/* ── KPI Stat Highlights ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalLeads}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">New / Unassigned</p>
            <p className="text-xl font-bold text-blue-900 mt-0.5">{statusCounts.new || 0}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Calls Scheduled</p>
            <p className="text-xl font-bold text-indigo-900 mt-0.5">{statusCounts.call_scheduled || 0}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Demos Scheduled</p>
            <p className="text-xl font-bold text-purple-900 mt-0.5">{statusCounts.demo_scheduled || 0}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-orange-200 bg-orange-50/20 shadow-sm">
            <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Follow-ups</p>
            <p className="text-xl font-bold text-orange-900 mt-0.5">{statusCounts.follow_up || 0}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Converted (Won)</p>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">{statusCounts.converted || 0}</p>
          </div>
        </div>

        {/* ════════════════════ TAB 1: LEADS PIPELINE ════════════════════ */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search by lead name, phone, city, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 w-full"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {/* Stage filter */}
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                  >
                    {STAGES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  {/* Assignee filter (managers only) */}
                  {isManager && (
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium max-w-xs"
                    >
                      <option value="all">All Assignees</option>
                      <option value="unassigned">⚠️ Unassigned Leads</option>
                      {assignees.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.category} · {a.assigned_leads_count})
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => fetchLeads()}
                    className="h-9 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-xs flex items-center gap-1 font-medium"
                    title="Refresh list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Manager Bulk Actions Banner */}
              {isManager && selectedLeadIds.length > 0 && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                  <span className="font-semibold text-indigo-900">
                    {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowAssignModal('bulk')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3"
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Bulk Assign to Executive
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadIds([])}
                      className="text-slate-500 hover:text-slate-700 underline text-[11px]"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Loading franchise leads…</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <p className="font-medium text-slate-700 text-sm">No franchise leads found</p>
                  <p className="text-slate-400 mt-1">Try adjusting filters or add a new franchise lead.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        {isManager && (
                          <th className="px-3 py-3 w-8">
                            <input
                              type="checkbox"
                              checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedLeadIds(leads.map(l => l.id));
                                else setSelectedLeadIds([]);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                        )}
                        <th className="px-4 py-3">Lead Details</th>
                        <th className="px-4 py-3">Location & Space</th>
                        <th className="px-4 py-3">Assigned Executive</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Next Action</th>
                        <th className="px-4 py-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((lead) => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-indigo-50/30' : ''}`}
                          >
                            {isManager && (
                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedLeadIds(prev => [...prev, lead.id]);
                                    else setSelectedLeadIds(prev => prev.filter(x => x !== lead.id));
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                            )}

                            {/* Lead Name & Contact */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => handleOpenLeadDetails(lead)}
                                  className="font-bold text-slate-900 hover:text-indigo-600 text-left text-sm"
                                >
                                  {lead.name}
                                </button>
                                <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                                  </span>
                                  {lead.email && (
                                    <span className="flex items-center gap-0.5 text-slate-400 truncate max-w-[140px]" title={lead.email}>
                                      · {lead.email}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Source: {lead.source || 'Website'} · Added {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </td>

                            {/* Location, Space & Budget */}
                            <td className="px-4 py-3 text-slate-600">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 font-medium text-slate-800">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{lead.city || 'City N/A'}</span>
                                  {lead.state && <span className="text-slate-400">({lead.state})</span>}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    lead.has_space === 'yes'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : lead.has_space === 'looking'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    Space: {lead.has_space === 'yes' ? 'Has Space' : lead.has_space === 'looking' ? 'Looking' : 'No Space'}
                                  </span>
                                  {lead.investment_budget && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {lead.investment_budget}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Assigned Executive */}
                            <td className="px-4 py-3">
                              {lead.assigned_to_name ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">{lead.assigned_to_name}</span>
                                  {lead.assigned_to_role && (
                                    <span className="text-[10px] text-indigo-700 font-medium">
                                      {lead.assigned_to_role}
                                    </span>
                                  )}
                                  {isManager && (
                                    <button
                                      type="button"
                                      onClick={() => setShowAssignModal(lead)}
                                      className="text-[10px] text-indigo-600 hover:underline mt-0.5 text-left"
                                    >
                                      Reassign
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Unassigned
                                  </span>
                                  {isManager && (
                                    <button
                                      type="button"
                                      onClick={() => setShowAssignModal(lead)}
                                      className="block mt-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                                    >
                                      + Assign Person
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Stage Badge */}
                            <td className="px-4 py-3">
                              {renderStatusBadge(lead.status)}
                            </td>

                            {/* Next Action Scheduled */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5 text-[11px]">
                                {lead.scheduled_call_at && (
                                  <div className="flex items-center gap-1 text-indigo-700 font-medium">
                                    <Phone className="w-3 h-3" />
                                    <span>Call: {new Date(lead.scheduled_call_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                                {lead.scheduled_demo_at && (
                                  <div className="flex items-center gap-1 text-purple-700 font-medium">
                                    <Video className="w-3 h-3" />
                                    <span>Demo: {new Date(lead.scheduled_demo_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                                {lead.next_followup_at && (
                                  <div className="flex items-center gap-1 text-orange-700 font-medium">
                                    <Clock className="w-3 h-3" />
                                    <span>Follow-up: {new Date(lead.next_followup_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                                {!lead.scheduled_call_at && !lead.scheduled_demo_at && !lead.next_followup_at && (
                                  <span className="text-slate-400 italic text-[11px]">None scheduled</span>
                                )}
                              </div>
                            </td>

                            {/* Actions (School CRM Style) */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Edit Lead */}
                                <button
                                  type="button"
                                  onClick={() => openEditLead(lead)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold transition"
                                  title="Edit Lead Details"
                                >
                                  <Edit className="w-3 h-3 text-amber-600" />
                                  <span>Edit</span>
                                </button>

                                {/* Demo Schedule */}
                                <button
                                  type="button"
                                  onClick={() => openScheduleDemo(lead)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 font-semibold transition"
                                  title="Schedule Demo Session"
                                >
                                  <CalendarClock className="w-3 h-3 text-purple-600" />
                                  <span>Demo Schedule</span>
                                </button>

                                {/* Demo Done */}
                                <button
                                  type="button"
                                  onClick={() => openDemoDone(lead)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1 font-semibold transition"
                                  title="Mark Demo Completed"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                  <span>Demo Done</span>
                                </button>

                                {/* Lost Lead */}
                                {lead.status !== 'lost' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowLostModal(lead);
                                      setLostReason('');
                                    }}
                                    className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 font-semibold transition"
                                    title="Mark Lead as Lost"
                                  >
                                    <X className="w-3 h-3 text-rose-600" />
                                    <span>Lost Lead</span>
                                  </button>
                                )}

                                {/* Call */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCallModalLead(lead);
                                    setCallModalMode(lead.scheduled_call_at ? 'log' : 'schedule');
                                  }}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 font-semibold transition"
                                  title="Schedule or Log Call"
                                >
                                  <Phone className="w-3 h-3 text-indigo-600" />
                                  <span>Call</span>
                                </button>

                                {/* Delete (Admins & GP Managers) */}
                                {isManager && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(lead)}
                                    className="text-[11px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 font-semibold transition"
                                    title="Delete Lead"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                    <span>Delete</span>
                                  </button>
                                )}

                                {/* View Details */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenLeadDetails(lead)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 font-semibold transition"
                                  title="View Full Profile & Timeline"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>View</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 2: TRACK SHEET REPORT ════════════════════ */}
        {activeTab === 'tracksheet' && isManager && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Date Range:
                </span>
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'month', label: 'This Month' },
                  { value: 'custom', label: 'Custom' },
                ].map(b => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setTrackDateFilter(b.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      trackDateFilter === b.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}

                {trackDateFilter === 'custom' && (
                  <div className="flex items-center gap-1 ml-2">
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="text-xs h-8 w-32"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="text-xs h-8 w-32"
                    />
                    <Button size="sm" onClick={fetchTracksheet} className="h-8 text-xs bg-indigo-600 text-white">
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={trackUserFilter}
                  onChange={(e) => setTrackUserFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">All Executives</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchTracksheet}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
            </div>

            {/* Tracksheet Summary Cards */}
            {tracksheetData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Assigned Leads</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{tracksheetData.summary.total_leads_assigned}</p>
                  <span className="text-[10px] text-slate-400">across {tracksheetData.summary.total_team_members} executives</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-700 uppercase">Calls Completed</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{tracksheetData.summary.total_calls_completed}</p>
                  <span className="text-[10px] text-indigo-600/80">successful connects</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
                  <p className="text-[11px] font-semibold text-purple-700 uppercase">Demos Conducted</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{tracksheetData.summary.total_demos_completed}</p>
                  <span className="text-[10px] text-purple-600/80">completed presentations</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/20 shadow-sm">
                  <p className="text-[11px] font-semibold text-orange-700 uppercase">Follow-ups Done</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{tracksheetData.summary.total_followups}</p>
                  <span className="text-[10px] text-orange-600/80">pipeline progression</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                  <p className="text-[11px] font-semibold text-emerald-800 uppercase">Converted Franchises</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{tracksheetData.summary.total_conversions}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {tracksheetData.summary.overall_conversion_rate}% conversion rate
                  </span>
                </div>
              </div>
            )}

            {/* Performance by Person Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Franchise CRM Executive Track Sheet</h3>
                  <p className="text-xs text-slate-500">Breakdown of calls, demos, follow-ups and franchise conversion performance per executive.</p>
                </div>
              </div>

              {tracksheetLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading performance data…</div>
              ) : !tracksheetData?.executives || tracksheetData.executives.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No activity logged for this time period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Executive Name</th>
                        <th className="px-4 py-3">Role / Designation</th>
                        <th className="px-4 py-3 text-center">Assigned Leads</th>
                        <th className="px-4 py-3 text-center">Calls (Sched / Done)</th>
                        <th className="px-4 py-3 text-center">Demos (Sched / Done)</th>
                        <th className="px-4 py-3 text-center">Follow-ups Done</th>
                        <th className="px-4 py-3 text-center">Won Franchises</th>
                        <th className="px-4 py-3 text-center">Conv. Rate</th>
                        <th className="px-4 py-3 text-center">Total Activities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tracksheetData.executives.map((exec) => (
                        <tr key={exec.user_id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{exec.name}</span>
                              <span className="text-[11px] text-slate-400">{exec.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {exec.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-800">
                            {exec.assigned_leads}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-slate-700">{exec.calls_scheduled}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="font-bold text-indigo-700">{exec.calls_completed}</span>
                            {exec.calls_no_answer > 0 && (
                              <span className="text-[10px] text-rose-500 ml-1">({exec.calls_no_answer} NA)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-slate-700">{exec.demos_scheduled}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="font-bold text-purple-700">{exec.demos_completed}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-orange-700">
                            {exec.followups_done}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {exec.conversions}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span className={exec.conversion_rate > 10 ? 'text-emerald-700' : 'text-slate-700'}>
                              {exec.conversion_rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-600">
                            {exec.total_activities}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Activities Stream */}
            {tracksheetData?.recent_activities && tracksheetData.recent_activities.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Recent Track Sheet Activity Log
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {tracksheetData.recent_activities.map((act, i) => (
                    <div key={act.id || i} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 mr-2">{act.user_name}</span>
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-semibold mr-2">
                          {act.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-slate-600 font-medium">on {act.lead_name}</span>
                        {act.details?.notes && (
                          <span className="text-slate-500 italic ml-2">"{act.details.notes}"</span>
                        )}
                        {act.details?.call_notes && (
                          <span className="text-slate-500 italic ml-2">"{act.details.call_notes}"</span>
                        )}
                        {act.details?.demo_notes && (
                          <span className="text-slate-500 italic ml-2">"{act.details.demo_notes}"</span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] whitespace-nowrap ml-4">
                        {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ MODALS ════════════════════ */}

        {/* 1. Add Franchise Lead Modal */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Building2 className="w-5 h-5 text-indigo-600" /> Add New Franchise Lead
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateNewLead} className="space-y-3 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Full Name *</label>
                  <Input
                    required
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Candidate / Owner Name"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Phone Number *</label>
                  <Input
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="10 digit mobile"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Email Address</label>
                  <Input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">City *</label>
                  <Input
                    required
                    value={newLeadForm.city}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Pune, Jaipur"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Current Occupation</label>
                  <Input
                    value={newLeadForm.occupation}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Business, Teacher, etc."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Has Commercial Space?</label>
                  <select
                    value={newLeadForm.has_space}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, has_space: e.target.value }))}
                    className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white"
                  >
                    <option value="yes">Yes, have space</option>
                    <option value="looking">Currently looking</option>
                    <option value="no">No space</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Investment Budget</label>
                  <Input
                    value={newLeadForm.investment_budget}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, investment_budget: e.target.value }))}
                    placeholder="₹2.5 Lakhs"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {isManager && (
                <div>
                  <label className="font-semibold text-slate-700">Assign To (Optional)</label>
                  <select
                    value={newLeadForm.assigned_to}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white"
                  >
                    <option value="">Leave Unassigned</option>
                    {assignees.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Demo Session Scheduled */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newLeadForm.demo_session_scheduled}
                      onChange={(e) => setNewLeadForm(prev => ({ ...prev, demo_session_scheduled: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Demo Session is Scheduled?</span>
                  </label>
                  {newLeadForm.demo_session_scheduled && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Demo Scheduled
                    </span>
                  )}
                </div>

                {newLeadForm.demo_session_scheduled && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Demo Date & Time (Optional)</label>
                      <Input
                        type="datetime-local"
                        value={newLeadForm.scheduled_demo_at}
                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, scheduled_demo_at: e.target.value }))}
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Demo Mode</label>
                      <select
                        value={newLeadForm.demo_type}
                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, demo_type: e.target.value }))}
                        className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white"
                      >
                        <option value="online_meet">Online Google Meet / Zoom</option>
                        <option value="in_person_center">In-Person at Center</option>
                        <option value="presentation">Presentation / Phone Walkthrough</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700">Details / Background</label>
                <Textarea
                  value={newLeadForm.details}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Notes, background or specific requirements..."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowAddLeadModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingNewLead} className="bg-indigo-600 text-white">
                  {savingNewLead ? 'Saving…' : 'Save Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Assign Lead Modal (Single or Bulk) */}
        <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                {showAssignModal === 'bulk'
                  ? `Assign ${selectedLeadIds.length} Leads to Salesperson`
                  : `Assign Lead: ${showAssignModal?.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs mt-2">
              <p className="text-slate-500">
                Select an executive (B2C, B2B, Business Development Executive or Telecaller) to assign this lead to:
              </p>

              <div>
                <label className="font-semibold text-slate-700">Choose Salesperson / Telecaller *</label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="mt-1 w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-white font-medium"
                >
                  <option value="">-- Select Executive --</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.category} ({a.assigned_leads_count} active leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Assignment Instruction / Note</label>
                <Textarea
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Please call before 2 PM, candidate has furnished space in Pune..."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAssignModal(null)}>Cancel</Button>
                <Button onClick={handleExecuteAssign} disabled={savingAssign} className="bg-indigo-600 text-white">
                  {savingAssign ? 'Assigning…' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Call Modal (Schedule or Log) */}
        <Dialog open={!!callModalLead} onOpenChange={() => setCallModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Phone className="w-5 h-5 text-indigo-600" />
                {callModalMode === 'schedule' ? 'Schedule Call' : 'Log Call Outcome'} · {callModalLead?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex border-b border-slate-200 mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCallModalMode('schedule')}
                className={`pb-2 px-3 border-b-2 transition ${callModalMode === 'schedule' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Schedule Call
              </button>
              <button
                type="button"
                onClick={() => setCallModalMode('log')}
                className={`pb-2 px-3 border-b-2 transition ${callModalMode === 'log' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
              >
                Log Call Outcome
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {callModalMode === 'schedule' ? (
                <>
                  <div>
                    <label className="font-semibold text-slate-700">Call Date & Time *</label>
                    <Input
                      type="datetime-local"
                      value={callScheduleTime}
                      onChange={(e) => setCallScheduleTime(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Purpose / Agenda</label>
                    <Input
                      value={callPurpose}
                      onChange={(e) => setCallPurpose(e.target.value)}
                      placeholder="e.g. Discovery & Space Discussion"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Preparation Notes</label>
                    <Textarea
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Key questions or points to discuss..."
                      rows={2}
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-700">Call Outcome *</label>
                    <select
                      value={callOutcomeStatus}
                      onChange={(e) => setCallOutcomeStatus(e.target.value)}
                      className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white font-medium"
                    >
                      <option value="completed">Completed (Call Connected & Discussed)</option>
                      <option value="no_answer">No Answer / Ringing / Busy</option>
                      <option value="rescheduled">Rescheduled / Requested Callback</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Call Duration (Minutes)</label>
                    <Input
                      type="number"
                      min="1"
                      value={callDuration}
                      onChange={(e) => setCallDuration(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Call Discussion Notes *</label>
                    <Textarea
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Summary of discussion, client reaction, objections, next steps..."
                      rows={3}
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCallModalLead(null)}>Cancel</Button>
                <Button onClick={handleExecuteCall} disabled={savingCall} className="bg-indigo-600 text-white">
                  {savingCall ? 'Saving…' : callModalMode === 'schedule' ? 'Schedule Call' : 'Log Outcome'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 4. Demo Modal (Schedule or Log) */}
        <Dialog open={!!demoModalLead} onOpenChange={() => setDemoModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Video className="w-5 h-5 text-purple-600" />
                {demoModalMode === 'schedule' ? 'Schedule Franchise Demo' : 'Log Demo Outcome'} · {demoModalLead?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex border-b border-slate-200 mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDemoModalMode('schedule')}
                className={`pb-2 px-3 border-b-2 transition ${demoModalMode === 'schedule' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}
              >
                Schedule Demo
              </button>
              <button
                type="button"
                onClick={() => setDemoModalMode('log')}
                className={`pb-2 px-3 border-b-2 transition ${demoModalMode === 'log' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}
              >
                Log Demo Outcome
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {demoModalMode === 'schedule' ? (
                <>
                  <div>
                    <label className="font-semibold text-slate-700">Demo Date & Time *</label>
                    <Input
                      type="datetime-local"
                      value={demoScheduleTime}
                      onChange={(e) => setDemoScheduleTime(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Demo Format</label>
                    <select
                      value={demoType}
                      onChange={(e) => setDemoType(e.target.value)}
                      className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white font-medium"
                    >
                      <option value="online_meet">Online Meeting (Google Meet / Zoom)</option>
                      <option value="in_person_center">In-Person Center Visit</option>
                      <option value="presentation">Presentation & Commercials</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Meeting Link / Location</label>
                    <Input
                      value={demoLink}
                      onChange={(e) => setDemoLink(e.target.value)}
                      placeholder="e.g. https://meet.google.com/xyz or Center address"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Agenda / Demo Notes</label>
                    <Textarea
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      placeholder="Curriculum overview, ROI sheet, student fee model..."
                      rows={2}
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-700">Demo Outcome Status *</label>
                    <select
                      value={demoOutcomeStatus}
                      onChange={(e) => setDemoOutcomeStatus(e.target.value)}
                      className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white font-medium"
                    >
                      <option value="completed">Conducted Successfully</option>
                      <option value="no_show">Candidate Did Not Show Up</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Candidate Interest Level</label>
                    <select
                      value={demoInterestLevel}
                      onChange={(e) => setDemoInterestLevel(e.target.value)}
                      className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white font-medium"
                    >
                      <option value="high">🔥 High Interest (Ready to proceed)</option>
                      <option value="medium">Medium Interest (Evaluating location/funds)</option>
                      <option value="low">Low Interest / Skeptical</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Demo Feedback & Next Steps *</label>
                    <Textarea
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      placeholder="Questions asked, space availability confirmed, agreement shared..."
                      rows={3}
                      className="mt-1 text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDemoModalLead(null)}>Cancel</Button>
                <Button onClick={handleExecuteDemo} disabled={savingDemo} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {savingDemo ? 'Saving…' : demoModalMode === 'schedule' ? 'Schedule Demo' : 'Log Demo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 5. Follow-up Modal */}
        <Dialog open={!!followupModalLead} onOpenChange={() => setFollowupModalLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Clock className="w-5 h-5 text-orange-600" /> Schedule Follow-up · {followupModalLead?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs mt-2">
              <div>
                <label className="font-semibold text-slate-700">Follow-up Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Follow-up Purpose / Reminder Note *</label>
                <Textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="e.g. Check on bank sanction, confirm lease agreement signing..."
                  rows={3}
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setFollowupModalLead(null)}>Cancel</Button>
                <Button onClick={handleExecuteFollowup} disabled={savingFollowup} className="bg-orange-600 text-white">
                  {savingFollowup ? 'Scheduling…' : 'Save Follow-up'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 6. Lead Details & Timeline Drawer / Modal */}
        <Dialog open={!!activeLeadDetails} onOpenChange={() => setActiveLeadDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold text-slate-800 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>{activeLeadDetails?.name}</span>
                  {activeLeadDetails?.status && renderStatusBadge(activeLeadDetails.status)}
                </div>
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading details…</div>
            ) : activeLeadDetails ? (
              <div className="space-y-4 text-xs mt-2">
                {/* Contact and details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Phone</span>
                    <p className="font-medium text-slate-900 mt-0.5">{activeLeadDetails.phone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Email</span>
                    <p className="font-medium text-slate-900 mt-0.5 truncate">{activeLeadDetails.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Location</span>
                    <p className="font-medium text-slate-900 mt-0.5">{activeLeadDetails.city || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Commercial Space</span>
                    <p className="font-medium text-slate-900 mt-0.5 capitalize">{activeLeadDetails.has_space || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Investment Budget</span>
                    <p className="font-medium text-slate-900 mt-0.5">{activeLeadDetails.investment_budget || '₹2.5 Lakhs'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Executive</span>
                    <p className="font-medium text-indigo-700 mt-0.5">{activeLeadDetails.assigned_to_name || 'Unassigned'}</p>
                  </div>
                </div>

                {activeLeadDetails.details && (
                  <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                    <span className="text-[10px] font-semibold text-amber-800 uppercase">Enquiry Notes / Reason</span>
                    <p className="text-slate-700 mt-1 whitespace-pre-wrap">{activeLeadDetails.details}</p>
                  </div>
                )}

                {/* Actions Bar (School CRM Style) */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-700 text-xs">Actions:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditLead(activeLeadDetails)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold transition"
                    >
                      <Edit className="w-3 h-3 text-amber-600" />
                      <span>Edit</span>
                    </button>

                    {/* Demo Schedule */}
                    <button
                      type="button"
                      onClick={() => openScheduleDemo(activeLeadDetails)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 font-semibold transition"
                    >
                      <CalendarClock className="w-3 h-3 text-purple-600" />
                      <span>Demo Schedule</span>
                    </button>

                    {/* Demo Done */}
                    <button
                      type="button"
                      onClick={() => openDemoDone(activeLeadDetails)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1 font-semibold transition"
                    >
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      <span>Demo Done</span>
                    </button>

                    {/* Lost Lead */}
                    {activeLeadDetails.status !== 'lost' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowLostModal(activeLeadDetails);
                          setLostReason('');
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 font-semibold transition"
                      >
                        <X className="w-3 h-3 text-rose-600" />
                        <span>Lost Lead</span>
                      </button>
                    )}

                    {/* Call */}
                    <button
                      type="button"
                      onClick={() => {
                        setCallModalLead(activeLeadDetails);
                        setCallModalMode(activeLeadDetails.scheduled_call_at ? 'log' : 'schedule');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 font-semibold transition"
                    >
                      <Phone className="w-3 h-3 text-indigo-600" />
                      <span>Call</span>
                    </button>

                    {/* Followup */}
                    <button
                      type="button"
                      onClick={() => setFollowupModalLead(activeLeadDetails)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1 font-semibold transition"
                    >
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span>Follow-up</span>
                    </button>

                    {/* Convert */}
                    {activeLeadDetails.status !== 'converted' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeLeadDetails.id, 'converted')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-semibold transition"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Convert</span>
                      </button>
                    )}

                    {/* Delete */}
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(activeLeadDetails)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 font-semibold transition"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Activity & Comment Timeline */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" /> Activity History & Comments
                  </h4>

                  {/* Add note */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an internal note or update..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={savingComment || !newCommentText.trim()}
                      className="h-8 bg-indigo-600 text-white"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2 max-h-56 overflow-y-auto">
                    {/* Comments */}
                    {(activeLeadDetails.comments || []).slice().reverse().map((c, idx) => (
                      <div key={c.id || idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px]">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="font-bold text-slate-700">{c.user_name || 'Team'}</span>
                          <span>{c.created_at ? new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="text-slate-800 mt-1">{c.text}</p>
                      </div>
                    ))}

                    {/* Historical Activities from DB */}
                    {leadActivities.map((act, idx) => (
                      <div key={act.id || idx} className="p-2 bg-indigo-50/40 border border-indigo-100 rounded-lg text-[11px]">
                        <div className="flex items-center justify-between text-indigo-600 text-[10px]">
                          <span className="font-bold">{act.user_name} · {act.action.replace('_', ' ').toUpperCase()}</span>
                          <span>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        {act.details?.notes && <p className="text-slate-700 mt-0.5">{act.details.notes}</p>}
                        {act.details?.call_notes && <p className="text-slate-700 mt-0.5">{act.details.call_notes}</p>}
                        {act.details?.demo_notes && <p className="text-slate-700 mt-0.5">{act.details.demo_notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* 7. Edit Franchise Lead Modal */}
        <Dialog open={!!showEditLeadModal} onOpenChange={() => setShowEditLeadModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Edit className="w-5 h-5 text-amber-600" /> Edit Franchise Lead · {showEditLeadModal?.name}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditLead} className="space-y-3 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Full Name *</label>
                  <Input
                    required
                    value={editLeadForm.name}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Phone Number *</label>
                  <Input
                    required
                    value={editLeadForm.phone}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Email Address</label>
                  <Input
                    type="email"
                    value={editLeadForm.email}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">City / Town *</label>
                  <Input
                    required
                    value={editLeadForm.city}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">State</label>
                  <Input
                    value={editLeadForm.state}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, state: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Current Occupation</label>
                  <Input
                    value={editLeadForm.occupation}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="e.g. Business Owner, Educator"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Pipeline Stage / Status</label>
                  <select
                    value={editLeadForm.status}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, status: e.target.value }))}
                    className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white font-medium"
                  >
                    {STAGES.filter(s => s.value !== 'all').map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Has Commercial Space?</label>
                  <select
                    value={editLeadForm.has_space}
                    onChange={(e) => setEditLeadForm(prev => ({ ...prev, has_space: e.target.value }))}
                    className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white"
                  >
                    <option value="owned">Owned space (500+ sq ft)</option>
                    <option value="rented">Rented / Leased</option>
                    <option value="looking">Actively Looking</option>
                    <option value="none">No Space Yet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Investment Budget</label>
                <Input
                  value={editLeadForm.investment_budget}
                  onChange={(e) => setEditLeadForm(prev => ({ ...prev, investment_budget: e.target.value }))}
                  placeholder="₹2.5 Lakhs"
                  className="mt-1 text-xs"
                />
              </div>

              {/* Demo Session Scheduled */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editLeadForm.demo_session_scheduled}
                      onChange={(e) => setEditLeadForm(prev => ({ ...prev, demo_session_scheduled: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Demo Session is Scheduled?</span>
                  </label>
                  {editLeadForm.demo_session_scheduled && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Demo Scheduled
                    </span>
                  )}
                </div>

                {editLeadForm.demo_session_scheduled && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Demo Date & Time (Optional)</label>
                      <Input
                        type="datetime-local"
                        value={editLeadForm.scheduled_demo_at}
                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, scheduled_demo_at: e.target.value }))}
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Demo Mode</label>
                      <select
                        value={editLeadForm.demo_type}
                        onChange={(e) => setEditLeadForm(prev => ({ ...prev, demo_type: e.target.value }))}
                        className="mt-1 w-full h-9 border border-slate-200 rounded-md px-2 text-xs bg-white"
                      >
                        <option value="online_meet">Online Google Meet / Zoom</option>
                        <option value="in_person_center">In-Person at Center</option>
                        <option value="presentation">Presentation / Phone Walkthrough</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700">Details / Background Notes</label>
                <Textarea
                  value={editLeadForm.details}
                  onChange={(e) => setEditLeadForm(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Notes, background or specific requirements..."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowEditLeadModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEditLead} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {savingEditLead ? 'Saving…' : 'Update Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 8. Lost Lead Reason Modal */}
        <Dialog open={!!showLostModal} onOpenChange={() => setShowLostModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-800">
                <X className="w-5 h-5 text-rose-600" /> Mark Lead as Lost · {showLostModal?.name}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmLost} className="space-y-3 text-xs mt-2">
              <p className="text-slate-600">
                Are you sure you want to mark <span className="font-semibold text-slate-800">{showLostModal?.name}</span> as lost? Please specify the reason below for tracking purposes.
              </p>

              <div>
                <label className="font-semibold text-slate-700">Reason for Lost Lead *</label>
                <Textarea
                  required
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="e.g. Budget constraints, opted for competitor, space unavailable, unreachable after multiple attempts..."
                  rows={3}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowLostModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingLost} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {savingLost ? 'Marking Lost…' : 'Confirm Lost Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 9. Delete Confirmation Modal */}
        <Dialog open={!!showDeleteModal} onOpenChange={() => setShowDeleteModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600">
                <Trash2 className="w-5 h-5 text-red-600" /> Delete Franchise Lead
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs mt-2">
              <p className="text-slate-600">
                Are you sure you want to permanently delete lead <span className="font-semibold text-slate-900">{showDeleteModal?.name}</span> ({showDeleteModal?.phone})?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px]">
                <strong>Warning:</strong> This will permanently delete the lead record along with all associated call logs, scheduled demos, and activity timeline entries.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowDeleteModal(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingLead}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deletingLead ? 'Deleting…' : 'Permanently Delete'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
