import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Database, Users, Building2, GraduationCap, 
  Filter, Download, Eye, Phone, Mail, MapPin, 
  ChevronDown, X, RefreshCw
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUSES = {
  students: ['new', 'demo_scheduled', 'demo_completed', 'converted', 'archived', 'rescheduled'],
  schools: ['new', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'negotiation', 'converted', 'archived'],
  educators: ['new', 'demo_scheduled', 'demo_completed', 'onboarding', 'onboarded', 'active', 'archived'],
};

const AGE_GROUPS = ['6-8 years', '9-12 years', '13-16 years', '17+ years'];
const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'State Board', 'IB'];
const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

const StatusBadge = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-700',
    demo_scheduled: 'bg-purple-100 text-purple-700',
    demo_completed: 'bg-indigo-100 text-indigo-700',
    meeting_scheduled: 'bg-purple-100 text-purple-700',
    meeting_done: 'bg-indigo-100 text-indigo-700',
    converted: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
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

const DataCard = ({ item, type, onClick }) => {
  const getIcon = () => {
    if (type === 'student') return <Users className="w-5 h-5 text-blue-500" />;
    if (type === 'school') return <Building2 className="w-5 h-5 text-purple-500" />;
    return <GraduationCap className="w-5 h-5 text-orange-500" />;
  };

  const getName = () => {
    if (type === 'school') return item.school_name || item.contact_name;
    return item.name;
  };

  return (
    <div 
      className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <p className="font-medium text-[#1E3A5F]">{getName()}</p>
            <p className="text-xs text-slate-500 capitalize">{type}</p>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      
      <div className="space-y-1 text-sm">
        {item.phone && (
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-3 h-3" />
            <span>{item.phone}</span>
          </div>
        )}
        {item.email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-3 h-3" />
            <span className="truncate">{item.email}</span>
          </div>
        )}
        {(item.city || item.location) && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3 h-3" />
            <span>{item.city || item.location}</span>
          </div>
        )}
      </div>
      
      {item.skill && (
        <div className="mt-2 pt-2 border-t border-slate-50">
          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{item.skill}</span>
        </div>
      )}
      {item.board && (
        <div className="mt-2 pt-2 border-t border-slate-50">
          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">{item.board}</span>
        </div>
      )}
    </div>
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
  const [boardFilter, setBoardFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [results, setResults] = useState({ students: [], schools: [], educators: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (dataType !== 'all') params.append('data_type', dataType);
      if (statusFilter) params.append('status', statusFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (ageFilter) params.append('age_group', ageFilter);
      if (boardFilter) params.append('board', boardFilter);
      if (skillFilter) params.append('skill', skillFilter);
      
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
  }, [searchQuery, dataType, statusFilter, cityFilter, ageFilter, boardFilter, skillFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDataType('all');
    setStatusFilter('');
    setCityFilter('');
    setAgeFilter('');
    setBoardFilter('');
    setSkillFilter('');
  };

  const hasActiveFilters = statusFilter || cityFilter || ageFilter || boardFilter || skillFilter;

  const exportToCSV = () => {
    const allData = [
      ...results.students.map(s => ({ ...s, type: 'student' })),
      ...results.schools.map(s => ({ ...s, type: 'school' })),
      ...results.educators.map(e => ({ ...e, type: 'educator' })),
    ];
    
    if (allData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Type', 'Name', 'Phone', 'Email', 'City', 'Status', 'Created At'];
    const rows = allData.map(item => [
      item.type,
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

  return (
    <AdminLayout title="Data Center">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totals?.students || 0}</p>
              </div>
              <Users className="w-10 h-10 text-blue-200" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.students || {}).slice(0, 4).map(([status, count]) => (
                <span key={status} className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Schools</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totals?.schools || 0}</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-200" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.schools || {}).slice(0, 4).map(([status, count]) => (
                <span key={status} className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Educators</p>
                <p className="text-3xl font-bold text-orange-600">{stats.totals?.educators || 0}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-orange-200" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(stats.by_status?.educators || {}).slice(0, 4).map(([status, count]) => (
                <span key={status} className="text-xs px-2 py-0.5 bg-slate-100 rounded">
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
          
          {/* Data Type Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {['all', 'students', 'schools', 'educators'].map(type => (
              <button
                key={type}
                onClick={() => setDataType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  dataType === type
                    ? 'bg-white text-[#1E3A5F] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
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
              
              {dataType !== 'schools' && (
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
              
              {dataType !== 'educators' && (
                <select
                  value={boardFilter}
                  onChange={(e) => setBoardFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="">All Boards</option>
                  {BOARDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
              
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

      {/* Results */}
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
          
          {results.total === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No results found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Students */}
              {results.students.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Students ({results.students.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.students.map(item => (
                      <DataCard key={item.id} item={item} type="student" onClick={() => setViewItem({ ...item, _type: 'student' })} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Schools */}
              {results.schools.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    Schools ({results.schools.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.schools.map(item => (
                      <DataCard key={item.id} item={item} type="school" onClick={() => setViewItem({ ...item, _type: 'school' })} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Educators */}
              {results.educators.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-orange-500" />
                    Educators ({results.educators.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.educators.map(item => (
                      <DataCard key={item.id} item={item} type="educator" onClick={() => setViewItem({ ...item, _type: 'educator' })} />
                    ))}
                  </div>
                </div>
              )}
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
                  <h3 className="text-xl font-semibold text-[#1E3A5F]">
                    {viewItem.name || viewItem.school_name || viewItem.contact_name}
                  </h3>
                  <StatusBadge status={viewItem.status} />
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
    </AdminLayout>
  );
};

export default AdminDataCenter;
