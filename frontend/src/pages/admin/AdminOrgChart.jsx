/**
 * AdminOrgChart — dedicated admin page hosting the OrgChartView.
 * Route: /admin/org-chart. Split into its own page (rather than a tab in
 * AdminUsers) because AdminUsers.jsx already sits at the platform's JSX
 * traversal-depth ceiling for the visual-edits babel plugin.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import OrgChartView from './OrgChartView';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminOrgChart() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      axios.get(`${API}/team-users`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      axios.get(`${API}/roles`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
    ])
      .then(([u, r]) => {
        if (cancelled) return;
        setUsers(u.data || []);
        setRoles(r.data || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [getAuthHeaders]);

  return (
    <AdminLayout title="Organisation Chart">
      <div className="space-y-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#DC2626]"
          data-testid="org-back-to-users"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users &amp; Roles
        </button>
        <div>
          <h2 className="text-2xl font-black text-[#0A1F44]">Organisation Chart</h2>
          <p className="text-sm text-slate-500 mt-1">
            Reporting tree derived from each user's <code>Reports to</code> field. Click any team member to view their monthly salary, KPIs and performance.
          </p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">Loading team…</div>
        ) : (
          <OrgChartView users={users} roles={roles} />
        )}
      </div>
    </AdminLayout>
  );
}
