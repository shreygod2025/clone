/**
 * AccessDenied — shown when a signed-in user tries to open an admin route
 * their role isn't allowed to view (from `ProtectedRoute` in App.js).
 * Prefer showing this over a silent redirect so the user understands why
 * they landed somewhere unexpected and can ask an admin for access.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from './AdminDashboard';
import { ShieldOff, ArrowLeft, LayoutDashboard, MessageSquareWarning } from 'lucide-react';

const AccessDenied = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const attempted = location.state?.attemptedPath || location.pathname;
  const permission = location.state?.permission;

  return (
    <AdminLayout title="Access Denied">
      <div
        className="max-w-2xl mx-auto pt-12 sm:pt-20 pb-12 px-4 text-center"
        data-testid="access-denied-page"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-rose-50 flex items-center justify-center mb-5">
          <ShieldOff className="w-10 h-10 text-rose-500" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#0F1E33] mb-2">
          You don&apos;t have access to this page
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mb-1">
          Your current role doesn&apos;t include permission to view
          <span className="mx-1 font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            {attempted}
          </span>
          .
        </p>
        <p className="text-slate-400 text-xs mt-3">
          Signed in as <span className="font-semibold text-slate-600">{user?.email}</span>
          {user?.role ? <> · role <span className="font-mono">{user.role}</span></> : null}
          {permission ? <> · needs <span className="font-mono">{permission}</span></> : null}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
            data-testid="access-denied-back-btn"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold text-sm"
            data-testid="access-denied-dashboard-btn"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
          </button>
        </div>

        <div className="mt-10 max-w-md mx-auto bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left flex gap-3">
          <MessageSquareWarning className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <b>Need access?</b> Ask an admin to add the required permission to
            your role from <span className="font-mono">Users &amp; Roles</span>.
            They can grant either the full section or just a sub-permission
            (e.g. <span className="font-mono">expenses.list</span>).
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AccessDenied;
