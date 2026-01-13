import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Calendar, Clock, Phone, User, Plus, LogOut, Search, GraduationCap, MapPin, Check, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const AGE_GROUPS = ['5-8 years', '9-12 years', '13-17 years', '18+ years'];

const CenterDashboard = () => {
  const { user, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('today');

  const [newDemo, setNewDemo] = useState({
    name: '',
    phone: '',
    email: '',
    age_group: '',
    skill: '',
    demo_date: null,
    demo_time: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.role !== 'center_user') {
      navigate('/admin/login');
      return;
    }
    fetchDemos();
  }, [user, navigate]);

  const fetchDemos = async () => {
    try {
      const response = await axios.get(`${API}/center/demos`, {
        headers: getAuthHeaders()
      });
      setDemos(response.data);
    } catch (error) {
      console.error('Failed to fetch demos:', error);
      toast.error('Failed to fetch demos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDemo = async () => {
    if (!newDemo.name || !newDemo.phone) {
      toast.error('Please fill in name and phone');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/center/demos`, {
        name: newDemo.name,
        email: newDemo.email || `${newDemo.phone}@student.oll`,
        phone: newDemo.phone,
        age_group: newDemo.age_group,
        skill: newDemo.skill,
        demo_date: newDemo.demo_date ? format(newDemo.demo_date, 'yyyy-MM-dd') : null,
        demo_time: newDemo.demo_time,
        notes: newDemo.notes
      }, {
        headers: getAuthHeaders()
      });

      toast.success('Demo booking added!');
      setShowAddModal(false);
      setNewDemo({
        name: '',
        phone: '',
        email: '',
        age_group: '',
        skill: '',
        demo_date: null,
        demo_time: '',
        notes: ''
      });
      fetchDemos();
    } catch (error) {
      toast.error('Failed to add demo booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Filter demos
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const filteredDemos = demos.filter(demo => {
    const matchesSearch = !searchQuery || 
      demo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.phone?.includes(searchQuery);

    if (activeTab === 'today') {
      return matchesSearch && demo.demo_date === today;
    } else if (activeTab === 'tomorrow') {
      return matchesSearch && demo.demo_date === tomorrow;
    } else if (activeTab === 'upcoming') {
      return matchesSearch && demo.demo_date && demo.demo_date > tomorrow;
    } else {
      return matchesSearch && (!demo.demo_date || demo.demo_date < today);
    }
  });

  const getCounts = () => ({
    today: demos.filter(d => d.demo_date === today).length,
    tomorrow: demos.filter(d => d.demo_date === tomorrow).length,
    upcoming: demos.filter(d => d.demo_date && d.demo_date > tomorrow).length,
    unscheduled: demos.filter(d => !d.demo_date || d.demo_date < today).length
  });

  const counts = getCounts();

  if (user?.role !== 'center_user') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E3A5F] rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {user?.center_name || 'Center Dashboard'}
                </h1>
                <p className="text-xs text-slate-500">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-[#D63031] hover:bg-[#b52828] gap-2"
                data-testid="add-demo-btn"
              >
                <Plus className="w-4 h-4" />
                Quick Add Demo
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="text-slate-500">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div 
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${activeTab === 'today' ? 'border-[#D63031] shadow-md' : 'border-slate-100'}`}
            onClick={() => setActiveTab('today')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{counts.today}</p>
                <p className="text-xs text-slate-500">Today's Demos</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${activeTab === 'tomorrow' ? 'border-[#D63031] shadow-md' : 'border-slate-100'}`}
            onClick={() => setActiveTab('tomorrow')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{counts.tomorrow}</p>
                <p className="text-xs text-slate-500">Tomorrow</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${activeTab === 'upcoming' ? 'border-[#D63031] shadow-md' : 'border-slate-100'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{counts.upcoming}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${activeTab === 'unscheduled' ? 'border-[#D63031] shadow-md' : 'border-slate-100'}`}
            onClick={() => setActiveTab('unscheduled')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{counts.unscheduled}</p>
                <p className="text-xs text-slate-500">Unscheduled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Demos List */}
        <div className="bg-white rounded-xl border border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#1E3A5F] capitalize">
              {activeTab === 'today' ? "Today's Demos" : 
               activeTab === 'tomorrow' ? "Tomorrow's Demos" : 
               activeTab === 'upcoming' ? "Upcoming Demos" : "Unscheduled Leads"}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
            </div>
          ) : filteredDemos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No demos found
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDemos.map((demo) => (
                <div key={demo.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[#1E3A5F]">{demo.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {demo.phone}
                          </span>
                          {demo.skill && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {demo.skill}
                            </span>
                          )}
                          {demo.age_group && (
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                              {demo.age_group}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {demo.demo_date && demo.demo_time ? (
                        <div className={`text-sm font-medium ${isToday(parseISO(demo.demo_date)) ? 'text-green-600' : 'text-[#1E3A5F]'}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {demo.demo_date}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <Clock className="w-3 h-3" />
                            {demo.demo_time}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Not Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                  {demo.notes && (
                    <p className="text-xs text-slate-400 mt-2 ml-13 pl-10">{demo.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Demo Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D63031]" />
              Quick Add Demo Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  placeholder="Student name"
                  value={newDemo.name}
                  onChange={(e) => setNewDemo({...newDemo, name: e.target.value})}
                  data-testid="demo-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newDemo.phone}
                  onChange={(e) => setNewDemo({...newDemo, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  data-testid="demo-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age Group</label>
                <Select value={newDemo.age_group} onValueChange={(v) => setNewDemo({...newDemo, age_group: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skill Interest</label>
                <Select value={newDemo.skill} onValueChange={(v) => setNewDemo({...newDemo, skill: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILLS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Demo Date & Time</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-2">
                  <CalendarComponent
                    mode="single"
                    selected={newDemo.demo_date}
                    onSelect={(date) => setNewDemo({...newDemo, demo_date: date})}
                    disabled={(date) => date < new Date()}
                    className="rounded-md scale-90 origin-top-left"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Select Time</p>
                  <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setNewDemo({...newDemo, demo_time: time})}
                        className={`py-2 px-2 rounded-lg text-sm font-medium border transition-all ${
                          newDemo.demo_time === time
                            ? 'border-[#D63031] bg-[#D63031] text-white'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                placeholder="Any additional notes..."
                value={newDemo.notes}
                onChange={(e) => setNewDemo({...newDemo, notes: e.target.value})}
                className="min-h-[60px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleAddDemo} 
                disabled={submitting}
                className="flex-1 bg-[#D63031] hover:bg-[#b52828]"
                data-testid="submit-demo"
              >
                {submitting ? 'Adding...' : 'Add Demo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CenterDashboard;
