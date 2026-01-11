import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, UserX, Monitor, CreditCard, ExternalLink, Camera, Check, Calendar, Building2, School, HelpCircle, CalendarClock, Phone, LogIn, LinkIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { useUserAuth } from '../context/UserAuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHOP_URL = 'https://oll-robotics.myshopify.com/collections/all';
const LMS_URL = 'https://lms.oll.co';

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const SupportFlow = ({ onBack }) => {
  const navigate = useNavigate();
  const { isLoggedIn } = useUserAuth();
  const [mainCategory, setMainCategory] = useState(''); // demo, ongoing_classes, ongoing_school, other
  const [step, setStep] = useState('main'); // main, category, subcategory, form, success, login_prompt
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');
  const [formData, setFormData] = useState({
    // Common
    phone: '',
    email: '',
    contact_name: '',
    details: '',
    // Demo specific
    new_date: null,
    new_time: '',
    // School specific
    school_name: '',
    class_division: '',
    reason: '',
    // Ongoing classes
    session_type: '', // online, offline_home, offline_center
  });
  const [submitting, setSubmitting] = useState(false);

  // Main categories - Removed "Demo Link" from here (moved inside Demo Related)
  const mainCategories = [
    { id: 'demo', label: 'Demo Related', icon: Calendar, description: 'Demo link, reschedule, update booking' },
    { id: 'ongoing_classes', label: 'Ongoing Classes', icon: Building2, description: 'Online / Offline at home or center' },
    { id: 'ongoing_school', label: 'Ongoing Course in School', icon: School, description: 'School program related queries' },
    { id: 'other', label: 'Other Query', icon: HelpCircle, description: 'Any other questions' },
  ];

  // Demo sub-options - Added "Link to Join Demo" option
  const demoOptions = [
    { id: 'demo_link', label: 'Link to Join Demo', description: 'Get your demo joining link', action: 'login' },
    { id: 'reschedule', label: 'Reschedule Demo', description: 'Change your demo date/time' },
    { id: 'new_date', label: 'Ask for New Date & Time', description: 'Request a new slot' },
    { id: 'update_phone', label: 'Update Phone Number', description: 'Change the number used for booking' },
  ];

  // Ongoing classes categories
  const ongoingClassesCategories = [
    { id: 'reschedule_session', label: 'Reschedule Session', icon: CalendarClock, description: 'Change upcoming session timing' },
    { id: 'kit', label: 'Kit Related', icon: Package, description: 'Missing, lost, or damaged components' },
    { id: 'teacher', label: 'Teacher Related', icon: UserX, description: 'Complaints or feedback' },
    { id: 'center', label: 'Center Related', icon: Building2, description: 'Facility or location issues' },
    { id: 'payment', label: 'Payment Related', icon: CreditCard, description: 'Refund or billing queries' },
  ];

  // School program categories (existing)
  const schoolCategories = [
    { id: 'kit', label: 'Kit Related', icon: Package, description: 'Missing, lost, or damaged components' },
    { id: 'teacher', label: 'Teacher Related', icon: UserX, description: 'Complaints or feedback about teacher' },
    { id: 'lms', label: 'LMS Related', icon: Monitor, description: 'Login issues or LMS access' },
    { id: 'payment', label: 'Payment Related', icon: CreditCard, description: 'Invoice or refund requests' },
  ];

  const kitSubCategories = [
    { id: 'missing', label: 'Missing Components / Kit', description: 'Parts missing from your kit' },
    { id: 'damaged', label: 'Damaged Components', description: 'Kit parts that are damaged' },
  ];

  const missingOptions = [
    { id: 'lost_by_me', label: 'Lost by me', action: 'shop' },
    { id: 'lost_on_delivery', label: 'Lost when I received it', action: 'form', note: '(within 1 week of delivery)' },
  ];

  const damagedOptions = [
    { id: 'damaged_by_me', label: 'Damaged by me', action: 'shop' },
    { id: 'damaged_on_delivery', label: 'Was damaged when I received it', action: 'form', note: '(within 1 week of delivery)' },
  ];

  const lmsSubCategories = [
    { id: 'lost_password', label: 'Lost login ID / Password', action: 'form' },
    { id: 'lms_link', label: 'Need link to LMS', action: 'link' },
  ];

  const paymentSubCategories = [
    { id: 'refund', label: 'Want Refund', action: 'form' },
    { id: 'invoice', label: 'Want Invoice / Bill', action: 'form' },
  ];

  const handleBack = () => {
    if (step === 'success' || step === 'login_prompt') {
      onBack();
    } else if (step === 'form') {
      if (subSubCategory) {
        setSubSubCategory('');
        setStep('subcategory');
      } else if (subCategory) {
        setSubCategory('');
        setStep('subcategory');
      } else if (category) {
        setCategory('');
        setStep('category');
      } else {
        setStep('main');
      }
    } else if (step === 'subcategory') {
      if (subCategory) {
        setSubCategory('');
      } else {
        setCategory('');
        setStep('category');
      }
    } else if (step === 'category') {
      setMainCategory('');
      setStep('main');
    } else {
      onBack();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone) {
      toast.error('Please enter your phone number');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/query`, {
        main_category: mainCategory,
        category,
        sub_category: subCategory,
        sub_sub_category: subSubCategory,
        ...formData,
        new_date: formData.new_date ? format(formData.new_date, 'yyyy-MM-dd') : null,
      });
      setStep('success');
      toast.success('Query submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Login prompt for demo link
  const renderLoginPrompt = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-4">
        <LogIn className="w-8 h-8 text-[#1E3A5F]" />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Login Required</h2>
      <p className="text-slate-600 mb-6">
        Please login with your phone number to access your demo joining link and schedule.
      </p>
      <div className="space-y-3">
        <Button 
          onClick={() => navigate('/login')} 
          className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f]"
          data-testid="login-prompt-btn"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Login to View Demo Link
        </Button>
        <Button 
          variant="outline" 
          onClick={handleBack} 
          className="w-full"
        >
          Go Back
        </Button>
      </div>
      <p className="text-sm text-slate-500 mt-6">
        Don't have a booking yet?{' '}
        <Link to="/student" className="text-[#D63031] hover:underline">Book a Demo</Link>
      </p>
    </div>
  );

  // Main category selection
  const renderMainSelection = () => (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Queries related to:</h2>
      {mainCategories.map(cat => (
        <div
          key={cat.id}
          className="selection-card p-4 cursor-pointer"
          onClick={() => {
            setMainCategory(cat.id);
            if (cat.id === 'other') {
              setStep('form');
            } else {
              setStep('category');
            }
          }}
          data-testid={`main-${cat.id}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
              <cat.icon className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E3A5F]">{cat.label}</h3>
              <p className="text-sm text-slate-500">{cat.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Demo category options - now includes "Link to Join Demo"
  const renderDemoOptions = () => (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Demo Related</h2>
      {demoOptions.map(opt => (
        <div
          key={opt.id}
          className="selection-card p-4 cursor-pointer"
          onClick={() => {
            setCategory(opt.id);
            setStep('form');
          }}
          data-testid={`demo-${opt.id}`}
        >
          <h3 className="font-semibold text-[#1E3A5F]">{opt.label}</h3>
          <p className="text-sm text-slate-500">{opt.description}</p>
        </div>
      ))}
    </div>
  );

  // Ongoing classes categories
  const renderOngoingClassesCategories = () => (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Ongoing Classes</h2>
      <p className="text-slate-500 text-sm mb-4">Online / Offline at home or center</p>
      {ongoingClassesCategories.map(cat => (
        <div
          key={cat.id}
          className="selection-card p-4 cursor-pointer"
          onClick={() => {
            setCategory(cat.id);
            if (cat.id === 'reschedule_session' || cat.id === 'teacher' || cat.id === 'center') {
              setStep('form');
            } else {
              setStep('subcategory');
            }
          }}
          data-testid={`ongoing-${cat.id}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
              <cat.icon className="w-5 h-5 text-[#1E3A5F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E3A5F]">{cat.label}</h3>
              <p className="text-sm text-slate-500">{cat.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // School program categories
  const renderSchoolCategories = () => (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">School Program Queries</h2>
      <p className="text-slate-500 text-sm mb-4">Ongoing course in your school</p>
      {schoolCategories.map(cat => (
        <div
          key={cat.id}
          className="selection-card p-4 cursor-pointer"
          onClick={() => {
            setCategory(cat.id);
            if (cat.id === 'teacher') {
              setStep('form');
            } else {
              setStep('subcategory');
            }
          }}
          data-testid={`school-${cat.id}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
              <cat.icon className="w-5 h-5 text-[#1E3A5F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E3A5F]">{cat.label}</h3>
              <p className="text-sm text-slate-500">{cat.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Category selection based on main category
  const renderCategorySelection = () => {
    if (mainCategory === 'demo') return renderDemoOptions();
    if (mainCategory === 'ongoing_classes') return renderOngoingClassesCategories();
    if (mainCategory === 'ongoing_school') return renderSchoolCategories();
    return null;
  };

  // Subcategory selection
  const renderSubCategory = () => {
    // Kit subcategories
    if (category === 'kit') {
      if (!subCategory) {
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Kit Issue Type</h2>
            {kitSubCategories.map(sub => (
              <div
                key={sub.id}
                className="selection-card p-4 cursor-pointer"
                onClick={() => setSubCategory(sub.id)}
                data-testid={`kit-${sub.id}`}
              >
                <h3 className="font-semibold text-[#1E3A5F]">{sub.label}</h3>
                <p className="text-sm text-slate-500">{sub.description}</p>
              </div>
            ))}
          </div>
        );
      }

      const options = subCategory === 'missing' ? missingOptions : damagedOptions;
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">
            {subCategory === 'missing' ? 'Missing Components' : 'Damaged Components'}
          </h2>
          {options.map(opt => (
            <div
              key={opt.id}
              className="selection-card p-4 cursor-pointer"
              onClick={() => {
                if (opt.action === 'shop') {
                  window.open(SHOP_URL, '_blank');
                } else {
                  setSubSubCategory(opt.id);
                  setStep('form');
                }
              }}
              data-testid={`option-${opt.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{opt.label}</h3>
                  {opt.note && <p className="text-xs text-slate-500">{opt.note}</p>}
                </div>
                {opt.action === 'shop' && (
                  <ExternalLink className="w-5 h-5 text-[#D63031]" />
                )}
              </div>
            </div>
          ))}
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">
              <strong>Need replacement parts?</strong>{' '}
              <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="underline">
                Visit our shop →
              </a>
            </p>
          </div>
        </div>
      );
    }

    // LMS subcategories
    if (category === 'lms') {
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">LMS Related</h2>
          {lmsSubCategories.map(sub => (
            <div
              key={sub.id}
              className="selection-card p-4 cursor-pointer"
              onClick={() => {
                if (sub.action === 'link') {
                  window.open(LMS_URL, '_blank');
                } else {
                  setSubCategory(sub.id);
                  setStep('form');
                }
              }}
              data-testid={`lms-${sub.id}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E3A5F]">{sub.label}</h3>
                {sub.action === 'link' && (
                  <ExternalLink className="w-5 h-5 text-[#D63031]" />
                )}
              </div>
            </div>
          ))}
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">
              <strong>LMS Link:</strong>{' '}
              <a href={LMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                {LMS_URL}
              </a>
            </p>
          </div>
        </div>
      );
    }

    // Payment subcategories
    if (category === 'payment') {
      return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Payment Related</h2>
          {paymentSubCategories.map(sub => (
            <div
              key={sub.id}
              className="selection-card p-4 cursor-pointer"
              onClick={() => {
                setSubCategory(sub.id);
                setStep('form');
              }}
              data-testid={`payment-${sub.id}`}
            >
              <h3 className="font-semibold text-[#1E3A5F]">{sub.label}</h3>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // Form rendering
  const renderForm = () => {
    const needsProof = subSubCategory === 'damaged_on_delivery';
    const needsReason = subCategory === 'refund';
    const isPasswordReset = subCategory === 'lost_password';
    const isDemo = mainCategory === 'demo';
    const isSchool = mainCategory === 'ongoing_school';
    const needsDatePicker = isDemo && (category === 'reschedule' || category === 'new_date');
    const isRescheduleSession = category === 'reschedule_session';

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Enter Details</h2>
        
        {/* School fields */}
        {isSchool && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Name *</label>
              <Input
                placeholder="Enter school name"
                value={formData.school_name}
                onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                data-testid="school-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Class & Division *</label>
              <Input
                placeholder="e.g., 8th A"
                value={formData.class_division}
                onChange={(e) => setFormData({...formData, class_division: e.target.value})}
                data-testid="class-division"
              />
            </div>
          </>
        )}

        {/* Common contact fields */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {isDemo ? 'Phone Number (used for booking) *' : 'Contact Name'}
          </label>
          <Input
            placeholder={isDemo ? "Phone number used when booking" : "Your name"}
            value={formData.contact_name}
            onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
            data-testid="contact-name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
          <Input
            placeholder="Your WhatsApp number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            data-testid="phone"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
          <Input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            data-testid="email"
          />
        </div>

        {/* Date/Time picker for demo reschedule */}
        {needsDatePicker && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred New Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={formData.new_date}
                  onSelect={(date) => setFormData({...formData, new_date: date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                  className="rounded-xl border"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 rounded-lg border text-sm ${
                      formData.new_time === time 
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setFormData({...formData, new_time: time})}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Session reschedule */}
        {isRescheduleSession && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Session Type</label>
            <div className="space-y-2">
              {['Online', 'Offline at Home', 'Offline at Center'].map(type => (
                <div
                  key={type}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    formData.session_type === type 
                      ? 'border-[#D63031] bg-red-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData({...formData, session_type: type})}
                >
                  <span className="text-sm font-medium text-[#1E3A5F]">{type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reason field for refund */}
        {needsReason && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Refund *</label>
            <Textarea
              placeholder="Please explain your reason for requesting a refund"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="min-h-[100px]"
              data-testid="reason"
            />
          </div>
        )}

        {/* Details field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {mainCategory === 'other' ? 'Your Question *' : 'Additional Details (optional)'}
          </label>
          <Textarea
            placeholder={mainCategory === 'other' ? 'Describe your query...' : 'Any additional information...'}
            value={formData.details}
            onChange={(e) => setFormData({...formData, details: e.target.value})}
            className="min-h-[100px]"
            data-testid="details"
          />
        </div>

        {/* Info boxes */}
        {needsProof && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Photo/Video Proof Required</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please send a photo or video of the damaged component to our WhatsApp after submitting this form.
                </p>
              </div>
            </div>
          </div>
        )}

        {isPasswordReset && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              We will send your updated username and password to your WhatsApp number.
            </p>
          </div>
        )}

        {subCategory === 'invoice' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              We will send the invoice/bill to your WhatsApp/Email.
            </p>
          </div>
        )}

        {subCategory === 'refund' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700">
              Our team will contact you regarding your refund request.
            </p>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={submitting} 
          className="w-full bg-[#D63031] hover:bg-[#b52828]"
          data-testid="submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Query'}
        </Button>
      </form>
    );
  };

  // Success screen
  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Query Submitted!</h2>
      <p className="text-slate-600 mb-6">
        {subCategory === 'lost_password' 
          ? 'We will send your login details to your WhatsApp shortly.'
          : subCategory === 'invoice'
          ? 'We will send the invoice to your contact details.'
          : mainCategory === 'demo'
          ? 'Our team will confirm your new demo slot shortly.'
          : 'Our team will get back to you within 24-48 hours.'}
      </p>
      <Button onClick={onBack} className="bg-[#1E3A5F] hover:bg-[#2C5282]">
        Back to Home
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-8"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-8 px-4">
        <div className="max-w-lg mx-auto">
          {step !== 'success' && step !== 'login_prompt' && (
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <div className="glass-card rounded-2xl p-6">
            {step === 'main' && renderMainSelection()}
            {step === 'category' && renderCategorySelection()}
            {step === 'subcategory' && renderSubCategory()}
            {step === 'form' && renderForm()}
            {step === 'success' && renderSuccess()}
            {step === 'login_prompt' && renderLoginPrompt()}
          </div>
        </div>
      </main>

      <footer className="bg-[#1E3A5F] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
            <Link to="/about" className="hover:text-white">About OLL</Link>
            <Link to="/centers" className="hover:text-white">Our Centers</Link>
            <Link to="/blogs" className="hover:text-white">Blog</Link>
            <Link to="/faq" className="hover:text-white">FAQs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SupportFlow;
