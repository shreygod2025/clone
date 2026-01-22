import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { 
  Calendar, Clock, User, Phone, MapPin, Video, LogOut, 
  RefreshCw, CheckCircle2, Users, BookOpen,
  Send, MessageCircle, CalendarClock, AlertCircle, HelpCircle, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow, addHours, isAfter, isBefore, addDays } from 'date-fns';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// Query categories for educators
const QUERY_CATEGORIES = [
  {
    id: 'demo_related',
    label: 'Demo Related',
    icon: Video,
    color: 'text-purple-600 bg-purple-100',
    subcategories: [
      { id: 'unable_to_start', label: 'Unable to start meeting', hint: 'Steps: 1. Click Join Demo 2. Allow camera/mic 3. Enter your name 4. Click Join' },
      { id: 'student_not_joined', label: 'Student not joined demo', hint: 'We will send a WhatsApp reminder to the student' },
      { id: 'technical_issues', label: 'Technical issues during demo', hint: 'Describe the issue you faced' },
      { id: 'demo_rescheduled_by_student', label: 'Student wants to reschedule', hint: '' }
    ]
  },
  {
    id: 'ongoing_classes',
    label: 'Ongoing Classes',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-100',
    subcategories: [
      { id: 'timetable_change', label: 'Need to change timetable', hint: 'Mention preferred new timings' },
      { id: 'student_feedback', label: 'Feedback about student', hint: 'Share your observations' },
      { id: 'curriculum_query', label: 'Curriculum/content query', hint: '' },
      { id: 'student_absence', label: 'Student not attending classes', hint: '' }
    ]
  },
  {
    id: 'payment_related',
    label: 'Payment Related',
    icon: () => <span className="text-lg">₹</span>,
    color: 'text-green-600 bg-green-100',
    subcategories: [
      { id: 'payment_not_received', label: 'Payment not received', hint: 'Mention month and expected amount' },
      { id: 'payment_calculation', label: 'Payment calculation incorrect', hint: 'Provide details of discrepancy' },
      { id: 'payment_delay', label: 'Payment delayed', hint: '' },
      { id: 'invoice_request', label: 'Need invoice/receipt', hint: '' }
    ]
  }
];

const EducatorDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout, token, loading: authLoading } = useUserAuth();
  const [demos, setDemos] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [applicationData, setApplicationData] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  
  // Modal states
  const [showPassModal, setShowPassModal] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [availableEducators, setAvailableEducators] = useState([]);
  const [selectedEducator, setSelectedEducator] = useState('');
  const [passReason, setPassReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [incompleteReason, setIncompleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '' });
  
  // Query state
  const [queryStep, setQueryStep] = useState('category'); // category, subcategory, details
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [relatedDemoId, setRelatedDemoId] = useState('');

  // Incomplete reason options
  const INCOMPLETE_REASONS = [
    { value: 'student_no_show', label: 'Student did not join' },
    { value: 'student_left_early', label: 'Student left early' },
    { value: 'technical_issues', label: 'Technical issues prevented demo' },
    { value: 'wrong_time', label: 'Student joined at wrong time' },
    { value: 'other', label: 'Other reason' }
  ];

  useEffect(() => {
    // Wait for auth loading to complete before checking login status
    if (authLoading) return;
    
    if (!isLoggedIn || user?.role !== 'educator') {
      navigate('/login');
      return;
    }
    fetchApplicationData();
    
    // Check if educator needs to complete onboarding
    if (user?.status === 'onboarding' || user?.status === 'onboarded') {
      // Check onboarding completion status
      checkOnboardingStatus();
    }
    
    if (user?.status === 'active') {
      fetchDemos();
      fetchAvailableEducators();
    }
  }, [isLoggedIn, user, navigate, authLoading]);

  const checkOnboardingStatus = async () => {
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.get(`${API}/educator/onboarding/${educatorId}`, {
        headers: getAuthHeaders()
      });
      const onboarding = response.data?.onboarding;
      // If onboarding not completed, redirect to onboarding page
      if (!onboarding || onboarding.status !== 'completed') {
        navigate('/educator-onboarding');
      } else {
        // Onboarding complete, show demos
        fetchDemos();
        fetchAvailableEducators();
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // If no onboarding record, redirect to onboarding
      navigate('/educator-onboarding');
    }
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchApplicationData = async () => {
    try {
      const response = await axios.get(`${API}/educator/my-application`, { 
        headers: getAuthHeaders() 
      });
      setApplicationData(response.data);
      // Set availability from application data
      setIsAvailable(response.data.is_available !== false);
    } catch (error) {
      console.error('Failed to fetch application:', error);
      setApplicationData(user);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      const newAvailability = !isAvailable;
      await axios.patch(`${API}/educator/toggle-availability`, {
        is_available: newAvailability
      }, { headers: getAuthHeaders() });
      
      setIsAvailable(newAvailability);
      toast.success(newAvailability 
        ? 'You are now available for new demo assignments' 
        : 'You are now unavailable. No new demos will be assigned.'
      );
    } catch (error) {
      toast.error('Failed to update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const fetchDemos = async () => {
    try {
      const [upcomingRes, historyRes] = await Promise.all([
        axios.get(`${API}/educator/my-demos`, { headers: getAuthHeaders() }),
        axios.get(`${API}/educator/demo-history`, { headers: getAuthHeaders() })
      ]);
      setDemos(upcomingRes.data || []);
      setHistory(historyRes.data || []);
    } catch (error) {
      console.error('Failed to fetch demos:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        logout();
        navigate('/login');
      }
    }
  };

  const fetchAvailableEducators = async () => {
    try {
      const response = await axios.get(`${API}/educator/available-educators`, { 
        headers: getAuthHeaders() 
      });
      setAvailableEducators(response.data || []);
    } catch (error) {
      console.error('Failed to fetch educators:', error);
    }
  };

  const handlePassDemo = async () => {
    if (!selectedEducator) {
      toast.error('Please select an educator');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/educator/pass-demo/${showPassModal.id}`, {
        target_educator_id: selectedEducator,
        reason: passReason
      }, { headers: getAuthHeaders() });
      
      toast.success('Demo passed successfully');
      setShowPassModal(null);
      setSelectedEducator('');
      setPassReason('');
      fetchDemos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to pass demo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDemo = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/educator/complete-demo/${showCompleteModal.id}`, {
        feedback
      }, { headers: getAuthHeaders() });
      
      toast.success('Demo marked as completed');
      setShowCompleteModal(null);
      setFeedback('');
      fetchDemos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete demo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncompleteDemo = async () => {
    if (!incompleteReason) {
      toast.error('Please select a reason');
      return;
    }
    setSubmitting(true);
    try {
      const reasonLabel = INCOMPLETE_REASONS.find(r => r.value === incompleteReason)?.label || incompleteReason;
      await axios.post(`${API}/educator/incomplete-demo/${showIncompleteModal.id}`, {
        reason: reasonLabel
      }, { headers: getAuthHeaders() });
      
      toast.success('Demo marked as incomplete. Student has been notified.');
      setShowIncompleteModal(null);
      setIncompleteReason('');
      fetchDemos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark demo as incomplete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifyStudentNotJoined = async (demo) => {
    try {
      await axios.post(`${API}/educator/notify-not-joined/${demo.id}`, {}, { headers: getAuthHeaders() });
      toast.success('Student has been notified that they haven\'t joined yet');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    setSubmitting(true);
    try {
      await axios.patch(`${API}/educator/reschedule-demo`, {
        demo_date: format(rescheduleData.date, 'yyyy-MM-dd'),
        demo_time: rescheduleData.time
      }, { headers: getAuthHeaders() });
      
      toast.success('Demo rescheduled successfully');
      setShowRescheduleModal(false);
      setRescheduleData({ date: null, time: '' });
      fetchApplicationData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reschedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuery = async () => {
    if (!selectedCategory || !selectedSubcategory) {
      toast.error('Please select a category');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/educator/submit-query`, {
        category: selectedCategory.id,
        subcategory: selectedSubcategory.id,
        category_label: selectedCategory.label,
        subcategory_label: selectedSubcategory.label,
        query: queryText || selectedSubcategory.label,
        related_demo_id: relatedDemoId
      }, { headers: getAuthHeaders() });
      
      toast.success('Query submitted successfully');
      resetQueryModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQueryModal = () => {
    setShowQueryModal(false);
    setQueryStep('category');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setQueryText('');
    setRelatedDemoId('');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const generateMeetingLink = (id) => {
    const meetCode = id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const educatorName = encodeURIComponent(user?.name || 'Educator');
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': false,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'config.enableLobby': true,
      'userInfo.displayName': educatorName,
      'userInfo.moderator': true
    };
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return `https://meet.jit.si/${roomName}#${configString}`;
  };

  const isDemoJoinable = (demo) => {
    const demoDate = demo?.demo_date || applicationData?.demo_date;
    const demoTime = demo?.demo_time || applicationData?.demo_time;
    if (!demoDate || !demoTime) return false;
    try {
      const demoDateTime = parseISO(`${demoDate}T${demoTime}:00`);
      const now = new Date();
      const joinWindowStart = addHours(demoDateTime, -0.5);
      const joinWindowEnd = addHours(demoDateTime, 1.5);
      return isAfter(now, joinWindowStart) && isBefore(now, joinWindowEnd);
    } catch {
      return false;
    }
  };

  const formatDemoDate = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'new': 'bg-blue-100 text-blue-700',
      'demo_scheduled': 'bg-purple-100 text-purple-700',
      'demo_completed': 'bg-orange-100 text-orange-700',
      'onboarded': 'bg-green-100 text-green-700',
      'archived': 'bg-red-100 text-red-700',
      'confirmed': 'bg-green-100 text-green-700',
      'rescheduled': 'bg-amber-100 text-amber-700'
    };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  if (!isLoggedIn || user?.role !== 'educator') return null;

  const appStatus = applicationData?.status || user?.status;
  const isOnboarded = appStatus === 'onboarded';
  const isDemoScheduled = appStatus === 'demo_scheduled' || appStatus === 'new';
  const isDemoCompleted = appStatus === 'demo_completed';
  const isArchived = appStatus === 'archived';
  const demoRating = applicationData?.demo_rating;

  const renderApplicationStatus = () => {
    if (isArchived) {
      const recommendation = demoRating?.recommendation;
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-700">Application Status</h3>
              <p className="text-sm text-slate-500">
                {recommendation === 'reject' ? 'Your application was not approved' : 'Application archived'}
              </p>
            </div>
          </div>
          {demoRating?.feedback && (
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-1">Feedback:</p>
              <p className="text-sm text-slate-600">{demoRating.feedback}</p>
            </div>
          )}
          {recommendation === 'retake' && (
            <Button onClick={() => setShowRescheduleModal(true)} className="w-full bg-[#D63031] hover:bg-[#b52828]">
              <CalendarClock className="w-4 h-4 mr-2" />
              Schedule New Demo
            </Button>
          )}
        </div>
      );
    }

    if (isDemoCompleted) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-700">Demo Completed</h3>
              <p className="text-sm text-slate-500">Your application is under review</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Thank you for completing your demo! Our team is reviewing your application. 
              This typically takes <strong>24-48 hours</strong>.
            </p>
          </div>
        </div>
      );
    }

    if (isDemoScheduled) {
      const demoDate = applicationData?.demo_date || user?.demo_date;
      const demoTime = applicationData?.demo_time || user?.demo_time;
      const meetingLink = applicationData?.meeting_link || generateMeetingLink(applicationData?.id || user?.id);

      return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-700">Your Demo Session</h3>
              <p className="text-sm text-slate-500">Complete your demo to get onboarded</p>
            </div>
          </div>
          {demoDate && demoTime ? (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">{formatDemoDate(demoDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">{demoTime}</span>
                  </div>
                </div>
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all ${
                    isDemoJoinable(null)
                      ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] animate-pulse'
                      : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F]'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {isDemoJoinable(null) ? 'Join Demo Now' : 'Join Demo'}
                </a>
              </div>
              <Button variant="outline" onClick={() => setShowRescheduleModal(true)} className="w-full">
                <CalendarClock className="w-4 h-4 mr-2" />
                Reschedule Demo
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowRescheduleModal(true)} className="w-full bg-purple-600 hover:bg-purple-700">
              <CalendarClock className="w-4 h-4 mr-2" />
              Schedule Demo
            </Button>
          )}
        </div>
      );
    }
    return null;
  };

  const displayDemos = activeTab === 'upcoming' ? demos : history;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {isOnboarded ? 'Educator Dashboard' : 'My Application'}
            </h1>
            <p className="text-slate-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowQueryModal(true)} className="text-slate-600">
              <HelpCircle className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Ask Query</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-500 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Application Status (non-onboarded) */}
        {!isOnboarded && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appStatus)}`}>
                {appStatus?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            {renderApplicationStatus()}
          </div>
        )}

        {/* Onboarded Educator View */}
        {isOnboarded && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Assigned', value: demos.length, icon: Calendar, color: 'bg-blue-100 text-blue-600' },
                { label: 'Completed', value: history.filter(d => d.status === 'demo_completed').length, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
                { label: 'Converted', value: history.filter(d => d.status === 'converted').length, icon: Users, color: 'bg-purple-100 text-purple-600' },
                { label: 'Skills', value: user?.skills?.length || 0, icon: BookOpen, color: 'bg-amber-100 text-amber-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#1E3A5F]">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Availability Toggle */}
            <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
              isAvailable ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-sm font-medium text-slate-700">
                  {isAvailable ? 'Available for new demos' : 'Not accepting new demos'}
                </span>
              </div>
              <button
                onClick={toggleAvailability}
                disabled={togglingAvailability}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isAvailable 
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {togglingAvailability ? 'Updating...' : isAvailable ? 'Go Unavailable' : 'Go Available'}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'upcoming' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Assigned ({demos.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'history' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                History ({history.length})
              </button>
              <button onClick={() => { fetchDemos(); fetchApplicationData(); }} className="ml-auto p-2 rounded-lg bg-white border border-slate-200">
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Demo List - Always expanded */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
              </div>
            ) : displayDemos.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{activeTab === 'upcoming' ? 'No demos assigned yet' : 'No demo history yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayDemos.map((demo) => (
                  <div key={demo.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    {/* Demo Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#1E3A5F]">{demo.name}</h3>
                        <p className="text-sm text-slate-500">{demo.skill} • {demo.age_group}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(demo.status)}`}>
                        {demo.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Demo Details - Always visible */}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDemoDate(demo.demo_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {demo.demo_time || 'TBD'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {demo.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        {demo.learning_mode === 'online' ? <Video className="w-3.5 h-3.5 text-blue-500" /> : <MapPin className="w-3.5 h-3.5 text-red-500" />}
                        {demo.learning_mode === 'online' ? 'Online' : demo.city}
                      </span>
                    </div>

                    {/* Actions - Always visible for upcoming */}
                    {activeTab === 'upcoming' && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                        {demo.learning_mode === 'online' && (
                          <a
                            href={generateMeetingLink(demo.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white font-medium text-sm transition-all ${
                              isDemoJoinable(demo)
                                ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] animate-pulse'
                                : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F]'
                            }`}
                          >
                            <Video className="w-4 h-4" />
                            {isDemoJoinable(demo) ? 'Join Now' : 'Join Demo'}
                          </a>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCompleteModal(demo)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setShowIncompleteModal(demo)}
                          >
                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Incomplete
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => { setShowPassModal(demo); setSelectedEducator(''); setPassReason(''); }}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Pass
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleNotifyStudentNotJoined(demo)}
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Not Joined?
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={() => setShowRescheduleModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-purple-600" />
              {applicationData?.demo_date ? 'Reschedule Demo' : 'Schedule Demo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center bg-slate-50 rounded-xl p-2">
              <CalendarComponent
                mode="single"
                selected={rescheduleData.date}
                onSelect={(date) => setRescheduleData(prev => ({ ...prev, date }))}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    onClick={() => setRescheduleData(prev => ({ ...prev, time }))}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      rescheduleData.time === time ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleReschedule} disabled={submitting || !rescheduleData.date || !rescheduleData.time} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {submitting ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Query Modal with Categories */}
      <Dialog open={showQueryModal} onOpenChange={resetQueryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              {queryStep === 'category' ? 'Ask a Query' : queryStep === 'subcategory' ? selectedCategory?.label : 'Add Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Step 1: Category Selection */}
            {queryStep === 'category' && (
              <div className="space-y-2">
                {QUERY_CATEGORIES.map(cat => {
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat); setQueryStep('subcategory'); }}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center gap-3 transition-all text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cat.color}`}>
                        {typeof IconComp === 'function' ? <IconComp /> : <IconComp className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{cat.label}</p>
                        <p className="text-xs text-slate-500">{cat.subcategories.length} options</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Subcategory Selection */}
            {queryStep === 'subcategory' && selectedCategory && (
              <div className="space-y-2">
                <button onClick={() => setQueryStep('category')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
                  ← Back to categories
                </button>
                {selectedCategory.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => { setSelectedSubcategory(sub); setQueryStep('details'); }}
                    className="w-full p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all"
                  >
                    <p className="font-medium text-slate-900">{sub.label}</p>
                    {sub.hint && <p className="text-xs text-slate-500 mt-1">{sub.hint}</p>}
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Details */}
            {queryStep === 'details' && selectedSubcategory && (
              <div className="space-y-4">
                <button onClick={() => setQueryStep('subcategory')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  ← Back
                </button>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-700">{selectedCategory?.label}</p>
                  <p className="text-sm text-slate-600">{selectedSubcategory.label}</p>
                </div>
                {selectedSubcategory.hint && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">{selectedSubcategory.hint}</div>
                )}
                {/* Demo selector for demo-related queries */}
                {selectedCategory?.id === 'demo_related' && demos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Related Demo (optional)</label>
                    <select
                      value={relatedDemoId}
                      onChange={(e) => setRelatedDemoId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">Select demo...</option>
                      {demos.map(d => (
                        <option key={d.id} value={d.id}>{d.name} - {formatDemoDate(d.demo_date)}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Additional Details (optional)</label>
                  <Textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Add any additional information..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetQueryModal} className="flex-1">Cancel</Button>
                  <Button onClick={handleSubmitQuery} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {submitting ? 'Submitting...' : 'Submit Query'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pass Demo Modal */}
      <Dialog open={!!showPassModal} onOpenChange={() => setShowPassModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pass Demo to Another Educator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600"><strong>{showPassModal?.name}</strong> - {showPassModal?.skill}</p>
            </div>
            {availableEducators.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No other educators available</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {availableEducators.map((edu) => (
                  <button
                    key={edu.id}
                    onClick={() => setSelectedEducator(edu.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedEducator === edu.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{edu.name}</p>
                    <p className="text-xs text-slate-500">{edu.skills?.join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
            <Textarea value={passReason} onChange={(e) => setPassReason(e.target.value)} placeholder="Reason (optional)" className="min-h-[60px]" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPassModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handlePassDemo} disabled={submitting || !selectedEducator} className="flex-1 bg-amber-500 hover:bg-amber-600">
                {submitting ? 'Passing...' : 'Pass Demo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Demo Modal */}
      <Dialog open={!!showCompleteModal} onOpenChange={() => setShowCompleteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Demo as Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600"><strong>{showCompleteModal?.name}</strong> - {showCompleteModal?.skill}</p>
            </div>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)" className="min-h-[80px]" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCompleteModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleCompleteDemo} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                {submitting ? 'Completing...' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incomplete Demo Modal */}
      <Dialog open={!!showIncompleteModal} onOpenChange={() => { setShowIncompleteModal(null); setIncompleteReason(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Mark Demo as Incomplete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600"><strong>{showIncompleteModal?.name}</strong> - {showIncompleteModal?.skill}</p>
              <p className="text-xs text-slate-500 mt-1">{showIncompleteModal?.phone}</p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
              <p>This will notify the student that they missed the demo and prompt them to reschedule.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for incomplete</label>
              <div className="space-y-2">
                {INCOMPLETE_REASONS.map(reason => (
                  <div
                    key={reason.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      incompleteReason === reason.value 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setIncompleteReason(reason.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        incompleteReason === reason.value ? 'border-red-500' : 'border-slate-300'
                      }`}>
                        {incompleteReason === reason.value && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                      <span className="text-sm">{reason.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowIncompleteModal(null); setIncompleteReason(''); }} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleIncompleteDemo} 
                disabled={submitting || !incompleteReason} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? 'Submitting...' : 'Mark Incomplete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EducatorDashboard;
