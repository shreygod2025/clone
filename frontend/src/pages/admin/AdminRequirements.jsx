import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Users, Clock, Calendar, IndianRupee, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AdminRequirements = () => {
  const { getAuthHeaders } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [cities, setCities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [expandedReq, setExpandedReq] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    skill: '',
    city: '',
    area: '',
    description: '',
    positions: 1,
    days: [],
    timing_from: '',
    timing_to: '',
    pay_amount: '',
    pay_type: 'per_session',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, citiesRes, appsRes] = await Promise.all([
        axios.get(`${API}/requirements`, { headers: getAuthHeaders() }),
        axios.get(`${API}/cities`, { headers: getAuthHeaders() }),
        axios.get(`${API}/educators`, { headers: getAuthHeaders() })
      ]);
      setRequirements(reqRes.data);
      setCities(citiesRes.data);
      setApplications(appsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.skill || !formData.city) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingReq) {
        await axios.patch(`${API}/requirements/${editingReq.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement updated successfully');
      } else {
        await axios.post(`${API}/requirements`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement created successfully');
      }

      setShowForm(false);
      setEditingReq(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save requirement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;

    try {
      await axios.delete(`${API}/requirements/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Requirement deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      skill: '',
      city: '',
      area: '',
      description: '',
      positions: 1,
      days: [],
      timing_from: '',
      timing_to: '',
      pay_amount: '',
      pay_type: 'per_session',
      is_active: true
    });
  };

  const openEditForm = (req) => {
    setEditingReq(req);
    setFormData({
      title: req.title,
      skill: req.skill,
      city: req.city,
      area: req.area || '',
      description: req.description,
      positions: req.positions,
      days: req.days || [],
      timing_from: req.timing_from || '',
      timing_to: req.timing_to || '',
      pay_amount: req.pay_amount || req.pay_per_session || '',
      pay_type: req.pay_type || 'per_session',
      is_active: req.is_active
    });
    setShowForm(true);
  };

  const formatDays = (days) => {
    if (!days || days.length === 0) return 'Flexible';
    if (days.length === 7) return 'All Days';
    if (days.length > 3) return `${days.length} days/week`;
    return days.map(d => d.substring(0, 3)).join(', ');
  };

  const getPayTypeLabel = (type) => {
    switch(type) {
      case 'per_session': return 'session';
      case 'per_day': return 'day';
      case 'per_month': return 'month';
      default: return 'session';
    }
  };

  // Get applicants for a specific requirement
  const getApplicantsForReq = (reqId) => {
    return applications.filter(app => app.requirement_id === reqId);
  };

  return (
    <AdminLayout title="Open Requirements">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{requirements.length} open positions</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingReq(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-requirement-btn"
        >
          <Plus className="w-4 h-4" /> Add Requirement
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No open requirements</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => {
            const applicants = getApplicantsForReq(req.id);
            const isExpanded = expandedReq === req.id;
            
            return (
              <div 
                key={req.id} 
                className={`bg-white rounded-2xl border overflow-hidden ${req.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}
                data-testid={`requirement-card-${req.id}`}
              >
                {/* Requirement Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[#1E3A5F] text-lg">{req.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${req.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {req.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" /> {req.skill}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {req.city}{req.area && ` - ${req.area}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" /> {req.positions} positions
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditForm(req)} data-testid={`edit-requirement-${req.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(req.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-requirement-${req.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Days, Timings, Pay */}
                  <div className="flex flex-wrap gap-3 text-sm mb-3">
                    {req.days && req.days.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        <Calendar className="w-3 h-3" /> {formatDays(req.days)}
                      </span>
                    )}
                    {req.timing_from && req.timing_to && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                        <Clock className="w-3 h-3" /> {req.timing_from} - {req.timing_to}
                      </span>
                    )}
                    {(req.pay_amount || req.pay_per_session) && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                        <IndianRupee className="w-3 h-3" /> ₹{req.pay_amount || req.pay_per_session}/{getPayTypeLabel(req.pay_type)}
                      </span>
                    )}
                  </div>
                  
                  {req.description && (
                    <p className="text-slate-600 text-sm mb-4">{req.description}</p>
                  )}

                  {/* Applicants Toggle */}
                  <button
                    onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                    className="flex items-center gap-2 text-sm font-medium text-[#1E3A5F] hover:text-[#D63031] transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    {applicants.length} Applicants
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Applicants Section */}
                {isExpanded && (
                  <div className="border-t bg-slate-50 p-4">
                    {applicants.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">No applications yet</p>
                    ) : (
                      <div className="space-y-3">
                        {applicants.map(app => (
                          <div key={app.id} className="bg-white rounded-xl p-4 border border-slate-100">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-[#1E3A5F]">{app.name}</h4>
                                <p className="text-sm text-slate-500">{app.phone} • {app.email}</p>
                                {app.experience && (
                                  <p className="text-sm text-slate-600 mt-1">{app.experience}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                app.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                app.status === 'demo_scheduled' ? 'bg-purple-100 text-purple-700' :
                                app.status === 'demo_completed' ? 'bg-orange-100 text-orange-700' :
                                app.status === 'onboarded' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {app.status?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Requirement Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReq ? 'Edit Requirement' : 'Add New Requirement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Robotics Instructor"
                data-testid="requirement-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skill *</label>
                <select
                  value={formData.skill}
                  onChange={(e) => setFormData({...formData, skill: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="requirement-skill"
                >
                  <option value="">Select Skill</option>
                  {SKILLS.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="requirement-city"
                >
                  <option value="">Select City</option>
                  {cities.filter(c => c.is_active).map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Area</label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  placeholder="e.g., Andheri West"
                  data-testid="requirement-area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Positions</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.positions}
                  onChange={(e) => setFormData({...formData, positions: parseInt(e.target.value) || 1})}
                  data-testid="requirement-positions"
                />
              </div>
            </div>
            
            {/* Days Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.days.includes(day)
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid={`day-${day.toLowerCase()}`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timing From</label>
                <Input
                  type="time"
                  value={formData.timing_from}
                  onChange={(e) => setFormData({...formData, timing_from: e.target.value})}
                  data-testid="requirement-timing-from"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timing To</label>
                <Input
                  type="time"
                  value={formData.timing_to}
                  onChange={(e) => setFormData({...formData, timing_to: e.target.value})}
                  data-testid="requirement-timing-to"
                />
              </div>
            </div>

            {/* Pay */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pay (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={formData.pay_amount}
                  onChange={(e) => setFormData({...formData, pay_amount: e.target.value})}
                  data-testid="requirement-pay"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pay Type</label>
                <select
                  value={formData.pay_type}
                  onChange={(e) => setFormData({...formData, pay_type: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="requirement-pay-type"
                >
                  <option value="per_session">Per Session</option>
                  <option value="per_day">Per Day</option>
                  <option value="per_month">Per Month</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the role..."
                className="min-h-[80px]"
                data-testid="requirement-description"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                data-testid="requirement-active"
              />
              <label className="text-sm text-slate-600">Active (visible to educators)</label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)} 
                className="flex-1"
                data-testid="cancel-requirement"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" data-testid="save-requirement">
                {editingReq ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRequirements;
