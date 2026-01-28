import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, User, Mail, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-100 text-slate-600' },
];

const USER_TYPE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'educator', label: 'Educator' },
  { value: 'school', label: 'School' },
  { value: 'parent', label: 'Parent' },
];

const AdminSupport = () => {
  const { getAuthHeaders } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, userTypeFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (userTypeFilter) params.append('user_type', userTypeFilter);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await axios.get(`${API}/support/tickets${queryString}`, {
        headers: getAuthHeaders()
      });
      setTickets(response.data);
    } catch (error) {
      toast.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await axios.patch(`${API}/support/tickets/${ticketId}?status=${newStatus}`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Status updated');
      fetchTickets();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  return (
    <AdminLayout title="Support Tickets">
      {/* Filters */}
      <div className="flex gap-4 mb-6">
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
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="user-type-filter"
        >
          <option value="">All User Types</option>
          {USER_TYPE_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No support tickets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="bg-white rounded-2xl border border-slate-100 p-6"
              data-testid={`ticket-${ticket.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(ticket.status)}
                    <span className="text-sm text-slate-500 capitalize">
                      {ticket.user_type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">
                    {ticket.subject || 'No Subject'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" /> {ticket.name}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {ticket.email}
                </span>
              </div>

              <p className="text-slate-600 bg-slate-50 rounded-xl p-4 mb-4">
                {ticket.message}
              </p>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter(s => s.value !== ticket.status).map(status => (
                  <Button
                    key={status.value}
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(ticket.id, status.value)}
                    data-testid={`set-status-${status.value}-${ticket.id}`}
                  >
                    Mark as {status.label}
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

export default AdminSupport;
