import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, User, CreditCard, FileText, GraduationCap, 
  Phone, Mail, Clock, ArrowLeft, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ONBOARDING_STEPS = [
  { key: 'personal_info', label: 'Personal Information', icon: User, description: 'Complete your personal details' },
  { key: 'bank_details', label: 'Bank Details', icon: CreditCard, description: 'Add your bank account information' },
  { key: 'contract_signing', label: 'Contract Signing', icon: FileText, description: 'Review and sign your contract' },
  { key: 'training', label: 'Training', icon: GraduationCap, description: 'Complete your onboarding training' },
];

const TeamOnboardingTrack = () => {
  const { token } = useParams();
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOnboarding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/team-onboarding/track/${token}`);
      setOnboarding(res.data);
    } catch (err) {
      setError('Invalid or expired tracking link');
    } finally {
      setLoading(false);
    }
  };

  const getCompletedSteps = (steps) => {
    if (!steps) return 0;
    return Object.values(steps).filter(s => s.completed).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !onboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8c] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'This tracking link is invalid or has expired.'}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-[#D63031] font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const completedSteps = getCompletedSteps(onboarding.steps);
  const progress = (completedSteps / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8c]">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Onboarding Progress</h1>
          <p className="text-white/80">Track your onboarding journey at OLL</p>
        </div>

        {/* Status Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Member Info */}
            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8c] p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{onboarding.name}</h2>
                  <p className="text-white/80">{onboarding.role || 'Team Member'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {onboarding.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {onboarding.phone}
                  </span>
                )}
                {onboarding.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {onboarding.email}
                  </span>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700">Overall Progress</span>
                <span className="text-lg font-bold text-[#1E3A5F]">{completedSteps}/4 Complete</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {onboarding.status === 'active' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  You have been successfully onboarded! Welcome to the team.
                </div>
              )}
              {onboarding.status === 'discontinued' && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  This onboarding has been discontinued.
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="p-6">
              <h3 className="font-semibold text-slate-700 mb-4">Onboarding Steps</h3>
              <div className="space-y-4">
                {ONBOARDING_STEPS.map((step, index) => {
                  const stepData = onboarding.steps?.[step.key];
                  const isCompleted = stepData?.completed;
                  const Icon = step.icon;

                  return (
                    <div 
                      key={step.key}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                        isCompleted 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${isCompleted ? 'text-green-700' : 'text-slate-700'}`}>
                            Step {index + 1}: {step.label}
                          </h4>
                          {isCompleted && (
                            <span className="text-xs px-2 py-0.5 bg-green-200 text-green-700 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                        {isCompleted && stepData.completed_at && (
                          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Completed on {format(new Date(stepData.completed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 text-center text-sm text-slate-500">
              Need help? Contact our team at{' '}
              <a href="mailto:hr@oll.co" className="text-[#D63031] hover:underline">hr@oll.co</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamOnboardingTrack;
