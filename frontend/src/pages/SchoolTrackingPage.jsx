import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Circle, Clock, Calendar, Package, Users, Settings, BookOpen, FileText, ThumbsUp, Truck, AlertCircle, HelpCircle, MessageSquare, Send, X, Share2, DollarSign, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEP_ICONS = {
  payment_collection: <CheckCircle2 className="w-5 h-5" />,
  kit_delivery: <Package className="w-5 h-5" />,
  distribution_checking: <Users className="w-5 h-5" />,
  technical_check: <Settings className="w-5 h-5" />,
  teacher_training: <BookOpen className="w-5 h-5" />,
  calendar_making: <Calendar className="w-5 h-5" />,
  timetable_finalization: <Clock className="w-5 h-5" />,
  mou_signing: <FileText className="w-5 h-5" />,
  school_confirmation: <ThumbsUp className="w-5 h-5" />
};

// Step-specific help queries
const STEP_QUERIES = {
  payment_collection: [
    { label: "When is payment due?", type: "payment_due_date" },
    { label: "What payment methods are accepted?", type: "payment_methods" },
    { label: "Request payment receipt", type: "payment_receipt" },
    { label: "Payment plan inquiry", type: "payment_plan" }
  ],
  kit_delivery: [
    { label: "Track my shipment", type: "track_shipment" },
    { label: "Delivery not received", type: "delivery_missing" },
    { label: "Items missing/damaged", type: "items_damaged" },
    { label: "Change delivery address", type: "change_address" }
  ],
  distribution_checking: [
    { label: "How to distribute kits?", type: "distribution_guide" },
    { label: "Inventory mismatch", type: "inventory_issue" },
    { label: "Storage requirements", type: "storage_help" }
  ],
  technical_check: [
    { label: "Setup assistance needed", type: "setup_help" },
    { label: "Equipment not working", type: "equipment_issue" },
    { label: "Software installation help", type: "software_help" }
  ],
  teacher_training: [
    { label: "Training schedule inquiry", type: "training_schedule" },
    { label: "Reschedule training", type: "reschedule_training" },
    { label: "Training materials needed", type: "training_materials" },
    { label: "Additional training session", type: "extra_training" }
  ],
  calendar_making: [
    { label: "Calendar template needed", type: "calendar_template" },
    { label: "Help with scheduling", type: "scheduling_help" }
  ],
  timetable_finalization: [
    { label: "Timetable conflict", type: "timetable_conflict" },
    { label: "Change class timings", type: "timing_change" }
  ],
  mou_signing: [
    { label: "MOU draft review", type: "mou_review" },
    { label: "Clarification on terms", type: "terms_clarification" },
    { label: "Request document copy", type: "document_copy" }
  ],
  school_confirmation: [
    { label: "Final review meeting", type: "final_meeting" },
    { label: "Update school details", type: "update_details" }
  ]
};

const SchoolTrackingPage = () => {
  const { token } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ query_type: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await axios.get(`${API}/track/${token}`);
        setTrackingData(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Tracking not found');
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchTracking();
    }
  }, [token]);

  const handleSubmitTicket = async () => {
    if (!ticketForm.query_type) {
      toast.error('Please select a query type');
      return;
    }
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/track/${token}/support-ticket`, {
        step: trackingData?.current_step || 'general',
        query_type: ticketForm.query_type,
        description: ticketForm.description,
        priority: 'medium'
      });
      setTicketSuccess(response.data.ticket_id);
      setTicketForm({ query_type: '', description: '' });
      toast.success('Support ticket submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Tracking Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-[#1E3A5F] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const { school_name, contact_name, programs, progress_percent, completed_steps, total_steps, steps, timeline, current_step, started_at, completed_at, onboarding_details } = trackingData;

  return (
    <>
      <Helmet>
        <title>Onboarding Progress - {school_name} | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Proper OLL Header/Navbar */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img src="/oll-logo.png" alt="OLL" className="h-10 w-auto" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} />
                <div className="w-10 h-10 bg-[#1E3A5F] rounded-lg items-center justify-center hidden">
                  <span className="text-white font-bold text-xl">O</span>
                </div>
                <span className="text-xl font-bold text-[#1E3A5F]">OLL</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-slate-600 hover:text-[#1E3A5F] text-sm font-medium">Home</Link>
                <Link to="/for-students" className="text-slate-600 hover:text-[#1E3A5F] text-sm font-medium">For Students</Link>
                <Link to="/for-schools" className="text-slate-600 hover:text-[#1E3A5F] text-sm font-medium">For Schools</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] text-sm font-medium">About</Link>
              </nav>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied! Share it with your team.');
                }}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </header>

        {/* School Tracking Hero */}
        <div className="bg-[#1E3A5F] text-white py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Onboarding Progress Tracker</p>
                <h1 className="text-2xl md:text-3xl font-bold">{school_name}</h1>
                <p className="text-white/70 text-sm mt-1">Contact: {contact_name}</p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-4xl font-bold">{progress_percent}%</div>
                <div className="text-sm text-white/80">{completed_steps} of {total_steps} steps complete</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-2">
          <div className="bg-white rounded-full h-3 shadow-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        </div>

        {/* Onboarding Details Cards */}
        {onboarding_details && (onboarding_details.total_amount || onboarding_details.contract_start) && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {onboarding_details.total_amount && (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Amount</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">₹{onboarding_details.total_amount?.toLocaleString()}</p>
                </div>
              )}
              {onboarding_details.total_students && (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-xs font-medium">Students</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{onboarding_details.total_students}</p>
                </div>
              )}
              {onboarding_details.contract_start && (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Contract Start</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{onboarding_details.contract_start}</p>
                </div>
              )}
              {onboarding_details.contract_end && (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Contract End</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{onboarding_details.contract_end}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Status Banner */}
          {completed_at ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 mb-8 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Onboarding Complete!</p>
                <p className="text-sm text-green-700">Completed on {format(new Date(completed_at), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 mb-8 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Onboarding In Progress</p>
                <p className="text-sm text-blue-700">Started on {started_at ? format(new Date(started_at), 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8">
            {/* Steps Timeline */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Onboarding Steps</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {steps.map((step, idx) => (
                  <div 
                    key={step.key}
                    className={`flex items-start gap-4 p-4 border-b last:border-b-0 ${
                      step.completed ? 'bg-green-50' : 
                      current_step === step.key ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    {/* Step Number/Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-500 text-white' 
                        : current_step === step.key 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        STEP_ICONS[step.key] || <Circle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${step.completed ? 'text-green-800' : 'text-slate-800'}`}>
                          {step.title}
                        </h3>
                        {step.completed && step.completed_date && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            {format(new Date(step.completed_date), 'MMM d')}
                          </span>
                        )}
                        {current_step === step.key && !step.completed && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                      
                      {/* Kit Tracking Link */}
                      {step.key === 'kit_delivery' && step.tracking_link && (
                        <a 
                          href={step.tracking_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                        >
                          <Truck className="w-4 h-4" /> Track Shipment
                        </a>
                      )}
                      
                      {/* Training Date */}
                      {step.key === 'teacher_training' && step.training_date && (
                        <p className="text-sm text-blue-600 mt-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Scheduled: {format(new Date(step.training_date), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Connection Line */}
                    {idx < steps.length - 1 && (
                      <div className="absolute left-[2.25rem] mt-10 w-0.5 h-full bg-slate-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* School Info */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">School Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Contact:</span> {contact_name}</p>
                  {programs && programs.length > 0 && (
                    <div>
                      <span className="text-slate-500">Programs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {programs.map(p => (
                          <span key={p} className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity yet</p>
                  ) : (
                    timeline.slice().reverse().map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-[#1E3A5F] mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-slate-700">{item.action}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(item.date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Help */}
              <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2d4a6f] rounded-xl shadow-lg p-4 text-white">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Need Help?
                </h3>
                <p className="text-sm text-white/80 mb-3">
                  Have questions about your onboarding? We are here to help!
                </p>
                <button 
                  onClick={() => setShowHelpModal(true)}
                  className="w-full bg-white text-[#1E3A5F] px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Get Support
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1E3A5F] flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    How can we help?
                  </h3>
                  <button 
                    onClick={() => {
                      setShowHelpModal(false);
                      setTicketSuccess(null);
                      setTicketForm({ query_type: '', description: '' });
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {ticketSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-slate-800 mb-2">Ticket Submitted!</h4>
                    <p className="text-sm text-slate-600 mb-2">Your ticket ID: <span className="font-mono font-bold">{ticketSuccess}</span></p>
                    <p className="text-sm text-slate-500">Our team will contact you within 24 hours.</p>
                    <button
                      onClick={() => {
                        setShowHelpModal(false);
                        setTicketSuccess(null);
                      }}
                      className="mt-6 px-6 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Current Step Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-600 mb-1">Current Step</p>
                      <p className="text-sm font-medium text-blue-800 capitalize">
                        {(current_step || 'payment_collection').replace(/_/g, ' ')}
                      </p>
                    </div>

                    {/* Step-specific Quick Queries */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">Quick Questions</p>
                      <div className="space-y-2">
                        {(STEP_QUERIES[current_step] || STEP_QUERIES.payment_collection).map((query, idx) => (
                          <button
                            key={idx}
                            onClick={() => setTicketForm({ ...ticketForm, query_type: query.type })}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              ticketForm.query_type === query.type
                                ? 'bg-[#1E3A5F] text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {query.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setTicketForm({ ...ticketForm, query_type: 'other' })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            ticketForm.query_type === 'other'
                              ? 'bg-[#1E3A5F] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          Other / General Query
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Additional Details (Optional)
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Describe your issue or question in more detail..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleSubmitTicket}
                      disabled={submitting || !ticketForm.query_type}
                      className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Support Request
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-500 text-center mt-3">
                      Or email us directly at <a href="mailto:support@oll.co" className="text-[#1E3A5F] underline">support@oll.co</a>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Proper OLL Footer - matching main site */}
        <footer className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              {/* Logo & Description */}
              <div className="col-span-2 md:col-span-1">
                <Link to="/" className="flex items-center gap-2 mb-4">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png"
                    alt="OLL Logo"
                    className="h-10 w-auto"
                  />
                </Link>
                <p className="text-slate-400 text-sm leading-relaxed">
                  India's leading skill education platform. Empowering students with Robotics, Coding, AI, and Entrepreneurship skills.
                </p>
              </div>

              {/* Programs */}
              <div>
                <h4 className="font-semibold mb-4 text-white">Programs</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/courses/robotics" className="hover:text-white transition-colors">Robotics</Link></li>
                  <li><Link to="/courses/coding" className="hover:text-white transition-colors">Coding</Link></li>
                  <li><Link to="/courses/ai" className="hover:text-white transition-colors">AI & ML</Link></li>
                  <li><Link to="/courses/entrepreneurship" className="hover:text-white transition-colors">Entrepreneurship</Link></li>
                </ul>
              </div>

              {/* For Schools */}
              <div>
                <h4 className="font-semibold mb-4 text-white">For Schools</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/school-offerings" className="hover:text-white transition-colors">All Programs</Link></li>
                  <li><Link to="/for-schools" className="hover:text-white transition-colors">Partner With Us</Link></li>
                  <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-semibold mb-4 text-white">Contact Us</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <a href="mailto:info@oll.co" className="hover:text-white transition-colors">info@oll.co</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <a href="tel:+919920188188" className="hover:text-white transition-colors">+91 9920188188</a>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span>Mumbai, India</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} Clonefutura Live Solutions Pvt. Ltd. All rights reserved.
              </p>
              <div className="flex gap-6">
                <Link to="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/refund-policy" className="text-sm text-slate-400 hover:text-white transition-colors">Refund Policy</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolTrackingPage;
