import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, CalendarClock, LogOut, Check, X, ChevronRight, BookOpen, Users, Video, MessageCircle, XCircle, Navigation, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import { format, addDays, parseISO, isAfter, isBefore, addHours, compareAsc } from 'date-fns';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// Course data for display
const COURSES_DATA = [
  { id: 'robotics', name: 'Robotics', emoji: '🤖', tagline: 'Build the Future with Your Hands', color: '#2563EB', gradient: 'from-blue-600 to-blue-800' },
  { id: 'coding', name: 'Coding', emoji: '💻', tagline: 'Code Your Ideas Into Reality', color: '#059669', gradient: 'from-emerald-600 to-emerald-800' },
  { id: 'ai', name: 'AI & Machine Learning', emoji: '🧠', tagline: 'Shape the Intelligent Future', color: '#7C3AED', gradient: 'from-violet-600 to-violet-800' },
  { id: 'entrepreneurship', name: 'Entrepreneurship', emoji: '💡', tagline: 'Turn Ideas Into Ventures', color: '#D97706', gradient: 'from-amber-500 to-amber-700' },
  { id: 'financial', name: 'Financial Literacy', emoji: '📊', tagline: 'Master Your Money Future', color: '#0891B2', gradient: 'from-cyan-600 to-cyan-800' },
];

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useUserAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const hasFetched = useRef(false);

  const CANCEL_REASONS = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'found_alternative', label: 'Found an alternative' },
    { value: 'not_interested', label: 'No longer interested' },
    { value: 'financial', label: 'Financial reasons' },
    { value: 'other', label: 'Other reason' }
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    // Only fetch once per mount to prevent duplicate calls
    if (!hasFetched.current && user?.phone) {
      hasFetched.current = true;
      fetchBookings();
    }
  }, [isLoggedIn, navigate, user?.phone]);

  const fetchBookings = async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/user/bookings/${user.phone}?user_type=${user.user_type || 'student'}`);
      setBookings(response.data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      // Don't show error toast, just set empty bookings
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error('Please select date and time');
      return;
    }
    setRescheduling(true);
    try {
      await axios.post(`${API}/user/reschedule`, {
        booking_id: selectedBooking.id,
        user_type: user.user_type,
        new_date: format(newDate, 'yyyy-MM-dd'),
        new_time: newTime
      });
      toast.success('Booking rescheduled successfully!');
      setShowReschedule(false);
      setSelectedBooking(null);
      setNewDate(null);
      setNewTime('');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason) {
      toast.error('Please select a reason for cancellation');
      return;
    }
    setCancelling(true);
    try {
      await axios.post(`${API}/user/cancel-booking`, {
        booking_id: selectedBooking.id,
        user_type: user.user_type,
        reason: cancelReason
      });
      toast.success('Demo cancelled successfully');
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason('');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Generate a meeting link based on booking ID
  const generateMeetingLink = (booking) => {
    // Create a unique Google Meet-like link using booking ID
    const meetCode = booking.id?.slice(-10) || 'demo-meet';
    return `https://meet.jit.si/OLL-Demo-${meetCode}`;
  };

  // Check if demo is joinable (within 15 mins before to 1 hour after scheduled time)
  const isDemoJoinable = (booking) => {
    if (!booking.demo_date || !booking.demo_time) return false;
    if (!['new', 'confirmed', 'rescheduled'].includes(booking.status)) return false;
    if (booking.learning_mode !== 'online') return false;
    
    try {
      const demoDateTime = parseISO(`${booking.demo_date}T${booking.demo_time}:00`);
      const now = new Date();
      const joinWindowStart = addHours(demoDateTime, -0.25); // 15 mins before
      const joinWindowEnd = addHours(demoDateTime, 1); // 1 hour after
      
      return isAfter(now, joinWindowStart) && isBefore(now, joinWindowEnd);
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-700',
      'confirmed': 'bg-green-100 text-green-700',
      'demo_completed': 'bg-purple-100 text-purple-700',
      'converted': 'bg-emerald-100 text-emerald-700',
      'rescheduled': 'bg-amber-100 text-amber-700',
      'cancelled': 'bg-red-100 text-red-700',
      'archived': 'bg-slate-100 text-slate-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                My Bookings
              </h1>
              <p className="text-slate-500">
                Welcome back, {user?.name || user?.phone}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-red-500 border-red-200 hover:bg-red-50"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Bookings List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">No Bookings Yet</h2>
              <p className="text-slate-500 mb-6">
                You haven&apos;t made any bookings with this phone number.
              </p>
              <Button 
                onClick={() => navigate(user?.user_type === 'school' ? '/school' : '/student')}
                className="bg-[#D63031] hover:bg-[#b52828]"
              >
                {user?.user_type === 'school' ? 'Schedule a Meeting' : 'Book a Demo'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div 
                  key={booking.id}
                  className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[#1E3A5F] text-lg">
                          {user?.user_type === 'school' 
                            ? booking.school_name 
                            : user?.user_type === 'educator'
                            ? `Application: ${booking.skills?.join(', ') || 'Educator'}`
                            : booking.skill?.charAt(0).toUpperCase() + booking.skill?.slice(1) || 'Demo'
                          }
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {formatDate(booking.demo_date || booking.meeting_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{booking.demo_time || booking.meeting_time || 'Time not set'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>
                            {booking.learning_mode === 'online' 
                              ? 'Online' 
                              : booking.learning_mode?.includes('center')
                              ? `At OLL Center - ${booking.city}`
                              : booking.learning_mode?.includes('home')
                              ? `At Home - ${booking.city}`
                              : booking.location || booking.city || 'Location TBD'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Join Demo Button - Only for online classes when joinable */}
                      {isDemoJoinable(booking) && (
                        <a
                          href={generateMeetingLink(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all duration-300 bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] shadow-md hover:shadow-lg"
                          data-testid={`join-demo-${booking.id}`}
                        >
                          <Video className="w-4 h-4" />
                          Join Demo
                        </a>
                      )}
                      
                      {['new', 'confirmed', 'rescheduled'].includes(booking.status) && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowReschedule(true);
                            }}
                            className="text-[#1E3A5F] border-[#1E3A5F]/30 hover:bg-[#1E3A5F]/5"
                            data-testid={`reschedule-${booking.id}`}
                          >
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowCancelModal(true);
                              setCancelReason('');
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`cancel-${booking.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Book Another & Support */}
          {bookings.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => navigate(user?.user_type === 'school' ? '/school' : '/student')}
                variant="outline"
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
              >
                {user?.user_type === 'school' ? 'Schedule Another Meeting' : 'Book Another Demo'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => navigate('/student?support=true')}
                variant="outline"
                className="border-[#D63031] text-[#D63031] hover:bg-[#D63031]/5"
                data-testid="need-support-btn"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                I have a query / Need Support
              </Button>
            </div>
          )}

          {/* Other Courses Section - Show for all logged in users (except schools) */}
          {user?.user_type !== 'school' && (
            <div className="mt-12" data-testid="other-courses-section">
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Other Courses Offered by OLL
                </h2>
                <p className="text-slate-500 text-sm mt-1">Explore more skills to learn</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {COURSES_DATA.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
                    data-testid={`course-card-${course.id}`}
                  >
                    {/* Course Header */}
                    <div className={`relative h-24 bg-gradient-to-br ${course.gradient} flex items-center justify-center`}>
                      <span className="text-4xl">{course.emoji}</span>
                    </div>
                    
                    {/* Course Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-[#1E3A5F] group-hover:text-[#D63031] transition-colors">
                        {course.name}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1 line-clamp-1">
                        {course.tagline}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          View Details
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D63031] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* View All Courses Link */}
              <div className="mt-6 text-center">
                <Link 
                  to="/courses"
                  className="inline-flex items-center gap-2 text-[#1E3A5F] hover:text-[#D63031] font-medium transition-colors"
                  data-testid="view-all-courses-link"
                >
                  View All Courses
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reschedule Dialog */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select New Date</label>
              <div className="flex justify-center border rounded-xl p-2">
                <CalendarComponent
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                  className="rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select New Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 rounded-lg border text-sm ${
                      newTime === time 
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setNewTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowReschedule(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleReschedule}
                disabled={rescheduling || !newDate || !newTime}
                className="flex-1 bg-[#D63031] hover:bg-[#b52828]"
              >
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Demo Dialog */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Cancel Demo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              Are you sure you want to cancel your demo? Please let us know the reason so we can improve.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for cancellation</label>
              <div className="space-y-2">
                {CANCEL_REASONS.map(reason => (
                  <div
                    key={reason.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      cancelReason === reason.value 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setCancelReason(reason.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        cancelReason === reason.value ? 'border-red-500' : 'border-slate-300'
                      }`}>
                        {cancelReason === reason.value && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                      <span className="text-sm">{reason.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelModal(false)} className="flex-1">
                Keep Demo
              </Button>
              <Button 
                onClick={handleCancelBooking}
                disabled={cancelling || !cancelReason}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
