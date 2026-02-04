import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Eye, Phone, Mail, User, MapPin, CheckCircle2, X, FileText, 
  Clock, Briefcase, Building, CreditCard, GraduationCap, UserX, 
  ChevronRight, Copy, ExternalLink, UserPlus, AlertTriangle, BarChart3
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
  { key: 'personal_info', label: 'Personal Information', icon: User },
  { key: 'bank_details', label: 'Bank Details', icon: CreditCard },
  { key: 'contract_signing', label: 'Contract Signing', icon: FileText },
  { key: 'training', label: 'Training', icon: GraduationCap },
];

const AdminTeamOnboarding = () => {
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
  const [exitFormalities, setExitFormalities] = useState({
    assets_returned: false,
    access_revoked: false,
    final_settlement: false,
    exit_interview: false,
    notes: ''
  });
  
  // Step form data
  const [stepData, setStepData] = useState({});

  useEffect(() => {
    fetchOnboardings();
    fetchRoles();
  }, []);

  const fetchOnboardings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/team-onboarding`, { headers: getAuthHeaders() });
      setOnboardings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch onboardings:', error);
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
      await axios.post(`${API}/team-onboarding/${showStepModal.onboardingId}/complete-step`, {
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
    if (!showActivateModal || !selectedRoleId) {
      toast.error('Please select a role');
      return;
    }
    try {
      const res = await axios.post(`${API}/team-onboarding/${showActivateModal.id}/activate`, {
        role_id: selectedRoleId
      }, { headers: getAuthHeaders() });
      toast.success(`Team member activated! Username: ${res.data.username}`);
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
      await axios.post(`${API}/team-onboarding/${showDiscontinueModal.id}/discontinue`, {
        reason: discontinueReason,
        exit_formalities: exitFormalities
      }, { headers: getAuthHeaders() });
      toast.success('Team member discontinued');
      setShowDiscontinueModal(null);
      setDiscontinueReason('');
      setExitFormalities({ assets_returned: false, access_revoked: false, final_settlement: false, exit_interview: false, notes: '' });
      fetchOnboardings();
    } catch (error) {
      toast.error('Failed to discontinue');
    }
  };

  const copyTrackingLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/team-track/${token}`);
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
    { value: 'onboarding', label: 'Onboarding', count: onboardings.filter(o => o.status === 'onboarding').length, color: 'blue' },
    { value: 'active', label: 'Active', count: onboardings.filter(o => o.status === 'active').length, color: 'green' },
    { value: 'discontinued', label: 'Discontinued', count: onboardings.filter(o => o.status === 'discontinued').length, color: 'slate' },
  ];

  return (
    <AdminLayout title="Team Onboarding">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.value
                ? tab.color === 'blue' ? 'bg-blue-600 text-white'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500 mt-4">Loading...</p>
        </div>
      ) : filteredOnboardings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <User className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Team Members</h3>
          <p className="text-slate-500">
            {activeTab === 'onboarding' ? 'No team members in onboarding. Hire applicants from Team Applications.' :
             activeTab === 'active' ? 'No active team members yet.' :
             'No discontinued team members.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOnboardings.map(member => (
            <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#1E3A5F]">{member.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.status === 'onboarding' ? 'bg-blue-100 text-blue-700' :
                      member.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {member.status === 'onboarding' ? 'Onboarding' :
                       member.status === 'active' ? 'Active' : 'Discontinued'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {member.phone}
                      </span>
                    )}
                    {member.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {member.email}
                      </span>
                    )}
                    {member.role && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" /> {member.role}
                      </span>
                    )}
                    {member.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {member.city}
                      </span>
                    )}
                  </div>

                  {/* Progress for onboarding */}
                  {member.status === 'onboarding' && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${(getCompletedSteps(member.steps) / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{getCompletedSteps(member.steps)}/4 steps</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {ONBOARDING_STEPS.map(step => {
                          const isCompleted = member.steps?.[step.key]?.completed;
                          const Icon = step.icon;
                          return (
                            <button
                              key={step.key}
                              onClick={() => {
                                if (!isCompleted) {
                                  setShowStepModal({ onboardingId: member.id, step: step.key, stepLabel: step.label });
                                  setStepData({});
                                }
                              }}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                isCompleted 
                                  ? 'bg-green-100 text-green-700 cursor-default' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
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

                  {/* Discontinued info */}
                  {member.status === 'discontinued' && member.discontinued_reason && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">
                        <strong>Reason:</strong> {member.discontinued_reason}
                      </p>
                      {member.discontinued_at && (
                        <p className="text-xs text-red-500 mt-1">
                          Discontinued on {format(new Date(member.discontinued_at), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {member.status === 'onboarding' && (
                    <>
                      <button
                        onClick={() => copyTrackingLink(member.tracking_token)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy Link
                      </button>
                      {getCompletedSteps(member.steps) === 4 && (
                        <button
                          onClick={() => {
                            setShowActivateModal(member);
                            setSelectedRoleId(member.target_role_id || '');
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                        >
                          <UserPlus className="w-3 h-3" /> Activate
                        </button>
                      )}
                    </>
                  )}
                  
                  {member.status === 'active' && (
                    <>
                      <button
                        onClick={() => setShowReportsModal(member)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" /> Reports
                      </button>
                      <button
                        onClick={() => setShowDiscontinueModal(member)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" /> Discontinue
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setViewOnboarding(member)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Member Details</DialogTitle>
          </DialogHeader>
          {viewOnboarding && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="font-medium">{viewOnboarding.role || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">City</p>
                  <p className="font-medium">{viewOnboarding.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-medium capitalize">{viewOnboarding.status}</p>
                </div>
              </div>
              
              {viewOnboarding.personal_info && Object.keys(viewOnboarding.personal_info).length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(viewOnboarding.personal_info).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>{' '}
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {viewOnboarding.bank_details && Object.keys(viewOnboarding.bank_details).length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(viewOnboarding.bank_details).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>{' '}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete: {showStepModal?.stepLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showStepModal?.step === 'personal_info' && (
              <>
                <Input placeholder="Full Name" value={stepData.full_name || ''} onChange={(e) => setStepData({...stepData, full_name: e.target.value})} />
                <Input type="date" placeholder="Date of Birth" value={stepData.dob || ''} onChange={(e) => setStepData({...stepData, dob: e.target.value})} />
                <Textarea placeholder="Address" value={stepData.address || ''} onChange={(e) => setStepData({...stepData, address: e.target.value})} />
                <Input placeholder="Emergency Contact Name" value={stepData.emergency_contact_name || ''} onChange={(e) => setStepData({...stepData, emergency_contact_name: e.target.value})} />
                <Input placeholder="Emergency Contact Phone" value={stepData.emergency_contact_phone || ''} onChange={(e) => setStepData({...stepData, emergency_contact_phone: e.target.value})} />
              </>
            )}
            
            {showStepModal?.step === 'bank_details' && (
              <>
                <Input placeholder="Account Holder Name" value={stepData.account_holder || ''} onChange={(e) => setStepData({...stepData, account_holder: e.target.value})} />
                <Input placeholder="Account Number" value={stepData.account_number || ''} onChange={(e) => setStepData({...stepData, account_number: e.target.value})} />
                <Input placeholder="IFSC Code" value={stepData.ifsc || ''} onChange={(e) => setStepData({...stepData, ifsc: e.target.value})} />
                <Input placeholder="Bank Name" value={stepData.bank_name || ''} onChange={(e) => setStepData({...stepData, bank_name: e.target.value})} />
                <Input placeholder="PAN Number" value={stepData.pan || ''} onChange={(e) => setStepData({...stepData, pan: e.target.value})} />
              </>
            )}
            
            {showStepModal?.step === 'contract_signing' && (
              <>
                <Input placeholder="Contract Document URL" value={stepData.contract_url || ''} onChange={(e) => setStepData({...stepData, contract_url: e.target.value})} />
                <p className="text-sm text-slate-500">Upload the signed contract and paste the URL above</p>
              </>
            )}
            
            {showStepModal?.step === 'training' && (
              <>
                <Textarea placeholder="Training completion notes" value={stepData.notes || ''} onChange={(e) => setStepData({...stepData, notes: e.target.value})} />
                <p className="text-sm text-slate-500">Add any notes about the training completion</p>
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
              Activate Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-green-800">{showActivateModal?.name}</p>
              <p className="text-sm text-green-600">{showActivateModal?.role}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Role *</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            
            <p className="text-sm text-slate-500">
              A new team user will be created with a temporary password. The password will be copied to your clipboard.
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Discontinue Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-800">{showDiscontinueModal?.name}</p>
              <p className="text-sm text-red-600">{showDiscontinueModal?.role}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Discontinuation *</label>
              <select
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select reason</option>
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="Contract End">Contract End</option>
                <option value="Performance Issues">Performance Issues</option>
                <option value="Personal Reasons">Personal Reasons</option>
                <option value="Relocation">Relocation</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-slate-700">Exit Formalities</p>
              {Object.entries(exitFormalities).filter(([k]) => k !== 'notes').map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setExitFormalities({...exitFormalities, [key]: e.target.checked})}
                    className="rounded"
                  />
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              ))}
              <Textarea
                placeholder="Additional notes..."
                value={exitFormalities.notes}
                onChange={(e) => setExitFormalities({...exitFormalities, notes: e.target.value})}
                className="mt-2"
              />
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
              Reports: {showReportsModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-700">
                Reports based on allocated features will be shown here.
                <br />
                <strong>Coming soon:</strong> Leads assigned, conversions, demos conducted, etc.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">-</p>
                <p className="text-sm text-slate-500">Leads Assigned</p>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">-</p>
                <p className="text-sm text-slate-500">Conversions</p>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">-</p>
                <p className="text-sm text-slate-500">Demos Conducted</p>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">-</p>
                <p className="text-sm text-slate-500">Tickets Resolved</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeamOnboarding;
