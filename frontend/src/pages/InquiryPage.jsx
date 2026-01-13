import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, User, School, GraduationCap, Users, Briefcase, Phone, Mail, FileText, MessageCircle, UserPlus, MapPin, Calendar, Clock, BookOpen, Building } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INQUIRY_TYPES = [
  { value: 'student', label: 'Student', icon: User, description: 'Student or parent inquiry' },
  { value: 'school', label: 'School', icon: School, description: 'School partnership inquiry' },
  { value: 'growth_partner', label: 'Growth Partner', icon: Briefcase, description: 'Franchise or partnership' },
  { value: 'teacher', label: 'Teacher/Educator', icon: GraduationCap, description: 'Educator application' },
  { value: 'team', label: 'Team', icon: Users, description: 'Team member application' },
];

const QUERY_TYPES = [
  { value: 'demo_related', label: 'Demo Related' },
  { value: 'payment', label: 'Payment Related' },
  { value: 'course_info', label: 'Course Information' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'partnership', label: 'Partnership Query' },
  { value: 'feedback', label: 'Feedback / Complaint' },
  { value: 'other', label: 'Other' },
];

const SKILL_OPTIONS = [
  { value: 'robotics', label: 'Robotics' },
  { value: 'coding', label: 'Coding' },
  { value: 'ai', label: 'Artificial Intelligence' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'financial', label: 'Financial Literacy' },
];

const AGE_OPTIONS = [
  { value: '5-8', label: '5-8 years' },
  { value: '9-12', label: '9-12 years' },
  { value: '13-17', label: '13-17 years' },
  { value: '18+', label: '18+ years' },
];

const MODE_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline_center', label: 'Offline at Center' },
  { value: 'offline_home', label: 'Offline at Home' },
];

const SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event', label: 'Event / Workshop' },
  { value: 'other', label: 'Other' },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const GRADES = ['Pre-primary', 'Primary (1-5)', 'Middle (6-8)', 'High School (9-10)', 'Senior (11-12)'];
const PROGRAMS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const SCHOOL_SIZES = ['< 500 students', '500-1000 students', '1000-2000 students', '2000+ students'];
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Cambridge', 'Other'];
const AVAILABILITY_OPTIONS = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends', 'Full-time', 'Part-time'];

const InquiryPage = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [teamUser, setTeamUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(!!username);
  
  const [formData, setFormData] = useState({
    inquiry_type: '',
    action_type: '', // lead or query
    
    // Common fields
    name: '',
    phone: '',
    email: '',
    city: '',
    source: '',
    details: '',
    
    // Assignment option (only for team user links)
    assign_option: 'self', // 'self' or 'auto'
    
    // Query fields
    query_type: '',
    query_details: '',
    
    // Student fields
    age_group: '',
    skill: '',
    learning_mode: '',
    selected_center: '',
    
    // School fields
    school_name: '',
    school_size: '',
    programs_interested: [],
    board: '',
    
    // Educator fields
    skills: [],
    experience: '',
    grades_comfortable: [],
    availability: [],
    
    // Team fields
    role: '',
    message: '',
    
    // Growth Partner fields
    investment_capacity: '',
    interest_type: '',
    
    // Booking fields (for student/school/teacher)
    demo_date: null,
    demo_time: '',
  });

  useEffect(() => {
    const fetchTeamUser = async () => {
      if (!username) {
        setLoadingUser(false);
        return;
      }
      try {
        const response = await axios.get(`${API}/team-users/by-username/${username}`);
        setTeamUser(response.data);
      } catch (error) {
        toast.error('Invalid user link');
        navigate('/add');
      } finally {
        setLoadingUser(false);
      }
    };
    fetchTeamUser();
  }, [username, navigate]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${API}/cities`);
        setCities(response.data.filter(c => c.is_active));
      } catch (error) {
        console.error('Failed to fetch cities');
      }
    };
    fetchCities();
  }, []);

  // Fetch centers when city changes and mode is offline_center
  useEffect(() => {
    const fetchCenters = async () => {
      if (formData.city && formData.learning_mode === 'offline_center') {
        try {
          const response = await axios.get(`${API}/centers/by-city/${formData.city}`);
          setCenters(response.data || []);
        } catch (error) {
          console.error('Failed to fetch centers');
          setCenters([]);
        }
      }
    };
    fetchCenters();
  }, [formData.city, formData.learning_mode]);

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.inquiry_type) {
      toast.error('Please select inquiry type');
      return;
    }
    if (!formData.action_type) {
      toast.error('Please select Lead or Query');
      return;
    }
    if (!formData.name || !formData.phone) {
      toast.error('Please fill name and phone');
      return;
    }

    setSubmitting(true);
    try {
      if (formData.action_type === 'lead') {
        await submitLead();
      } else {
        await submitQuery();
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLead = async () => {
    const { inquiry_type } = formData;
    
    // Format demo date if selected
    const demoDate = formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null;
    const demoTime = formData.demo_time || null;
    
    // Determine assignment - if team user and "self" selected, auto-assign
    const assignedTo = (teamUser && formData.assign_option === 'self') ? teamUser.id : '';
    
    // Build source string with team member name if added via their link
    const sourceValue = teamUser 
      ? `${formData.source || 'team_added'} (Added by: ${teamUser.name})`
      : (formData.source || 'team_added');
    
    if (inquiry_type === 'student') {
      // Auto-determine meeting type from learning mode
      const meetingType = formData.learning_mode === 'online' ? 'online' : 'offline';
      
      await axios.post(`${API}/students/inquiry`, {
        learner_type: 'self',
        age_group: formData.age_group,
        skill: formData.skill,
        city: formData.city,
        learning_mode: formData.learning_mode || 'online',
        learning_goal: 'general',
        name: formData.name,
        email: formData.email || `${formData.phone}@student.oll`,
        phone: formData.phone,
        demo_date: demoDate,
        demo_time: demoTime,
        source: sourceValue,
        added_by: teamUser?.id || '',
        assigned_to: assignedTo,
        notes: formData.selected_center 
          ? `${formData.details || ''}\nCenter: ${formData.selected_center}`.trim()
          : formData.details
      });
      toast.success(demoDate ? 'Student lead added with demo booking!' : 'Student lead added to CRM!');
    } 
    else if (inquiry_type === 'school') {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: formData.school_name || formData.name,
        contact_name: formData.name,
        email: formData.email || `${formData.phone}@school.oll`,
        phone: formData.phone,
        location: formData.city,
        school_size: formData.school_size,
        fee_range: '',
        board: formData.board,
        programs_interested: formData.programs_interested,
        support_needed: [],
        meeting_date: demoDate,
        meeting_time: demoTime,
        meeting_type: 'offline', // School meetings default to offline
        source: sourceValue,
        added_by: teamUser?.id || '',
        assigned_to: assignedTo,
        notes: formData.details
      });
      toast.success(demoDate ? 'School lead added with meeting scheduled!' : 'School lead added to CRM!');
    }
    else if (inquiry_type === 'teacher') {
      await axios.post(`${API}/educators/apply`, {
        name: formData.name,
        email: formData.email || `${formData.phone}@educator.oll`,
        phone: formData.phone,
        skills: formData.skills,
        experience: formData.experience,
        grades_comfortable: formData.grades_comfortable,
        city: formData.city,
        availability: Array.isArray(formData.availability) ? formData.availability.join(', ') : (formData.availability || 'Flexible'),
        demo_ready: !!demoDate,
        demo_date: demoDate,
        demo_time: demoTime,
        source: sourceValue,
        added_by: teamUser?.id || '',
        assigned_to: assignedTo,
        notes: formData.details
      });
      toast.success(demoDate ? 'Educator added with demo scheduled!' : 'Educator application added!');
    }
    else if (inquiry_type === 'growth_partner') {
      await axios.post(`${API}/growth-partners`, {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone,
        city: formData.city,
        interest_type: formData.interest_type || 'franchise',
        details: formData.details || `Investment: ${formData.investment_capacity}`,
        source: sourceValue,
        added_by: teamUser?.id || '',
        assigned_to: assignedTo
      });
      toast.success('Growth Partner lead added!');
    }
    else if (inquiry_type === 'team') {
      await axios.post(`${API}/team-applications`, {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone,
        role: formData.role,
        experience: formData.experience,
        city: formData.city,
        message: formData.details,
        source: sourceValue
      });
      toast.success('Team application added!');
    }
  };

  const submitQuery = async () => {
    await axios.post(`${API}/inquiry/query`, {
      inquiry_type: formData.inquiry_type,
      action_type: 'query',
      name: formData.name,
      phone: formData.phone,
      email: formData.email || '',
      query_type: formData.query_type,
      query_details: formData.query_details,
      source: formData.source || 'team_added',
      added_by: teamUser?.id || ''
    });
    toast.success('Query logged to ticketing system!');
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      inquiry_type: '',
      action_type: '',
      name: '',
      phone: '',
      email: '',
      city: '',
      source: '',
      details: '',
      query_type: '',
      query_details: '',
      age_group: '',
      skill: '',
      learning_mode: '',
      selected_center: '',
      school_name: '',
      school_size: '',
      programs_interested: [],
      board: '',
      skills: [],
      experience: '',
      grades_comfortable: [],
      availability: '',
      role: '',
      message: '',
      investment_capacity: '',
      interest_type: '',
      demo_date: null,
      demo_time: '',
    });
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] mb-2">Submitted Successfully!</h2>
          <p className="text-slate-500 mb-2 text-sm sm:text-base">
            {formData.action_type === 'lead' 
              ? 'Lead has been added to the CRM.'
              : 'Query has been logged to the ticketing system.'}
          </p>
          {formData.demo_date && formData.demo_time && (
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700 font-medium">
                {formData.inquiry_type === 'school' ? 'Meeting' : 'Demo'} scheduled for {format(formData.demo_date, 'MMM d, yyyy')} at {formData.demo_time}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={resetForm}
              className="flex-1"
              data-testid="add-another-btn"
            >
              Add Another
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="flex-1 bg-[#1E3A5F] hover:bg-[#152c4a]"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
          <Link to="/" className="p-2 hover:bg-white/50 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Add Lead / Query
            </h1>
            {teamUser && (
              <p className="text-xs sm:text-sm text-slate-500">Adding as: {teamUser.name}</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* Step 1: Inquiry Type */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1E3A5F] text-white text-xs sm:text-sm flex items-center justify-center">1</span>
              Select Type
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {INQUIRY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-center ${
                      formData.inquiry_type === type.value 
                        ? 'border-[#D63031] bg-[#D63031]/5' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    onClick={() => updateForm('inquiry_type', type.value)}
                    data-testid={`type-${type.value}`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 ${formData.inquiry_type === type.value ? 'text-[#D63031]' : 'text-slate-500'}`} />
                    <div className={`text-xs sm:text-sm font-medium ${formData.inquiry_type === type.value ? 'text-[#D63031]' : 'text-slate-700'}`}>
                      {type.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Lead or Query */}
          {formData.inquiry_type && (
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1E3A5F] text-white text-xs sm:text-sm flex items-center justify-center">2</span>
                Lead or Query?
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                    formData.action_type === 'lead' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => updateForm('action_type', 'lead')}
                  data-testid="action-lead"
                >
                  <UserPlus className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${formData.action_type === 'lead' ? 'text-green-600' : 'text-slate-400'}`} />
                  <div className={`font-semibold text-sm sm:text-base ${formData.action_type === 'lead' ? 'text-green-700' : 'text-slate-700'}`}>Add Lead</div>
                  <div className="text-xs text-slate-500 mt-1">Add to CRM</div>
                </button>
                <button
                  className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                    formData.action_type === 'query' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => updateForm('action_type', 'query')}
                  data-testid="action-query"
                >
                  <MessageCircle className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${formData.action_type === 'query' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className={`font-semibold text-sm sm:text-base ${formData.action_type === 'query' ? 'text-blue-700' : 'text-slate-700'}`}>Log Query</div>
                  <div className="text-xs text-slate-500 mt-1">Add to tickets</div>
                </button>
              </div>

              {/* Assignment Option - Only show if team user */}
              {teamUser && formData.action_type === 'lead' && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                  <p className="text-sm font-medium text-indigo-700 mb-3">Lead Assignment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateForm('assign_option', 'self')}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        formData.assign_option === 'self'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                      data-testid="assign-self"
                    >
                      <UserPlus className="w-4 h-4 mx-auto mb-1" />
                      Assign to Me
                    </button>
                    <button
                      onClick={() => updateForm('assign_option', 'auto')}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        formData.assign_option === 'auto'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                      data-testid="assign-auto"
                    >
                      <Users className="w-4 h-4 mx-auto mb-1" />
                      Let Admin Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contact & Source */}
          {formData.action_type && (
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1E3A5F] text-white text-xs sm:text-sm flex items-center justify-center">3</span>
                Contact Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <Input
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="h-10 sm:h-11"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <Input
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-10 sm:h-11"
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="h-10 sm:h-11"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Source</label>
                  <Select value={formData.source} onValueChange={(v) => updateForm('source', v)}>
                    <SelectTrigger className="h-10 sm:h-11" data-testid="select-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.inquiry_type !== 'school' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">City</label>
                    <Select value={formData.city} onValueChange={(v) => updateForm('city', v)}>
                      <SelectTrigger className="h-10 sm:h-11" data-testid="select-city">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Type-specific fields */}
          {formData.action_type === 'lead' && formData.inquiry_type && (
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1E3A5F] text-white text-xs sm:text-sm flex items-center justify-center">4</span>
                {formData.inquiry_type === 'student' && 'Student Details'}
                {formData.inquiry_type === 'school' && 'School Details'}
                {formData.inquiry_type === 'teacher' && 'Educator Details'}
                {formData.inquiry_type === 'growth_partner' && 'Partnership Details'}
                {formData.inquiry_type === 'team' && 'Application Details'}
              </h2>

              {/* Student-specific fields */}
              {formData.inquiry_type === 'student' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Age Group</label>
                      <Select value={formData.age_group} onValueChange={(v) => updateForm('age_group', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select age group" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_OPTIONS.map(a => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Skill Interest</label>
                      <Select value={formData.skill} onValueChange={(v) => updateForm('skill', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Learning Mode</label>
                      <Select value={formData.learning_mode} onValueChange={(v) => updateForm('learning_mode', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODE_OPTIONS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Center Selection - only for offline_center mode */}
                  {formData.learning_mode === 'offline_center' && formData.city && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        Select Center
                      </label>
                      {centers.length > 0 ? (
                        <Select value={formData.selected_center} onValueChange={(v) => updateForm('selected_center', v)}>
                          <SelectTrigger className="h-10 sm:h-11">
                            <SelectValue placeholder="Select a center" />
                          </SelectTrigger>
                          <SelectContent>
                            {centers.map(c => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name} - {c.area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-slate-500 py-2">No centers available in {formData.city}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* School-specific fields */}
              {formData.inquiry_type === 'school' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">School Name</label>
                      <Input
                        placeholder="School name"
                        value={formData.school_name}
                        onChange={(e) => updateForm('school_name', e.target.value)}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Location</label>
                      <Input
                        placeholder="City / Area"
                        value={formData.city}
                        onChange={(e) => updateForm('city', e.target.value)}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">School Size</label>
                      <Select value={formData.school_size} onValueChange={(v) => updateForm('school_size', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHOOL_SIZES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Board</label>
                      <Select value={formData.board} onValueChange={(v) => updateForm('board', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select board" />
                        </SelectTrigger>
                        <SelectContent>
                          {BOARD_OPTIONS.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Programs Interested</label>
                    <div className="flex flex-wrap gap-2">
                      {PROGRAMS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleArrayField('programs_interested', p)}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition-all ${
                            formData.programs_interested.includes(p)
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Educator-specific fields */}
              {formData.inquiry_type === 'teacher' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Experience</label>
                    <Input
                      placeholder="Years of experience"
                      value={formData.experience}
                      onChange={(e) => updateForm('experience', e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Availability</label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABILITY_OPTIONS.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleArrayField('availability', slot)}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition-all ${
                            formData.availability.includes(slot)
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {PROGRAMS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleArrayField('skills', s)}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition-all ${
                            formData.skills.includes(s)
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Grades Comfortable</label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleArrayField('grades_comfortable', g)}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition-all ${
                            formData.grades_comfortable.includes(g)
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Growth Partner fields */}
              {formData.inquiry_type === 'growth_partner' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Interest Type</label>
                      <Select value={formData.interest_type} onValueChange={(v) => updateForm('interest_type', v)}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Select interest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="franchise">Franchise</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Investment Capacity</label>
                      <Input
                        placeholder="Budget range"
                        value={formData.investment_capacity}
                        onChange={(e) => updateForm('investment_capacity', e.target.value)}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Team Application fields */}
              {formData.inquiry_type === 'team' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Role / Position *</label>
                      <Input
                        placeholder="Position applying for"
                        value={formData.role}
                        onChange={(e) => updateForm('role', e.target.value)}
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Experience</label>
                      <Input
                        placeholder="Years of experience"
                        value={formData.experience}
                        onChange={(e) => updateForm('experience', e.target.value)}
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Demo/Meeting Booking Section - ALWAYS VISIBLE for student, school, teacher */}
              {['student', 'school', 'teacher'].includes(formData.inquiry_type) && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200">
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    {formData.inquiry_type === 'school' ? 'Schedule Meeting' : 'Book Demo'} (Optional)
                  </h3>

                  <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Date Selection */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Select Date</label>
                        <div className="bg-white rounded-lg border border-slate-200 p-2 flex justify-center">
                          <CalendarComponent
                            mode="single"
                            selected={formData.demo_date}
                            onSelect={(date) => updateForm('demo_date', date)}
                            disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                            className="rounded-md"
                          />
                        </div>
                        {formData.demo_date && (
                          <p className="text-xs sm:text-sm text-[#1E3A5F] mt-2 font-medium">
                            Selected: {format(formData.demo_date, 'EEE, MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      {/* Time Selection */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Select Time</label>
                        <div className="grid grid-cols-3 gap-2">
                          {TIME_SLOTS.map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => updateForm('demo_time', time)}
                              className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                                formData.demo_time === time
                                  ? 'border-[#D63031] bg-[#D63031] text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                              data-testid={`time-${time}`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                        {formData.demo_time && (
                          <p className="text-xs sm:text-sm text-[#D63031] mt-3 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            Selected: {formData.demo_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <Textarea
                  placeholder="Any additional details..."
                  value={formData.details}
                  onChange={(e) => updateForm('details', e.target.value)}
                  className="min-h-[70px] sm:min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Query-specific fields */}
          {formData.action_type === 'query' && (
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1E3A5F] text-white text-xs sm:text-sm flex items-center justify-center">4</span>
                Query Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Query Type</label>
                  <Select value={formData.query_type} onValueChange={(v) => updateForm('query_type', v)}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Select query type" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUERY_TYPES.map(q => (
                        <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Query Details</label>
                  <Textarea
                    placeholder="Describe the query in detail..."
                    value={formData.query_details}
                    onChange={(e) => updateForm('query_details', e.target.value)}
                    className="min-h-[100px] sm:min-h-[120px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {formData.action_type && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#D63031] hover:bg-[#b52828] h-11 sm:h-12 text-base sm:text-lg"
                data-testid="submit-btn"
              >
                {submitting ? 'Submitting...' : formData.action_type === 'lead' ? 'Add Lead' : 'Log Query'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InquiryPage;
