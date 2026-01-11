import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Mail, Clock, User, Briefcase, Building2, GraduationCap, Users, MapPin, FileText } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INQUIRY_TYPES = [
  { value: 'student', label: 'Student', icon: User, color: 'bg-blue-100 text-blue-700' },
  { value: 'school', label: 'School', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  { value: 'growth_partner', label: 'Growth Partner', icon: Briefcase, color: 'bg-green-100 text-green-700' },
  { value: 'teacher', label: 'Teacher', icon: GraduationCap, color: 'bg-orange-100 text-orange-700' },
  { value: 'team', label: 'Team', icon: Users, color: 'bg-slate-100 text-slate-700' },
];

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-100 text-slate-600' },
];

const AdminInquiryLeads = () => {
  const { getAuthHeaders } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewLead, setViewLead] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [typeFilter, statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `${API}/inquiry/leads`;
      const params = new URLSearchParams();
      if (typeFilter) params.append('inquiry_type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: getAuthHeaders()
      });
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (leadId, newStatus) => {
    try {
      await axios.patch(`${API}/inquiry/leads/${leadId}`, { status: newStatus }, {
        headers: getAuthHeaders()
      });
      toast.success('Status updated');
      fetchLeads();
      setViewLead(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getTypeBadge = (type) => {
    const typeObj = INQUIRY_TYPES.find(t => t.value === type) || INQUIRY_TYPES[0];
    return <span className={`badge-status ${typeObj.color}`}>{typeObj.label}</span>;
  };

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.phone?.includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.offering?.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout title="Inquiry Leads">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-leads"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="type-filter"
        >
          <option value="">All Types</option>
          {INQUIRY_TYPES.map(t => (
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {INQUIRY_TYPES.map(type => {
          const count = leads.filter(l => l.inquiry_type === type.value).length;
          const Icon = type.icon;
          return (
            <div 
              key={type.value}
              className={`bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:shadow-md transition-shadow ${typeFilter === type.value ? 'ring-2 ring-[#D63031]' : ''}`}
              onClick={() => setTypeFilter(typeFilter === type.value ? '' : type.value)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{count}</p>
                  <p className="text-xs text-slate-500">{type.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No leads found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Lead</th>
                  <th className="text-left p-4 font-medium text-slate-600">Type</th>
                  <th className="text-left p-4 font-medium text-slate-600">Offering</th>
                  <th className="text-left p-4 font-medium text-slate-600">City</th>
                  <th className="text-left p-4 font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 font-medium text-slate-600">Date</th>
                  <th className="text-left p-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`lead-row-${lead.id}`}>
                    <td className="p-4">
                      <div className="font-medium text-[#1E3A5F]">{lead.name}</div>
                      <div className="text-sm text-slate-500">{lead.phone}</div>
                    </td>
                    <td className="p-4">{getTypeBadge(lead.inquiry_type)}</td>
                    <td className="p-4 text-slate-600 capitalize">{lead.offering?.replace(/_/g, ' ') || '-'}</td>
                    <td className="p-4 text-slate-600">{lead.city || '-'}</td>
                    <td className="p-4">{getStatusBadge(lead.status)}</td>
                    <td className="p-4 text-slate-500 text-sm">
                      {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewLead(lead)}
                        data-testid={`view-lead-${lead.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      <Dialog open={!!viewLead} onOpenChange={() => setViewLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                {getTypeBadge(viewLead.inquiry_type)}
                {getStatusBadge(viewLead.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Name</label>
                  <p className="font-medium text-[#1E3A5F]">{viewLead.name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phone</label>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {viewLead.phone}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {viewLead.email || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">City</label>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {viewLead.city || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Offering</label>
                  <p className="font-medium capitalize">{viewLead.offering?.replace(/_/g, ' ') || '-'}</p>
                </div>
                {viewLead.details && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Details</label>
                    <p className="text-slate-600">{viewLead.details}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Source</label>
                  <p className="text-slate-600">{viewLead.source || 'team_inquiry_form'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Created</label>
                  <p className="text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {viewLead.created_at ? format(new Date(viewLead.created_at), 'PPpp') : '-'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="text-xs text-slate-500 mb-2 block">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <Button
                      key={status.value}
                      size="sm"
                      variant={viewLead.status === status.value ? 'default' : 'outline'}
                      className={viewLead.status === status.value ? 'bg-[#1E3A5F]' : ''}
                      onClick={() => updateStatus(viewLead.id, status.value)}
                      data-testid={`status-${status.value}`}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminInquiryLeads;
