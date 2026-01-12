import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, User, School, GraduationCap, Users, Briefcase, Phone, Mail, FileText, MessageCircle, UserPlus, MapPin, Calendar, Clock, BookOpen } from 'lucide-react';
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
const MEETING_TYPES = [
  { value: 'online', label: 'Online Meeting' },
  { value: 'offline', label: 'In-Person Meeting' },
];

const InquiryPage = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
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
    
    // Query fields
    query_type: '',
    query_details: '',
    
    // Student fields
    age_group: '',
    skill: '',
    learning_mode: '',
    
    // School fields
    school_name: '',
    school_size: '',
    programs_interested: [],
    board: '',
    
    // Educator fields
    skills: [],
    experience: '',
    grades_comfortable: [],
    availability: '',
    
    // Team fields
    role: '',
    message: '',
    
    // Growth Partner fields
    investment_capacity: '',
    interest_type: '',
    
    // Booking fields (for student/school/teacher)
    book_demo: false,
    demo_date: null,
    demo_time: '',
    meeting_type: 'online', // online or offline
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
    
    if (inquiry_type === 'student') {
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
        demo_date: null,
        demo_time: null,
        source: formData.source || 'team_added',
        added_by: teamUser?.id || '',
        notes: formData.details
      });
      toast.success('Student lead added to CRM!');
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
        source: formData.source || 'team_added',
        added_by: teamUser?.id || '',
        notes: formData.details
      });
      toast.success('School lead added to CRM!');
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
        availability: formData.availability || 'Flexible',
        demo_ready: false,
        source: formData.source || 'team_added',
        added_by: teamUser?.id || '',
        notes: formData.details
      });
      toast.success('Educator application added!');
    }
    else if (inquiry_type === 'growth_partner') {
      await axios.post(`${API}/growth-partners`, {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone,
        city: formData.city,
        interest_type: formData.interest_type || 'franchise',
        details: formData.details || `Investment: ${formData.investment_capacity}`,
        source: formData.source || 'team_added',
        added_by: teamUser?.id || ''
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
        source: formData.source || 'team_added'
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
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Submitted Successfully!</h2>
          <p className="text-slate-500 mb-6">
            {formData.action_type === 'lead' 
              ? 'Lead has been added to the CRM.'
              : 'Query has been logged to the ticketing system.'}
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
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
                });
              }}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-white/50 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Add Lead / Query
            </h1>
            {teamUser && (
              <p className="text-sm text-slate-500">Adding as: {teamUser.name}</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-8 space-y-8">
          {/* Step 1: Inquiry Type */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-sm flex items-center justify-center">1</span>
              Select Type
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {INQUIRY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.inquiry_type === type.value 
                        ? 'border-[#D63031] bg-[#D63031]/5' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    onClick={() => updateForm('inquiry_type', type.value)}
                    data-testid={`type-${type.value}`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${formData.inquiry_type === type.value ? 'text-[#D63031]' : 'text-slate-500'}`} />
                    <div className={`text-sm font-medium ${formData.inquiry_type === type.value ? 'text-[#D63031]' : 'text-slate-700'}`}>
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
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-sm flex items-center justify-center">2</span>
                Lead or Query?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className={`p-5 rounded-xl border-2 transition-all ${
                    formData.action_type === 'lead' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => updateForm('action_type', 'lead')}
                  data-testid="action-lead"
                >
                  <UserPlus className={`w-8 h-8 mx-auto mb-2 ${formData.action_type === 'lead' ? 'text-green-600' : 'text-slate-400'}`} />
                  <div className={`font-semibold ${formData.action_type === 'lead' ? 'text-green-700' : 'text-slate-700'}`}>Add Lead</div>
                  <div className="text-xs text-slate-500 mt-1">Add to CRM</div>
                </button>
                <button
                  className={`p-5 rounded-xl border-2 transition-all ${
                    formData.action_type === 'query' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => updateForm('action_type', 'query')}
                  data-testid="action-query"
                >
                  <MessageCircle className={`w-8 h-8 mx-auto mb-2 ${formData.action_type === 'query' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className={`font-semibold ${formData.action_type === 'query' ? 'text-blue-700' : 'text-slate-700'}`}>Log Query</div>
                  <div className="text-xs text-slate-500 mt-1">Add to tickets</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact & Source */}
          {formData.action_type && (
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-sm flex items-center justify-center">3</span>
                Contact Details & Source
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <Input
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <Input
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                  <Select value={formData.source} onValueChange={(v) => updateForm('source', v)}>
                    <SelectTrigger data-testid="select-source">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <Select value={formData.city} onValueChange={(v) => updateForm('city', v)}>
                      <SelectTrigger data-testid="select-city">
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
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-sm flex items-center justify-center">4</span>
                {formData.inquiry_type === 'student' && 'Student Details'}
                {formData.inquiry_type === 'school' && 'School Details'}
                {formData.inquiry_type === 'teacher' && 'Educator Details'}
                {formData.inquiry_type === 'growth_partner' && 'Partnership Details'}
                {formData.inquiry_type === 'team' && 'Application Details'}
              </h2>

              {/* Student-specific fields */}
              {formData.inquiry_type === 'student' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Age Group</label>
                      <Select value={formData.age_group} onValueChange={(v) => updateForm('age_group', v)}>
                        <SelectTrigger>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Skill Interest</label>
                      <Select value={formData.skill} onValueChange={(v) => updateForm('skill', v)}>
                        <SelectTrigger>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Learning Mode</label>
                      <Select value={formData.learning_mode} onValueChange={(v) => updateForm('learning_mode', v)}>
                        <SelectTrigger>
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
                </div>
              )}

              {/* School-specific fields */}
              {formData.inquiry_type === 'school' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                      <Input
                        placeholder="School name"
                        value={formData.school_name}
                        onChange={(e) => updateForm('school_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                      <Input
                        placeholder="City / Area"
                        value={formData.city}
                        onChange={(e) => updateForm('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">School Size</label>
                      <Select value={formData.school_size} onValueChange={(v) => updateForm('school_size', v)}>
                        <SelectTrigger>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Board</label>
                      <Input
                        placeholder="CBSE, ICSE, State Board, etc."
                        value={formData.board}
                        onChange={(e) => updateForm('board', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Programs Interested</label>
                    <div className="flex flex-wrap gap-2">
                      {PROGRAMS.map(p => (
                        <button
                          key={p}
                          onClick={() => toggleArrayField('programs_interested', p)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                      <Input
                        placeholder="Years of experience"
                        value={formData.experience}
                        onChange={(e) => updateForm('experience', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                      <Select value={formData.availability} onValueChange={(v) => updateForm('availability', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Weekends">Weekends only</SelectItem>
                          <SelectItem value="Flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {PROGRAMS.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleArrayField('skills', s)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Grades Comfortable</label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map(g => (
                        <button
                          key={g}
                          onClick={() => toggleArrayField('grades_comfortable', g)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Interest Type</label>
                      <Select value={formData.interest_type} onValueChange={(v) => updateForm('interest_type', v)}>
                        <SelectTrigger>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Investment Capacity</label>
                      <Input
                        placeholder="Budget range"
                        value={formData.investment_capacity}
                        onChange={(e) => updateForm('investment_capacity', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Team Application fields */}
              {formData.inquiry_type === 'team' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role / Position *</label>
                      <Input
                        placeholder="Position applying for"
                        value={formData.role}
                        onChange={(e) => updateForm('role', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                      <Input
                        placeholder="Years of experience"
                        value={formData.experience}
                        onChange={(e) => updateForm('experience', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <Textarea
                  placeholder="Any additional details..."
                  value={formData.details}
                  onChange={(e) => updateForm('details', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Query-specific fields */}
          {formData.action_type === 'query' && (
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-sm flex items-center justify-center">4</span>
                Query Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Query Type</label>
                  <Select value={formData.query_type} onValueChange={(v) => updateForm('query_type', v)}>
                    <SelectTrigger>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Query Details</label>
                  <Textarea
                    placeholder="Describe the query in detail..."
                    value={formData.query_details}
                    onChange={(e) => updateForm('query_details', e.target.value)}
                    className="min-h-[120px]"
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
                className="w-full bg-[#D63031] hover:bg-[#b52828] h-12 text-lg"
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
