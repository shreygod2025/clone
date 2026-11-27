import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Mail, Clock, User, Building2, MessageSquare, AlertCircle, CreditCard, Wrench, HelpCircle, ThumbsUp } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUERY_TYPES = [
  { value: 'demo_related', label: 'Demo Related', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  { value: 'payment', label: 'Payment', icon: CreditCard, color: 'bg-green-100 text-green-700' },
  { value: 'course_info', label: 'Course Info', icon: HelpCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'technical', label: 'Technical', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
  { value: 'partnership', label: 'Partnership', icon: Building2, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'feedback', label: 'Feedback', icon: ThumbsUp, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'other', label: 'Other', icon: AlertCircle, color: 'bg-slate-100 text-slate-700' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-100 text-slate-600' },
];

const INQUIRY_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'school', label: 'School' },
  { value: 'growth_partner', label: 'Growth Partner' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'team', label: 'Team' },
];

const AdminInquiryQueries = () => {
  const { getAuthHeaders } = useAuth();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [queryTypeFilter, setQueryTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewQuery, setViewQuery] = useState(null);

  useEffect(() => {
    fetchQueries();
  }, [queryTypeFilter, statusFilter]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      let url = `${API}/inquiry/queries`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: getAuthHeaders()
      });
      setQueries(response.data);
    } catch (error) {
      toast.error('Failed to fetch queries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (queryId, newStatus) => {
    try {
      await axios.patch(`${API}/inquiry/queries/${queryId}`, { status: newStatus }, {
        headers: getAuthHeaders()
      });
      toast.success('Status updated');
      fetchQueries();
      setViewQuery(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getQueryTypeBadge = (type) => {
    const typeObj = QUERY_TYPES.find(t => t.value === type) || QUERY_TYPES[6];
    return <span className={`badge-status ${typeObj.color}`}>{typeObj.label}</span>;
  };

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  const filteredQueries = queries.filter(query => {
    if (queryTypeFilter && query.query_type !== queryTypeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      query.name?.toLowerCase().includes(q) ||
      query.phone?.includes(q) ||
      query.email?.toLowerCase().includes(q) ||
      query.query_details?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title="Support Queries">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-queries"
          />
        </div>
        <select
          value={queryTypeFilter}
          onChange={(e) => setQueryTypeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="query-type-filter"
        >
          <option value="">All Query Types</option>
          {QUERY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="status-filter"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STATUS_OPTIONS.map(status => {
          const count = queries.filter(q => q.status === status.value).length;
          return (
            <div 
              key={status.value}
              className={`bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === status.value ? 'ring-2 ring-[#D63031]' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status.value ? '' : status.value)}
            >
              <p className="text-2xl font-bold text-[#1E3A5F]">{count}</p>
              <p className="text-sm text-slate-500">{status.label}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No queries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueries.map((query) => (
            <div 
              key={query.id} 
              className="bg-white rounded-2xl border border-slate-100 p-6"
              data-testid={`query-card-${query.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {getStatusBadge(query.status)}
                  {getQueryTypeBadge(query.query_type)}
                  <span className="text-sm text-slate-500 capitalize">
                    {INQUIRY_TYPES.find(t => t.value === query.inquiry_type)?.label || query.inquiry_type}
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  {query.created_at ? format(new Date(query.created_at), 'MMM d, yyyy h:mm a') : '-'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4 text-slate-400" />
                    {query.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {query.phone}
                  </span>
                  {query.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {query.email}
                    </span>
                  )}
                </div>
              </div>

              {query.query_details && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-slate-600">{query.query_details}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(status => (
                  <Button
                    key={status.value}
                    size="sm"
                    variant={query.status === status.value ? 'default' : 'outline'}
                    className={query.status === status.value ? 'bg-[#1E3A5F]' : ''}
                    onClick={() => updateStatus(query.id, status.value)}
                    data-testid={`query-${query.id}-status-${status.value}`}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInquiryQueries;
