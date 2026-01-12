import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Mail, Calendar, Clock, Plus, ChevronRight, MessageSquare, Archive, CalendarClock, CheckCircle2, User, Briefcase, MapPin, UserPlus, Send } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Applications', color: 'bg-blue-500' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-orange-500' },
  { value: 'onboarded', label: 'Onboarded', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const AdminEducators = () => {
  const { getAuthHeaders } = useAuth();
  const [educators, setEducators] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Modal states
  const [viewEducator, setViewEducator] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [scheduleData, setScheduleData] = useState({ date: null, time: '' });

  useEffect(() => {
    fetchEducators();
    fetchTeamUsers();
  }, []);

  const fetchTeamUsers = async () => {
    try {
      const response = await axios.get(`${API}/team-users`, {
        headers: getAuthHeaders()
      });
      setTeamUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team users:', error);
    }
  };

  const fetchEducators = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/educators/applications`, {
        headers: getAuthHeaders()
      });
      setEducators(response.data);
    } catch (error) {
      toast.error('Failed to fetch educators');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (educator, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/educators/application/${educator.id}`, { 
        status: newStatus,
        ...additionalData
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Status updated successfully`);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleScheduleDemo = async () => {
    if (!scheduleData.date || !scheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      await axios.patch(`${API}/educators/${showScheduleModal.id}`, {
        status: 'demo_scheduled',
        demo_date: format(scheduleData.date, 'yyyy-MM-dd'),
        demo_time: scheduleData.time
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Demo scheduled successfully');
      setShowScheduleModal(null);
      setScheduleData({ date: null, time: '' });
      fetchEducators();
    } catch (error) {
      toast.error('Failed to schedule demo');
    }
  };

  const handleDemoCompleted = async (educator) => {
    await handleStatusChange(educator, 'demo_completed');
  };

  const handleOnboard = async (educator) => {
    await handleStatusChange(educator, 'onboarded', {
      onboarding_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleArchive = async (educator) => {
    await handleStatusChange(educator, 'archived');
  };

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/educators/${showAssignModal.id}`, {
        assigned_to: userId
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead assigned successfully');
      setShowAssignModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/educators/comment/${showCommentModal.id}`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      setShowCommentModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const filteredEducators = educators.filter(edu => {
    const matchesSearch = edu.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.phone?.includes(searchQuery);
    const matchesSection = edu.status === activeSection;
    
    // Assignee filter
    let matchesAssignee = true;
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        matchesAssignee = !edu.assigned_to;
      } else {
        matchesAssignee = edu.assigned_to === assigneeFilter;
      }
    }
    
    return matchesSearch && matchesSection && matchesAssignee;
  });

  const getCount = (status) => educators.filter(e => e.status === status).length;

  // Render action buttons based on status
  const renderActionButtons = (educator) => {
    switch (educator.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => {
                setShowScheduleModal(educator);
                setScheduleData({ date: null, time: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`schedule-demo-${educator.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Schedule Demo
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'demo_scheduled':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleDemoCompleted(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
              data-testid={`demo-completed-${educator.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Demo Completed
            </button>
            <button
              onClick={() => {
                setShowScheduleModal(educator);
                setScheduleData({ date: null, time: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${educator.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'demo_completed':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleOnboard(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`onboard-${educator.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Onboard
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'onboarded':
      case 'archived':
        return null;
      
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Educator Applications">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="educator-search"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_SECTIONS.map(section => (
          <button
            key={section.value}
            onClick={() => setActiveSection(section.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === section.value
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`section-${section.value}`}
          >
            <span className={`w-2 h-2 rounded-full ${section.color}`} />
            {section.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeSection === section.value ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {getCount(section.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Educator Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredEducators.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No applications in this section</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEducators.map((educator) => (
            <div 
              key={educator.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`educator-card-${educator.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{educator.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {educator.email}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {educator.phone}
                  </p>
                </div>
                {educator.requirement_title && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-[#D63031]/10 text-[#D63031]">
                    {educator.requirement_title}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-3">
                {educator.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {educator.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {educator.city && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {educator.city}
                  </p>
                )}
                {educator.demo_date && (
                  <p className="flex items-center gap-1 text-purple-600 font-medium">
                    <Calendar className="w-3 h-3" />
                    Demo: {educator.demo_date} {educator.demo_time && `at ${educator.demo_time}`}
                  </p>
                )}
                {educator.onboarding_date && (
                  <p className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Onboarded: {educator.onboarding_date}
                  </p>
                )}
              </div>

              {/* Notes shown outside */}
              {educator.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Notes
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-line">{educator.notes}</p>
                </div>
              )}

              {/* View Button */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewEducator(educator)}
                  data-testid={`view-educator-${educator.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
              </div>

              {/* Action Buttons based on status */}
              {renderActionButtons(educator)}
            </div>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewEducator} onOpenChange={() => setViewEducator(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#1E3A5F]" />
              {viewEducator?.name}
            </DialogTitle>
          </DialogHeader>
          {viewEducator && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                    <Mail className="w-4 h-4" /> {viewEducator.email}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                    <Phone className="w-4 h-4" /> {viewEducator.phone}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">City</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                    <MapPin className="w-4 h-4" /> {viewEducator.city || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Availability</p>
                  <p className="font-medium text-[#1E3A5F] text-sm">{viewEducator.availability || 'N/A'}</p>
                </div>
              </div>

              {viewEducator.skills?.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {viewEducator.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewEducator.grades_comfortable?.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2">Grades Comfortable</p>
                  <div className="flex flex-wrap gap-1">
                    {viewEducator.grades_comfortable.map((grade, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#D63031]/10 text-[#D63031] rounded text-xs font-medium">
                        {grade}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewEducator.experience && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Experience</p>
                  <p className="text-slate-700 text-sm">{viewEducator.experience}</p>
                </div>
              )}

              {viewEducator.requirement_title && (
                <div className="bg-[#D63031]/5 rounded-lg p-3">
                  <p className="text-xs text-[#D63031] mb-1">Applied For</p>
                  <p className="font-medium text-[#D63031]">{viewEducator.requirement_title}</p>
                </div>
              )}

              {viewEducator.demo_date && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-500 mb-1">Demo Scheduled</p>
                  <p className="font-medium text-purple-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> 
                    {viewEducator.demo_date} {viewEducator.demo_time && `at ${viewEducator.demo_time}`}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>Status: <span className="font-medium text-[#1E3A5F] capitalize">{viewEducator.status?.replace('_', ' ')}</span></span>
                  <span>Demo Ready: <span className="font-medium text-[#1E3A5F]">{viewEducator.demo_ready ? 'Yes' : 'No'}</span></span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Demo Modal */}
      <Dialog open={!!showScheduleModal} onOpenChange={() => setShowScheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Demo - {showScheduleModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={scheduleData.date}
                  onSelect={(date) => setScheduleData({...scheduleData, date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                  className="rounded-xl border border-slate-200"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      scheduleData.time === time 
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setScheduleData({...scheduleData, time})}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowScheduleModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleScheduleDemo} className="btn-primary flex-1">
                Schedule Demo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEducators;
