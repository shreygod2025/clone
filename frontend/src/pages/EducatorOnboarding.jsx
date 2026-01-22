import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { 
  Play, CheckCircle, Circle, Upload, User, MapPin, Phone, CreditCard, 
  FileText, Video, Award, Download, ChevronRight, ChevronLeft, Loader2,
  AlertCircle, Check, X, Camera, Building, Heart, Clock, Linkedin, Copy, ExternalLink
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const STEPS = [
  { id: 1, title: 'Welcome', icon: Play, description: 'Introduction to OLL' },
  { id: 2, title: 'Profile', icon: User, description: 'Your teaching profile' },
  { id: 3, title: 'Personal Details', icon: MapPin, description: 'Address, ID & Emergency Contact' },
  { id: 4, title: 'Bank Details', icon: CreditCard, description: 'Payment information' },
  { id: 5, title: 'Contract', icon: FileText, description: 'Terms & Agreement' },
  { id: 6, title: 'Training', icon: Video, description: 'Guidelines & Videos' },
  { id: 7, title: 'Review', icon: Clock, description: 'Awaiting Approval' },
  { id: 8, title: 'Complete', icon: Download, description: 'ID Card & Certificate' },
];

// Training videos with their quizzes
const TRAINING_CONTENT = [
  {
    id: 'rules',
    title: 'Educator Rules & Restrictions',
    duration: '10:00',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Learn about the dos and donts as an OLL Educator',
    quiz: [
      {
        id: 'rules_q1',
        question: 'What is the maximum time you should take to respond to a student query?',
        options: ['1 hour', '24 hours', '48 hours', '1 week'],
        correct: 1
      },
      {
        id: 'rules_q2',
        question: 'Can you share your personal contact details with students?',
        options: ['Yes, always', 'Only if they ask', 'No, never', 'Only with parents permission'],
        correct: 2
      }
    ],
    requiresVideoUpload: true,
    uploadPrompt: 'Record a 1-minute video introducing yourself as an OLL Educator'
  },
  {
    id: 'beliefs',
    title: 'What OLL Believes In',
    duration: '8:00',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Understanding OLL\'s core values and teaching philosophy',
    quiz: [
      {
        id: 'beliefs_q1',
        question: 'What is OLL\'s primary focus?',
        options: ['Rote learning', 'Student-centric personalized learning', 'Exam preparation only', 'Competition-based learning'],
        correct: 1
      },
      {
        id: 'beliefs_q2',
        question: 'How does OLL approach student mistakes?',
        options: ['Punish them', 'Ignore them', 'Use them as learning opportunities', 'Report to parents immediately'],
        correct: 2
      }
    ],
    requiresVideoUpload: true,
    uploadPrompt: 'Record a video explaining what student-centric learning means to you'
  },
  {
    id: 'quiz_checking',
    title: 'Quiz Checking Guidelines',
    duration: '12:00',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'How to evaluate and provide constructive feedback',
    quiz: [
      {
        id: 'quiz_q1',
        question: 'When providing feedback, you should focus on:',
        options: ['Only the mistakes', 'Only the correct answers', 'Both strengths and areas of improvement', 'Just give a score'],
        correct: 2
      },
      {
        id: 'quiz_q2',
        question: 'How soon should quiz results be shared with students?',
        options: ['Within 24 hours', 'Within 1 week', 'Within 1 month', 'Whenever convenient'],
        correct: 0
      }
    ],
    requiresVideoUpload: true,
    uploadPrompt: 'Record a video demonstrating how you would provide feedback on a sample quiz'
  }
];

const EducatorOnboarding = () => {
  const navigate = useNavigate();
  const { user, token } = useUserAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [educator, setEducator] = useState(null);
  const [content, setContent] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form states
  const [formData, setFormData] = useState({
    profile_photo: '',
    bio: '',
    tshirt_size: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    aadhar_number: '',
    aadhar_document: '',
    pan_number: '',
    pan_document: '',
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_document: '',
    contract_accepted: false,
    digital_signature: ''
  });
  
  // Training states
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [videoUploads, setVideoUploads] = useState({});

  const getAuthHeaders = () => ({ Authorization: `Bearer ${token}` });

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchOnboardingData();
    fetchContent();
  }, [user, token]);

  const fetchOnboardingData = async () => {
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.get(`${API}/educator/onboarding/${educatorId}`, {
        headers: getAuthHeaders()
      });
      setOnboarding(response.data.onboarding);
      setEducator(response.data.educator);
      setCurrentStep(response.data.onboarding?.current_step || 1);
      
      // Pre-fill form with existing data
      if (response.data.onboarding) {
        const onb = response.data.onboarding;
        setFormData(prev => ({
          ...prev,
          ...onb,
          city: onb.city || response.data.educator?.city || ''
        }));
        setVideoProgress(onb.video_progress || {});
        setVideoUploads(onb.video_uploads || {});
      }
    } catch (error) {
      console.error('Failed to fetch onboarding data:', error);
      toast.error('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API}/educator/onboarding/content`);
      setContent(response.data);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  };

  const saveProgress = async (data = {}) => {
    setSaving(true);
    try {
      const educatorId = user?.educator_id || user?.id;
      await axios.patch(`${API}/educator/onboarding/${educatorId}`, {
        ...formData,
        ...data,
        video_progress: videoProgress,
        video_uploads: videoUploads
      }, { headers: getAuthHeaders() });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const completeStep = async (step) => {
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.post(`${API}/educator/onboarding/${educatorId}/complete-step`, 
        { step },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.next_step) {
        setCurrentStep(response.data.next_step);
      }
      
      toast.success(`Step ${step} completed!`);
      fetchOnboardingData();
    } catch (error) {
      toast.error('Failed to complete step');
    }
  };

  const handleFileUpload = async (file, field) => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await axios.post(`${API}/upload`, formDataUpload, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      
      setFormData(prev => ({ ...prev, [field]: response.data.url }));
      toast.success('File uploaded successfully');
      return response.data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
      return null;
    }
  };

  const isStepCompleted = (step) => onboarding?.completed_steps?.includes(step);
  const canAccessStep = (step) => step <= currentStep || isStepCompleted(step);

  // Check if educator is approved (moved to active status)
  const isApproved = educator?.status === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep content={content} onboarding={onboarding} educator={educator} 
          onComplete={() => { saveProgress({ welcome_video_watched: true }); completeStep(1); }} />;
      case 2:
        return <ProfileStep formData={formData} setFormData={setFormData} 
          onSave={() => saveProgress()} onComplete={() => completeStep(2)} 
          onFileUpload={handleFileUpload} />;
      case 3:
        return <PersonalDetailsStep formData={formData} setFormData={setFormData}
          onSave={() => saveProgress()} onComplete={() => completeStep(3)}
          onFileUpload={handleFileUpload} />;
      case 4:
        return <BankDetailsStep formData={formData} setFormData={setFormData}
          onSave={() => saveProgress()} onComplete={() => completeStep(4)}
          onFileUpload={handleFileUpload} />;
      case 5:
        return <ContractStep content={content} formData={formData} setFormData={setFormData}
          onSave={() => saveProgress({ contract_accepted: true })} onComplete={() => completeStep(5)} />;
      case 6:
        return <TrainingStep 
          videoProgress={videoProgress} setVideoProgress={setVideoProgress}
          quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers}
          videoUploads={videoUploads} setVideoUploads={setVideoUploads}
          currentVideoIndex={currentVideoIndex} setCurrentVideoIndex={setCurrentVideoIndex}
          saveProgress={saveProgress} onComplete={() => completeStep(6)} />;
      case 7:
        return <ReviewStep educator={educator} onboarding={onboarding} isApproved={isApproved}
          onComplete={() => completeStep(7)} />;
      case 8:
        return <CompleteStep educator={educator} onboarding={onboarding} isApproved={isApproved} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-[#1E3A5F] text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Educator Onboarding</h1>
              <p className="text-white/70 text-sm">Welcome, {educator?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white/70">Progress</p>
              <p className="font-bold">{Math.round((onboarding?.completed_steps?.length || 0) / 8 * 100)}%</p>
            </div>
            <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${(onboarding?.completed_steps?.length || 0) / 8 * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex gap-8">
          {/* Sidebar - Steps */}
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-8">
              <h3 className="font-semibold text-[#1E3A5F] mb-4">Onboarding Steps</h3>
              <div className="space-y-2">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const completed = isStepCompleted(step.id);
                  const active = currentStep === step.id;
                  const accessible = canAccessStep(step.id);
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => accessible && setCurrentStep(step.id)}
                      disabled={!accessible}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        active 
                          ? 'bg-[#1E3A5F] text-white' 
                          : completed 
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : accessible
                              ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        active ? 'bg-white/20' : completed ? 'bg-green-500 text-white' : 'bg-slate-200'
                      }`}>
                        {completed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{step.title}</p>
                        <p className={`text-xs truncate ${active ? 'text-white/70' : 'text-slate-500'}`}>
                          {step.description}
                        </p>
                      </div>
                      {active && <ChevronRight className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const WelcomeStep = ({ content, educator, onComplete }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Welcome to OLL, {educator?.name}! 🎉</h2>
      <p className="text-slate-600">Watch this short video to learn about your journey as an OLL Educator</p>
    </div>
    
    <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
      <iframe
        src={content?.welcome_video?.url || "https://www.youtube.com/embed/dQw4w9WgXcQ"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Welcome to OLL"
      />
    </div>
    
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
      <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
      <ul className="text-sm text-blue-700 space-y-1">
        <li>• Complete your profile with a photo and bio</li>
        <li>• Submit your documents for verification</li>
        <li>• Sign the educator agreement</li>
        <li>• Complete training videos and assessments</li>
        <li>• Get approved and receive your certificate!</li>
      </ul>
    </div>
    
    <Button onClick={onComplete} className="w-full bg-[#D63031] hover:bg-[#c0392b]">
      I've Watched the Video - Continue <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const ProfileStep = ({ formData, setFormData, onSave, onComplete, onFileUpload }) => {
  const [photoPreview, setPhotoPreview] = useState(formData.profile_photo || null);
  
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      onFileUpload(file, 'profile_photo');
    }
  };
  
  const canContinue = formData.bio?.length >= 50;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Your Teaching Profile</h2>
        <p className="text-slate-600">This information will be visible to students and parents</p>
      </div>
      
      <div className="flex items-start gap-6">
        <div className="shrink-0">
          <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-slate-400" />
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <span className="text-white text-sm font-medium">Change Photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">Click to upload</p>
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Bio *</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell students about yourself, your teaching experience, and what makes you passionate about education..."
              className="min-h-[150px]"
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.bio?.length || 0}/500 characters (minimum 50)
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onSave} className="flex-1">Save Progress</Button>
        <Button 
          onClick={() => { onSave(); onComplete(); }} 
          disabled={!canContinue}
          className="flex-1 bg-[#D63031] hover:bg-[#c0392b]"
        >
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const PersonalDetailsStep = ({ formData, setFormData, onSave, onComplete, onFileUpload }) => {
  const canContinue = formData.address_line1 && formData.city && formData.state && 
    formData.pincode && formData.emergency_contact_name && formData.emergency_contact_phone &&
    formData.aadhar_number && formData.aadhar_document && formData.tshirt_size;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Personal Details</h2>
        <p className="text-slate-600">We need this information for your onboarding kit delivery and verification</p>
      </div>
      
      {/* T-Shirt Size */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">T-Shirt Size (for OLL merchandise) *</label>
        <div className="flex gap-2 flex-wrap">
          {TSHIRT_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setFormData({ ...formData, tshirt_size: size })}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                formData.tshirt_size === size
                  ? 'border-[#D63031] bg-[#D63031]/10 text-[#D63031]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      
      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Delivery Address (for blazer & kit)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} placeholder="Address Line 1 *" />
          </div>
          <div className="col-span-2">
            <Input value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} placeholder="Address Line 2" />
          </div>
          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City *" />
          <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State *" />
          <Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="Pincode *" />
        </div>
      </div>
      
      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <Heart className="w-4 h-4" /> Emergency Contact
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <Input value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} placeholder="Contact Name *" />
          <Input value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} placeholder="Phone Number *" />
          <Input value={formData.emergency_contact_relation} onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })} placeholder="Relation" />
        </div>
      </div>
      
      {/* ID Documents */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <FileText className="w-4 h-4" /> ID Verification
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Number *</label>
            <Input value={formData.aadhar_number} onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })} placeholder="XXXX XXXX XXXX" maxLength={14} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Aadhar Card *</label>
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${!formData.aadhar_document ? 'border-red-300' : 'border-green-300 bg-green-50'}`}>
              <Upload className="w-4 h-4 text-slate-500" />
              <span className={`text-sm ${formData.aadhar_document ? 'text-green-600' : 'text-slate-600'}`}>
                {formData.aadhar_document ? 'Uploaded ✓' : 'Choose file (Required)'}
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'aadhar_document')} className="hidden" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
            <Input value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload PAN Card</label>
            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">{formData.pan_document ? 'Uploaded ✓' : 'Choose file'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'pan_document')} className="hidden" />
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onSave} className="flex-1">Save Progress</Button>
        <Button onClick={() => { onSave(); onComplete(); }} disabled={!canContinue} className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const BankDetailsStep = ({ formData, setFormData, onSave, onComplete, onFileUpload }) => {
  const canContinue = formData.bank_name && formData.account_holder_name && formData.account_number && formData.ifsc_code;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Bank Details</h2>
        <p className="text-slate-600">For payment processing. Your information is secure.</p>
      </div>
      
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <p className="text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          Please ensure your bank details are correct. Payments will be credited to this account.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
          <Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g., State Bank of India" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name *</label>
          <Input value={formData.account_holder_name} onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })} placeholder="As per bank records" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
          <Input type="password" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} placeholder="Enter account number" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code *</label>
          <Input value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })} placeholder="e.g., SBIN0001234" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Upload Cancelled Cheque / Passbook First Page</label>
          <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50">
            <Upload className="w-5 h-5 text-slate-500" />
            <span className="text-slate-600">{formData.bank_document ? 'Document Uploaded ✓' : 'Click to upload'}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'bank_document')} className="hidden" />
          </label>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onSave} className="flex-1">Save Progress</Button>
        <Button onClick={() => { onSave(); onComplete(); }} disabled={!canContinue} className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ContractStep = ({ content, formData, setFormData, onSave, onComplete }) => {
  const [agreed, setAgreed] = useState(formData.contract_accepted || false);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Educator Agreement</h2>
        <p className="text-slate-600">Please read and accept the terms to continue</p>
      </div>
      
      <div className="bg-slate-50 rounded-xl p-6 max-h-[400px] overflow-y-auto prose prose-sm">
        <div dangerouslySetInnerHTML={{ __html: content?.contract_text?.replace(/\n/g, '<br/>') || '' }} />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Digital Signature</label>
        <Input value={formData.digital_signature} onChange={(e) => setFormData({ ...formData, digital_signature: e.target.value })} placeholder="Type your full name as signature" />
      </div>
      
      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
        <Checkbox id="agree" checked={agreed} onCheckedChange={(checked) => { setAgreed(checked); setFormData({ ...formData, contract_accepted: checked }); }} />
        <label htmlFor="agree" className="text-sm text-green-800 cursor-pointer">
          I have read and agree to the OLL Educator Agreement. I understand and accept all terms and conditions.
        </label>
      </div>
      
      <Button onClick={() => { onSave(); onComplete(); }} disabled={!agreed || !formData.digital_signature} className="w-full bg-[#D63031] hover:bg-[#c0392b]">
        <Check className="w-4 h-4 mr-2" /> Accept & Continue
      </Button>
    </div>
  );
};

// New Training Step - Videos one by one with quiz after each
const TrainingStep = ({ videoProgress, setVideoProgress, quizAnswers, setQuizAnswers, 
  videoUploads, setVideoUploads, currentVideoIndex, setCurrentVideoIndex, saveProgress, onComplete }) => {
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const currentVideo = TRAINING_CONTENT[currentVideoIndex];
  
  const isVideoWatched = videoProgress[currentVideo?.id]?.watched;
  const isQuizPassed = videoProgress[currentVideo?.id]?.quizPassed;
  const hasVideoUpload = videoUploads[currentVideo?.id];
  
  const allCompleted = TRAINING_CONTENT.every(v => 
    videoProgress[v.id]?.watched && videoProgress[v.id]?.quizPassed && 
    (!v.requiresVideoUpload || videoUploads[v.id])
  );

  const markVideoWatched = () => {
    const updated = { ...videoProgress, [currentVideo.id]: { ...videoProgress[currentVideo.id], watched: true } };
    setVideoProgress(updated);
    saveProgress({ video_progress: updated });
    setShowQuiz(true);
  };

  const submitQuiz = () => {
    const answers = quizAnswers[currentVideo.id] || {};
    let correct = 0;
    currentVideo.quiz.forEach(q => {
      if (answers[q.id] === q.correct) correct++;
    });
    
    const passed = correct >= Math.ceil(currentVideo.quiz.length * 0.7);
    
    if (passed) {
      const updated = { ...videoProgress, [currentVideo.id]: { ...videoProgress[currentVideo.id], quizPassed: true } };
      setVideoProgress(updated);
      saveProgress({ video_progress: updated });
      toast.success(`Quiz passed! ${correct}/${currentVideo.quiz.length} correct`);
      setShowQuiz(false);
      
      if (currentVideo.requiresVideoUpload) {
        setShowUpload(true);
      } else if (currentVideoIndex < TRAINING_CONTENT.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      }
    } else {
      toast.error(`Quiz failed. ${correct}/${currentVideo.quiz.length} correct. You need 70% to pass.`);
    }
  };

  const handleVideoLinkUpload = (link) => {
    const updated = { ...videoUploads, [currentVideo.id]: link };
    setVideoUploads(updated);
    saveProgress({ video_uploads: updated });
    toast.success('Video link saved!');
    setShowUpload(false);
    
    if (currentVideoIndex < TRAINING_CONTENT.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Training & Guidelines</h2>
        <p className="text-slate-600">Complete all videos, quizzes, and assessments</p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {TRAINING_CONTENT.map((v, idx) => {
          const completed = videoProgress[v.id]?.quizPassed && (!v.requiresVideoUpload || videoUploads[v.id]);
          const current = idx === currentVideoIndex;
          return (
            <div key={v.id} className={`flex-1 h-2 rounded-full ${completed ? 'bg-green-500' : current ? 'bg-orange-500' : 'bg-slate-200'}`} />
          );
        })}
      </div>

      <div className="text-sm text-slate-500">
        Video {currentVideoIndex + 1} of {TRAINING_CONTENT.length}: <span className="font-medium text-[#1E3A5F]">{currentVideo?.title}</span>
      </div>

      {!showQuiz && !showUpload ? (
        /* Video View */
        <div className="space-y-4">
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden">
            <iframe src={currentVideo?.url} className="w-full h-full" allowFullScreen title={currentVideo?.title} />
          </div>
          <p className="text-sm text-slate-600">{currentVideo?.description}</p>
          
          {isVideoWatched && isQuizPassed && (!currentVideo?.requiresVideoUpload || hasVideoUpload) ? (
            <div className="bg-green-50 p-4 rounded-xl text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Completed! {hasVideoUpload ? 'Video uploaded.' : ''}</span>
            </div>
          ) : isVideoWatched && isQuizPassed && currentVideo?.requiresVideoUpload && !hasVideoUpload ? (
            /* Quiz passed but video upload still needed */
            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-xl text-green-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Quiz passed! Now upload your video assessment.</span>
              </div>
              <Button onClick={() => setShowUpload(true)} className="w-full bg-purple-600 hover:bg-purple-700">
                <Upload className="w-4 h-4 mr-2" /> Upload Video Assessment
              </Button>
            </div>
          ) : (
            <Button onClick={markVideoWatched} disabled={isVideoWatched} className="w-full bg-[#1E3A5F]">
              {isVideoWatched ? 'Video Watched ✓ - Take Quiz' : 'I\'ve Watched This Video'}
            </Button>
          )}
          
          {isVideoWatched && !isQuizPassed && (
            <Button onClick={() => setShowQuiz(true)} className="w-full bg-[#D63031]">
              Take Quiz for This Video
            </Button>
          )}
        </div>
      ) : showQuiz ? (
        /* Quiz View */
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h3 className="font-semibold text-blue-800 mb-1">Quiz: {currentVideo?.title}</h3>
            <p className="text-sm text-blue-600">Answer all questions correctly to proceed (70% required)</p>
          </div>
          
          {currentVideo?.quiz.map((q, idx) => (
            <div key={q.id} className="bg-slate-50 rounded-xl p-4">
              <p className="font-medium text-[#1E3A5F] mb-3">{idx + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((option, optIdx) => (
                  <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    quizAnswers[currentVideo.id]?.[q.id] === optIdx ? 'bg-[#1E3A5F] text-white' : 'bg-white hover:bg-slate-100'
                  }`}>
                    <input type="radio" name={q.id} checked={quizAnswers[currentVideo.id]?.[q.id] === optIdx}
                      onChange={() => setQuizAnswers({ ...quizAnswers, [currentVideo.id]: { ...quizAnswers[currentVideo.id], [q.id]: optIdx } })}
                      className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      quizAnswers[currentVideo.id]?.[q.id] === optIdx ? 'border-white' : 'border-slate-300'
                    }`}>
                      {quizAnswers[currentVideo.id]?.[q.id] === optIdx && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowQuiz(false)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Video
            </Button>
            <Button onClick={submitQuiz} className="flex-1 bg-[#D63031]">Submit Quiz</Button>
          </div>
        </div>
      ) : showUpload ? (
        /* Video Upload View */
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-xl">
            <h3 className="font-semibold text-purple-800 mb-1">Video Assessment</h3>
            <p className="text-sm text-purple-600">{currentVideo?.uploadPrompt}</p>
          </div>
          
          <div className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center">
            <Video className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Upload your video to Google Drive and paste the link below</p>
            <Input
              placeholder="Paste Google Drive link here..."
              value={videoUploads[currentVideo?.id] || ''}
              onChange={(e) => setVideoUploads({ ...videoUploads, [currentVideo.id]: e.target.value })}
              className="mb-4"
            />
            <Button onClick={() => handleVideoLinkUpload(videoUploads[currentVideo?.id])} 
              disabled={!videoUploads[currentVideo?.id]}
              className="bg-purple-600 hover:bg-purple-700">
              <Upload className="w-4 h-4 mr-2" /> Submit Video Link
            </Button>
          </div>
        </div>
      ) : null}

      {/* Navigation & Complete */}
      <div className="flex gap-3 pt-4 border-t">
        {currentVideoIndex > 0 && (
          <Button variant="outline" onClick={() => { setCurrentVideoIndex(currentVideoIndex - 1); setShowQuiz(false); setShowUpload(false); }}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous Video
          </Button>
        )}
        
        {currentVideoIndex < TRAINING_CONTENT.length - 1 && isQuizPassed && (!currentVideo?.requiresVideoUpload || hasVideoUpload) && (
          <Button variant="outline" onClick={() => { setCurrentVideoIndex(currentVideoIndex + 1); setShowQuiz(false); setShowUpload(false); }}>
            Next Video <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
        {allCompleted && (
          <Button onClick={onComplete} className="ml-auto bg-[#D63031] hover:bg-[#c0392b]">
            Complete Training <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Review Step - Waiting for admin approval
const ReviewStep = ({ educator, onboarding, isApproved, onComplete }) => {
  if (isApproved) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">You're Approved! 🎉</h2>
        <p className="text-slate-600">Congratulations! Your documents have been verified and you are now an active OLL Educator.</p>
        <Button onClick={onComplete} className="bg-[#D63031] hover:bg-[#c0392b]">
          Continue to Download Your Certificate <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center py-8">
      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
        <Clock className="w-12 h-12 text-orange-600" />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3A5F]">Under Review</h2>
      <p className="text-slate-600 max-w-md mx-auto">
        Thank you for completing your onboarding! Our team is reviewing your documents and submissions. 
        Once approved, you will be onboarded as an active OLL Educator.
      </p>
      <div className="bg-blue-50 rounded-xl p-6 max-w-md mx-auto">
        <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 text-left space-y-2">
          <li>✓ Our team will review your documents</li>
          <li>✓ We'll verify your training videos</li>
          <li>✓ Once approved, you'll receive a notification</li>
          <li>✓ You can then download your ID card & certificate</li>
        </ul>
      </div>
      <p className="text-sm text-slate-500">This usually takes 1-2 business days</p>
    </div>
  );
};

// Complete Step - Certificate, ID Card, LinkedIn
const CompleteStep = ({ educator, onboarding, isApproved }) => {
  const [linkedinCopied, setLinkedinCopied] = useState(false);
  const [downloading, setDownloading] = useState({ idCard: false, certificate: false });

  const linkedinPost = `🎉 Excited to share that I've joined @OLL (One Life Learning) as an Educator!

I'm thrilled to be part of a team that believes in student-centric, personalized learning. Looking forward to making a positive impact on young minds.

#OLL #Educator #NewBeginnings #Education #Teaching #OneLifeLearning`;

  const copyLinkedinPost = () => {
    navigator.clipboard.writeText(linkedinPost);
    setLinkedinCopied(true);
    toast.success('LinkedIn post copied to clipboard!');
    setTimeout(() => setLinkedinCopied(false), 3000);
  };

  const downloadIDCard = async () => {
    setDownloading(prev => ({ ...prev, idCard: true }));
    try {
      const educatorId = educator?.id;
      const response = await fetch(`${API}/educator/onboarding/${educatorId}/download-id-card`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to download ID card');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OLL_ID_Card_${educator?.name?.replace(/\s/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ID Card downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download ID card');
    } finally {
      setDownloading(prev => ({ ...prev, idCard: false }));
    }
  };

  const downloadCertificate = async () => {
    setDownloading(prev => ({ ...prev, certificate: true }));
    try {
      const educatorId = educator?.id;
      const response = await fetch(`${API}/educator/onboarding/${educatorId}/download-certificate`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to download certificate');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OLL_Certificate_${educator?.name?.replace(/\s/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download certificate');
    } finally {
      setDownloading(prev => ({ ...prev, certificate: false }));
    }
  };

  const downloadLinkedinImage = () => {
    // For now, redirect to template or generate
    toast.success('LinkedIn image template - coming soon!');
  };

  if (!isApproved) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-600">Awaiting Approval</h2>
        <p className="text-slate-500">Complete Step 7 (Review) first. Your documents need to be approved before you can access your certificate and ID card.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">Congratulations, {educator?.name}! 🎉</h2>
        <p className="text-slate-600">You are now an official OLL Educator!</p>
      </div>

      {/* Downloads Section */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-[#1E3A5F] mb-2">ID Card</h3>
          <p className="text-sm text-slate-500 mb-4">Your official OLL Educator ID Card (PDF)</p>
          <Button onClick={downloadIDCard} disabled={downloading.idCard} className="w-full bg-[#1E3A5F]">
            {downloading.idCard ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {downloading.idCard ? 'Generating...' : 'Download ID Card'}
          </Button>
        </div>

        <div className="border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="font-semibold text-[#1E3A5F] mb-2">Certificate</h3>
          <p className="text-sm text-slate-500 mb-4">Your completion certificate (PDF)</p>
          <Button onClick={downloadCertificate} disabled={downloading.certificate} className="w-full bg-purple-600 hover:bg-purple-700">
            {downloading.certificate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {downloading.certificate ? 'Generating...' : 'Download Certificate'}
          </Button>
        </div>
      </div>

      {/* LinkedIn Section */}
      <div className="border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#0077B5] rounded-xl flex items-center justify-center">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1E3A5F]">Share on LinkedIn</h3>
            <p className="text-sm text-slate-500">Announce your new role!</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{linkedinPost}</pre>
        </div>

        <div className="flex gap-3">
          <Button onClick={copyLinkedinPost} variant="outline" className="flex-1">
            {linkedinCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {linkedinCopied ? 'Copied!' : 'Copy Post'}
          </Button>
          <Button onClick={downloadLinkedinImage} className="flex-1 bg-[#0077B5] hover:bg-[#005885]">
            <Download className="w-4 h-4 mr-2" /> Download Image
          </Button>
          <Button asChild className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
            <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Post on LinkedIn
            </a>
          </Button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-green-50 rounded-xl p-6">
        <h3 className="font-semibold text-green-800 mb-3">🚀 What's Next?</h3>
        <ul className="text-sm text-green-700 space-y-2">
          <li>✓ Your Educator Dashboard is now active</li>
          <li>✓ You'll start receiving demo assignments</li>
          <li>✓ Complete demos and build your teaching profile</li>
          <li>✓ Earn based on completed sessions</li>
        </ul>
        <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
          <a href="/educator-dashboard">Go to Educator Dashboard <ChevronRight className="w-4 h-4 ml-2" /></a>
        </Button>
      </div>
    </div>
  );
};

export default EducatorOnboarding;
