import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Circle, Clock, Calendar, Package, Users, Settings, BookOpen, FileText, ThumbsUp, Truck, AlertCircle, HelpCircle, MessageSquare, Send, X, Share2, DollarSign, GraduationCap, Mail, Phone, MapPin, Download, User, Building2, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEP_ICONS = {
  mou_signing: <FileText className="w-5 h-5" />,
  payment_collection: <DollarSign className="w-5 h-5" />,
  kit_delivery: <Package className="w-5 h-5" />,
  distribution_checking: <Users className="w-5 h-5" />,
  technical_check: <Settings className="w-5 h-5" />,
  teacher_training: <BookOpen className="w-5 h-5" />,
  calendar_making: <Calendar className="w-5 h-5" />,
  timetable_finalization: <Clock className="w-5 h-5" />,
  school_confirmation: <ThumbsUp className="w-5 h-5" />
};

// Step-specific help queries
const STEP_QUERIES = {
  mou_signing: [
    { label: "MOU draft review", type: "mou_review", faq: "I would like to review the MOU document before signing. Please share the draft for my review." },
    { label: "Clarification on terms", type: "terms_clarification", faq: "I need clarification on some terms mentioned in the MOU document." },
    { label: "Request document copy", type: "document_copy", faq: "Please share a copy of the signed MOU document for our records." }
  ],
  payment_collection: [
    { label: "When is payment due?", type: "payment_due_date", faq: "Could you please confirm the payment due date and share the payment schedule?" },
    { label: "What payment methods are accepted?", type: "payment_methods", faq: "What payment methods are accepted? Do you accept cheque, NEFT, or online payment?" },
    { label: "Request payment receipt", type: "payment_receipt", faq: "I have completed the payment. Please share the payment receipt." },
    { label: "Payment plan inquiry", type: "payment_plan", faq: "Can we discuss a payment plan with instalments? Please advise on available options." }
  ],
  kit_delivery: [
    { label: "Track my shipment", type: "track_shipment", faq: "Please share the tracking details for the kit delivery shipment." },
    { label: "Delivery not received", type: "delivery_missing", faq: "We have not received the kit delivery yet. Please help track and resolve this." },
    { label: "Items missing/damaged", type: "items_damaged", faq: "Some items in the delivered kit are missing or damaged. Please arrange replacement." },
    { label: "Change delivery address", type: "change_address", faq: "I need to update the delivery address. Please update to the new address." }
  ],
  distribution_checking: [
    { label: "How to distribute kits?", type: "distribution_guide", faq: "Please share guidelines on how to distribute the kits to students." },
    { label: "Inventory mismatch", type: "inventory_issue", faq: "There is a mismatch in the inventory count. Please help resolve this." },
    { label: "Storage requirements", type: "storage_help", faq: "What are the storage requirements for the kits? Please advise." }
  ],
  technical_check: [
    { label: "Setup assistance needed", type: "setup_help", faq: "We need assistance with setting up the equipment. Please schedule a support call." },
    { label: "Equipment not working", type: "equipment_issue", faq: "Some equipment is not working properly. Please help troubleshoot." },
    { label: "Software installation help", type: "software_help", faq: "We need help with software installation. Please provide instructions or remote support." }
  ],
  teacher_training: [
    { label: "Training schedule inquiry", type: "training_schedule", faq: "Please share the teacher training schedule and session details." },
    { label: "Reschedule training", type: "reschedule_training", faq: "We need to reschedule the teacher training session. Please suggest alternative dates." },
    { label: "Training materials needed", type: "training_materials", faq: "Please share the training materials for our teachers to prepare in advance." },
    { label: "Additional training session", type: "extra_training", faq: "We would like to request an additional training session for more teachers." }
  ],
  calendar_making: [
    { label: "Calendar template needed", type: "calendar_template", faq: "Please share the academic calendar template for planning sessions." },
    { label: "Help with scheduling", type: "scheduling_help", faq: "We need help creating the class schedule. Please advise on best practices." }
  ],
  timetable_finalization: [
    { label: "Timetable conflict", type: "timetable_conflict", faq: "There is a scheduling conflict in the timetable. Please help resolve." },
    { label: "Change class timings", type: "timing_change", faq: "We need to change the class timings. Please update the schedule." }
  ],
  school_confirmation: [
    { label: "Final review meeting", type: "final_meeting", faq: "Please schedule a final review meeting before we go live." },
    { label: "Update school details", type: "update_details", faq: "I need to update some school details. Please help with the changes." }
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

  const { 
    school_name, 
    contact_name, 
    programs, 
    progress_percent, 
    completed_steps, 
    total_steps, 
    steps, 
    timeline, 
    current_step, 
    started_at, 
    completed_at, 
    onboarding_details, 
    payment_tranches, 
    payments,
    school_contacts,
    assigned_team_member,
    offerings,
    mou_url,
    is_renewal,
    documents
  } = trackingData;

  // Reorder steps to put MOU first
  const reorderedSteps = [...steps].sort((a, b) => {
    if (a.key === 'mou_signing') return -1;
    if (b.key === 'mou_signing') return 1;
    return 0;
  });

  return (
    <>
      <Helmet>
        <title>{school_name} {is_renewal ? 'Renewal' : 'Onboarding'} Tracker | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Renewal Banner */}
        {is_renewal && (
          <div className="bg-emerald-500 text-white py-2 px-4 text-center text-sm font-medium">
            🔄 Partnership Renewal - Thank you for continuing with OLL!
          </div>
        )}
        
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL Logo"
                  className="h-10 w-auto"
                />
              </Link>
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

        {/* Hero Section - New Title & Description */}
        <div className="bg-[#1E3A5F] text-white py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <Building2 className="w-8 h-8" />
                  {school_name} Onboarding Tracker
                </h1>
                <p className="text-white/70 text-sm mt-2 max-w-xl">
                  Track your school&apos;s onboarding journey with OLL. View progress, download documents, and see upcoming scheduled activities.
                </p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-4xl font-bold">{progress_percent}%</div>
                <div className="text-sm text-white/80">{completed_steps} of {total_steps} steps complete</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-2 w-full">
          <div className="bg-white rounded-full h-3 shadow-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        </div>

        {/* Status Banner */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 w-full">
          {completed_at ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">{is_renewal ? 'Renewal' : 'Onboarding'} Complete!</p>
                <p className="text-sm text-green-700">Completed on {format(new Date(completed_at), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">{is_renewal ? 'Renewal' : 'Onboarding'} In Progress</p>
                <p className="text-sm text-blue-700">Started on {started_at ? format(new Date(started_at), 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Steps Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-semibold text-[#1E3A5F]">{is_renewal ? 'Renewal' : 'Onboarding'} Steps</h2>
              
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {reorderedSteps.map((step, idx) => (
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
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className={`font-medium ${step.completed ? 'text-green-800' : 'text-slate-800'}`}>
                          {idx + 1}. {step.title}
                        </h3>
                        {step.completed && step.completed_date && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Completed {format(new Date(step.completed_date), 'MMM d')}
                          </span>
                        )}
                        {current_step === step.key && !step.completed && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                      
                      {/* MOU Download - Step 1 */}
                      {step.key === 'mou_signing' && (mou_url || onboarding_details?.mou_url) && (
                        <a 
                          href={mou_url || onboarding_details?.mou_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#2d4a6f] transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download MOU Document
                        </a>
                      )}
                      
                      {/* Kit Delivery - Show scheduled date */}
                      {step.key === 'kit_delivery' && (
                        <div className="mt-3 space-y-2">
                          {step.scheduled_date && (
                            <p className="text-sm text-blue-600 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Scheduled: {format(new Date(step.scheduled_date), 'MMMM d, yyyy')}
                            </p>
                          )}
                          {step.tracking_link && (
                            <a 
                              href={step.tracking_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <Truck className="w-4 h-4" /> Track Shipment
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Distribution Checking - Show scheduled date */}
                      {step.key === 'distribution_checking' && step.scheduled_date && (
                        <p className="text-sm text-blue-600 mt-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled: {format(new Date(step.scheduled_date), 'MMMM d, yyyy')}
                        </p>
                      )}
                      
                      {/* Teacher Training - Show scheduled date */}
                      {step.key === 'teacher_training' && (step.training_date || step.scheduled_date) && (
                        <p className="text-sm text-blue-600 mt-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled: {format(new Date(step.training_date || step.scheduled_date), 'MMMM d, yyyy')}
                          {step.training_time && ` at ${step.training_time}`}
                        </p>
                      )}

                      {/* Payment Collection - Show scheduled payment date if available */}
                      {step.key === 'payment_collection' && step.payment_date && !payment_tranches?.length && (
                        <p className="text-sm text-blue-600 mt-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Payment Date: {format(new Date(step.payment_date), 'MMMM d, yyyy')}
                        </p>
                      )}

                      {/* Payment Collection - Show Tranches */}
                      {step.key === 'payment_collection' && payment_tranches && payment_tranches.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-slate-600">Payment Schedule:</p>
                          {payment_tranches.map((tranche, tidx) => {
                            const tranchePayment = payments?.find(p => p.tranche_index === tidx);
                            return (
                              <div 
                                key={tidx} 
                                className={`bg-white border rounded-lg p-3 ${
                                  tranchePayment?.status === 'paid' ? 'border-green-200' : 'border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">Tranche {tidx + 1}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    tranchePayment?.status === 'paid' 
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {tranchePayment?.status || 'pending'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                                  {tranche.percentage && (
                                    <span>{tranche.percentage}%</span>
                                  )}
                                  <span className="font-medium text-green-600">
                                    ₹{(tranche.amount || 0).toLocaleString()}
                                  </span>
                                  <span>
                                    Due: {tranche.date ? format(new Date(tranche.date), 'MMM d') : '-'}
                                  </span>
                                </div>
                                {tranchePayment?.invoice_url && (
                                  <a 
                                    href={tranchePayment.invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                                  >
                                    <Download className="w-3 h-3" /> Download Invoice
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* School Contacts */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  School Team
                </h3>
                <div className="space-y-3">
                  {school_contacts && school_contacts.length > 0 ? (
                    school_contacts.map((contact, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-[#1E3A5F]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 text-sm">{contact.name}</p>
                          <p className="text-xs text-[#1E3A5F] font-medium capitalize">{(contact.role || 'Contact').replace(/_/g, ' ')}</p>
                          {contact.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {contact.phone_number || contact.phone}
                            </p>
                          )}
                          {contact.email && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {contact.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#1E3A5F]" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{contact_name}</p>
                        <p className="text-xs text-[#1E3A5F] font-medium">Primary Contact</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Offerings */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Programs & Offerings
                </h3>
                <div className="space-y-2">
                  {/* Show detailed offering info from onboarding_details */}
                  {onboarding_details?.offering && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{onboarding_details.offering}</span>
                    </div>
                  )}
                  {onboarding_details?.model && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-slate-500">Model</span>
                      <span className="text-slate-700 font-medium capitalize">{onboarding_details.model.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {onboarding_details?.kit_type && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-slate-500">Kit Type</span>
                      <span className="text-slate-700 font-medium capitalize">{onboarding_details.kit_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {onboarding_details?.book_type && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-slate-500">Book Type</span>
                      <span className="text-slate-700 font-medium capitalize">{onboarding_details.book_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {onboarding_details?.training_type && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-slate-500">Training</span>
                      <span className="text-slate-700 font-medium capitalize">{onboarding_details.training_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {/* Fallback: show offerings/programs list if no detailed info */}
                  {!onboarding_details?.offering && (offerings || programs || []).length > 0 && (
                    (offerings || programs).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{typeof item === 'string' ? item : item.name}</span>
                      </div>
                    ))
                  )}
                  {!onboarding_details?.offering && (offerings || programs || []).length === 0 && (
                    <p className="text-sm text-slate-500">No programs selected</p>
                  )}
                </div>
                {onboarding_details?.total_students && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Total Students</span>
                      <span className="font-semibold text-[#1E3A5F]">{onboarding_details.total_students}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              {((documents && documents.length > 0) || onboarding_details?.parent_circular_url || onboarding_details?.payment_link) && (
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Important Documents
                  </h3>
                  <div className="space-y-2">
                    {/* Parent Circular */}
                    {onboarding_details?.parent_circular_url && (
                      <a 
                        href={onboarding_details.parent_circular_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Parent Circular</span>
                        <ExternalLink className="w-4 h-4 text-yellow-600 ml-auto" />
                      </a>
                    )}
                    
                    {/* Payment Link */}
                    {onboarding_details?.payment_mode === 'from_student' && onboarding_details?.payment_link && (
                      <a 
                        href={onboarding_details.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Online Payment Link</span>
                        <ExternalLink className="w-4 h-4 text-green-600 ml-auto" />
                      </a>
                    )}
                    
                    {/* Other Documents */}
                    {documents?.map((doc, idx) => (
                      <a 
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-slate-600" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-800">{doc.type}</span>
                          <span className="text-xs text-slate-500 block truncate">{doc.name}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* OLL Team Member */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Your OLL Representative
                </h3>
                {assigned_team_member ? (
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {assigned_team_member.name?.charAt(0) || 'O'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{assigned_team_member.name}</p>
                      <p className="text-xs text-[#1E3A5F] font-medium">{assigned_team_member.role || 'Relationship Manager'}</p>
                      {assigned_team_member.phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {assigned_team_member.phone}
                        </p>
                      )}
                      {assigned_team_member.email && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {assigned_team_member.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">O</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">OLL Support Team</p>
                      <p className="text-xs text-[#1E3A5F] font-medium">Relationship Manager</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" /> support@oll.co
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Need Help - Above Recent Activity */}
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

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-3">Recent Activity</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-600 mb-1">Current Step</p>
                      <p className="text-sm font-medium text-blue-800 capitalize">
                        {(current_step || 'mou_signing').replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">Quick Questions</p>
                      <div className="space-y-2">
                        {(STEP_QUERIES[current_step] || STEP_QUERIES.mou_signing).map((query, idx) => (
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

        {/* Simple Footer Bar - Sticky at bottom */}
        <footer className="bg-[#1E3A5F] text-white mt-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png"
                  alt="OLL Logo"
                  className="h-8 w-auto"
                />
                <span className="text-sm text-white/70">© {new Date().getFullYear()} Clonefutura Live Solutions Pvt. Ltd</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <a href="tel:+919920188188" className="flex items-center gap-1 text-white/80 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">+91 99201 88188</span>
                </a>
                <a href="mailto:support@oll.co" className="flex items-center gap-1 text-white/80 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">support@oll.co</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolTrackingPage;
