import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { 
  Calendar, Clock, User, Phone, MapPin, Video, LogOut, 
  RefreshCw, CheckCircle2, ArrowRight, Users, BookOpen,
  Send, ChevronDown, X, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow, addHours, isAfter, isBefore } from 'date-fns';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EducatorDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout, token } = useUserAuth();
  const [demos, setDemos] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Modal states
  const [showPassModal, setShowPassModal] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [availableEducators, setAvailableEducators] = useState([]);
  const [selectedEducator, setSelectedEducator] = useState('');
  const [passReason, setPassReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'educator') {
      navigate('/login');
      return;
    }
    fetchDemos();
    fetchAvailableEducators();
  }, [isLoggedIn, user, navigate]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchDemos = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  // Generate Jitsi meeting link for educator (moderator)
  const generateMeetingLink = (demo) => {
    const meetCode = demo.id?.slice(-10) || 'demo-meet';
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
    if (!demo.demo_date || !demo.demo_time) return false;
    try {
      const demoDateTime = parseISO(`${demo.demo_date}T${demo.demo_time}:00`);
      const now = new Date();
      const joinWindowStart = addHours(demoDateTime, -0.5); // 30 mins before
      const joinWindowEnd = addHours(demoDateTime, 1.5); // 1.5 hours after
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
      'confirmed': 'bg-green-100 text-green-700',
      'rescheduled': 'bg-amber-100 text-amber-700',
      'demo_completed': 'bg-purple-100 text-purple-700',
      'converted': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700',
      'archived': 'bg-slate-100 text-slate-600'
    };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  if (!isLoggedIn || user?.role !== 'educator') return null;

  const displayDemos = activeTab === 'upcoming' ? demos : history;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Educator Dashboard
            </h1>
            <p className="text-slate-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-500 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{demos.length}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{history.filter(d => d.status === 'demo_completed').length}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{history.filter(d => d.status === 'converted').length}</p>
                <p className="text-xs text-slate-500">Converted</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{user?.skills?.length || 0}</p>
                <p className="text-xs text-slate-500">Skills</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Upcoming Demos ({demos.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            History ({history.length})
          </button>
          <button
            onClick={fetchDemos}
            className="ml-auto p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Demo List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
          </div>
        ) : displayDemos.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {activeTab === 'upcoming' ? 'No upcoming demos assigned' : 'No demo history yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayDemos.map((demo) => (
              <div 
                key={demo.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1E3A5F]">{demo.name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="capitalize">{demo.skill}</span>
                        <span>•</span>
                        <span>{demo.age_group}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(demo.status)}`}>
                      {demo.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDemoDate(demo.demo_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {demo.demo_time || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {demo.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      {demo.learning_mode === 'online' ? (
                        <Video className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-red-500" />
                      )}
                      {demo.learning_mode === 'online' ? 'Online' : demo.city}
                    </span>
                  </div>

                  {/* Actions for upcoming demos */}
                  {activeTab === 'upcoming' && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      {/* Join Demo Button */}
                      {demo.learning_mode === 'online' && (
                        <a
                          href={generateMeetingLink(demo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all duration-300 ${
                            isDemoJoinable(demo)
                              ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] animate-pulse'
                              : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F]'
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          {isDemoJoinable(demo) ? 'Join Demo Now' : 'Join Demo'}
                        </a>
                      )}

                      {/* Action buttons row */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowCompleteModal(demo)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => {
                            setShowPassModal(demo);
                            setSelectedEducator('');
                            setPassReason('');
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Pass to Other
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pass Demo Modal */}
      <Dialog open={!!showPassModal} onOpenChange={() => setShowPassModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              Pass Demo to Another Educator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <strong>{showPassModal?.name}</strong> - {showPassModal?.skill}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDemoDate(showPassModal?.demo_date)} at {showPassModal?.demo_time}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Educator</label>
              {availableEducators.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No other educators available</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {availableEducators.map((edu) => (
                    <button
                      key={edu.id}
                      onClick={() => setSelectedEducator(edu.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedEducator === edu.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{edu.name}</p>
                      <p className="text-xs text-slate-500">
                        {edu.skills?.join(', ')} • {edu.city}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
              <Textarea
                value={passReason}
                onChange={(e) => setPassReason(e.target.value)}
                placeholder="Why are you passing this demo?"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowPassModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handlePassDemo}
                disabled={submitting || !selectedEducator}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
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
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Mark Demo as Completed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <strong>{showCompleteModal?.name}</strong> - {showCompleteModal?.skill}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Demo Feedback (optional)</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="How did the demo go? Any notes for the team..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCompleteModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteDemo}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Completing...' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EducatorDashboard;
