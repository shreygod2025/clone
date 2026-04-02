import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, CalendarClock, LogOut, Check, X, ChevronRight, BookOpen, Users, Video, MessageCircle, XCircle, Navigation, Home, PlayCircle, CheckCircle2, Circle, CreditCard, Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import { format, addDays, parseISO, isAfter, isBefore, addHours, compareAsc, isToday, isTomorrow } from 'date-fns';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { downloadReceiptPDF } from '../utils/receiptPdfGenerator';

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
  const { user, isLoggedIn, logout, loading: authLoading } = useUserAuth();
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'sessions'
  const [bookingFilter, setBookingFilter] = useState('upcoming'); // 'upcoming', 'completed', 'archived'
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
  
  // Payment-related state
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cashfreeReady, setCashfreeReady] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // School student payment receipts
  const [schoolReceipts, setSchoolReceipts] = useState(null); // null = not loaded yet

  const CANCEL_REASONS = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'found_alternative', label: 'Found an alternative' },
    { value: 'not_interested', label: 'No longer interested' },
    { value: 'financial', label: 'Financial reasons' },
    { value: 'other', label: 'Other reason' }
  ];

  // Load Cashfree SDK
  useEffect(() => {
    if (window.Cashfree) {
      setCashfreeReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      console.log('Cashfree SDK loaded');
      setCashfreeReady(true);
    };
    script.onerror = () => {
      console.error('Failed to load Cashfree SDK');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return;
    
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    // Only fetch once per mount to prevent duplicate calls
    if (!hasFetched.current && user?.phone) {
      hasFetched.current = true;
      fetchBookings();
      // Also fetch sessions for students
      if (user?.user_type === 'student' || !user?.user_type) {
        fetchSessions();
        fetchPaymentInfo();
        fetchSchoolReceipts();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate, user?.phone, authLoading]);

  // Fetch payment info for logged-in student
  const fetchPaymentInfo = async () => {
    if (!user?.phone) return;
    try {
      const response = await axios.get(`${API}/payments/by-phone/${user.phone}`);
      setPaymentInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    }
  };

  const fetchSchoolReceipts = async () => {
    if (!user?.phone) return;
    try {
      const response = await axios.get(`${API}/school-student/profile/${user.phone}`);
      setSchoolReceipts(response.data);
      // Auto-switch to school receipts tab if they have completed payments
      const completedPayments = response.data?.payments?.filter(p => ['PAID', 'REFUNDED'].includes(p.status));
      if (completedPayments?.length > 0) {
        setActiveTab('school_receipts');
      }
    } catch (error) {
      // 404 = no school payments, that's fine
      if (error.response?.status !== 404) {
        console.error('Failed to fetch school receipts:', error);
      }
      setSchoolReceipts({ payments: [] });
    }
  };

  const fetchSessions = async () => {
    if (!user?.phone) return;
    try {
      const response = await axios.get(`${API}/user/my-sessions/${user.phone}`);
      setSessions(response.data.sessions || []);
      setStudentInfo(response.data.student);
      // If user has sessions, default to sessions tab
      if (response.data.sessions?.length > 0) {
        setActiveTab('sessions');
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchBookings = async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/user/bookings/${user.phone}?user_type=${user.user_type || 'student'}`);
      // Sort bookings by date - earliest upcoming first
      const sortedBookings = (response.data || []).sort((a, b) => {
        const dateA = a.demo_date || a.meeting_date || '9999-12-31';
        const dateB = b.demo_date || b.meeting_date || '9999-12-31';
        try {
          return compareAsc(parseISO(dateA), parseISO(dateB));
        } catch {
          return 0;
        }
      });
      setBookings(sortedBookings);
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

  // Generate a Jitsi meeting link for students (participant role)
  const generateMeetingLink = (booking) => {
    // Create a unique Jitsi Meet room using booking ID
    const meetCode = booking.id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const userName = encodeURIComponent(user?.name || 'Student');
    
    // Jitsi config for students: they join as participants in lobby mode
    // The room is configured so moderators must admit participants
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': true,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'userInfo.displayName': userName
    };
    
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `https://meet.jit.si/${roomName}#${configString}`;
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

  // Check if booking is online mode
  const isOnlineMode = (booking) => {
    return booking.learning_mode === 'online';
  };

  // Check if booking is offline at center
  const isOfflineCenter = (booking) => {
    return booking.learning_mode === 'offline_center' || 
           (booking.learning_mode?.includes('offline') && booking.learning_mode?.includes('center'));
  };

  // Check if booking is offline at home
  const isOfflineHome = (booking) => {
    return booking.learning_mode === 'offline_home' || 
           (booking.learning_mode?.includes('offline') && booking.learning_mode?.includes('home'));
  };

  // Generate Google Maps link for center
  const generateCenterMapsLink = (booking) => {
    const centerName = booking.selected_center_name || booking.center_name || 'OLL Center';
    const city = booking.city || '';
    const query = encodeURIComponent(`${centerName} ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Get location display text
  const getLocationDisplay = (booking) => {
    if (isOnlineMode(booking)) {
      return { type: 'online', text: 'Online Class', icon: Video };
    } else if (isOfflineCenter(booking)) {
      const centerName = booking.selected_center_name || booking.center_name || 'OLL Center';
      return { 
        type: 'center', 
        text: `${centerName}, ${booking.city || ''}`, 
        icon: MapPin 
      };
    } else if (isOfflineHome(booking)) {
      const address = booking.address || booking.home_address || booking.city || 'Your Home';
      return { 
        type: 'home', 
        text: `At Home - ${address}`, 
        icon: Home 
      };
    }
    return { type: 'unknown', text: booking.location || booking.city || 'Location TBD', icon: MapPin };
  };

  // Handle support query - navigate without logging out
  const handleSupportQuery = () => {
    // Store user data before navigation to ensure session persists
    navigate('/student', { state: { openSupport: true } });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  // Format currency for payment display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle Pay Now button click - Cashfree Drop-in
  const handlePayNow = useCallback(async () => {
    if (!cashfreeReady) {
      toast.error('Payment system is loading. Please wait a moment.');
      return;
    }

    if (!paymentInfo?.student_id) {
      toast.error('Missing payment information. Please refresh the page.');
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      // Step 1: Create payment session on backend
      const response = await axios.post(`${API}/payments/create-session/${paymentInfo.student_id}`);
      
      if (!response.data.success || !response.data.payment_session_id) {
        throw new Error('Failed to create payment session');
      }

      const { payment_session_id, environment, order_id } = response.data;
      
      // Step 2: Initialize Cashfree with correct environment
      const cashfree = window.Cashfree({
        mode: environment === 'sandbox' ? 'sandbox' : 'production'
      });

      // Step 3: Open Cashfree Drop-in checkout (modal)
      const checkoutOptions = {
        paymentSessionId: payment_session_id,
        redirectTarget: '_modal'
      };

      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        console.error('Payment error:', result.error);
        if (result.error.message) {
          setPaymentError(`Payment failed: ${result.error.message}`);
          toast.error(`Payment failed: ${result.error.message}`);
        } else {
          setPaymentError('Payment was not completed. Please try again.');
          toast.error('Payment was not completed. Please try again.');
        }
      }

      // Helper function to verify payment with retries
      const verifyPaymentWithRetry = async (orderId, maxAttempts = 5) => {
        let attempts = 0;
        
        const verify = async () => {
          try {
            const verifyResponse = await axios.get(`${API}/payments/verify/${orderId}`);
            const status = verifyResponse.data.status;
            
            console.log(`Payment verification attempt ${attempts + 1}: Status = ${status}`);
            
            if (status === 'PAID') {
              setPaymentSuccess(true);
              setPaymentInfo(null);
              toast.success('Payment successful! Your sessions are being scheduled.');
              // Refresh sessions data
              setTimeout(() => {
                fetchSessions();
                fetchBookings();
              }, 1000);
              return true;
            } else if (status === 'ACTIVE' && attempts < maxAttempts) {
              // Payment still being processed, retry
              attempts++;
              toast.loading(`Verifying payment... (${attempts}/${maxAttempts})`, { id: 'payment-verify' });
              await new Promise(resolve => setTimeout(resolve, 3000));
              return verify();
            } else if (status === 'FAILED' || status === 'EXPIRED' || status === 'TERMINATED') {
              toast.dismiss('payment-verify');
              setPaymentError(`Payment ${status.toLowerCase()}. Please try again.`);
              return false;
            } else {
              toast.dismiss('payment-verify');
              if (status === 'ACTIVE') {
                setPaymentError('Payment is being processed. Please wait a few minutes and refresh the page.');
              }
              fetchPaymentInfo();
              return false;
            }
          } catch (e) {
            console.error('Verification error:', e);
            if (attempts < maxAttempts) {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 3000));
              return verify();
            }
            toast.dismiss('payment-verify');
            fetchPaymentInfo();
            return false;
          }
        };
        
        return verify();
      };

      if (result.redirect) {
        console.log('Payment redirect completed');
        await verifyPaymentWithRetry(order_id);
      }

      if (result.paymentDetails) {
        const paymentStatus = result.paymentDetails.paymentMessage;
        console.log('Payment status:', paymentStatus);
        
        if (paymentStatus === 'Payment is successful' || paymentStatus === 'SUCCESS') {
          await verifyPaymentWithRetry(order_id);
        } else {
          // Refresh to get latest status
          setTimeout(() => {
            fetchPaymentInfo();
          }, 1500);
        }
      }

    } catch (err) {
      console.error('Payment error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Payment failed. Please try again.';
      setPaymentError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashfreeReady, paymentInfo]);

  const getStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-700',
      'confirmed': 'bg-green-100 text-green-700',
      'demo_completed': 'bg-purple-100 text-purple-700',
      'converted': 'bg-emerald-100 text-emerald-700',
      'rescheduled': 'bg-amber-100 text-amber-700',
      'cancelled': 'bg-red-100 text-red-700',
      'archived': 'bg-slate-100 text-slate-700',
      'incomplete': 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getSessionStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'missed': 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'new': 'SCHEDULED',
      'confirmed': 'CONFIRMED',
      'demo_completed': 'COMPLETED',
      'converted': 'CONVERTED',
      'rescheduled': 'RESCHEDULED',
      'cancelled': 'CANCELLED',
      'archived': 'ARCHIVED',
      'incomplete': 'MISSED - RESCHEDULE',
    };
    return labels[status] || status?.replace('_', ' ').toUpperCase() || 'NEW';
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

  const formatSessionDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  // Check if session is joinable (within 15 mins before to 1 hour after)
  const isSessionJoinable = (session) => {
    if (!session.date || !session.time) return false;
    if (session.status !== 'scheduled') return false;
    if (session.mode !== 'online') return false;
    
    try {
      const sessionDateTime = parseISO(`${session.date}T${session.time}:00`);
      const now = new Date();
      const joinWindowStart = addHours(sessionDateTime, -0.25); // 15 mins before
      const joinWindowEnd = addHours(sessionDateTime, 1); // 1 hour after
      
      return isAfter(now, joinWindowStart) && isBefore(now, joinWindowEnd);
    } catch {
      return false;
    }
  };

  // Generate session Jitsi link
  const generateSessionLink = (session) => {
    const roomName = session.jitsi_room || `oll-${session.batch_id?.slice(0,8)}-${session.student_id?.slice(0,8)}`;
    const userName = encodeURIComponent(user?.name || 'Student');
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': true,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'userInfo.displayName': userName
    };
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return session.jitsi_link || `https://meet.jit.si/${roomName}#${configString}`;
  };

  // Calculate session stats
  const sessionStats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    upcoming: sessions.filter(s => s.status === 'scheduled').length,
  };

  // Filter bookings based on status
  const filterBookings = () => {
    const now = new Date();
    
    if (bookingFilter === 'upcoming') {
      // Upcoming: new, confirmed, rescheduled, incomplete - and date is in future or today
      return bookings.filter(b => {
        const bookingDate = b.demo_date || b.meeting_date;
        if (!bookingDate) return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status);
        try {
          const date = parseISO(bookingDate);
          const isUpcoming = isAfter(date, addDays(now, -1)); // Include today
          return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status) && isUpcoming;
        } catch {
          return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status);
        }
      });
    } else if (bookingFilter === 'completed') {
      // Completed: demo_completed, converted
      return bookings.filter(b => ['demo_completed', 'converted'].includes(b.status));
    } else if (bookingFilter === 'archived') {
      // Archived/Cancelled: cancelled, archived
      return bookings.filter(b => ['cancelled', 'archived'].includes(b.status));
    }
    return bookings;
  };

  const filteredBookings = filterBookings();

  // Count bookings by filter
  const bookingCounts = {
    upcoming: bookings.filter(b => {
      const now = new Date();
      const bookingDate = b.demo_date || b.meeting_date;
      if (!bookingDate) return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status);
      try {
        const date = parseISO(bookingDate);
        const isUpcoming = isAfter(date, addDays(now, -1));
        return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status) && isUpcoming;
      } catch {
        return ['new', 'confirmed', 'rescheduled', 'incomplete'].includes(b.status);
      }
    }).length,
    completed: bookings.filter(b => ['demo_completed', 'converted'].includes(b.status)).length,
    archived: bookings.filter(b => ['cancelled', 'archived'].includes(b.status)).length,
  };

  if (!isLoggedIn) return null;

  // Check if user has sessions (converted student)
  const hasActiveSessions = sessions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {hasActiveSessions ? 'My Learning' : 'My Bookings'}
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

          {/* Pay Fees Section - Prominent card for pending payments */}
          {paymentInfo?.has_pending_payment && (
            <div className="mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg" data-testid="pay-fees-section">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Pay Your Fees</h2>
                  </div>
                  <p className="text-green-100 text-sm mb-2">
                    Complete your payment to start your batch sessions
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="text-green-100">
                      <span className="text-white font-medium">Batch:</span> {paymentInfo.batch_name || 'Course Batch'}
                    </p>
                    {paymentInfo.skill && (
                      <p className="text-green-100">
                        <span className="text-white font-medium">Course:</span> {paymentInfo.skill}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-green-100 text-sm mb-1">Amount Due</p>
                  <p className="text-3xl font-bold mb-3" data-testid="payment-amount">
                    {formatCurrency(paymentInfo.amount)}
                  </p>
                  <Button
                    onClick={handlePayNow}
                    disabled={processingPayment || !cashfreeReady}
                    className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-3 text-base shadow-md"
                    data-testid="pay-now-btn"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : !cashfreeReady ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Payment Error */}
              {paymentError && (
                <div className="mt-4 bg-red-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <p className="text-white text-sm">{paymentError}</p>
                </div>
              )}
              
              {/* Security Note */}
              <div className="mt-4 pt-4 border-t border-green-400/30 flex items-center justify-center gap-2 text-green-100 text-xs">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secure payment powered by Cashfree | UPI, Cards, Net Banking accepted
              </div>
            </div>
          )}

          {/* Payment Success Card */}
          {paymentSuccess && (
            <div className="mb-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg" data-testid="payment-success-section">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Payment Successful!</h2>
                  <p className="text-green-100 mt-1">
                    Thank you! Your batch sessions are being scheduled. Check your sessions below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs - Show sessions + school receipts if applicable */}
          {(hasActiveSessions || schoolReceipts?.payments?.length > 0) && (
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'bookings' 
                    ? 'bg-[#1E3A5F] text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
                data-testid="bookings-tab"
              >
                <Calendar className="w-4 h-4 inline-block mr-1.5" />
                Demo Bookings ({bookings.length})
              </button>
              {hasActiveSessions && (
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'sessions' 
                      ? 'bg-[#1E3A5F] text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid="sessions-tab"
                >
                  <PlayCircle className="w-4 h-4 inline-block mr-1.5" />
                  My Sessions ({sessions.length})
                </button>
              )}
              {schoolReceipts?.payments?.length > 0 && (
                <button
                  onClick={() => setActiveTab('school_receipts')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'school_receipts' 
                      ? 'bg-[#1E3A5F] text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid="school-receipts-tab"
                >
                  <CreditCard className="w-4 h-4 inline-block mr-1.5" />
                  School Receipts ({schoolReceipts.payments.filter(p => ['PAID', 'REFUNDED', 'paid', 'refunded'].includes(p.status)).length})
                </button>
              )}
            </div>
          )}

          {/* Sessions View */}
          {hasActiveSessions && activeTab === 'sessions' && (
            <>
              {/* Session Stats Card */}
              {studentInfo && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#1E3A5F]">{studentInfo.skill || 'Learning'} Classes</h3>
                      <p className="text-sm text-slate-500">{studentInfo.batch_name || 'Your Batch'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#1E3A5F]">{sessionStats.completed}/{sessionStats.total}</p>
                      <p className="text-xs text-slate-500">Sessions Completed</p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#1E3A5F] to-[#D63031] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sessionStats.total > 0 ? (sessionStats.completed / sessionStats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sessions List */}
              {sessions.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                  <PlayCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No sessions scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, index) => (
                    <div 
                      key={session.id}
                      className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                        session.status === 'completed' 
                          ? 'border-green-200 bg-green-50/30' 
                          : isSessionJoinable(session) 
                            ? 'border-[#D63031] ring-2 ring-[#D63031]/20' 
                            : 'border-slate-100'
                      }`}
                      data-testid={`session-card-${session.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Session Number Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            session.status === 'completed' 
                              ? 'bg-green-100' 
                              : 'bg-[#1E3A5F]/10'
                          }`}>
                            {session.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <span className="text-sm font-bold text-[#1E3A5F]">{session.session_number || index + 1}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#1E3A5F]">
                              Session {session.session_number || index + 1}
                            </h3>
                            <p className="text-sm text-slate-500">{session.skill || studentInfo?.skill || 'Class'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSessionStatusColor(session.status)}`}>
                          {session.status?.toUpperCase() || 'SCHEDULED'}
                        </span>
                      </div>

                      {/* Session Details */}
                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatSessionDate(session.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {session.time || 'TBD'}
                        </span>
                        <span className="flex items-center gap-1">
                          {session.mode === 'online' ? (
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                          )}
                          {session.mode === 'online' ? 'Online' : 'In-person'}
                        </span>
                      </div>

                      {/* Join Button for Online Sessions */}
                      {session.mode === 'online' && session.status === 'scheduled' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <a
                            href={generateSessionLink(session)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white font-medium text-sm transition-all ${
                              isSessionJoinable(session)
                                ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] animate-pulse'
                                : 'bg-gradient-to-r from-[#1E3A5F] to-[#2d5a87] hover:from-[#2d5a87] hover:to-[#1E3A5F]'
                            }`}
                            data-testid={`join-session-${session.id}`}
                          >
                            <Video className="w-4 h-4" />
                            {isSessionJoinable(session) ? 'Join Now' : 'Join Class'}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bookings View (Original) */}
          {activeTab === 'bookings' && (
            <>
              {/* Booking Filter Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setBookingFilter('upcoming')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    bookingFilter === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                  data-testid="filter-upcoming"
                >
                  <CalendarClock className="w-4 h-4 inline-block mr-1.5" />
                  Upcoming ({bookingCounts.upcoming})
                </button>
                <button
                  onClick={() => setBookingFilter('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    bookingFilter === 'completed'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-green-300'
                  }`}
                  data-testid="filter-completed"
                >
                  <Check className="w-4 h-4 inline-block mr-1.5" />
                  Completed ({bookingCounts.completed})
                </button>
                <button
                  onClick={() => setBookingFilter('archived')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    bookingFilter === 'archived'
                      ? 'bg-slate-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                  }`}
                  data-testid="filter-archived"
                >
                  <XCircle className="w-4 h-4 inline-block mr-1.5" />
                  Archived/Cancelled ({bookingCounts.archived})
                </button>
              </div>

              {/* Bookings List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
                  <p className="text-slate-500 mt-4">Loading your bookings...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    {bookingFilter === 'upcoming' ? (
                      <CalendarClock className="w-7 h-7 text-blue-400" />
                    ) : bookingFilter === 'completed' ? (
                      <Check className="w-7 h-7 text-green-400" />
                    ) : (
                      <XCircle className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-[#1E3A5F] mb-1">
                    {bookingFilter === 'upcoming' 
                      ? 'No Upcoming Bookings' 
                      : bookingFilter === 'completed'
                      ? 'No Completed Demos'
                      : 'No Archived Bookings'}
                  </h2>
                  <p className="text-slate-500 text-sm mb-4">
                    {bookingFilter === 'upcoming' 
                      ? "You don't have any upcoming demos scheduled."
                      : bookingFilter === 'completed'
                      ? "You haven't completed any demos yet."
                      : "No cancelled or archived bookings."}
                  </p>
                  {bookingFilter === 'upcoming' && (
                    <Button 
                      onClick={() => navigate(user?.user_type === 'school' ? '/school' : '/student')}
                      className="bg-[#D63031] hover:bg-[#b52828]"
                      data-testid="book-session-btn"
                    >
                      {user?.user_type === 'school' ? 'Schedule a Meeting' : 'Book a Session'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[#1E3A5F]">
                              {user?.user_type === 'school' 
                                ? booking.school_name 
                                : user?.user_type === 'educator'
                                ? `Application: ${booking.skills?.join(', ') || 'Educator'}`
                                : booking.skill?.charAt(0).toUpperCase() + booking.skill?.slice(1) || 'Demo'
                              }
                            </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(booking.demo_date || booking.meeting_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {booking.demo_time || booking.meeting_time || 'TBD'}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    
                    {/* Incomplete Notice */}
                    {booking.status === 'incomplete' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                        <p className="text-orange-700 font-medium">We missed you at the demo!</p>
                        <p className="text-orange-600 text-xs mt-1">
                          {booking.incomplete_reason || 'The educator reported that you didn\'t join the demo.'}
                        </p>
                        <p className="text-slate-600 text-xs mt-2">Please reschedule at your convenience using the button below.</p>
                      </div>
                    )}
                    
                    {/* Location Row */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      {(() => {
                        const locationInfo = getLocationDisplay(booking);
                        const LocationIcon = locationInfo.icon;
                        return (
                          <>
                            <LocationIcon className="w-4 h-4 text-slate-400" />
                            <span className={locationInfo.type === 'home' ? 'text-green-600 font-medium' : ''}>
                              {locationInfo.text}
                            </span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      {/* Join Demo Button - Full width on mobile */}
                      {isOnlineMode(booking) && ['new', 'confirmed', 'rescheduled'].includes(booking.status) && (
                        <a
                          href={generateMeetingLink(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-3 md:py-1.5 rounded-lg text-white font-medium text-xs md:text-sm transition-all duration-300 shadow-sm hover:shadow-md ${
                            isDemoJoinable(booking)
                              ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] animate-pulse'
                              : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F]'
                          }`}
                          data-testid={`join-demo-${booking.id}`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          {isDemoJoinable(booking) ? 'Join Now' : 'Join Demo'}
                        </a>
                      )}

                      {/* Go to Center Button */}
                      {isOfflineCenter(booking) && ['new', 'confirmed', 'rescheduled'].includes(booking.status) && (
                        <a
                          href={generateCenterMapsLink(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-3 md:py-1.5 rounded-lg text-white font-medium text-xs md:text-sm transition-all duration-300 bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] shadow-sm hover:shadow-md"
                          data-testid={`go-to-center-${booking.id}`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Go to Center
                        </a>
                      )}
                      
                      {/* Reschedule button for incomplete demos - Highlighted */}
                      {booking.status === 'incomplete' && (
                        <Button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowReschedule(true);
                          }}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                          data-testid={`reschedule-incomplete-${booking.id}`}
                        >
                          <CalendarClock className="w-4 h-4 mr-2" />
                          Reschedule Demo
                        </Button>
                      )}
                      
                      {/* Reschedule & Cancel - Half-half on mobile */}
                      {['new', 'confirmed', 'rescheduled'].includes(booking.status) && (
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowReschedule(true);
                            }}
                            className="flex-1 text-[#1E3A5F] border-[#1E3A5F]/30 hover:bg-[#1E3A5F]/5"
                            data-testid={`reschedule-${booking.id}`}
                          >
                            <CalendarClock className="w-4 h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Reschedule</span>
                            <span className="sm:hidden">Reschedule</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowCancelModal(true);
                              setCancelReason('');
                            }}
                            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                            data-testid={`cancel-${booking.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1 md:mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Book Another & Support - Subtle shadow buttons */}
          {bookings.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate(user?.user_type === 'school' ? '/school' : '/student')}
                className="px-5 py-2.5 bg-white text-[#1E3A5F] text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                {user?.user_type === 'school' ? 'Schedule Another Meeting' : 'Book Another Demo'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSupportQuery}
                className="px-5 py-2.5 bg-white text-slate-600 text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                data-testid="need-support-btn"
              >
                <MessageCircle className="w-4 h-4" />
                I have a query
              </button>
            </div>
          )}
            </>
          )}

          {/* Other Courses Section - Show for all logged in users (except schools) */}
          {/* School Receipts Tab */}
          {activeTab === 'school_receipts' && schoolReceipts?.payments?.length > 0 && (
            <div data-testid="school-receipts-section">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#1E3A5F]">School Programme Receipts</h2>
                <p className="text-sm text-slate-500">Payments made via your school's programme portal</p>
              </div>
              <div className="space-y-3">
                {schoolReceipts.payments
                  .filter(p => ['PAID', 'REFUNDED', 'paid', 'refunded'].includes(p.status))
                  .map((payment, idx) => (
                  <div key={payment.id || idx} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100" data-testid={`school-receipt-${idx}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            payment.status?.toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' :
                            payment.status?.toUpperCase() === 'REFUNDED' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{payment.status?.toUpperCase()}</span>
                          {payment.receipt_number && (
                            <span className="text-xs text-slate-400">#{payment.receipt_number}</span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800">{payment.student_name || user?.name}</p>
                        <p className="text-sm text-slate-500">{payment.school_name || schoolReceipts.school_name}</p>
                        {payment.grade && <p className="text-xs text-slate-400">Grade: {payment.grade}</p>}
                        {payment.programme_name && <p className="text-xs text-slate-400">{payment.programme_name}</p>}
                        {payment.created_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            Paid on: {new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-[#1E3A5F]">₹{Number(payment.amount || 0).toLocaleString('en-IN')}</p>
                        {payment.payment_id && (
                          <p className="text-xs text-slate-400 mt-0.5">Txn: {payment.payment_id}</p>
                        )}
                      </div>
                    </div>
                    {/* Download Receipt Button */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => downloadReceiptPDF(payment, schoolReceipts.school_name)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1E3A5F] text-white hover:bg-[#2d5a87] transition-colors"
                        data-testid={`download-receipt-${idx}`}
                      >
                        <Download className="w-4 h-4" />
                        Download Receipt
                      </button>
                    </div>
                  </div>
                ))}
                {schoolReceipts.payments.filter(p => ['PAID', 'REFUNDED', 'paid', 'refunded'].includes(p.status)).length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No completed payments yet</p>
                  </div>
                )}
              </div>
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
