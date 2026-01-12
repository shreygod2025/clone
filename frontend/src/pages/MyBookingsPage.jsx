import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, CalendarClock, LogOut, Check, X, ChevronRight, BookOpen, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import { format, addDays, parseISO } from 'date-fns';
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const hasFetched = useRef(false);

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

                    <div className="flex items-center gap-2">
                      {['new', 'confirmed', 'rescheduled'].includes(booking.status) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowReschedule(true);
                          }}
                          className="text-[#D63031] border-[#D63031]/30 hover:bg-red-50"
                          data-testid={`reschedule-${booking.id}`}
                        >
                          <CalendarClock className="w-4 h-4 mr-2" />
                          Reschedule
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Book Another */}
          {bookings.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                onClick={() => navigate(user?.user_type === 'school' ? '/school' : '/student')}
                variant="outline"
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
              >
                {user?.user_type === 'school' ? 'Schedule Another Meeting' : 'Book Another Demo'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Other Courses Section */}
          {user?.user_type === 'student' && (
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
    </div>
  );
};

export default MyBookingsPage;
