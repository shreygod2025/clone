import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Phone, Video, Calendar, Clock, CheckCircle2,
  AlertCircle, Search, Filter, Plus, ChevronRight, UserCheck,
  UserPlus, MessageSquare, BarChart3, ArrowUpDown, RefreshCw,
  ExternalLink, Eye, Check, X, Shield, Star, Award, TrendingUp,
  MapPin, Mail, Briefcase, FileText, ChevronDown, Send, ArrowRight,
  Edit, Trash2, CalendarClock, Upload, Download, LayoutGrid, List,
  Ticket, Paperclip, Archive, History, RefreshCcw, DollarSign,
  ClipboardList, CheckSquare, Tag, Globe, Sparkles, School
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = [
  { value: 'all', label: 'All Leads', dotColor: 'bg-slate-400' },
  { value: 'new', label: 'New Leads', dotColor: 'bg-blue-500' },
  { value: 'meeting_done', label: 'Meeting Done', dotColor: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', dotColor: 'bg-emerald-500' },
  { value: 'active', label: 'Active Schools', dotColor: 'bg-green-600' },
  { value: 'call_scheduled', label: 'Renewal Meeting', dotColor: 'bg-teal-500' },
  { value: 'follow_up', label: 'Renewed', dotColor: 'bg-amber-500' },
  { value: 'lost', label: 'Lost', dotColor: 'bg-rose-500' },
  { value: 'archived', label: 'Archived', dotColor: 'bg-slate-500' },
];

export default function AdminB2BCRM() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isManager = isAdmin || Boolean(user?.is_manager) || ['sales_manager', 'b2b_manager'].includes(user?.role);

  // Sub-navigation tabs: 'leads' | 'dashboard' | 'tracksheet'
  const [activeSubTab, setActiveSubTab] = useState('leads');

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Leads list state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingTelecalling, setSyncingTelecalling] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [searchStageOnly, setSearchStageOnly] = useState(false);
  const [selectedStage, setSelectedStage] = useState('new');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedOffering, setSelectedOffering] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name_asc'

  // Multi-select for bulk assign
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Eligible assignees
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Tracksheet state
  const [tracksheetData, setTracksheetData] = useState(null);
  const [tracksheetLoading, setTracksheetLoading] = useState(false);
  const [trackDateFilter, setTrackDateFilter] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trackUserFilter, setTrackUserFilter] = useState('all');

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null); // lead doc or 'bulk'
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // Edit / Proposal Modal
  const [showEditLeadModal, setShowEditLeadModal] = useState(null);
  const [editLeadForm, setEditLeadForm] = useState({
    school_name: '', name: '', phone: '', alt_phone: '', email: '',
    city: '', state: '', role: '', board: '', deal_size: '', status: 'new',
    proposal_amount: '', notes: '',
    demo_session_scheduled: false, scheduled_demo_at: '', demo_type: 'offline', demo_link: '',
  });
  const [savingEditLead, setSavingEditLead] = useState(false);

  // Meeting Done Modal
  const [showMeetingDoneModal, setShowMeetingDoneModal] = useState(null);
  const [meetingDoneData, setMeetingDoneData] = useState({
    outcome: 'completed', notes: '', interest_level: 'high'
  });
  const [savingMeetingDone, setSavingMeetingDone] = useState(false);

  // Schedule Meeting / Demo Modal
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(null);
  const [scheduleMeetingData, setScheduleMeetingData] = useState({
    date: '', time: '', type: 'online_meet', link: '', agenda: 'B2B School Lab Curriculum Presentation'
  });
  const [savingScheduleMeeting, setSavingScheduleMeeting] = useState(false);

  // Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(null);
  const [ticketData, setTicketData] = useState({
    subject: '', description: '', priority: 'medium'
  });
  const [savingTicket, setSavingTicket] = useState(false);

  // Followup Modal
  const [showFollowupModal, setShowFollowupModal] = useState(null);
  const [followupTime, setFollowupTime] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Docs Modal
  const [showDocsModal, setShowDocsModal] = useState(null);

  // Mail Modal
  const [showMailModal, setShowMailModal] = useState(null);
  const [mailData, setMailData] = useState({
    to: '', subject: 'OLL Robotics & AI Lab Proposal for Schools', body: '', template: 'intro'
  });
  const [sendingMail, setSendingMail] = useState(false);

  // Note Modal
  const [showNoteModal, setShowNoteModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Lost Lead Modal
  const [showLostModal, setShowLostModal] = useState(null);
  const [lostReason, setLostReason] = useState('Not interested');
  const [lostNotes, setLostNotes] = useState('');
  const [savingLost, setSavingLost] = useState(false);

  // Delete Lead Modal
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deletingLead, setDeletingLead] = useState(false);

  // Excel Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importAssignMode, setImportAssignMode] = useState('unassigned');
  const [importAssignedTo, setImportAssignedTo] = useState('');
  const [importAutoPool, setImportAutoPool] = useState([]);
  const [importBatchName, setImportBatchName] = useState('');
  const [uploadingImport, setUploadingImport] = useState(false);

  // Lead Details Drawer
  const [activeLeadDetails, setActiveLeadDetails] = useState(null);

  // Add Lead Form
  const [newLeadForm, setNewLeadForm] = useState({
    school_name: '', name: '', phone: '', alt_phone: '', email: '',
    city: '', state: '', role: 'Principal', board: 'CBSE',
    deal_size: '', source: 'manual', notes: '', assigned_to: '',
    demo_session_scheduled: false, scheduled_demo_at: '', demo_type: 'offline', demo_link: '',
    followup_scheduled: false, next_followup_at: '', followup_notes: '',
  });
  const [savingNewLead, setSavingNewLead] = useState(false);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/b2b-crm/leads`, {
        headers: getAuthHeaders(),
        params: {
          search: search || undefined,
          stage: selectedStage === 'all' ? undefined : selectedStage,
          assignee: selectedAssignee === 'all' ? undefined : selectedAssignee,
          limit: 1000,
        },
      });
      setLeads(res.data?.leads || []);
      setTotalLeads(res.data?.total || 0);
      setStatusCounts(res.data?.status_counts || {});
    } catch (err) {
      console.error('Failed to load B2B leads:', err);
      toast.error('Failed to load B2B leads');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, search, selectedStage, selectedAssignee]);

  // Fetch assignees
  const fetchAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    try {
      const res = await axios.get(`${API}/b2b-crm/assignees`, {
        headers: getAuthHeaders(),
      });
      setAssignees(res.data?.assignees || []);
    } catch (err) {
      console.error('Failed to load B2B assignees:', err);
    } finally {
      setLoadingAssignees(false);
    }
  }, [getAuthHeaders]);

  // Fetch tracksheet
  const fetchTracksheet = useCallback(async () => {
    setTracksheetLoading(true);
    try {
      const res = await axios.get(`${API}/b2b-crm/tracksheet`, {
        headers: getAuthHeaders(),
        params: {
          range: trackDateFilter,
          from_date: trackDateFilter === 'custom' ? customFrom : undefined,
          to_date: trackDateFilter === 'custom' ? customTo : undefined,
          user_id: trackUserFilter === 'all' ? undefined : trackUserFilter,
        },
      });
      setTracksheetData(res.data);
    } catch (err) {
      console.error('Failed to load B2B tracksheet:', err);
    } finally {
      setTracksheetLoading(false);
    }
  }, [getAuthHeaders, trackDateFilter, customFrom, customTo, trackUserFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  useEffect(() => {
    if (activeSubTab === 'tracksheet') {
      fetchTracksheet();
    }
  }, [activeSubTab, fetchTracksheet]);

  // Unique cities list for dropdown
  const uniqueCities = useMemo(() => {
    const s = new Set();
    leads.forEach(l => {
      if (l.city && l.city.trim()) s.add(l.city.trim());
    });
    return Array.from(s).sort();
  }, [leads]);

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Stage filtering helper
    if (selectedStage !== 'all') {
      if (selectedStage === 'meeting_done') {
        result = result.filter(l => ['demo_completed', 'meeting_done'].includes(l.status));
      } else if (selectedStage === 'converted') {
        result = result.filter(l => ['converted', 'won'].includes(l.status));
      } else if (selectedStage === 'active') {
        result = result.filter(l => ['active', 'converted'].includes(l.status));
      } else if (selectedStage === 'call_scheduled') {
        result = result.filter(l => ['call_scheduled', 'renewal_meeting'].includes(l.status));
      } else if (selectedStage === 'follow_up') {
        result = result.filter(l => ['follow_up', 'renewed'].includes(l.status));
      } else if (selectedStage === 'lost') {
        result = result.filter(l => ['lost', 'lost_lead'].includes(l.status));
      } else if (selectedStage === 'archived') {
        result = result.filter(l => l.status === 'archived');
      } else {
        result = result.filter(l => l.status === selectedStage);
      }
    }

    // City filter
    if (selectedCity !== 'all') {
      result = result.filter(l => (l.city || '').toLowerCase() === selectedCity.toLowerCase());
    }

    // Offering / Board filter
    if (selectedOffering !== 'all') {
      result = result.filter(l => (l.board || '').toLowerCase().includes(selectedOffering.toLowerCase()) || (l.notes || '').toLowerCase().includes(selectedOffering.toLowerCase()));
    }

    // Assignee filter
    if (selectedAssignee === 'unassigned') {
      result = result.filter(l => !l.assigned_to);
    } else if (selectedAssignee !== 'all') {
      result = result.filter(l => l.assigned_to === selectedAssignee);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(l =>
        (l.school_name || '').toLowerCase().includes(q) ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.board || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.school_name || a.name || '').localeCompare(b.school_name || b.name || ''));
    }

    return result;
  }, [leads, selectedStage, selectedCity, selectedOffering, selectedAssignee, search, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export');
      return;
    }
    const headers = ['School Name', 'Contact Person', 'Phone', 'Email', 'City', 'Board', 'Deal Size', 'Status', 'Assigned To', 'Created At'];
    const rows = filteredLeads.map(l => [
      `"${(l.school_name || l.name || '').replace(/"/g, '""')}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.city || ''}"`,
      `"${l.board || ''}"`,
      `"${l.deal_size || ''}"`,
      `"${l.status || ''}"`,
      `"${l.assigned_to_name || ''}"`,
      `"${l.created_at || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `b2b-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLeads.length} leads to CSV`);
  };

  // Sync Telecalling
  const handleSyncTelecalling = async () => {
    setSyncingTelecalling(true);
    try {
      await fetchLeads();
      toast.success('Synchronized with Telecalling & database!');
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingTelecalling(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (lead) => {
    const isOnline = lead.demo_type === 'online' || lead.demo_type === 'online_meet';
    setEditLeadForm({
      id: lead.id,
      school_name: lead.school_name || lead.name || '',
      name: lead.name || '',
      phone: lead.phone || '',
      alt_phone: lead.alt_phone || '',
      email: lead.email || '',
      city: lead.city || '',
      state: lead.state || '',
      role: lead.role || '',
      board: lead.board || 'CBSE',
      deal_size: lead.deal_size || '',
      status: lead.status || 'new',
      proposal_amount: lead.proposal_amount || lead.deal_size || '',
      notes: lead.notes || '',
      demo_session_scheduled: !!lead.scheduled_demo_at,
      scheduled_demo_at: lead.scheduled_demo_at ? (lead.scheduled_demo_at.length > 16 ? lead.scheduled_demo_at.slice(0, 16) : lead.scheduled_demo_at) : '',
      demo_type: isOnline ? 'online' : 'offline',
      demo_link: lead.demo_link || '',
    });
    setShowEditLeadModal(lead);
  };

  // Submit Edit Modal
  const handleSaveEditLead = async (e) => {
    e.preventDefault();
    if (!showEditLeadModal) return;
    setSavingEditLead(true);
    try {
      const payload = {
        ...editLeadForm,
        scheduled_demo_at: editLeadForm.demo_session_scheduled && editLeadForm.scheduled_demo_at ? editLeadForm.scheduled_demo_at : null,
        demo_type: editLeadForm.demo_type || 'offline',
        demo_link: editLeadForm.demo_link || '',
      };
      await axios.put(`${API}/b2b-crm/leads/${showEditLeadModal.id}`, payload, {
        headers: getAuthHeaders(),
      });
      toast.success('B2B lead updated successfully');
      setShowEditLeadModal(null);
      fetchLeads();
      if (activeLeadDetails?.id === showEditLeadModal.id) {
        setActiveLeadDetails(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update lead');
    } finally {
      setSavingEditLead(false);
    }
  };

  // Meeting / Demo Done
  const openMeetingDoneModal = (lead) => {
    setShowMeetingDoneModal(lead);
    setMeetingDoneData({ outcome: 'completed', notes: '', interest_level: 'high' });
  };

  const handleMeetingDoneSubmit = async () => {
    if (!showMeetingDoneModal) return;
    setSavingMeetingDone(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${showMeetingDoneModal.id}/log-demo`,
        {
          demo_status: meetingDoneData.outcome,
          demo_notes: meetingDoneData.notes,
          interest_level: meetingDoneData.interest_level,
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Meeting / Demo logged as Done!');
      setShowMeetingDoneModal(null);
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to log meeting');
    } finally {
      setSavingMeetingDone(false);
    }
  };

  // Schedule Meeting / Demo
  const openScheduleMeetingModal = (lead) => {
    const isOnline = lead?.demo_type === 'online' || lead?.demo_type === 'online_meet';
    setShowScheduleMeetingModal(lead);
    setScheduleMeetingData({
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time: '11:00',
      type: isOnline ? 'online' : 'offline',
      link: isOnline ? (lead?.demo_link || 'https://meet.google.com/oll-b2b-schools') : (lead?.demo_link || ''),
      agenda: 'School Robotics & AI Lab Presentation',
    });
  };

  const handleScheduleMeetingSubmit = async () => {
    if (!showScheduleMeetingModal || !scheduleMeetingData.date) {
      toast.error('Please pick a date');
      return;
    }
    setSavingScheduleMeeting(true);
    try {
      const isoTime = `${scheduleMeetingData.date}T${scheduleMeetingData.time || '10:00'}:00`;
      await axios.post(
        `${API}/b2b-crm/leads/${showScheduleMeetingModal.id}/schedule-demo`,
        {
          scheduled_demo_at: isoTime,
          demo_type: scheduleMeetingData.type,
          demo_link: scheduleMeetingData.link,
          demo_notes: scheduleMeetingData.agenda,
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Meeting scheduled successfully!');
      setShowScheduleMeetingModal(null);
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to schedule meeting');
    } finally {
      setSavingScheduleMeeting(false);
    }
  };

  // Raise Ticket
  const openTicketModal = (lead) => {
    setShowTicketModal(lead);
    setTicketData({
      subject: `Support required for ${lead.school_name || lead.name}`,
      description: '',
      priority: 'medium',
    });
  };

  const handleTicketSubmit = async () => {
    if (!showTicketModal || !ticketData.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    setSavingTicket(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${showTicketModal.id}/ticket`,
        ticketData,
        { headers: getAuthHeaders() }
      );
      toast.success('Support ticket raised successfully!');
      setShowTicketModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to raise ticket');
    } finally {
      setSavingTicket(false);
    }
  };

  // Followup Modal
  const openFollowupModal = (lead) => {
    setShowFollowupModal(lead);
    setFollowupTime(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16));
    setFollowupNotes('');
  };

  const handleFollowupSubmit = async () => {
    if (!showFollowupModal || !followupTime) {
      toast.error('Please select follow-up date and time');
      return;
    }
    setSavingFollowup(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${showFollowupModal.id}/schedule-followup`,
        {
          next_followup_at: followupTime,
          followup_notes: followupNotes.trim() || 'Follow-up discussion',
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Follow-up scheduled successfully');
      setShowFollowupModal(null);
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to schedule follow-up');
    } finally {
      setSavingFollowup(false);
    }
  };

  // Mail Modal
  const openMailModal = (lead) => {
    setShowMailModal(lead);
    setMailData({
      to: lead.email || '',
      subject: `OLL Robotics & AI Lab Offerings - ${lead.school_name || lead.name}`,
      body: `Dear ${lead.name || 'Principal'},\n\nGreetings from OLL (Online Live Learning). We are delighted to present our comprehensive turnkey Robotics, Coding, and AI curriculum for your institution.\n\nBest regards,\nOLL Institutional Partnerships Team`,
      template: 'intro',
    });
  };

  const handleMailSubmit = async () => {
    if (!showMailModal || !mailData.to) {
      toast.error('Email address is required');
      return;
    }
    setSendingMail(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${showMailModal.id}/comments`,
        { text: `✉️ Email sent to ${mailData.to}: "${mailData.subject}"` },
        { headers: getAuthHeaders() }
      );
      toast.success(`Email dispatched to ${mailData.to}`);
      setShowMailModal(null);
      fetchLeads();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingMail(false);
    }
  };

  // Quick Note Modal
  const openNoteModal = (lead) => {
    setShowNoteModal(lead);
    setNewComment('');
  };

  const handleNoteSubmit = async () => {
    if (!showNoteModal || !newComment.trim()) {
      toast.error('Note content is required');
      return;
    }
    setSavingComment(true);
    try {
      await axios.post(
        `${API}/b2b-crm/leads/${showNoteModal.id}/comments`,
        { text: newComment.trim() },
        { headers: getAuthHeaders() }
      );
      toast.success('Note added');
      setShowNoteModal(null);
      fetchLeads();
      if (activeLeadDetails?.id === showNoteModal.id) {
        setActiveLeadDetails(prev => ({
          ...prev,
          comments: [...(prev.comments || []), { user_name: user?.name, text: newComment.trim(), created_at: new Date().toISOString() }]
        }));
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSavingComment(false);
    }
  };

  // Lost Lead Modal
  const openLostModal = (lead) => {
    setShowLostModal(lead);
    setLostReason('Not interested');
    setLostNotes('');
  };

  const handleConfirmLost = async () => {
    if (!showLostModal) return;
    setSavingLost(true);
    try {
      await axios.patch(
        `${API}/b2b-crm/leads/${showLostModal.id}/status`,
        { status: 'lost', notes: lostNotes.trim(), lost_reason: lostReason },
        { headers: getAuthHeaders() }
      );
      toast.success('Lead marked as Lost');
      setShowLostModal(null);
      fetchLeads();
    } catch {
      toast.error('Failed to mark lead as lost');
    } finally {
      setSavingLost(false);
    }
  };

  // Archive Lead
  const handleArchiveLead = async (lead) => {
    if (!window.confirm(`Archive B2B lead "${lead.school_name || lead.name}"?`)) return;
    try {
      await axios.patch(
        `${API}/b2b-crm/leads/${lead.id}/status`,
        { status: 'archived', notes: 'Lead archived' },
        { headers: getAuthHeaders() }
      );
      toast.success('Lead archived');
      fetchLeads();
    } catch {
      toast.error('Failed to archive lead');
    }
  };

  // Delete Lead
  const openDeleteModal = (lead) => {
    setShowDeleteModal(lead);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteModal) return;
    setDeletingLead(true);
    try {
      await axios.delete(`${API}/b2b-crm/leads/${showDeleteModal.id}`, {
        headers: getAuthHeaders(),
      });
      toast.success('Lead permanently deleted');
      setShowDeleteModal(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setDeletingLead(false);
    }
  };

  // Assign Modal
  const openAssignModal = (lead) => {
    setShowAssignModal(lead);
    setSelectedAssigneeId(lead?.assigned_to || '');
    setAssignmentNote('');
  };

  const handleConfirmAssign = async () => {
    if (!showAssignModal || !selectedAssigneeId) {
      toast.error('Please choose a team member');
      return;
    }
    setSavingAssign(true);
    try {
      if (showAssignModal === 'bulk') {
        await axios.post(
          `${API}/b2b-crm/leads/bulk-assign`,
          { lead_ids: selectedLeadIds, assigned_to: selectedAssigneeId, notes: assignmentNote },
          { headers: getAuthHeaders() }
        );
        toast.success(`Assigned ${selectedLeadIds.length} leads`);
        setSelectedLeadIds([]);
      } else {
        await axios.post(
          `${API}/b2b-crm/leads/${showAssignModal.id}/assign`,
          { assigned_to: selectedAssigneeId, notes: assignmentNote },
          { headers: getAuthHeaders() }
        );
        toast.success('Lead assigned successfully');
      }
      setShowAssignModal(null);
      fetchLeads();
      fetchAssignees();
    } catch {
      toast.error('Assignment failed');
    } finally {
      setSavingAssign(false);
    }
  };

  // Add Lead Modal Submit
  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLeadForm.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setSavingNewLead(true);
    try {
      const payload = {
        ...newLeadForm,
        school_name: newLeadForm.school_name.trim(),
        name: newLeadForm.name.trim() || newLeadForm.school_name.trim(),
        phone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim(),
        city: newLeadForm.city.trim(),
        scheduled_demo_at: newLeadForm.demo_session_scheduled && newLeadForm.scheduled_demo_at ? newLeadForm.scheduled_demo_at : null,
        demo_type: newLeadForm.demo_type || 'offline',
        demo_link: newLeadForm.demo_link || '',
        next_followup_at: newLeadForm.followup_scheduled && newLeadForm.next_followup_at ? newLeadForm.next_followup_at : null,
      };
      await axios.post(`${API}/b2b-crm/leads`, payload, { headers: getAuthHeaders() });
      toast.success('B2B lead added successfully');
      setShowAddLeadModal(false);
      setNewLeadForm({
        school_name: '', name: '', phone: '', alt_phone: '', email: '',
        city: '', state: '', role: 'Principal', board: 'CBSE',
        deal_size: '', source: 'manual', notes: '', assigned_to: '',
        demo_session_scheduled: false, scheduled_demo_at: '', demo_type: 'offline', demo_link: '',
        followup_scheduled: false, next_followup_at: '', followup_notes: '',
      });
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create lead');
    } finally {
      setSavingNewLead(false);
    }
  };

  // Excel Import Submit
  const handleExcelImportSubmit = async () => {
    if (!importFile) {
      toast.error('Please select an Excel file (.xlsx) to import');
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
    } catch {
      toast.error('Failed to download template');
    }
  };

  return (
    <AdminLayout title="B2B CRM">
      <div className="max-w-[1600px] mx-auto space-y-4 pb-16 px-1 sm:px-2">

        {/* ── Top Header Row ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] tracking-tight">B2B CRM</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/admin/schools')}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
              data-testid="onboarding-tracker-btn"
            >
              <ClipboardList className="w-3.5 h-3.5" /> ONBOARDING TRACKER
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="bg-[#D63031] hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
              data-testid="pricing-btn"
            >
              <DollarSign className="w-3.5 h-3.5" /> PRICING
            </button>
            {isManager && (
              <button
                type="button"
                onClick={() => setActiveSubTab(activeSubTab === 'tracksheet' ? 'leads' : 'tracksheet')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                data-testid="tracksheet-btn"
              >
                <BarChart3 className="w-3.5 h-3.5" /> TRACK SHEET
              </button>
            )}
          </div>
        </div>

        {/* ── Sub Navigation Tabs ───────────────────────────────────── */}
        <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`pb-2.5 flex items-center gap-1.5 transition ${
              activeSubTab === 'dashboard'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('leads')}
            className={`pb-2.5 flex items-center gap-1.5 transition ${
              activeSubTab === 'leads'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Leads & Schools
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tracksheet')}
            className={`pb-2.5 flex items-center gap-1.5 transition ${
              activeSubTab === 'tracksheet'
                ? 'text-slate-900 border-b-2 border-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Contact Management
          </button>
        </div>

        {/* ════════════════════ VIEW: TRACKSHEET / REPORT ════════════════════ */}
        {activeSubTab === 'tracksheet' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> B2B Calling & Demo Performance Track Sheet
              </h2>
              <div className="flex items-center gap-2">
                {['today', 'week', 'month'].map(r => (
                  <button
                    key={r}
                    onClick={() => setTrackDateFilter(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize border ${
                      trackDateFilter === r
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {tracksheetLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading Track Sheet...</div>
            ) : tracksheetData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Sales Executive</th>
                      <th className="py-2.5 px-3 text-center">Total Assigned</th>
                      <th className="py-2.5 px-3 text-center">Calls Made</th>
                      <th className="py-2.5 px-3 text-center">Calls Picked</th>
                      <th className="py-2.5 px-3 text-center">Demos Sched.</th>
                      <th className="py-2.5 px-3 text-center">Demos Done</th>
                      <th className="py-2.5 px-3 text-center">Follow-ups</th>
                      <th className="py-2.5 px-3 text-center">Converted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(tracksheetData.per_user || []).map(u => (
                      <tr key={u.user_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name} <span className="text-[10px] text-slate-400">({u.role})</span></td>
                        <td className="py-2.5 px-3 text-center font-bold">{u.leads_assigned}</td>
                        <td className="py-2.5 px-3 text-center">{u.calls_made}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">{u.calls_picked}</td>
                        <td className="py-2.5 px-3 text-center text-purple-600 font-medium">{u.demos_scheduled}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-600">{u.demos_completed}</td>
                        <td className="py-2.5 px-3 text-center text-orange-600">{u.followups_scheduled}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{u.converted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {/* ════════════════════ VIEW: DASHBOARD KPI SUMMARY ════════════════════ */}
        {activeSubTab === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase">Total B2B Leads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalLeads}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
              <p className="text-xs text-blue-700 font-medium uppercase">New Leads</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{statusCounts.new || 0}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
              <p className="text-xs text-purple-700 font-medium uppercase">Demos Completed</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{statusCounts.demo_completed || 0}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
              <p className="text-xs text-emerald-700 font-medium uppercase">Converted Schools</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{statusCounts.converted || 0}</p>
            </div>
          </div>
        )}

        {/* ════════════════════ VIEW: LEADS & SCHOOLS (MAIN) ════════════════════ */}
        {activeSubTab === 'leads' && (
          <div className="space-y-3">

            {/* 1. Search Bar Row with 'Search this stage only' */}
            <div className="relative flex items-center bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search by school name, contact or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                data-testid="b2b-search-input"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium ml-3 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={searchStageOnly}
                  onChange={(e) => setSearchStageOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                Search this stage only
              </label>
            </div>

            {/* 2. Filters Row: All people | All Cities | All Offerings | Bulk Import | Newest first */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Assignee Filter */}
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-sm focus:outline-none"
                >
                  <option value="all">All people</option>
                  <option value="unassigned">Unassigned</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                {/* Cities Filter */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-sm focus:outline-none"
                >
                  <option value="all">All Cities</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Offerings / Board Filter */}
                <select
                  value={selectedOffering}
                  onChange={(e) => setSelectedOffering(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-sm focus:outline-none"
                >
                  <option value="all">All Offerings</option>
                  <option value="CBSE">CBSE Board</option>
                  <option value="ICSE">ICSE Board</option>
                  <option value="Robotics">AI & Robotics Lab</option>
                  <option value="Composite">Composite Skill Lab</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* Bulk Import */}
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="h-8 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold shadow-sm flex items-center gap-1.5 transition"
                  data-testid="b2b-bulk-import-btn"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" /> Bulk Import
                </button>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-sm focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name A-Z</option>
                </select>
              </div>
            </div>

            {/* 3. Action Buttons Bar: Grid/List | Sync LMS | Export CSV | + Add Lead */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2">
                {/* Grid / List Toggle */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1 transition ${
                      viewMode === 'grid'
                        ? 'bg-slate-100 text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1 transition ${
                      viewMode === 'list'
                        ? 'bg-slate-100 text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> List
                  </button>
                </div>

                {/* Sync LMS / Sync Telecalling */}
                <button
                  type="button"
                  onClick={handleSyncTelecalling}
                  disabled={syncingTelecalling}
                  className="h-8 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold shadow-sm flex items-center gap-1.5 transition"
                  data-testid="b2b-sync-telecalling-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncingTelecalling ? 'animate-spin' : ''}`} />
                  Sync LMS
                </button>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="h-8 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold shadow-sm flex items-center gap-1.5 transition"
                  data-testid="b2b-export-csv-btn"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
                </button>
              </div>

              {/* + Add Lead (Red Button) */}
              <button
                type="button"
                onClick={() => setShowAddLeadModal(true)}
                className="bg-[#D63031] hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                data-testid="b2b-add-lead-btn"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
            </div>

            {/* 4. Stage Pills Row */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {STAGES.map((s) => {
                const isActive = selectedStage === s.value;
                const count = s.value === 'all'
                  ? totalLeads
                  : s.value === 'new'
                  ? (statusCounts.new || 0)
                  : s.value === 'meeting_done'
                  ? (statusCounts.demo_completed || 0)
                  : s.value === 'converted'
                  ? (statusCounts.converted || 0)
                  : s.value === 'active'
                  ? (statusCounts.converted || 0)
                  : s.value === 'call_scheduled'
                  ? (statusCounts.call_scheduled || 0)
                  : s.value === 'follow_up'
                  ? (statusCounts.follow_up || 0)
                  : s.value === 'lost'
                  ? (statusCounts.lost || 0)
                  : (statusCounts[s.value] || 0);

                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedStage(s.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition border shadow-xs ${
                      isActive
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                    <span>{s.label}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 5. Main Content: Grid or List */}
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading B2B leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No B2B leads found in this view</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View Cards (3 Columns - Just Like School CRM Screenshot) ── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="border border-slate-200/90 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left"
                    data-testid={`b2b-card-${lead.id}`}
                  >
                    <div>
                      {/* Title & Contact */}
                      <h3
                        onClick={() => setActiveLeadDetails(lead)}
                        className="font-bold text-slate-900 text-base leading-snug hover:text-indigo-600 cursor-pointer truncate"
                        title={lead.school_name || lead.name}
                      >
                        {lead.school_name || lead.name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {lead.name ? `${lead.name} · ${lead.role || 'Contact'}` : (lead.role || 'Institution Lead')}
                      </p>

                      {/* Badges Row */}
                      <div className="flex items-center gap-1.5 flex-wrap my-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">
                          {lead.source || 'telecalling'}
                        </span>
                        {(() => {
                          const isOnline = lead.demo_type === 'online' || lead.demo_type === 'online_meet';
                          return (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${
                              isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {isOnline ? <Video className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          );
                        })()}
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded ml-auto">
                          {lead.assigned_to_name ? `👤 ${lead.assigned_to_name}` : 'Viewer Only'}
                        </span>
                      </div>

                      {/* Lead Details */}
                      <div className="space-y-1 text-xs text-slate-600 my-2.5">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.phone}</span>
                        </p>
                        {lead.city && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
                          </p>
                        )}
                        {lead.board && (
                          <p className="text-slate-500">
                            <span className="text-slate-400">Board:</span> <span className="font-semibold text-slate-700">{lead.board}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Added {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}
                        </p>
                      </div>

                      {/* Tag pill */}
                      <div className="my-2">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-semibold">
                          Agentic AI & Coding
                        </span>
                      </div>

                      {/* Scheduled Demo Banner */}
                      {lead.scheduled_demo_at && (
                        <div className="bg-purple-50/70 border border-purple-100 rounded-lg p-2 my-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-purple-900 font-semibold text-[11px]">
                            <CalendarClock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>
                              Demo: {new Date(lead.scheduled_demo_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {lead.scheduled_demo_at.includes('T') ? `, ${lead.scheduled_demo_at.slice(11, 16)}` : ''}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              lead.demo_type === 'online' || lead.demo_type === 'online_meet'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {lead.demo_type === 'online' || lead.demo_type === 'online_meet' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {lead.demo_link && (lead.demo_type === 'online' || lead.demo_type === 'online_meet') && (
                            <a
                              href={lead.demo_link.startsWith('http') ? lead.demo_link : `https://${lead.demo_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-purple-700 hover:text-purple-900 underline flex items-center gap-0.5"
                            >
                              Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Latest Note Box */}
                      {lead.notes && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 my-2">
                          <p className="text-[11px] text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" /> Latest Note
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-2">{lead.notes}</p>
                        </div>
                      )}

                      {/* Next follow-up / action */}
                      {lead.next_followup_at && (
                        <div className="bg-blue-50/60 rounded px-2.5 py-1 my-2 flex items-center justify-between text-[11px] font-semibold text-blue-800">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Next: {new Date(lead.next_followup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="text-[10px] text-blue-500">(0/4)</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Section */}
                    <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
                      {/* View Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveLeadDetails(lead)}
                        className="w-full h-7 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
                        data-testid={`b2b-view-btn-${lead.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>

                      {/* Action Button Pills Grid (Just Like School CRM Screenshot) */}
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {/* Row 1 */}
                        <button
                          type="button"
                          onClick={() => openEditModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-edit-${lead.id}`}
                        >
                          <Edit className="w-3 h-3" /> Edit / Proposal
                        </button>

                        <button
                          type="button"
                          onClick={() => openMeetingDoneModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-meeting-done-${lead.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Meeting Done
                        </button>

                        <button
                          type="button"
                          onClick={() => openScheduleMeetingModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-schedule-meeting-${lead.id}`}
                        >
                          <CalendarClock className="w-3 h-3" /> Schedule Meeting
                        </button>

                        <button
                          type="button"
                          onClick={() => openTicketModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-ticket-${lead.id}`}
                        >
                          <Ticket className="w-3 h-3" /> Ticket
                        </button>

                        {/* Row 2 */}
                        <button
                          type="button"
                          onClick={() => openFollowupModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-followup-${lead.id}`}
                        >
                          <Clock className="w-3 h-3" /> Followup
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDocsModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-docs-${lead.id}`}
                        >
                          <Paperclip className="w-3 h-3" /> Docs
                        </button>

                        <button
                          type="button"
                          onClick={() => openMailModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-mail-${lead.id}`}
                        >
                          <Mail className="w-3 h-3" /> Mail
                        </button>

                        <button
                          type="button"
                          onClick={() => openAssignModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-assign-${lead.id}`}
                        >
                          <UserPlus className="w-3 h-3" /> Assign
                        </button>

                        <button
                          type="button"
                          onClick={() => openNoteModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-note-${lead.id}`}
                        >
                          <MessageSquare className="w-3 h-3" /> Note
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-delete-${lead.id}`}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>

                        {/* Row 3 */}
                        <button
                          type="button"
                          onClick={() => openLostModal(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-lost-${lead.id}`}
                        >
                          <X className="w-3 h-3" /> Lost Lead
                        </button>

                        <button
                          type="button"
                          onClick={() => handleArchiveLead(lead)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium transition"
                          data-testid={`b2b-archive-${lead.id}`}
                        >
                          <Archive className="w-3 h-3" /> Archive
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── List View Table ── */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">School / Organization</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Board</th>
                        <th className="py-3 px-4">Assigned To</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <span
                              onClick={() => setActiveLeadDetails(lead)}
                              className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                            >
                              {lead.school_name || lead.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">{lead.name ? `${lead.name} · ${lead.role || ''}` : ''}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{lead.phone}</div>
                            {lead.email && <div className="text-[11px] text-slate-400">{lead.email}</div>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{lead.city || 'N/A'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{lead.board || 'CBSE'}</td>
                          <td className="py-3 px-4 text-slate-600">{lead.assigned_to_name || 'Unassigned'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveLeadDetails(lead)}
                              className="h-7 text-xs font-semibold"
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ MODALS ════════════════════ */}

        {/* 1. Modal: Edit / Proposal */}
        <Dialog open={!!showEditLeadModal} onOpenChange={() => setShowEditLeadModal(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Edit className="w-5 h-5 text-amber-600" /> Edit B2B School Lead & Proposal
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditLead} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School / Organization *</label>
                  <Input
                    value={editLeadForm.school_name}
                    onChange={e => setEditLeadForm(f => ({ ...f, school_name: e.target.value }))}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name</label>
                  <Input
                    value={editLeadForm.name}
                    onChange={e => setEditLeadForm(f => ({ ...f, name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone *</label>
                  <Input
                    value={editLeadForm.phone}
                    onChange={e => setEditLeadForm(f => ({ ...f, phone: e.target.value }))}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <Input
                    value={editLeadForm.email}
                    onChange={e => setEditLeadForm(f => ({ ...f, email: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <Input
                    value={editLeadForm.city}
                    onChange={e => setEditLeadForm(f => ({ ...f, city: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Board</label>
                  <select
                    value={editLeadForm.board}
                    onChange={e => setEditLeadForm(f => ({ ...f, board: e.target.value }))}
                    className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <Input
                    value={editLeadForm.role}
                    onChange={e => setEditLeadForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="Principal, Trustee..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposal / Quoted Value (₹)</label>
                <Input
                  placeholder="e.g. 3,50,000"
                  value={editLeadForm.proposal_amount}
                  onChange={e => setEditLeadForm(f => ({ ...f, proposal_amount: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes & Proposal Scope</label>
                <Textarea
                  rows={3}
                  value={editLeadForm.notes}
                  onChange={e => setEditLeadForm(f => ({ ...f, notes: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Demo Session Scheduled with Online/Offline Option */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editLeadForm.demo_session_scheduled}
                      onChange={e => setEditLeadForm(f => ({ ...f, demo_session_scheduled: e.target.checked }))}
                      className="rounded text-purple-600"
                    />
                    Is Demo / School Presentation Scheduled?
                  </label>
                  {editLeadForm.demo_session_scheduled && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {editLeadForm.demo_type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>

                {editLeadForm.demo_session_scheduled && (
                  <div className="space-y-3 pt-1 border-t border-purple-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Demo Mode: Online or Offline? *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditLeadForm(f => ({ ...f, demo_type: 'online' }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                            editLeadForm.demo_type === 'online' || editLeadForm.demo_type === 'online_meet'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" /> Online Demo
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditLeadForm(f => ({ ...f, demo_type: 'offline' }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                            editLeadForm.demo_type === 'offline' || editLeadForm.demo_type === 'offline_visit'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" /> Offline Demo (School Visit)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Presentation Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={editLeadForm.scheduled_demo_at}
                        onChange={e => setEditLeadForm(f => ({ ...f, scheduled_demo_at: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    {editLeadForm.demo_type === 'online' || editLeadForm.demo_type === 'online_meet' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Online Meeting Link (Google Meet / Zoom)</label>
                        <Input
                          placeholder="https://meet.google.com/..."
                          value={editLeadForm.demo_link}
                          onChange={e => setEditLeadForm(f => ({ ...f, demo_link: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Offline School Campus Address / Venue</label>
                        <Input
                          placeholder="e.g. School Campus, Sector 4, Delhi"
                          value={editLeadForm.demo_link}
                          onChange={e => setEditLeadForm(f => ({ ...f, demo_link: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEditLeadModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={savingEditLead} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {savingEditLead ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Modal: Meeting Done */}
        <Dialog open={!!showMeetingDoneModal} onOpenChange={() => setShowMeetingDoneModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="w-5 h-5 text-purple-600" /> Log School Meeting / Demo Done
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-600">
                Log presentation outcome for <span className="font-bold text-slate-900">{showMeetingDoneModal?.school_name || showMeetingDoneModal?.name}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Outcome</label>
                <select
                  value={meetingDoneData.outcome}
                  onChange={e => setMeetingDoneData(d => ({ ...d, outcome: e.target.value }))}
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                >
                  <option value="completed">Completed Successfully</option>
                  <option value="no_show">Principal/Trustee Unavailable</option>
                  <option value="rescheduled">Needs Follow-up Presentation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">School Interest Level</label>
                <select
                  value={meetingDoneData.interest_level}
                  onChange={e => setMeetingDoneData(d => ({ ...d, interest_level: e.target.value }))}
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                >
                  <option value="high">High - Requested Quotation</option>
                  <option value="medium">Medium - Under Trustee Review</option>
                  <option value="low">Low - Budget Constraints</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Discussion Points</label>
                <Textarea
                  rows={3}
                  placeholder="Number of students, labs required, key stakeholders..."
                  value={meetingDoneData.notes}
                  onChange={e => setMeetingDoneData(d => ({ ...d, notes: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowMeetingDoneModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleMeetingDoneSubmit} disabled={savingMeetingDone} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {savingMeetingDone ? 'Saving...' : 'Mark Meeting Done'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Modal: Schedule Meeting */}
        <Dialog open={!!showScheduleMeetingModal} onOpenChange={() => setShowScheduleMeetingModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CalendarClock className="w-5 h-5 text-blue-600" /> Schedule School Presentation / Demo
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <Input
                    type="date"
                    value={scheduleMeetingData.date}
                    onChange={e => setScheduleMeetingData(d => ({ ...d, date: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <Input
                    type="time"
                    value={scheduleMeetingData.time}
                    onChange={e => setScheduleMeetingData(d => ({ ...d, time: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Demo Mode: Online or Offline? *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMeetingData(d => ({ ...d, type: 'online' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      scheduleMeetingData.type === 'online' || scheduleMeetingData.type === 'online_meet'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Online Video Meet
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMeetingData(d => ({ ...d, type: 'offline' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      scheduleMeetingData.type === 'offline' || scheduleMeetingData.type === 'offline_visit' || scheduleMeetingData.type === 'in_person_school'
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Offline School Visit
                  </button>
                </div>
              </div>

              {scheduleMeetingData.type === 'online' || scheduleMeetingData.type === 'online_meet' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Online Google Meet / Video Link</label>
                  <Input
                    value={scheduleMeetingData.link}
                    onChange={e => setScheduleMeetingData(d => ({ ...d, link: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="h-8 text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Offline School Campus Address / Venue</label>
                  <Input
                    value={scheduleMeetingData.link}
                    onChange={e => setScheduleMeetingData(d => ({ ...d, link: e.target.value }))}
                    placeholder="e.g. School Campus, Main Road, City"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agenda & Presentation Topic</label>
                <Textarea
                  rows={2}
                  value={scheduleMeetingData.agenda}
                  onChange={e => setScheduleMeetingData(d => ({ ...d, agenda: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowScheduleMeetingModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleScheduleMeetingSubmit} disabled={savingScheduleMeeting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {savingScheduleMeeting ? 'Scheduling...' : 'Confirm Meeting'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 4. Modal: Ticket */}
        <Dialog open={!!showTicketModal} onOpenChange={() => setShowTicketModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Ticket className="w-5 h-5 text-orange-600" /> Raise Support Ticket for School
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Subject *</label>
                <Input
                  value={ticketData.subject}
                  onChange={e => setTicketData(d => ({ ...d, subject: e.target.value }))}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={ticketData.priority}
                  onChange={e => setTicketData(d => ({ ...d, priority: e.target.value }))}
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High - Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Requirements</label>
                <Textarea
                  rows={3}
                  value={ticketData.description}
                  onChange={e => setTicketData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Details of kits, lab setup support, or quote required..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowTicketModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleTicketSubmit} disabled={savingTicket} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {savingTicket ? 'Raising...' : 'Raise Ticket'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 5. Modal: Followup */}
        <Dialog open={!!showFollowupModal} onOpenChange={() => setShowFollowupModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Clock className="w-5 h-5 text-teal-600" /> Schedule Next Follow-up
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={followupTime}
                  onChange={e => setFollowupTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Agenda / Notes</label>
                <Textarea
                  rows={3}
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  placeholder="e.g. Call after school board meeting with updated quote..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowFollowupModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleFollowupSubmit} disabled={savingFollowup} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {savingFollowup ? 'Saving...' : 'Set Follow-up'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 6. Modal: Docs */}
        <Dialog open={!!showDocsModal} onOpenChange={() => setShowDocsModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Paperclip className="w-5 h-5 text-cyan-600" /> School Documents & Proposals
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <p className="text-slate-600">
                Documents for <span className="font-semibold text-slate-900">{showDocsModal?.school_name || showDocsModal?.name}</span>
              </p>
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-500">
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                <p className="font-medium">Drag & drop lab proposal, syllabus, or MoU files</p>
                <p className="text-[10px] text-slate-400">PDF, PPTX, DOCX up to 20MB</p>
              </div>
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowDocsModal(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 7. Modal: Mail */}
        <Dialog open={!!showMailModal} onOpenChange={() => setShowMailModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Mail className="w-5 h-5 text-sky-600" /> Send Email to School
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
                <Input
                  value={mailData.to}
                  onChange={e => setMailData(d => ({ ...d, to: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <Input
                  value={mailData.subject}
                  onChange={e => setMailData(d => ({ ...d, subject: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Body</label>
                <Textarea
                  rows={4}
                  value={mailData.body}
                  onChange={e => setMailData(d => ({ ...d, body: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowMailModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleMailSubmit} disabled={sendingMail} className="bg-sky-600 hover:bg-sky-700 text-white">
                  {sendingMail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 8. Modal: Add Note */}
        <Dialog open={!!showNoteModal} onOpenChange={() => setShowNoteModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <MessageSquare className="w-5 h-5 text-slate-700" /> Add School Note / Update
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <Textarea
                rows={4}
                placeholder="Write school meeting notes or updates..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowNoteModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleNoteSubmit} disabled={savingComment} className="bg-slate-800 hover:bg-slate-900 text-white">
                  {savingComment ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 9. Modal: Assign Executive */}
        <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <UserPlus className="w-5 h-5 text-indigo-600" /> Assign B2B Executive
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Sales Executive</label>
                <select
                  value={selectedAssigneeId}
                  onChange={e => setSelectedAssigneeId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Choose salesperson...</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Note</label>
                <Input
                  placeholder="Target package or school specific instructions..."
                  value={assignmentNote}
                  onChange={e => setAssignmentNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowAssignModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmAssign} disabled={savingAssign} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {savingAssign ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 10. Modal: Lost Lead */}
        <Dialog open={!!showLostModal} onOpenChange={() => setShowLostModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <X className="w-5 h-5 text-red-600" /> Mark School Lead as Lost
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Lost Reason</label>
                <select
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                >
                  <option value="Budget Constraints">Budget Constraints</option>
                  <option value="Existing Robotics Lab Vendor">Existing Robotics Lab Vendor</option>
                  <option value="Management Deferred to Next Year">Management Deferred to Next Year</option>
                  <option value="Not Interested in STEM/Robotics">Not Interested in STEM/Robotics</option>
                  <option value="Unreachable / Invalid Contact">Unreachable / Invalid Contact</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation</label>
                <Textarea
                  rows={3}
                  value={lostNotes}
                  onChange={e => setLostNotes(e.target.value)}
                  placeholder="School committee feedback..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowLostModal(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmLost} disabled={savingLost} className="bg-red-600 hover:bg-red-700 text-white">
                  {savingLost ? 'Marking Lost...' : 'Confirm Lost Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 11. Modal: Delete Lead */}
        <Dialog open={!!showDeleteModal} onOpenChange={() => setShowDeleteModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-bold text-red-600">
                <Trash2 className="w-5 h-5 text-red-600" /> Delete B2B School Lead
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs mt-2">
              <p className="text-slate-600">
                Are you sure you want to permanently delete lead <span className="font-semibold text-slate-900">{showDeleteModal?.school_name || showDeleteModal?.name}</span> ({showDeleteModal?.phone})?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px]">
                <strong>Warning:</strong> This will delete all lead details and notes permanently.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowDeleteModal(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirmDelete} disabled={deletingLead} className="bg-red-600 hover:bg-red-700 text-white">
                  {deletingLead ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 12. Modal: Excel Import */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Upload className="w-5 h-5 text-blue-600" /> Import B2B School Leads (.xlsx)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                <span className="text-xs text-blue-900 font-medium">Download standard B2B template</span>
                <Button size="sm" variant="outline" onClick={downloadSampleTemplate} className="h-7 text-xs bg-white text-blue-700 border-blue-200">
                  <Download className="w-3.5 h-3.5 mr-1" /> Template
                </Button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Spreadsheet File (.xlsx) *</label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Campaign Name</label>
                <Input
                  placeholder="e.g. Maharashtra Schools Q4 2026"
                  value={importBatchName}
                  onChange={e => setImportBatchName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>Cancel</Button>
                <Button size="sm" onClick={handleExcelImportSubmit} disabled={uploadingImport || !importFile} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {uploadingImport ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  Import B2B Leads
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 13. Modal: Add Lead (with Demo date & scheduled or not) */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Plus className="w-5 h-5 text-red-600" /> Add New B2B School Lead
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddLeadSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School / Institution Name *</label>
                  <Input
                    required
                    value={newLeadForm.school_name}
                    onChange={e => setNewLeadForm(f => ({ ...f, school_name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name</label>
                  <Input
                    value={newLeadForm.name}
                    onChange={e => setNewLeadForm(f => ({ ...f, name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone *</label>
                  <Input
                    required
                    value={newLeadForm.phone}
                    onChange={e => setNewLeadForm(f => ({ ...f, phone: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={newLeadForm.email}
                    onChange={e => setNewLeadForm(f => ({ ...f, email: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <Input
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm(f => ({ ...f, city: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Board</label>
                  <select
                    value={newLeadForm.board}
                    onChange={e => setNewLeadForm(f => ({ ...f, board: e.target.value }))}
                    className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <Input
                    value={newLeadForm.role}
                    onChange={e => setNewLeadForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="Principal, Trustee..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Demo Session Scheduled or Not with Online/Offline Option */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLeadForm.demo_session_scheduled}
                      onChange={e => setNewLeadForm(f => ({ ...f, demo_session_scheduled: e.target.checked }))}
                      className="rounded text-purple-600"
                    />
                    Is Demo / School Presentation Scheduled?
                  </label>
                  {newLeadForm.demo_session_scheduled && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {newLeadForm.demo_type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>

                {newLeadForm.demo_session_scheduled && (
                  <div className="space-y-3 pt-1 border-t border-purple-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Demo Mode: Online or Offline? *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewLeadForm(f => ({ ...f, demo_type: 'online' }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                            newLeadForm.demo_type === 'online' || newLeadForm.demo_type === 'online_meet'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" /> Online Demo
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewLeadForm(f => ({ ...f, demo_type: 'offline' }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                            newLeadForm.demo_type === 'offline' || newLeadForm.demo_type === 'offline_visit' || newLeadForm.demo_type === 'in_person_school'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" /> Offline Demo (School Visit)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Presentation Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={newLeadForm.scheduled_demo_at}
                        onChange={e => setNewLeadForm(f => ({ ...f, scheduled_demo_at: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    {newLeadForm.demo_type === 'online' || newLeadForm.demo_type === 'online_meet' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Online Meeting Link (Google Meet / Zoom)</label>
                        <Input
                          placeholder="https://meet.google.com/..."
                          value={newLeadForm.demo_link}
                          onChange={e => setNewLeadForm(f => ({ ...f, demo_link: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Offline School Campus Address / Venue</label>
                        <Input
                          placeholder="e.g. School Campus, Main Road, City"
                          value={newLeadForm.demo_link}
                          onChange={e => setNewLeadForm(f => ({ ...f, demo_link: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assign to Executive */}
              {isManager && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Sales Executive</label>
                  <select
                    value={newLeadForm.assigned_to}
                    onChange={e => setNewLeadForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className="w-full h-8 text-xs border border-slate-200 rounded px-2"
                  >
                    <option value="">Leave unassigned</option>
                    {assignees.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Notes</label>
                <Textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={e => setNewLeadForm(f => ({ ...f, notes: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddLeadModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={savingNewLead} className="bg-[#D63031] hover:bg-red-700 text-white">
                  {savingNewLead ? 'Adding...' : 'Add Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 14. Lead Details Drawer (Slide-Over from Right) */}
        {activeLeadDetails && (
          <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeLeadDetails.school_name || activeLeadDetails.name}</h2>
                    <p className="text-xs text-slate-500">{activeLeadDetails.name ? `${activeLeadDetails.name} (${activeLeadDetails.role || 'Principal'})` : (activeLeadDetails.role || 'B2B School Lead')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLeadDetails(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Phone</p>
                    <p className="font-semibold text-slate-800">{activeLeadDetails.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Email</p>
                    <p className="font-semibold text-slate-800 truncate">{activeLeadDetails.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">City & Board</p>
                    <p className="font-semibold text-slate-800">{activeLeadDetails.city || 'N/A'} {activeLeadDetails.board ? `(${activeLeadDetails.board})` : ''}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Stage</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {activeLeadDetails.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-medium">Assigned To</p>
                    <p className="font-semibold text-slate-800">{activeLeadDetails.assigned_to_name || 'Unassigned'}</p>
                  </div>
                </div>

                {/* Demo / Presentation Info */}
                <div className="bg-purple-50/70 border border-purple-100 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4 text-purple-600" /> Demo / Presentation Details
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      activeLeadDetails.demo_type === 'online' || activeLeadDetails.demo_type === 'online_meet'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {activeLeadDetails.demo_type === 'online' || activeLeadDetails.demo_type === 'online_meet' ? (
                        <><Video className="w-3 h-3" /> Online Demo</>
                      ) : (
                        <><Users className="w-3 h-3" /> Offline Demo</>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Scheduled Time</p>
                      <p className="font-semibold text-slate-900">
                        {activeLeadDetails.scheduled_demo_at
                          ? new Date(activeLeadDetails.scheduled_demo_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Not scheduled yet'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Demo Status</p>
                      <p className="font-semibold text-slate-900 capitalize">{activeLeadDetails.demo_status || 'none'}</p>
                    </div>
                  </div>
                  {activeLeadDetails.demo_link && (
                    <div className="pt-1 border-t border-purple-100/80">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">
                        {activeLeadDetails.demo_type === 'online' || activeLeadDetails.demo_type === 'online_meet' ? 'Meeting Link' : 'Location / Campus Venue'}
                      </p>
                      {activeLeadDetails.demo_type === 'online' || activeLeadDetails.demo_type === 'online_meet' ? (
                        <a
                          href={activeLeadDetails.demo_link.startsWith('http') ? activeLeadDetails.demo_link : `https://${activeLeadDetails.demo_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-purple-700 hover:underline flex items-center gap-1"
                        >
                          {activeLeadDetails.demo_link} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <p className="font-semibold text-slate-800">{activeLeadDetails.demo_link}</p>
                      )}
                    </div>
                  )}
                </div>

                {activeLeadDetails.notes && (
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase mb-1">Notes</p>
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-line border border-slate-100">
                      {activeLeadDetails.notes}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase mb-2">Activity & Comments</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(activeLeadDetails.comments || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No notes or comments logged yet</p>
                    ) : (
                      (activeLeadDetails.comments || []).map((c, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span className="font-semibold text-slate-600">{c.user_name || 'User'}</span>
                            <span>{new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <Button
                  onClick={() => openEditModal(activeLeadDetails)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit Lead / Proposal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveLeadDetails(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
