import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Database, Users, Building2, GraduationCap, 
  Filter, Download, Eye, Phone, Mail, MapPin, 
  X, RefreshCw, UserCog, TrendingUp, Edit, Trash2
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUSES = {
  students: ['new', 'demo_scheduled', 'demo_completed', 'converted', 'archived', 'rescheduled'],
  schools: ['new', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'negotiation', 'converted', 'active', 'renewed', 'lost', 'archived'],
  educators: ['new', 'demo_scheduled', 'demo_completed', 'onboarding', 'onboarded', 'active', 'archived'],
  team: ['active', 'inactive'],
  growth_partners: ['new', 'active', 'inactive', 'archived'],
};

const AGE_GROUPS = ['6-8 years', '9-12 years', '13-16 years', '17+ years'];
const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
const FEE_RANGES = ['Under 50k', '50k-1L', '1L-2L', '2L-5L', 'Above 5L'];
const STUDENT_COUNTS = ['Under 500', '500-1000', '1000-2000', '2000-5000', 'Above 5000'];
const AVAILABILITY = ['Full Time', 'Part Time', 'Weekends Only', 'Evenings Only'];

const StatusBadge = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-700',
    demo_scheduled: 'bg-purple-100 text-purple-700',
    demo_completed: 'bg-indigo-100 text-indigo-700',
    meeting_scheduled: 'bg-purple-100 text-purple-700',
    meeting_done: 'bg-indigo-100 text-indigo-700',
    converted: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
    renewed: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-700',
    onboarded: 'bg-green-100 text-green-700',
    onboarding: 'bg-orange-100 text-orange-700',
    archived: 'bg-slate-100 text-slate-700',
    rescheduled: 'bg-yellow-100 text-yellow-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const config = {
    student: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Users },
    school: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Building2 },
    educator: { bg: 'bg-orange-50', text: 'text-orange-700', icon: GraduationCap },
    team: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: UserCog },
    growth_partner: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: TrendingUp },
  };
  const { bg, text, icon: Icon } = config[type] || config.student;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {type?.replace(/_/g, ' ')}
    </span>
  );
};

const AdminDataCenter = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataType, setDataType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [feeRangeFilter, setFeeRangeFilter] = useState('');
  const [studentCountFilter, setStudentCountFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [results, setResults] = useState({ students: [], schools: [], educators: [], team: [], growth_partners: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  
  // Edit and Delete states
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Delete handler
  const handleDelete = async (item, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/data-center/${type}/${item.id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Record deleted successfully');
      fetchData();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    }
  };

  // Edit handler
  const handleEdit = async () => {
    if (!editItem) return;
    try {
      await axios.put(`${API}/data-center/${editItem._type}/${editItem.id}`, editForm, {
        headers: getAuthHeaders()
      });
      toast.success('Record updated successfully');
      setEditItem(null);
      setEditForm({});
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update record');
    }
  };

  // Open edit modal
  const openEditModal = (item, type) => {
    setEditItem({ ...item, _type: type });
    setEditForm({ ...item });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (dataType !== 'all') params.append('data_type', dataType);
      if (statusFilter) params.append('status', statusFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (ageFilter && dataType === 'students') params.append('age_group', ageFilter);
      if (skillFilter) params.append('skill', skillFilter);
      if (feeRangeFilter && dataType === 'schools') params.append('fee_range', feeRangeFilter);
      if (studentCountFilter && dataType === 'schools') params.append('student_count', studentCountFilter);
      if (availabilityFilter && dataType === 'educators') params.append('availability', availabilityFilter);
      
      const response = await axios.get(`${API}/data-center/search?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      setResults(response.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/data-center/stats`, {
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, dataType, statusFilter, cityFilter, ageFilter, skillFilter, feeRangeFilter, studentCountFilter, availabilityFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDataType('all');
    setStatusFilter('');
    setCityFilter('');
    setAgeFilter('');
    setSkillFilter('');
    setFeeRangeFilter('');
    setStudentCountFilter('');
    setAvailabilityFilter('');
  };

  const hasActiveFilters = statusFilter || cityFilter || ageFilter || skillFilter || feeRangeFilter || studentCountFilter || availabilityFilter;

  // Combine all results into a single list
  const allItems = [
    ...results.students.map(s => ({ ...s, _type: 'student' })),
    ...results.schools.map(s => ({ ...s, _type: 'school' })),
    ...results.educators.map(e => ({ ...e, _type: 'educator' })),
    ...(results.team || []).map(t => ({ ...t, _type: 'team' })),
    ...(results.growth_partners || []).map(g => ({ ...g, _type: 'growth_partner' })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const exportToCSV = () => {
    if (allItems.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Type', 'Name', 'Phone', 'Email', 'City', 'Status', 'Created At'];
    const rows = allItems.map(item => [
      item._type,
      item.name || item.school_name || item.contact_name,
      item.phone,
      item.email,
      item.city || item.location,
      item.status,
      item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd') : '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-center-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Data exported successfully');
  };

  const getName = (item) => {
    if (item._type === 'school') return item.school_name || item.contact_name;
    return item.name;
  };

  return (
    <AdminLayout title="Data Center">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Students</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totals?.students || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.students || {}).slice(0, 3).map(([status, count]) => (
                <span key={status} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Schools</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totals?.schools || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-200" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.schools || {}).slice(0, 3).map(([status, count]) => (
                <span key={status} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Educators</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totals?.educators || 0}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-orange-200" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.educators || {}).slice(0, 3).map(([status, count]) => (
                <span key={status} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Team</p>
                <p className="text-2xl font-bold text-cyan-600">{stats.totals?.team || 0}</p>
              </div>
              <UserCog className="w-8 h-8 text-cyan-200" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.team || {}).map(([status, count]) => (
                <span key={status} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Growth Partners</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.totals?.growth_partners || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-200" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.growth_partners || {}).slice(0, 3).map(([status, count]) => (
                <span key={status} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              data-testid="data-center-search"
            />
          </div>
          
          {/* Data Type Filter */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm font-medium"
          >
            <option value="all">All Types</option>
            <option value="students">Students</option>
            <option value="schools">Schools</option>
            <option value="educators">Educators</option>
            <option value="team">Team</option>
            <option value="growth_partners">Growth Partners</option>
          </select>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-[#D63031] text-[#D63031]' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-[#D63031]" />}
          </Button>
          
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={() => { fetchData(); fetchStats(); }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value="">All Statuses</option>
                {(STATUSES[dataType] || [...new Set([...STATUSES.students, ...STATUSES.schools, ...STATUSES.educators])]).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value="">All Cities</option>
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              {/* Age filter - ONLY for students */}
              {dataType === 'students' && (
                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Ages</option>
                  {AGE_GROUPS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
              
              {/* Fee Range filter - ONLY for schools */}
              {dataType === 'schools' && (
                <select
                  value={feeRangeFilter}
                  onChange={(e) => setFeeRangeFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Fee Ranges</option>
                  {FEE_RANGES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
              
              {/* Student Count filter - ONLY for schools */}
              {dataType === 'schools' && (
                <select
                  value={studentCountFilter}
                  onChange={(e) => setStudentCountFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Student Counts</option>
                  {STUDENT_COUNTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              
              {/* Availability filter - ONLY for educators */}
              {dataType === 'educators' && (
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Availability</option>
                  {AVAILABILITY.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
              
              {/* Skill filter - for students and educators */}
              {(dataType === 'students' || dataType === 'educators' || dataType === 'all') && (
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Skills</option>
                  {SKILLS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                  <X className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results - Unified List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
          <p className="text-slate-500 mt-3">Searching...</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            Found {results.total} results
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          
          {allItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No results found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-1">Type</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-2">City</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Date</div>
                <div className="col-span-1">Action</div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {allItems.map((item, idx) => (
                  <div 
                    key={`${item._type}-${item.id || idx}`} 
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors"
                  >
                    <div className="col-span-1">
                      <TypeBadge type={item._type} />
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium text-slate-900 truncate">{getName(item)}</p>
                      {item.email && <p className="text-xs text-slate-500 truncate">{item.email}</p>}
                    </div>
                    <div className="col-span-2 text-sm text-slate-600">{item.phone}</div>
                    <div className="col-span-2 text-sm text-slate-600">{item.city || item.location || '-'}</div>
                    <div className="col-span-2">
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="col-span-1 text-xs text-slate-500">
                      {item.created_at ? format(new Date(item.created_at), 'MMM d') : '-'}
                    </div>
                    <div className="col-span-1 flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setViewItem(item)}
                        className="p-2"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(item, dataType === 'all' ? (item._type || 'students') : dataType)}
                        className="p-2"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(item, dataType === 'all' ? (item._type || 'students') : dataType)}
                        className="p-2"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* View Detail Modal */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#1E3A5F]" />
              {viewItem?._type === 'student' && 'Student Details'}
              {viewItem?._type === 'school' && 'School Details'}
              {viewItem?._type === 'educator' && 'Educator Details'}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  {viewItem._type === 'student' && <Users className="w-8 h-8 text-blue-500" />}
                  {viewItem._type === 'school' && <Building2 className="w-8 h-8 text-purple-500" />}
                  {viewItem._type === 'educator' && <GraduationCap className="w-8 h-8 text-orange-500" />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1E3A5F]">{getName(viewItem)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <TypeBadge type={viewItem._type} />
                    <StatusBadge status={viewItem.status} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
                {viewItem.phone && (
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium">{viewItem.phone}</p>
                  </div>
                )}
                {viewItem.email && (
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-sm">{viewItem.email}</p>
                  </div>
                )}
                {(viewItem.city || viewItem.location) && (
                  <div>
                    <p className="text-xs text-slate-500">City/Location</p>
                    <p className="font-medium">{viewItem.city || viewItem.location}</p>
                  </div>
                )}
                {viewItem.age_group && (
                  <div>
                    <p className="text-xs text-slate-500">Age Group</p>
                    <p className="font-medium">{viewItem.age_group}</p>
                  </div>
                )}
                {viewItem.skill && (
                  <div>
                    <p className="text-xs text-slate-500">Skill Interest</p>
                    <p className="font-medium">{viewItem.skill}</p>
                  </div>
                )}
                {viewItem.board && (
                  <div>
                    <p className="text-xs text-slate-500">Board</p>
                    <p className="font-medium">{viewItem.board}</p>
                  </div>
                )}
                {viewItem.student_count && (
                  <div>
                    <p className="text-xs text-slate-500">Student Count</p>
                    <p className="font-medium">{viewItem.student_count}</p>
                  </div>
                )}
                {viewItem.skills && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Skills</p>
                    <p className="font-medium">{viewItem.skills}</p>
                  </div>
                )}
                {viewItem.created_at && (
                  <div>
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="font-medium">{format(new Date(viewItem.created_at), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setViewItem(null)} className="flex-1">
                  Close
                </Button>
                <Button 
                  className="flex-1 bg-[#1E3A5F]"
                  onClick={() => {
                    const path = viewItem._type === 'student' ? '/admin/students' : 
                                 viewItem._type === 'school' ? '/admin/schools' : '/admin/educators';
                    window.location.href = path;
                  }}
                >
                  Open in CRM
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editItem} onOpenChange={() => { setEditItem(null); setEditForm({}); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Record
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              {/* Common fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <Input
                    value={editForm.name || editForm.school_name || editForm.contact_name || ''}
                    onChange={(e) => {
                      if (editItem._type === 'schools') {
                        setEditForm({ ...editForm, school_name: e.target.value });
                      } else {
                        setEditForm({ ...editForm, name: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <Input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">City/Location</label>
                  <Input
                    value={editForm.city || editForm.location || ''}
                    onChange={(e) => {
                      if (editItem._type === 'schools') {
                        setEditForm({ ...editForm, location: e.target.value });
                      } else {
                        setEditForm({ ...editForm, city: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    {(STATUSES[editItem._type] || []).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type-specific fields */}
              {editItem._type === 'students' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Age Group</label>
                      <select
                        value={editForm.age_group || ''}
                        onChange={(e) => setEditForm({ ...editForm, age_group: e.target.value })}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select</option>
                        {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Skill</label>
                      <select
                        value={editForm.skill || ''}
                        onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select</option>
                        {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editItem._type === 'schools' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Board</label>
                      <Input
                        value={editForm.board || ''}
                        onChange={(e) => setEditForm({ ...editForm, board: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Student Count</label>
                      <Input
                        value={editForm.school_size || editForm.student_count || ''}
                        onChange={(e) => setEditForm({ ...editForm, school_size: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {editItem._type === 'educators' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Experience</label>
                    <Input
                      value={editForm.experience || ''}
                      onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea
                  value={editForm.notes || editForm.admin_notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { setEditItem(null); setEditForm({}); }} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleEdit} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDataCenter;
