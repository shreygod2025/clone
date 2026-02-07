import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, User, FileText, GraduationCap, CreditCard, Package, 
  Phone, Mail, Clock, ArrowLeft, ArrowRight, ExternalLink, Handshake, 
  MapPin, Upload, Play, ChevronRight, Building2, BookOpen, Video,
  Target, DollarSign, Monitor, Award, Loader2, Check, X, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Main onboarding steps
const ONBOARDING_STEPS = [
  { key: 'personal_info', label: 'Personal Information', icon: User, description: 'Your personal details and documents' },
  { key: 'bank_details', label: 'Bank Details', icon: CreditCard, description: 'Bank account for commission payouts' },
  { key: 'contract_signing', label: 'Contract Signing', icon: FileText, description: 'Review and sign the partnership agreement' },
  { key: 'payment', label: 'Onboarding Fees', icon: DollarSign, description: 'Pay onboarding fees' },
  { key: 'kit_delivery', label: 'Kit Delivery', icon: Package, description: 'Receive your onboarding kit' },
  { key: 'training', label: 'Training', icon: GraduationCap, description: 'Complete the training program' },
];

// Training sub-steps
const TRAINING_STEPS = [
  { 
    key: 'about_company', 
    label: 'About the Company', 
    icon: Building2,
    description: 'Learn about OLL\'s story, vision, mission & achievements',
    assessmentType: 'mcq'
  },
  { 
    key: 'about_skill', 
    label: 'About the Skill', 
    icon: BookOpen,
    description: 'Understanding Robotics & AI importance',
    assessmentType: 'long_text'
  },
  { 
    key: 'implementation_models', 
    label: 'Implementation Models', 
    icon: Target,
    description: 'How schools implement robotics programs',
    assessmentType: 'faq'
  },
  { 
    key: 'product_training', 
    label: 'Product Training', 
    icon: Package,
    description: 'Learn about OLL products and create samples',
    assessmentType: 'samples'
  },
  { 
    key: 'target_audiences', 
    label: 'Target Audiences', 
    icon: User,
    description: 'Understanding stakeholders and communication',
    assessmentType: 'video_upload'
  },
  { 
    key: 'pricing_training', 
    label: 'Pricing Training', 
    icon: DollarSign,
    description: 'Pricing sheet and negotiation skills',
    assessmentType: 'negotiation'
  },
  { 
    key: 'software_training', 
    label: 'Software Training', 
    icon: Monitor,
    description: 'CRM, proposals, and communication tools',
    assessmentType: 'uploads'
  },
];

// T-shirt sizes
const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Training content data
const TRAINING_CONTENT = {
  about_company: {
    videos: [
      { id: 'shark_tank', title: 'Shark Tank Episode', url: 'https://youtu.be/8WsTCgkC_bM' }
    ],
    mcqQuestions: [
      { id: 'founder', question: "Who's the company's founder?", options: ['Shreyaan', 'Rahul', 'Priya', 'Amit'] },
      { id: 'vision', question: "What's the company's vision & mission?", options: ['Option A', 'Option B', 'Option C', 'Option D'] },
      { id: 'advisor', question: "Who is the Curriculum advisor at OLL?", options: ['Option A', 'Option B', 'Option C', 'Option D'] },
      { id: 'retention', question: "What's OLL's retention rate?", options: ['70%', '80%', '90%', '95%'] }
    ]
  },
  about_skill: {
    videos: [
      { id: 'robotics_ai', title: 'Robotics & AI Importance', url: 'https://youtu.be/Cp5yOaW-2bk' }
    ],
    questions: [
      { id: 'q1', question: "Why is it important to learn robotics & AI for kids? Why should my students learn Robotics, AI, and IoT at this age? Isn't it more suitable for engineers or older students?" },
      { id: 'q2', question: "Why are schools introducing robotics & AI programs? Why should schools implement this as part of their curriculum? Students can learn it on their own in extracurricular classes." },
      { id: 'q3', question: "How will this benefit our students long-term?" },
      { id: 'q4', question: "Is Robotics & AI just a trend, or will these skills still be relevant when students graduate?" },
      { id: 'q5', question: "What are the career opportunities for a person after they learn Robotics, AI, IoT skills in depth?" }
    ]
  },
  implementation_models: {
    videos: [
      { id: 'school_impl', title: 'School Implementation', url: 'https://youtu.be/IMxCOzez9Jc' }
    ],
    faqQuestions: [
      { id: 'how_implement', question: "How can it be implemented in a school?" },
      { id: 'duration', question: "What's the duration and timetable requirement for OLL's program?" },
      { id: 'infrastructure', question: "What are the infrastructure requirements from the school's side?" },
      { id: 'who_teaches', question: "Who will deliver the classes?" },
      { id: 'catch_up', question: "My child is in 8th grade, and they are learning Robotics for the first time. How will they catch up with previous years curriculum?" },
      { id: 'events', question: "Do students get to showcase their work? Are there any competitions or events?" },
      { id: 'projects', question: "How many projects will my child build each year?" },
      { id: 'certification', question: "Do they get assessed or certified?" }
    ]
  },
  product_training: {
    componentVideos: [
      { id: 'witbrix', title: 'Witbrix Explanation', url: 'https://youtu.be/JLeCHQFLQoA' },
      { id: 'lock_key', title: 'Lock & Key Explanation', url: 'https://youtu.be/dre-OiFVkhM' },
      { id: 'witblox1', title: 'Witblox Part 1', url: 'https://youtu.be/ehCU8Bl-JdY' },
      { id: 'witblox2', title: 'Witblox Part 2', url: 'https://youtu.be/lYfNdaYxtp8' },
      { id: 'witblox3', title: 'Witblox Part 3', url: 'https://youtu.be/Nhl_q8FEtU8' },
      { id: 'witpro', title: 'Witpro Installation', url: 'https://youtu.be/okFWSXqb8uo' },
      { id: 'ai_vision', title: 'AI Vision', url: 'https://youtu.be/3iN5C5acVF0' }
    ],
    sampleProjects: [
      { grade: 1, title: 'Roller Coaster', url: 'https://www.youtube.com/watch?v=UAYfQ9UgqkY' },
      { grade: 2, title: 'Automatic Street Lamp', url: 'https://www.youtube.com/watch?v=blJJ-hdH4HU' },
      { grade: 3, title: 'Snail Robot', url: 'https://www.youtube.com/watch?v=xCOGG26-z68' },
      { grade: 4, title: 'Sensor Based Hammer', url: 'https://www.youtube.com/watch?v=-bYDMRKylwo' },
      { grade: 5, title: 'Edge Avoiding Robot', url: 'https://www.youtube.com/watch?v=5NtMYRfPGBU' },
      { grade: 6, title: 'Ball Vending Machine', url: 'https://www.youtube.com/watch?v=Rsb3OOzwrV4' },
      { grade: 7, title: 'Blinking LED', url: 'https://www.youtube.com/watch?v=okFWSXqb8uo' },
      { grade: 8, title: 'Rapid Shooter', url: '' },
      { grade: 9, title: 'Face Recognition Door Unlock', url: '' },
      { grade: 10, title: 'AI Mood Detection Song Player', url: '' }
    ],
    lmsAccess: {
      url: 'https://www.school-for-skills.com/lms',
      passwords: {
        'JrKg': 'cocomelon',
        'SrKg': 'cocomelon',
        'Grade 1': 'peppapig',
        'Grade 2': 'mashanbear',
        'Grade 3': 'doremon',
        'Grade 4': 'shinchan',
        'Grade 5': 'kitretsu',
        'Grade 6': 'oswald',
        'Grade 7': 'minecraft',
        'Grade 8': 'amongus',
        'Grade 9': 'manga',
        'Grade 10': 'squidgame'
      }
    }
  },
  target_audiences: {
    videos: [
      { id: 'stakeholders', title: 'Understanding Stakeholders', url: 'https://youtu.be/je_sf7_ovfI' }
    ],
    pitchRequirements: [
      { id: 'trustee_management', label: 'Pitch to Trustee/Management' },
      { id: 'principal', label: 'Pitch to Principal' },
      { id: 'teachers_demo', label: 'Demo to Teachers' },
      { id: 'students_demo', label: 'Demo to Students' },
      { id: 'parent_orientation', label: 'Parent Orientation' }
    ]
  },
  pricing_training: {
    materials: [
      { title: "Principal's PPT", url: 'https://www.canva.com/design/DAGUjTRnVvA/wNWNjc8PsYMXZrGdtcPpvA/edit' },
      { title: 'School Videos', url: 'https://www.youtube.com/watch?v=MM36G7rmAOU' },
      { title: 'Curriculum Sheet', url: 'https://drive.google.com/file/d/1Xda1R9Wvn1LHazVpDbv177K5nvJKvViE/view' },
      { title: 'Sample Books', url: 'https://drive.google.com/drive/folders/1DwX_JpmEgkKZF_0wqnSWOyLi9jN39ckp' },
      { title: 'FAQ Document', url: 'https://docs.google.com/document/d/1po0d0m9lsJU6W1nGSJfp2MBGNZcfQ5eLtifLPEXdso4/edit' }
    ],
    scenarios: [
      { id: 'scenario_100', question: 'A school with 100 students is interested but wants to negotiate. How would you approach pricing?' },
      { id: 'scenario_500', question: 'A school with 500 students wants a bulk discount. What would you propose?' },
      { id: 'scenario_1000', question: 'A large school with 1000 students is comparing with competitors. How do you handle this?' }
    ]
  },
  software_training: {
    tools: [
      'Proposal Making',
      'MOU Making',
      'Email Communication Templates',
      'WhatsApp Communication Templates',
      'CRM Usage'
    ],
    requirements: [
      { id: 'proposal', label: 'Upload a sample proposal', type: 'upload' },
      { id: 'mou', label: 'Upload a sample MOU', type: 'upload' },
      { id: 'email', label: 'Send test email to verify', type: 'action' },
      { id: 'whatsapp', label: 'Send test WhatsApp message', type: 'action' },
      { id: 'campaign', label: 'Create a bulk marketing campaign', type: 'action' }
    ]
  }
};

const GPSelfOnboarding = () => {
  const { token } = useParams();
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('personal_info');
  const [currentTrainingStep, setCurrentTrainingStep] = useState('about_company');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '', email: '', phone: '', aadhar_number: '', aadhar_url: '',
    pan_number: '', pan_url: '', address: '', city: '', state: '', pincode: '', tshirt_size: ''
  });
  
  const [bankDetails, setBankDetails] = useState({
    account_holder_name: '', bank_name: '', account_number: '', ifsc_code: '',
    branch: '', upi_id: '', cancelled_cheque_url: ''
  });
  
  const [paymentData, setPaymentData] = useState({
    amount: '', transaction_id: '', screenshot_url: '', payment_date: '', payment_method: ''
  });
  
  const [trainingAnswers, setTrainingAnswers] = useState({});
  const [contractAgreed, setContractAgreed] = useState(false);

  // GP MOU PDF URL
  const GP_MOU_PDF_URL = "https://customer-assets.emergentagent.com/job_skill-hub-55/artifacts/tkbt7jy3_OLL%20x%20Growth%20Partner%20MOU.pdf";

  useEffect(() => {
    fetchOnboarding();
  }, [token]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/gp-onboard/${token}`);
      setOnboarding(res.data);
      
      // Pre-fill forms with existing data
      if (res.data.personal_info) {
        setPersonalInfo(prev => ({ ...prev, ...res.data.personal_info }));
      }
      if (res.data.bank_details) {
        setBankDetails(prev => ({ ...prev, ...res.data.bank_details }));
      }
      if (res.data.training_progress) {
        setTrainingAnswers(res.data.training_progress);
      }
      
      // Determine current step
      const steps = res.data.steps || {};
      for (const step of ONBOARDING_STEPS) {
        if (!steps[step.key]?.completed) {
          setCurrentStep(step.key);
          break;
        }
      }
    } catch (err) {
      setError('Invalid or expired onboarding link');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, type = 'general') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await axios.post(`${API}/upload`, formData);
      return res.data.url;
    } catch (err) {
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e, field, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadFile(file, field);
    if (url) {
      setter(prev => ({ ...prev, [`${field}_url`]: url }));
      toast.success('File uploaded successfully');
    }
  };

  const submitPersonalInfo = async () => {
    if (!personalInfo.full_name || !personalInfo.email || !personalInfo.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/personal-info`, personalInfo);
      toast.success('Personal information saved');
      setCurrentStep('bank_details');
      fetchOnboarding();
    } catch (err) {
      toast.error('Failed to save personal information');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBankDetails = async () => {
    if (!bankDetails.account_holder_name || !bankDetails.account_number || !bankDetails.ifsc_code) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/bank-details`, bankDetails);
      toast.success('Bank details saved');
      setCurrentStep('contract_signing');
      fetchOnboarding();
    } catch (err) {
      toast.error('Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  const submitContract = async () => {
    if (!contractAgreed) {
      toast.error('Please agree to the terms and conditions');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/contract`, { agreed: true });
      toast.success('Contract signed successfully! Downloading...');
      
      // Trigger PDF download
      const link = document.createElement('a');
      link.href = GP_MOU_PDF_URL;
      link.download = 'OLL_Growth_Partner_MOU.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setCurrentStep('payment');
      fetchOnboarding();
    } catch (err) {
      toast.error('Failed to sign contract');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentData.transaction_id) {
      toast.error('Please provide transaction ID');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/payment`, paymentData);
      toast.success('Payment proof submitted. Awaiting admin verification.');
      setCurrentStep('kit_delivery');
      fetchOnboarding();
    } catch (err) {
      toast.error('Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmKitDelivery = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/confirm-kit`, {});
      toast.success('Kit delivery confirmed');
      setCurrentStep('training');
      fetchOnboarding();
    } catch (err) {
      toast.error('Failed to confirm kit delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTrainingStep = async (step, data, markComplete = false) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/gp-onboard/${token}/training/${step}`, {
        ...data,
        mark_complete: markComplete
      });
      toast.success(`Training step "${step}" updated`);
      fetchOnboarding();
      
      // Move to next training step
      const stepIndex = TRAINING_STEPS.findIndex(s => s.key === step);
      if (stepIndex < TRAINING_STEPS.length - 1 && markComplete) {
        setCurrentTrainingStep(TRAINING_STEPS[stepIndex + 1].key);
      }
    } catch (err) {
      toast.error('Failed to save training progress');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepStatus = (stepKey) => {
    const steps = onboarding?.steps || {};
    const step = steps[stepKey];
    if (!step) return 'pending';
    if (step.completed) return 'completed';
    if (stepKey === 'payment' && step.verified === false && step.completed) return 'awaiting_verification';
    if (stepKey === 'kit_delivery' && !step.delivered && step.tracking_number) return 'shipped';
    return 'in_progress';
  };

  const getCompletedSteps = () => {
    if (!onboarding?.steps) return 0;
    return Object.values(onboarding.steps).filter(s => s.completed).length;
  };

  // Extract YouTube video ID
  const getYoutubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !onboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'This onboarding link is invalid or has expired.'}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-orange-600 font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Check if onboarding is complete
  if (onboarding.status === 'active' && onboarding.team_user_credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Congratulations! 🎉</h1>
          <p className="text-slate-600 mb-6">You have successfully completed the Growth Partner onboarding!</p>
          
          <div className="bg-slate-50 rounded-xl p-6 text-left mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Your Login Credentials</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-800">{onboarding.team_user_credentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Username</p>
                <p className="font-medium text-slate-800">{onboarding.team_user_credentials.username}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Temporary Password</p>
                <p className="font-medium text-slate-800 font-mono bg-yellow-50 px-2 py-1 rounded">
                  {onboarding.team_user_credentials.temp_password}
                </p>
              </div>
            </div>
          </div>
          
          <a 
            href="/admin/login"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Go to Admin Panel
          </a>
          
          <p className="text-xs text-slate-500 mt-4">Please change your password after first login</p>
        </div>
      </div>
    );
  }

  const completedSteps = getCompletedSteps();
  const progress = (completedSteps / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Growth Partner Onboarding</h1>
          <p className="text-orange-100">Welcome, {onboarding.name}! Complete your onboarding to become an OLL Growth Partner.</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-3 mb-8 max-w-2xl mx-auto">
          <div 
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Steps Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 sticky top-4">
              <h3 className="font-semibold text-slate-800 mb-4">Onboarding Steps</h3>
              <div className="space-y-2">
                {ONBOARDING_STEPS.map((step, idx) => {
                  const status = getStepStatus(step.key);
                  const isActive = currentStep === step.key;
                  const Icon = step.icon;
                  
                  return (
                    <button
                      key={step.key}
                      onClick={() => status !== 'pending' && setCurrentStep(step.key)}
                      disabled={status === 'pending' && idx > completedSteps}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        isActive 
                          ? 'bg-orange-100 border-2 border-orange-500' 
                          : status === 'completed'
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'bg-slate-50 hover:bg-slate-100 opacity-60'
                      }`}
                      data-testid={`step-${step.key}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : isActive
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {status === 'completed' ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-orange-700' : 'text-slate-700'}`}>
                          {step.label}
                        </p>
                        {status === 'awaiting_verification' && (
                          <p className="text-xs text-yellow-600">Awaiting verification</p>
                        )}
                        {status === 'shipped' && (
                          <p className="text-xs text-blue-600">Kit shipped</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-6 md:p-8">
              {/* Step 1: Personal Information */}
              {currentStep === 'personal_info' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Personal Information</h2>
                    <p className="text-slate-600">Please provide your personal details and upload required documents.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Full Name *</label>
                      <Input
                        value={personalInfo.full_name}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Email *</label>
                      <Input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Phone *</label>
                      <Input
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">T-Shirt Size</label>
                      <Select value={personalInfo.tshirt_size} onValueChange={(v) => setPersonalInfo(prev => ({ ...prev, tshirt_size: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {TSHIRT_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Aadhar Card Number</label>
                      <Input
                        value={personalInfo.aadhar_number}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, aadhar_number: e.target.value }))}
                        placeholder="XXXX XXXX XXXX"
                        className="mt-1"
                      />
                      <div className="mt-2">
                        <label className="text-xs text-slate-500">Upload Aadhar Card</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'aadhar', setPersonalInfo)}
                          className="mt-1 text-sm"
                        />
                        {personalInfo.aadhar_url && (
                          <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">PAN Card Number</label>
                      <Input
                        value={personalInfo.pan_number}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                        placeholder="ABCDE1234F"
                        className="mt-1"
                      />
                      <div className="mt-2">
                        <label className="text-xs text-slate-500">Upload PAN Card</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'pan', setPersonalInfo)}
                          className="mt-1 text-sm"
                        />
                        {personalInfo.pan_url && (
                          <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <Textarea
                      value={personalInfo.address}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your full address"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">City</label>
                      <Input
                        value={personalInfo.city}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">State</label>
                      <Input
                        value={personalInfo.state}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Pincode</label>
                      <Input
                        value={personalInfo.pincode}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="XXXXXX"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={submitPersonalInfo} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save & Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Bank Details */}
              {currentStep === 'bank_details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Bank Details</h2>
                    <p className="text-slate-600">Your bank account details for commission payouts.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Account Holder Name *</label>
                      <Input
                        value={bankDetails.account_holder_name}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, account_holder_name: e.target.value }))}
                        placeholder="Name as per bank records"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Bank Name *</label>
                      <Input
                        value={bankDetails.bank_name}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
                        placeholder="e.g., State Bank of India"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Account Number *</label>
                      <Input
                        value={bankDetails.account_number}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))}
                        placeholder="Your account number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">IFSC Code *</label>
                      <Input
                        value={bankDetails.ifsc_code}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g., SBIN0001234"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Branch</label>
                      <Input
                        value={bankDetails.branch}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, branch: e.target.value }))}
                        placeholder="Branch name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">UPI ID</label>
                      <Input
                        value={bankDetails.upi_id}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, upi_id: e.target.value }))}
                        placeholder="your@upi"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Upload Cancelled Cheque</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'cancelled_cheque', setBankDetails)}
                      className="mt-1 text-sm"
                    />
                    {bankDetails.cancelled_cheque_url && (
                      <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('personal_info')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button onClick={submitBankDetails} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save & Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Contract Signing */}
              {currentStep === 'contract_signing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Contract Signing</h2>
                    <p className="text-slate-600">Download, sign, and upload the Growth Partner MOU.</p>
                  </div>

                  {/* Step 1: Download Contract */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-2">Download the MOU</h3>
                        <p className="text-sm text-slate-600 mb-3">Download the Growth Partner MOU, print it, sign it, and scan/photograph it.</p>
                        <div className="flex gap-3">
                          <a 
                            href={GP_MOU_PDF_URL}
                            download="OLL_Growth_Partner_MOU.pdf"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download MOU
                          </a>
                          <a 
                            href={GP_MOU_PDF_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Preview
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Upload Signed Contract */}
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold shrink-0">2</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-2">Upload Signed Contract</h3>
                        <p className="text-sm text-slate-600 mb-3">Upload the signed MOU (PDF, JPG, or PNG format).</p>
                        
                        {signedContractUrl ? (
                          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Signed contract uploaded</span>
                            <a href={signedContractUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm ml-auto">View</a>
                            <button onClick={() => setSignedContractUrl('')} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              id="contract-upload"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const url = await uploadFile(file, 'contract');
                                  if (url) setSignedContractUrl(url);
                                }
                              }}
                            />
                            <label 
                              htmlFor="contract-upload"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium cursor-pointer"
                            >
                              <Upload className="w-4 h-4" />
                              Upload Signed Contract
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('bank_details')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button 
                      onClick={submitContract} 
                      disabled={submitting || !signedContractUrl} 
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Submit Contract
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Onboarding Fees</h2>
                    <p className="text-slate-600">Complete the onboarding fees payment to proceed.</p>
                  </div>

                  {getStepStatus('payment') === 'awaiting_verification' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                      <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Payment Submitted</h3>
                      <p className="text-yellow-700">Your payment is awaiting admin verification. You'll be notified once it's confirmed.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h3 className="font-semibold text-blue-800 mb-2">Payment Details</h3>
                        <p className="text-sm text-blue-700 mb-4">Please transfer the onboarding fees to the following account:</p>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-blue-600">Account Name</p>
                            <p className="font-medium text-blue-800">OLL Education Pvt Ltd</p>
                          </div>
                          <div>
                            <p className="text-blue-600">Account Number</p>
                            <p className="font-medium text-blue-800">XXXXXXXXXXXXXX</p>
                          </div>
                          <div>
                            <p className="text-blue-600">IFSC Code</p>
                            <p className="font-medium text-blue-800">HDFC0001234</p>
                          </div>
                          <div>
                            <p className="text-blue-600">UPI ID</p>
                            <p className="font-medium text-blue-800">oll@upi</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Amount Paid</label>
                          <Input
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="Enter amount"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Transaction ID *</label>
                          <Input
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            placeholder="UTR/Reference number"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">Upload Payment Screenshot (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const url = await uploadFile(file, 'payment');
                              if (url) setPaymentData(prev => ({ ...prev, screenshot_url: url }));
                            }
                          }}
                          className="mt-1 text-sm"
                        />
                        {paymentData.screenshot_url && (
                          <p className="text-xs text-green-600 mt-1">✓ Screenshot uploaded</p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('contract_signing')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    {getStepStatus('payment') !== 'awaiting_verification' && (
                      <Button onClick={submitPayment} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Submit Payment Proof
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Kit Delivery */}
              {currentStep === 'kit_delivery' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Onboarding Kit Delivery</h2>
                    <p className="text-slate-600">Your onboarding kit will be shipped after payment verification.</p>
                  </div>

                  {!onboarding.steps?.payment?.verified ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                      <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Awaiting Payment Verification</h3>
                      <p className="text-yellow-700">Your kit will be shipped once your payment is verified by admin.</p>
                    </div>
                  ) : onboarding.kit_delivery_status === 'shipped' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Package className="w-12 h-12 text-blue-500" />
                        <div>
                          <h3 className="text-lg font-semibold text-blue-800">Kit Shipped!</h3>
                          <p className="text-blue-700">Your onboarding kit is on the way.</p>
                        </div>
                      </div>
                      {onboarding.kit_tracking_number && (
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-slate-600">Tracking Number:</p>
                          <p className="font-mono font-medium text-slate-800">{onboarding.kit_tracking_number}</p>
                        </div>
                      )}
                      
                      <div className="mt-6">
                        <Button onClick={confirmKitDelivery} disabled={submitting} className="bg-green-500 hover:bg-green-600">
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          <Check className="w-4 h-4 mr-2" />
                          I've Received My Kit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                      <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Kit Being Prepared</h3>
                      <p className="text-slate-600">Your onboarding kit is being prepared for shipping.</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('payment')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Training */}
              {currentStep === 'training' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Training Program</h2>
                    <p className="text-slate-600">Complete all training modules to become a certified Growth Partner.</p>
                  </div>

                  {/* Training Steps Navigation */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_STEPS.map((step, idx) => {
                        const stepProgress = onboarding?.training_progress?.[step.key];
                        const isComplete = stepProgress?.completed;
                        const isActive = currentTrainingStep === step.key;
                        const Icon = step.icon;
                        
                        return (
                          <button
                            key={step.key}
                            onClick={() => setCurrentTrainingStep(step.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              isActive 
                                ? 'bg-orange-500 text-white' 
                                : isComplete
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            {step.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Training Content - About Company */}
                  {currentTrainingStep === 'about_company' && (
                    <div className="space-y-6">
                      <div className="bg-orange-50 rounded-xl p-6">
                        <h3 className="font-semibold text-orange-800 mb-2">About the Company</h3>
                        <p className="text-orange-700 text-sm">Learn about Shreyaan's story, OLL's vision, mission, team & achievements.</p>
                      </div>

                      {/* Video */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Watch Required Videos</h4>
                        {TRAINING_CONTENT.about_company.videos.map(video => (
                          <div key={video.id} className="bg-slate-50 rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                              >
                                <Play className="w-5 h-5" />
                                {video.title}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* MCQ Assessment */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Assessment - MCQ</h4>
                        {TRAINING_CONTENT.about_company.mcqQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-white border rounded-lg p-4">
                            <p className="font-medium text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <label key={optIdx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`mcq_${q.id}`}
                                    value={opt}
                                    onChange={(e) => setTrainingAnswers(prev => ({
                                      ...prev,
                                      about_company: {
                                        ...prev.about_company,
                                        assessment: {
                                          ...prev.about_company?.assessment,
                                          answers: {
                                            ...prev.about_company?.assessment?.answers,
                                            [q.id]: e.target.value
                                          }
                                        }
                                      }
                                    }))}
                                    className="w-4 h-4 text-orange-500"
                                  />
                                  <span className="text-slate-700">{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={() => submitTrainingStep('about_company', { 
                          assessment: trainingAnswers.about_company?.assessment 
                        }, true)} 
                        disabled={submitting}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Submit & Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {/* Training Content - About Skill */}
                  {currentTrainingStep === 'about_skill' && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h3 className="font-semibold text-blue-800 mb-2">About the Skill</h3>
                        <p className="text-blue-700 text-sm">Understanding Robotics & AI importance for kids and career opportunities.</p>
                      </div>

                      {/* Video */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Watch Required Videos</h4>
                        {TRAINING_CONTENT.about_skill.videos.map(video => (
                          <div key={video.id} className="bg-slate-50 rounded-lg p-4">
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <Play className="w-5 h-5" />
                              {video.title}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>

                      {/* Long Text Assessment */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Assessment - Long Text Answers</h4>
                        {TRAINING_CONTENT.about_skill.questions.map((q, idx) => (
                          <div key={q.id} className="bg-white border rounded-lg p-4">
                            <p className="font-medium text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                            <Textarea
                              placeholder="Write your detailed answer here..."
                              rows={4}
                              onChange={(e) => setTrainingAnswers(prev => ({
                                ...prev,
                                about_skill: {
                                  ...prev.about_skill,
                                  assessment: {
                                    ...prev.about_skill?.assessment,
                                    answers: {
                                      ...prev.about_skill?.assessment?.answers,
                                      [q.id]: e.target.value
                                    }
                                  }
                                }
                              }))}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('about_company')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('about_skill', { 
                            assessment: trainingAnswers.about_skill?.assessment 
                          }, true)} 
                          disabled={submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit & Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Training Content - Implementation Models */}
                  {currentTrainingStep === 'implementation_models' && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 rounded-xl p-6">
                        <h3 className="font-semibold text-purple-800 mb-2">Implementation Models</h3>
                        <p className="text-purple-700 text-sm">Learn how schools implement robotics programs and answer common questions.</p>
                      </div>

                      {/* Video */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Watch Required Videos</h4>
                        {TRAINING_CONTENT.implementation_models.videos.map(video => (
                          <div key={video.id} className="bg-slate-50 rounded-lg p-4">
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                            >
                              <Play className="w-5 h-5" />
                              {video.title}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>

                      {/* FAQ Assessment */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Assessment - Answer FAQs</h4>
                        <p className="text-sm text-slate-600">Answer these common questions you'll encounter from schools:</p>
                        {TRAINING_CONTENT.implementation_models.faqQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-white border rounded-lg p-4">
                            <p className="font-medium text-slate-800 mb-3">{idx + 1}. {q.question}</p>
                            <Textarea
                              placeholder="Write your detailed answer here..."
                              rows={3}
                              onChange={(e) => setTrainingAnswers(prev => ({
                                ...prev,
                                implementation_models: {
                                  ...prev.implementation_models,
                                  assessment: {
                                    ...prev.implementation_models?.assessment,
                                    answers: {
                                      ...prev.implementation_models?.assessment?.answers,
                                      [q.id]: e.target.value
                                    }
                                  }
                                }
                              }))}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('about_skill')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('implementation_models', { 
                            assessment: trainingAnswers.implementation_models?.assessment 
                          }, true)} 
                          disabled={submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit & Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Training Content - Product Training */}
                  {currentTrainingStep === 'product_training' && (
                    <div className="space-y-6">
                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="font-semibold text-green-800 mb-2">Product Training</h3>
                        <p className="text-green-700 text-sm">Learn about OLL products, components, and create sample projects.</p>
                      </div>

                      {/* Component Videos */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Watch Component Explanation Videos</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {TRAINING_CONTENT.product_training.componentVideos.map(video => (
                            <a 
                              key={video.id}
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <Video className="w-5 h-5" />
                              <span className="text-sm font-medium">{video.title}</span>
                              <ExternalLink className="w-4 h-4 ml-auto" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Sample Projects */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Build Sample Projects (One per Grade)</h4>
                        <p className="text-sm text-slate-600">Watch these tutorials and create the projects. Upload photos/videos of your completed projects.</p>
                        <div className="grid gap-3">
                          {TRAINING_CONTENT.product_training.sampleProjects.map(project => (
                            <div key={project.grade} className="flex items-center gap-4 bg-white border rounded-lg p-4">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center font-bold text-green-700">
                                G{project.grade}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-800">{project.title}</p>
                                {project.url && (
                                  <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline flex items-center gap-1">
                                    <Play className="w-3 h-3" /> Watch Tutorial
                                  </a>
                                )}
                              </div>
                              <Input
                                type="url"
                                placeholder="Paste your project video/photo URL"
                                className="w-64"
                                onChange={(e) => setTrainingAnswers(prev => ({
                                  ...prev,
                                  product_training: {
                                    ...prev.product_training,
                                    samples_created: {
                                      ...prev.product_training?.samples_created,
                                      [`grade_${project.grade}`]: e.target.value
                                    }
                                  }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* LMS Access */}
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h4 className="font-semibold text-blue-800 mb-3">LMS Access Credentials</h4>
                        <p className="text-sm text-blue-700 mb-4">Access the Learning Management System to explore curriculum:</p>
                        <a href={TRAINING_CONTENT.product_training.lmsAccess.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          {TRAINING_CONTENT.product_training.lmsAccess.url}
                        </a>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                          {Object.entries(TRAINING_CONTENT.product_training.lmsAccess.passwords).map(([grade, password]) => (
                            <div key={grade} className="bg-white rounded-lg p-2">
                              <span className="font-medium">{grade}:</span> <span className="font-mono">{password}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('implementation_models')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('product_training', { 
                            samples_created: trainingAnswers.product_training?.samples_created,
                            component_names_learned: true
                          }, true)} 
                          disabled={submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit & Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Training Content - Target Audiences */}
                  {currentTrainingStep === 'target_audiences' && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 rounded-xl p-6">
                        <h3 className="font-semibold text-indigo-800 mb-2">Target Audiences</h3>
                        <p className="text-indigo-700 text-sm">Learn to communicate with different stakeholders and record pitch videos.</p>
                      </div>

                      {/* Video */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Watch Required Videos</h4>
                        {TRAINING_CONTENT.target_audiences.videos.map(video => (
                          <div key={video.id} className="bg-slate-50 rounded-lg p-4">
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <Play className="w-5 h-5" />
                              {video.title}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>

                      {/* Pitch Video Recordings */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Record Pitch Videos</h4>
                        <p className="text-sm text-slate-600">Record yourself pitching to each audience type. Upload video links (YouTube, Google Drive, etc.)</p>
                        {TRAINING_CONTENT.target_audiences.pitchRequirements.map((pitch) => (
                          <div key={pitch.id} className="bg-white border rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Video className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-800">{pitch.label}</p>
                                <p className="text-xs text-slate-500">Record a 2-3 minute pitch video</p>
                              </div>
                              <Input
                                type="url"
                                placeholder="Paste video URL"
                                className="w-72"
                                onChange={(e) => setTrainingAnswers(prev => ({
                                  ...prev,
                                  target_audiences: {
                                    ...prev.target_audiences,
                                    assessment: {
                                      ...prev.target_audiences?.assessment,
                                      pitch_videos: {
                                        ...prev.target_audiences?.assessment?.pitch_videos,
                                        [pitch.id]: e.target.value
                                      }
                                    }
                                  }
                                }))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('product_training')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('target_audiences', { 
                            assessment: trainingAnswers.target_audiences?.assessment 
                          }, true)} 
                          disabled={submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit & Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Training Content - Pricing Training */}
                  {currentTrainingStep === 'pricing_training' && (
                    <div className="space-y-6">
                      <div className="bg-amber-50 rounded-xl p-6">
                        <h3 className="font-semibold text-amber-800 mb-2">Pricing Training</h3>
                        <p className="text-amber-700 text-sm">Master the pricing structure and negotiation techniques.</p>
                      </div>

                      {/* Materials */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Review Required Materials</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {TRAINING_CONTENT.pricing_training.materials.map((material, idx) => (
                            <a 
                              key={idx}
                              href={material.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-white border rounded-lg p-4 hover:border-amber-300 transition-colors"
                            >
                              <FileText className="w-5 h-5 text-amber-600" />
                              <span className="font-medium text-slate-700">{material.title}</span>
                              <ExternalLink className="w-4 h-4 ml-auto text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Negotiation Scenarios */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Negotiation Scenarios</h4>
                        <p className="text-sm text-slate-600">How would you handle these pricing scenarios?</p>
                        {TRAINING_CONTENT.pricing_training.scenarios.map((scenario, idx) => (
                          <div key={scenario.id} className="bg-white border rounded-lg p-4">
                            <p className="font-medium text-slate-800 mb-3">{idx + 1}. {scenario.question}</p>
                            <Textarea
                              placeholder="Describe your negotiation approach..."
                              rows={3}
                              onChange={(e) => setTrainingAnswers(prev => ({
                                ...prev,
                                pricing_training: {
                                  ...prev.pricing_training,
                                  assessment: {
                                    ...prev.pricing_training?.assessment,
                                    negotiation_scenarios: {
                                      ...prev.pricing_training?.assessment?.negotiation_scenarios,
                                      [scenario.id]: e.target.value
                                    }
                                  }
                                }
                              }))}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('target_audiences')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('pricing_training', { 
                            assessment: trainingAnswers.pricing_training?.assessment,
                            materials_reviewed: true
                          }, true)} 
                          disabled={submitting}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Submit & Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Training Content - Software Training */}
                  {currentTrainingStep === 'software_training' && (
                    <div className="space-y-6">
                      <div className="bg-cyan-50 rounded-xl p-6">
                        <h3 className="font-semibold text-cyan-800 mb-2">Software Training</h3>
                        <p className="text-cyan-700 text-sm">Learn to use the CRM, create proposals, and communication tools.</p>
                      </div>

                      {/* Tools Overview */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Tools You'll Learn</h4>
                        <div className="flex flex-wrap gap-2">
                          {TRAINING_CONTENT.software_training.tools.map((tool, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Complete These Tasks</h4>
                        <p className="text-sm text-slate-600">Demonstrate your proficiency by completing these tasks:</p>
                        {TRAINING_CONTENT.software_training.requirements.map((req) => (
                          <div key={req.id} className="bg-white border rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                {req.type === 'upload' ? <Upload className="w-5 h-5 text-cyan-600" /> : <Monitor className="w-5 h-5 text-cyan-600" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-800">{req.label}</p>
                                {req.type === 'upload' && (
                                  <Input
                                    type="url"
                                    placeholder="Paste document/screenshot URL"
                                    className="mt-2"
                                    onChange={(e) => setTrainingAnswers(prev => ({
                                      ...prev,
                                      software_training: {
                                        ...prev.software_training,
                                        assessment: {
                                          ...prev.software_training?.assessment,
                                          [req.id]: e.target.value
                                        }
                                      }
                                    }))}
                                  />
                                )}
                                {req.type === 'action' && (
                                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-cyan-600"
                                      onChange={(e) => setTrainingAnswers(prev => ({
                                        ...prev,
                                        software_training: {
                                          ...prev.software_training,
                                          assessment: {
                                            ...prev.software_training?.assessment,
                                            [`${req.id}_done`]: e.target.checked
                                          }
                                        }
                                      }))}
                                    />
                                    <span className="text-sm text-slate-600">I have completed this task</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <Award className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <h4 className="font-semibold text-green-800 mb-2">Almost Done!</h4>
                        <p className="text-green-700 text-sm">Complete this final step to finish your training and become a certified Growth Partner!</p>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentTrainingStep('pricing_training')}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => submitTrainingStep('software_training', { 
                            assessment: trainingAnswers.software_training?.assessment 
                          }, true)} 
                          disabled={submitting}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Complete Training
                          <Award className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-6 pt-6 border-t">
                    <Button variant="outline" onClick={() => setCurrentStep('kit_delivery')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Kit Delivery
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPSelfOnboarding;
