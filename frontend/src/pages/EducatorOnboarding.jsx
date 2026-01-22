import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { 
  Play, CheckCircle, Circle, Upload, User, MapPin, Phone, CreditCard, 
  FileText, Video, Award, Download, ChevronRight, ChevronLeft, Loader2,
  AlertCircle, Check, X, Camera, Building, Heart
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
  { id: 6, title: 'Training', icon: Video, description: 'Guidelines & Quiz' },
  { id: 7, title: 'Curriculum', icon: Award, description: 'Training & Assessment' },
  { id: 8, title: 'Complete', icon: Download, description: 'ID Card & Certificate' },
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
  
  // Quiz/Assessment states
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [watchedVideos, setWatchedVideos] = useState([]);

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
        setWatchedVideos(onb.training_videos_watched || []);
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

  const fetchQuiz = async () => {
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.get(`${API}/educator/onboarding/${educatorId}/quiz`, {
        headers: getAuthHeaders()
      });
      setQuizQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    }
  };

  const fetchAssessment = async () => {
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.get(`${API}/educator/onboarding/${educatorId}/assessment`, {
        headers: getAuthHeaders()
      });
      setAssessmentQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to fetch assessment:', error);
    }
  };

  const saveProgress = async (data = {}) => {
    setSaving(true);
    try {
      const educatorId = user?.educator_id || user?.id;
      await axios.patch(`${API}/educator/onboarding/${educatorId}`, {
        ...formData,
        ...data
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
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/upload`, formData, {
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

  const submitQuiz = async () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      toast.error('Please answer all questions');
      return;
    }
    
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.post(`${API}/educator/onboarding/${educatorId}/submit-quiz`,
        { answers: quizAnswers },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.passed) {
        toast.success(`🎉 ${response.data.message} Score: ${response.data.score}%`);
        fetchOnboardingData();
      } else {
        toast.error(`${response.data.message} Score: ${response.data.score}%`);
      }
    } catch (error) {
      toast.error('Failed to submit quiz');
    }
  };

  const submitAssessment = async () => {
    if (Object.keys(assessmentAnswers).length < assessmentQuestions.length) {
      toast.error('Please answer all questions');
      return;
    }
    
    try {
      const educatorId = user?.educator_id || user?.id;
      const response = await axios.post(`${API}/educator/onboarding/${educatorId}/submit-assessment`,
        { answers: assessmentAnswers },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.passed) {
        toast.success(`🎉 ${response.data.message} Score: ${response.data.score}%`);
        fetchOnboardingData();
      } else {
        toast.error(`${response.data.message} Score: ${response.data.score}%`);
      }
    } catch (error) {
      toast.error('Failed to submit assessment');
    }
  };

  const generateCertificate = async () => {
    try {
      const educatorId = user?.educator_id || user?.id;
      await axios.post(`${API}/educator/onboarding/${educatorId}/generate-certificate`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Certificate and ID Card generated!');
      fetchOnboardingData();
    } catch (error) {
      toast.error('Failed to generate certificate');
    }
  };

  const isStepCompleted = (step) => onboarding?.completed_steps?.includes(step);
  const canAccessStep = (step) => step <= currentStep || isStepCompleted(step);

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
        return <TrainingStep content={content} onboarding={onboarding}
          quizQuestions={quizQuestions} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers}
          fetchQuiz={fetchQuiz} submitQuiz={submitQuiz}
          watchedVideos={watchedVideos} setWatchedVideos={setWatchedVideos}
          saveProgress={saveProgress} onComplete={() => completeStep(6)} />;
      case 7:
        return <CurriculumStep content={content} onboarding={onboarding}
          assessmentQuestions={assessmentQuestions} assessmentAnswers={assessmentAnswers} 
          setAssessmentAnswers={setAssessmentAnswers}
          fetchAssessment={fetchAssessment} submitAssessment={submitAssessment}
          onComplete={() => completeStep(7)} />;
      case 8:
        return <CompleteStep educator={educator} onboarding={onboarding}
          generateCertificate={generateCertificate} />;
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
        <li>• Complete training and receive your certificate!</li>
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
      
      {/* Profile Photo */}
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
        <Button variant="outline" onClick={onSave} className="flex-1">
          Save Progress
        </Button>
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
            <Input
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="Address Line 1 *"
            />
          </div>
          <div className="col-span-2">
            <Input
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Address Line 2"
            />
          </div>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="City *"
          />
          <Input
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="State *"
          />
          <Input
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            placeholder="Pincode *"
          />
        </div>
      </div>
      
      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <Heart className="w-4 h-4" /> Emergency Contact
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <Input
            value={formData.emergency_contact_name}
            onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            placeholder="Contact Name *"
          />
          <Input
            value={formData.emergency_contact_phone}
            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            placeholder="Phone Number *"
          />
          <Input
            value={formData.emergency_contact_relation}
            onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
            placeholder="Relation"
          />
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
            <Input
              value={formData.aadhar_number}
              onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Aadhar Card *</label>
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${
              !formData.aadhar_document ? 'border-red-300' : 'border-green-300 bg-green-50'
            }`}>
              <Upload className="w-4 h-4 text-slate-500" />
              <span className={`text-sm ${formData.aadhar_document ? 'text-green-600' : 'text-slate-600'}`}>
                {formData.aadhar_document ? 'Uploaded ✓' : 'Choose file (Required)'}
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" 
                onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'aadhar_document')} 
                className="hidden" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
            <Input
              value={formData.pan_number}
              onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload PAN Card</label>
            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">
                {formData.pan_document ? 'Uploaded ✓' : 'Choose file'}
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'pan_document')}
                className="hidden" />
            </label>
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

const BankDetailsStep = ({ formData, setFormData, onSave, onComplete, onFileUpload }) => {
  const canContinue = formData.bank_name && formData.account_holder_name && 
    formData.account_number && formData.ifsc_code;
  
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
          <Input
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            placeholder="e.g., State Bank of India"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name *</label>
          <Input
            value={formData.account_holder_name}
            onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
            placeholder="As per bank records"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
          <Input
            type="password"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            placeholder="Enter account number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code *</label>
          <Input
            value={formData.ifsc_code}
            onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
            placeholder="e.g., SBIN0001234"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Upload Cancelled Cheque / Passbook First Page
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50">
            <Upload className="w-5 h-5 text-slate-500" />
            <span className="text-slate-600">
              {formData.bank_document ? 'Document Uploaded ✓' : 'Click to upload'}
            </span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'bank_document')}
              className="hidden" />
          </label>
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
        <Input
          value={formData.digital_signature}
          onChange={(e) => setFormData({ ...formData, digital_signature: e.target.value })}
          placeholder="Type your full name as signature"
        />
      </div>
      
      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
        <Checkbox 
          id="agree" 
          checked={agreed}
          onCheckedChange={(checked) => { setAgreed(checked); setFormData({ ...formData, contract_accepted: checked }); }}
        />
        <label htmlFor="agree" className="text-sm text-green-800 cursor-pointer">
          I have read and agree to the OLL Educator Agreement. I understand and accept all terms and conditions.
        </label>
      </div>
      
      <Button 
        onClick={() => { onSave(); onComplete(); }}
        disabled={!agreed || !formData.digital_signature}
        className="w-full bg-[#D63031] hover:bg-[#c0392b]"
      >
        <Check className="w-4 h-4 mr-2" /> Accept & Continue
      </Button>
    </div>
  );
};

const TrainingStep = ({ content, onboarding, quizQuestions, quizAnswers, setQuizAnswers, 
  fetchQuiz, submitQuiz, watchedVideos, setWatchedVideos, saveProgress, onComplete }) => {
  
  const [showQuiz, setShowQuiz] = useState(false);
  const allVideosWatched = content?.training_videos?.every(v => watchedVideos.includes(v.id));
  const quizPassed = onboarding?.quiz_passed;
  
  const markVideoWatched = (videoId) => {
    if (!watchedVideos.includes(videoId)) {
      const updated = [...watchedVideos, videoId];
      setWatchedVideos(updated);
      saveProgress({ training_videos_watched: updated });
    }
  };
  
  useEffect(() => {
    if (showQuiz && quizQuestions.length === 0) {
      fetchQuiz();
    }
  }, [showQuiz]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Training & Guidelines</h2>
        <p className="text-slate-600">Watch all videos and pass the quiz to continue</p>
      </div>
      
      {!showQuiz ? (
        <>
          {/* Videos */}
          <div className="space-y-4">
            {content?.training_videos?.map((video) => (
              <div key={video.id} className={`border rounded-xl overflow-hidden ${
                watchedVideos.includes(video.id) ? 'border-green-300 bg-green-50' : 'border-slate-200'
              }`}>
                <div className="aspect-video bg-slate-900">
                  <iframe
                    src={video.url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[#1E3A5F]">{video.title}</h4>
                    <p className="text-sm text-slate-500">Duration: {video.duration}</p>
                  </div>
                  <Button 
                    size="sm"
                    variant={watchedVideos.includes(video.id) ? "outline" : "default"}
                    onClick={() => markVideoWatched(video.id)}
                    className={watchedVideos.includes(video.id) ? 'text-green-600 border-green-300' : 'bg-[#1E3A5F]'}
                  >
                    {watchedVideos.includes(video.id) ? (
                      <><Check className="w-4 h-4 mr-1" /> Watched</>
                    ) : (
                      'Mark as Watched'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Quiz Button */}
          <div className="pt-4">
            {quizPassed ? (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-800">Quiz Passed! ✓</p>
                <Button onClick={onComplete} className="mt-4 bg-[#D63031]">
                  Continue to Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setShowQuiz(true)}
                disabled={!allVideosWatched}
                className="w-full bg-[#D63031]"
              >
                {allVideosWatched ? 'Take Quiz' : 'Watch all videos to unlock quiz'}
              </Button>
            )}
          </div>
        </>
      ) : (
        /* Quiz Section */
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setShowQuiz(false)}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Videos
          </Button>
          
          <div className="space-y-6">
            {quizQuestions.map((q, idx) => (
              <div key={q.id} className="bg-slate-50 rounded-xl p-4">
                <p className="font-medium text-[#1E3A5F] mb-3">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => (
                    <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      quizAnswers[q.id] === optIdx 
                        ? 'bg-[#1E3A5F] text-white' 
                        : 'bg-white hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={quizAnswers[q.id] === optIdx}
                        onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        quizAnswers[q.id] === optIdx ? 'border-white' : 'border-slate-300'
                      }`}>
                        {quizAnswers[q.id] === optIdx && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <Button onClick={submitQuiz} className="w-full bg-[#D63031]">
            Submit Quiz
          </Button>
        </div>
      )}
    </div>
  );
};

const CurriculumStep = ({ content, onboarding, assessmentQuestions, assessmentAnswers, 
  setAssessmentAnswers, fetchAssessment, submitAssessment, onComplete }) => {
  
  const [showAssessment, setShowAssessment] = useState(false);
  const [watchedCurriculum, setWatchedCurriculum] = useState(onboarding?.curriculum_videos_watched || []);
  const allWatched = content?.curriculum_videos?.every(v => watchedCurriculum.includes(v.id));
  const assessmentPassed = onboarding?.assessment_passed;
  
  useEffect(() => {
    if (showAssessment && assessmentQuestions.length === 0) {
      fetchAssessment();
    }
  }, [showAssessment]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Curriculum Training</h2>
        <p className="text-slate-600">Learn about OLL curriculum and teaching methodology</p>
      </div>
      
      {!showAssessment ? (
        <>
          <div className="space-y-4">
            {content?.curriculum_videos?.map((video) => (
              <div key={video.id} className={`border rounded-xl overflow-hidden ${
                watchedCurriculum.includes(video.id) ? 'border-green-300 bg-green-50' : 'border-slate-200'
              }`}>
                <div className="aspect-video bg-slate-900">
                  <iframe src={video.url} className="w-full h-full" allowFullScreen title={video.title} />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[#1E3A5F]">{video.title}</h4>
                    <p className="text-sm text-slate-500">Duration: {video.duration}</p>
                  </div>
                  <Button 
                    size="sm"
                    variant={watchedCurriculum.includes(video.id) ? "outline" : "default"}
                    onClick={() => !watchedCurriculum.includes(video.id) && setWatchedCurriculum([...watchedCurriculum, video.id])}
                    className={watchedCurriculum.includes(video.id) ? 'text-green-600 border-green-300' : 'bg-[#1E3A5F]'}
                  >
                    {watchedCurriculum.includes(video.id) ? <><Check className="w-4 h-4 mr-1" /> Watched</> : 'Mark as Watched'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-4">
            {assessmentPassed ? (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-800">Assessment Passed! ✓</p>
                <Button onClick={onComplete} className="mt-4 bg-[#D63031]">
                  Continue to Final Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowAssessment(true)} disabled={!allWatched} className="w-full bg-[#D63031]">
                {allWatched ? 'Take Assessment' : 'Watch all videos to unlock assessment'}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setShowAssessment(false)}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Videos
          </Button>
          
          <div className="space-y-6">
            {assessmentQuestions.map((q, idx) => (
              <div key={q.id} className="bg-slate-50 rounded-xl p-4">
                <p className="font-medium text-[#1E3A5F] mb-3">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => (
                    <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      assessmentAnswers[q.id] === optIdx ? 'bg-[#1E3A5F] text-white' : 'bg-white hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={assessmentAnswers[q.id] === optIdx}
                        onChange={() => setAssessmentAnswers({ ...assessmentAnswers, [q.id]: optIdx })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        assessmentAnswers[q.id] === optIdx ? 'border-white' : 'border-slate-300'
                      }`}>
                        {assessmentAnswers[q.id] === optIdx && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <Button onClick={submitAssessment} className="w-full bg-[#D63031]">Submit Assessment</Button>
        </div>
      )}
    </div>
  );
};

const CompleteStep = ({ educator, onboarding, generateCertificate }) => {
  const certificateReady = onboarding?.certificate_generated;
  
  return (
    <div className="space-y-6 text-center">
      <div className="py-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">Congratulations, {educator?.name}! 🎉</h2>
        <p className="text-slate-600 text-lg">You have successfully completed the OLL Educator Onboarding!</p>
      </div>
      
      {!certificateReady ? (
        <Button onClick={generateCertificate} className="bg-[#D63031] hover:bg-[#c0392b]">
          Generate Certificate & ID Card
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-800 mb-4">Your documents are ready!</p>
            
            <div className="flex gap-4 justify-center">
              <Button variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                <Download className="w-4 h-4 mr-2" /> Download ID Card
              </Button>
              <Button variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                <Download className="w-4 h-4 mr-2" /> Download Certificate
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-blue-800">
              <strong>What's next?</strong><br />
              You can now access your Educator Dashboard and start receiving demo assignments!
            </p>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/educator-dashboard'}
            className="bg-[#1E3A5F]"
          >
            Go to Educator Dashboard <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EducatorOnboarding;
