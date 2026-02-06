import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Eye, Phone, Mail, User, MapPin, CheckCircle2, X, FileText, 
  Clock, Briefcase, Building, CreditCard, GraduationCap, UserX, 
  ChevronRight, Copy, ExternalLink, UserPlus, AlertTriangle, BarChart3,
  Handshake, DollarSign
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ONBOARDING_STEPS = [
  { key: 'personal_info', label: 'Personal Information', icon: User, description: 'Personal details & documents' },
  { key: 'bank_details', label: 'Bank Details', icon: CreditCard, description: 'Bank account for payouts' },
  { key: 'contract_signing', label: 'Contract Signing', icon: FileText, description: 'Partnership contract' },
  { key: 'payment', label: 'Onboarding Fees', icon: DollarSign, description: 'Payment verification' },
  { key: 'kit_delivery', label: 'Kit Delivery', icon: Briefcase, description: 'Onboarding kit shipping' },
  { key: 'training', label: 'Training', icon: GraduationCap, description: 'Complete training program' },
];

const AdminGPOnboarding = () => {
  const { getAuthHeaders } = useAuth();
  const [onboardings, setOnboardings] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('onboarding');
  
  // Modal states
  const [viewOnboarding, setViewOnboarding] = useState(null);
  const [showStepModal, setShowStepModal] = useState(null);
  const [showActivateModal, setShowActivateModal] = useState(null);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [discontinueReason, setDiscontinueReason] = useState('');
  
  // Step form data
  const [stepData, setStepData] = useState({});

  useEffect(() => {
    fetchOnboardings();
    fetchRoles();
  }, []);

  const fetchOnboardings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/gp-onboarding`, { headers: getAuthHeaders() });
      setOnboardings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch GP onboardings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`, { headers: getAuthHeaders() });
      setRoles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleCompleteStep = async () => {
    if (!showStepModal) return;
    try {
      await axios.post(`${API}/gp-onboarding/${showStepModal.onboardingId}/complete-step`, {
        step: showStepModal.step,
        data: stepData
      }, { headers: getAuthHeaders() });
      toast.success(`${showStepModal.stepLabel} completed!`);
      setShowStepModal(null);
      setStepData({});
      fetchOnboardings();
    } catch (error) {
      toast.error('Failed to complete step');
    }
  };

  const handleActivate = async () => {
    if (!showActivateModal) return;
    try {
      const res = await axios.post(`${API}/gp-onboarding/${showActivateModal.id}/activate`, {
        role_id: selectedRoleId || undefined
      }, { headers: getAuthHeaders() });
      toast.success(`Growth Partner activated! Username: ${res.data.username}`);
      navigator.clipboard.writeText(res.data.temp_password);
      toast.info('Temporary password copied to clipboard');
      setShowActivateModal(null);
      setSelectedRoleId('');
      fetchOnboardings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleDiscontinue = async () => {
    if (!showDiscontinueModal || !discontinueReason) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await axios.post(`${API}/gp-onboarding/${showDiscontinueModal.id}/discontinue`, {
        reason: discontinueReason
      }, { headers: getAuthHeaders() });
      toast.success('Growth Partner discontinued');
      setShowDiscontinueModal(null);
      setDiscontinueReason('');
      fetchOnboardings();
    } catch (error) {
      toast.error('Failed to discontinue');
    }
  };

  const copyTrackingLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/gp-track/${token}`);
    toast.success('Tracking link copied!');
  };

  const getCompletedSteps = (steps) => {
    if (!steps) return 0;
    return Object.values(steps).filter(s => s.completed).length;
  };

  const filteredOnboardings = onboardings.filter(o => {
    const matchesSearch = !searchQuery ||
      o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'onboarding') return matchesSearch && o.status === 'onboarding';
    if (activeTab === 'active') return matchesSearch && o.status === 'active';
    if (activeTab === 'discontinued') return matchesSearch && o.status === 'discontinued';
    return matchesSearch;
  });

  const tabs = [
    { value: 'onboarding', label: 'Onboarding', count: onboardings.filter(o => o.status === 'onboarding').length, color: 'orange' },
    { value: 'active', label: 'Active', count: onboardings.filter(o => o.status === 'active').length, color: 'green' },
    { value: 'discontinued', label: 'Discontinued', count: onboardings.filter(o => o.status === 'discontinued').length, color: 'slate' },
  ];

  return (
    <AdminLayout title="Growth Partner Onboarding">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-gp-onboarding"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            data-testid={`tab-${tab.value}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.value
                ? tab.color === 'orange' ? 'bg-orange-500 text-white'
                  : tab.color === 'green' ? 'bg-green-600 text-white'
                  : 'bg-slate-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.value ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-slate-500 mt-4">Loading...</p>
        </div>
      ) : filteredOnboardings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <Handshake className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Growth Partners</h3>
          <p className="text-slate-500">
            {activeTab === 'onboarding' ? 'No partners in onboarding. Convert Growth Partner leads to start onboarding.' :
             activeTab === 'active' ? 'No active growth partners yet.' :
             'No discontinued growth partners.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOnboardings.map(partner => (
            <div key={partner.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#1E3A5F]">{partner.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      partner.status === 'onboarding' ? 'bg-orange-100 text-orange-700' :
                      partner.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {partner.status === 'onboarding' ? 'Onboarding' :
                       partner.status === 'active' ? 'Active Partner' : 'Discontinued'}
                    </span>
                    {partner.interest_type && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                        {partner.interest_type}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    {partner.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {partner.phone}
                      </span>
                    )}
                    {partner.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {partner.email}
                      </span>
                    )}
                    {partner.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {partner.city}
                      </span>
                    )}
                  </div>

                  {/* Progress for onboarding */}
                  {partner.status === 'onboarding' && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${(getCompletedSteps(partner.steps) / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{getCompletedSteps(partner.steps)}/3 steps</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {ONBOARDING_STEPS.map(step => {
                          const isCompleted = partner.steps?.[step.key]?.completed;
                          const Icon = step.icon;
                          return (
                            <button
                              key={step.key}
                              onClick={() => {
                                if (!isCompleted) {
                                  setShowStepModal({ onboardingId: partner.id, step: step.key, stepLabel: step.label });
                                  setStepData({});
                                }
                              }}
                              data-testid={`step-${step.key}-${partner.id}`}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                isCompleted 
                                  ? 'bg-green-100 text-green-700 cursor-default' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700'
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                              {step.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active partner stats */}
                  {partner.status === 'active' && (
                    <div className="mt-3 flex gap-4">
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{partner.total_referrals || 0}</p>
                        <p className="text-xs text-slate-500">Referrals</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{partner.successful_conversions || 0}</p>
                        <p className="text-xs text-slate-500">Conversions</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <p className="text-lg font-bold text-purple-600">₹{(partner.total_earnings || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Earnings</p>
                      </div>
                    </div>
                  )}

                  {/* Discontinued info */}
                  {partner.status === 'discontinued' && partner.discontinued_reason && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">
                        <strong>Reason:</strong> {partner.discontinued_reason}
                      </p>
                      {partner.discontinued_at && (
                        <p className="text-xs text-red-500 mt-1">
                          Discontinued on {format(new Date(partner.discontinued_at), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {partner.status === 'onboarding' && (
                    <>
                      <button
                        onClick={() => copyTrackingLink(partner.tracking_token)}
                        data-testid={`copy-link-${partner.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy Link
                      </button>
                      {getCompletedSteps(partner.steps) === 3 && (
                        <button
                          onClick={() => setShowActivateModal(partner)}
                          data-testid={`activate-${partner.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                        >
                          <UserPlus className="w-3 h-3" /> Activate
                        </button>
                      )}
                    </>
                  )}
                  
                  {partner.status === 'active' && (
                    <>
                      <button
                        onClick={() => setShowReportsModal(partner)}
                        data-testid={`reports-${partner.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" /> Reports
                      </button>
                      <button
                        onClick={() => setShowDiscontinueModal(partner)}
                        data-testid={`discontinue-${partner.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" /> Discontinue
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setViewOnboarding(partner)}
                    data-testid={`view-${partner.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <Dialog open={!!viewOnboarding} onOpenChange={() => setViewOnboarding(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Growth Partner Details</DialogTitle>
          </DialogHeader>
          {viewOnboarding && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium">{viewOnboarding.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{viewOnboarding.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium">{viewOnboarding.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">City</p>
                  <p className="font-medium">{viewOnboarding.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className={`font-medium capitalize ${viewOnboarding.status === 'active' ? 'text-green-600' : viewOnboarding.status === 'discontinued' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {viewOnboarding.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Onboarding Link</p>
                  <a 
                    href={`/gp-onboard/${viewOnboarding.tracking_token}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    /gp-onboard/{viewOnboarding.tracking_token}
                  </a>
                </div>
              </div>
              
              {/* Personal Information */}
              {viewOnboarding.personal_info && Object.keys(viewOnboarding.personal_info).length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-blue-800 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-blue-600">Full Name:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.full_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Email:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.email || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Phone:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Aadhar Number:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.aadhar_number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">PAN Number:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.pan_number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">T-Shirt Size:</span>
                      <p className="font-medium">{viewOnboarding.personal_info.tshirt_size || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-blue-600">Address:</span>
                      <p className="font-medium">
                        {viewOnboarding.personal_info.address || '-'}, {viewOnboarding.personal_info.city || ''}, {viewOnboarding.personal_info.state || ''} - {viewOnboarding.personal_info.pincode || ''}
                      </p>
                    </div>
                  </div>
                  {/* Document Links */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-blue-200">
                    {viewOnboarding.personal_info.aadhar_url && (
                      <a href={viewOnboarding.personal_info.aadhar_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View Aadhar
                      </a>
                    )}
                    {viewOnboarding.personal_info.pan_url && (
                      <a href={viewOnboarding.personal_info.pan_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View PAN
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Bank Details */}
              {viewOnboarding.bank_details && Object.keys(viewOnboarding.bank_details).length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-purple-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Bank Details
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-purple-600">Account Holder:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.account_holder_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Bank Name:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.bank_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Account Number:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.account_number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">IFSC Code:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.ifsc_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Branch:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.branch || '-'}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">UPI ID:</span>
                      <p className="font-medium">{viewOnboarding.bank_details.upi_id || '-'}</p>
                    </div>
                  </div>
                  {viewOnboarding.bank_details.cancelled_cheque_url && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <a href={viewOnboarding.bank_details.cancelled_cheque_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View Cancelled Cheque
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Information */}
              {(viewOnboarding.payment_status || viewOnboarding.payment_amount) && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-green-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-green-600">Amount:</span>
                      <p className="font-medium">₹{viewOnboarding.payment_amount || 0}</p>
                    </div>
                    <div>
                      <span className="text-green-600">Transaction ID:</span>
                      <p className="font-medium">{viewOnboarding.payment_transaction_id || '-'}</p>
                    </div>
                    <div>
                      <span className="text-green-600">Status:</span>
                      <p className={`font-medium capitalize ${viewOnboarding.payment_status === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {viewOnboarding.payment_status || 'Pending'}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-600">Payment Date:</span>
                      <p className="font-medium">{viewOnboarding.payment_date || '-'}</p>
                    </div>
                  </div>
                  {viewOnboarding.payment_screenshot_url && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <a href={viewOnboarding.payment_screenshot_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View Payment Screenshot
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Kit Delivery */}
              {viewOnboarding.kit_delivery_status && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-orange-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Kit Delivery
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-orange-600">Status:</span>
                      <p className={`font-medium capitalize ${viewOnboarding.kit_delivery_status === 'delivered' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {viewOnboarding.kit_delivery_status}
                      </p>
                    </div>
                    <div>
                      <span className="text-orange-600">Tracking Number:</span>
                      <p className="font-medium">{viewOnboarding.kit_tracking_number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-orange-600">Delivery Date:</span>
                      <p className="font-medium">{viewOnboarding.kit_delivery_date || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Training Progress */}
              {viewOnboarding.training_progress && Object.keys(viewOnboarding.training_progress).length > 0 && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-indigo-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Training Progress
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(viewOnboarding.training_progress).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          {value?.completed ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>
                          ) : value?.assessment?.submitted ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Submitted</span>
                          ) : (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Pending</span>
                          )}
                          {value?.assessment?.passed && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Passed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credentials (for active GPs) */}
              {viewOnboarding.team_user_credentials && Object.keys(viewOnboarding.team_user_credentials).length > 0 && (
                <div className="bg-slate-100 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Login Credentials
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Email:</span>
                      <p className="font-medium">{viewOnboarding.team_user_credentials.email || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Username:</span>
                      <p className="font-medium">{viewOnboarding.team_user_credentials.username || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission Structure */}
              {viewOnboarding.commission_structure && Object.keys(viewOnboarding.commission_structure).length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-green-800">Commission Structure</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(viewOnboarding.commission_structure).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-green-600">{key.replace(/_/g, ' ')}:</span>{' '}
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Step Modal */}
      <Dialog open={!!showStepModal} onOpenChange={() => setShowStepModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete: {showStepModal?.stepLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showStepModal?.step === 'personal_info' && (
              <>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-slate-700">Personal Details</h4>
                  <Input placeholder="Full Name" value={stepData.full_name || ''} onChange={(e) => setStepData({...stepData, full_name: e.target.value})} />
                  <Input type="date" placeholder="Date of Birth" value={stepData.dob || ''} onChange={(e) => setStepData({...stepData, dob: e.target.value})} />
                  <Textarea placeholder="Address" value={stepData.address || ''} onChange={(e) => setStepData({...stepData, address: e.target.value})} />
                  <Input placeholder="PAN Number" value={stepData.pan || ''} onChange={(e) => setStepData({...stepData, pan: e.target.value})} />
                  <Input placeholder="Aadhar Number" value={stepData.aadhar || ''} onChange={(e) => setStepData({...stepData, aadhar: e.target.value})} />
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm text-slate-700">Bank Details (for commission payouts)</h4>
                  <Input 
                    placeholder="Account Holder Name" 
                    value={stepData.bank_details?.account_holder || ''} 
                    onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), account_holder: e.target.value}})} 
                  />
                  <Input 
                    placeholder="Account Number" 
                    value={stepData.bank_details?.account_number || ''} 
                    onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), account_number: e.target.value}})} 
                  />
                  <Input 
                    placeholder="IFSC Code" 
                    value={stepData.bank_details?.ifsc || ''} 
                    onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), ifsc: e.target.value}})} 
                  />
                  <Input 
                    placeholder="Bank Name" 
                    value={stepData.bank_details?.bank_name || ''} 
                    onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), bank_name: e.target.value}})} 
                  />
                </div>
              </>
            )}
            
            {showStepModal?.step === 'contract_signing' && (
              <>
                <div className="space-y-3">
                  <Input placeholder="Signed Contract Document URL" value={stepData.contract_url || ''} onChange={(e) => setStepData({...stepData, contract_url: e.target.value})} />
                  <p className="text-sm text-slate-500">Upload the signed contract and paste the URL above</p>
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm text-slate-700">Commission Structure</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      placeholder="Student Referral %" 
                      type="number"
                      value={stepData.commission_structure?.student_referral || ''} 
                      onChange={(e) => setStepData({...stepData, commission_structure: {...(stepData.commission_structure || {}), student_referral: e.target.value}})} 
                    />
                    <Input 
                      placeholder="School Referral %" 
                      type="number"
                      value={stepData.commission_structure?.school_referral || ''} 
                      onChange={(e) => setStepData({...stepData, commission_structure: {...(stepData.commission_structure || {}), school_referral: e.target.value}})} 
                    />
                  </div>
                  <p className="text-xs text-slate-500">Enter commission percentages for different referral types</p>
                </div>
              </>
            )}
            
            {showStepModal?.step === 'training' && (
              <>
                <Textarea placeholder="Training completion notes" value={stepData.notes || ''} onChange={(e) => setStepData({...stepData, notes: e.target.value})} />
                <p className="text-sm text-slate-500">Add any notes about the training completion (product knowledge, referral process, etc.)</p>
              </>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowStepModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleCompleteStep} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate Modal */}
      <Dialog open={!!showActivateModal} onOpenChange={() => setShowActivateModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Activate Growth Partner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-green-800">{showActivateModal?.name}</p>
              <p className="text-sm text-green-600">{showActivateModal?.interest_type || 'Growth Partner'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Role (Optional)</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Default: Growth Partner</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            
            <p className="text-sm text-slate-500">
              A new user account will be created for this Growth Partner. They can use it to track their referrals and commissions. The temporary password will be copied to your clipboard.
            </p>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowActivateModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleActivate} className="flex-1 bg-green-600 hover:bg-green-700">
                <UserPlus className="w-4 h-4 mr-2" /> Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discontinue Modal */}
      <Dialog open={!!showDiscontinueModal} onOpenChange={() => setShowDiscontinueModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Discontinue Growth Partner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-800">{showDiscontinueModal?.name}</p>
              <p className="text-sm text-red-600">{showDiscontinueModal?.interest_type || 'Growth Partner'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Discontinuation *</label>
              <select
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select reason</option>
                <option value="Inactivity">Inactivity</option>
                <option value="Contract Violation">Contract Violation</option>
                <option value="Poor Performance">Poor Performance</option>
                <option value="Partner Request">Partner Request</option>
                <option value="Business Decision">Business Decision</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDiscontinueModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleDiscontinue} className="flex-1 bg-red-600 hover:bg-red-700">
                <UserX className="w-4 h-4 mr-2" /> Discontinue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reports Modal */}
      <Dialog open={!!showReportsModal} onOpenChange={() => setShowReportsModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Partner Report: {showReportsModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{showReportsModal?.total_referrals || 0}</p>
                <p className="text-sm text-slate-600">Total Referrals</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{showReportsModal?.successful_conversions || 0}</p>
                <p className="text-sm text-slate-600">Conversions</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">₹{(showReportsModal?.total_earnings || 0).toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Earnings</p>
              </div>
            </div>

            {showReportsModal?.commission_structure && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Commission Structure</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-slate-500">Student Referral</p>
                    <p className="text-xl font-bold text-blue-600">{showReportsModal.commission_structure.student_referral || 0}%</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-slate-500">School Referral</p>
                    <p className="text-xl font-bold text-purple-600">{showReportsModal.commission_structure.school_referral || 0}%</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-700">
                <strong>Note:</strong> Detailed referral history and payout records will be available here once the partner makes referrals.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminGPOnboarding;
