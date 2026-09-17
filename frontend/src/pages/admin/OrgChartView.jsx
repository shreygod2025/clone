/**
 * OrgChartView — tree visualization of the "reports_to" relationships across
 * the team. Rendered as a third tab inside `/admin/users` alongside Users and
 * Roles. Clicking any node opens a right-side drawer with the selected
 * member's monthly salary, assigned KPIs and a jump-in "View Performance"
 * button that routes to `/admin/users/:id/performance`.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User as UserIcon, X, ChevronDown, ChevronRight, IndianRupee,
  Award, ArrowUpRight, Building2, Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Palette — used to tint each department/level for quick visual scanning.
const DEPT_TINT = [
  { bg: 'from-blue-50 to-blue-100',    ring: 'ring-blue-300',    dot: 'bg-blue-500' },
  { bg: 'from-purple-50 to-purple-100', ring: 'ring-purple-300', dot: 'bg-purple-500' },
  { bg: 'from-emerald-50 to-emerald-100', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'from-amber-50 to-amber-100',  ring: 'ring-amber-300',  dot: 'bg-amber-500' },
  { bg: 'from-rose-50 to-rose-100',    ring: 'ring-rose-300',   dot: 'bg-rose-500' },
];

const formatINR = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// Recursive tree builder: given the flat user list, group children under each parent.
const buildTree = (users) => {
  const byId = new Map(users.map((u) => [u.id, { ...u, children: [] }]));
  const roots = [];
  byId.forEach((node) => {
    const parentId = node.reports_to;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(node);
    } else {
      roots.push(node); // top-level (no manager)
    }
  });
  // Deterministic ordering: role name, then full name.
  const sortRec = (arr) => {
    arr.sort((a, b) => (a.role_id || '').localeCompare(b.role_id || '') || (a.name || '').localeCompare(b.name || ''));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};

const initialsOf = (name) => (name || '?')
  .trim()
  .split(/\s+/)
  .map((p) => p[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

const OrgNode = ({ node, depth, roles, onSelect, expanded, toggle }) => {
  const isOpen = expanded[node.id] !== false; // default expanded
  const tint = DEPT_TINT[depth % DEPT_TINT.length];
  const role = roles.find((r) => r.id === node.role_id) || roles.find((r) => r.name === node.role);
  const hasChildren = node.children.length > 0;
  const displayName = node.name || node.full_name || node.email;

  return (
    <li className="relative">
      <div className="flex items-start gap-3 py-2">
        <button
          type="button"
          onClick={() => hasChildren && toggle(node.id)}
          aria-label={hasChildren ? (isOpen ? 'Collapse team' : 'Expand team') : undefined}
          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
            hasChildren ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'text-transparent'
          }`}
          data-testid={`org-node-toggle-${node.id}`}
        >
          {hasChildren && (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>

        <button
          type="button"
          onClick={() => onSelect(node)}
          className={`group flex-1 text-left px-3 py-2.5 rounded-xl bg-gradient-to-br ${tint.bg} ring-1 ${tint.ring} hover:shadow-lg hover:-translate-y-[1px] transition-all`}
          data-testid={`org-node-${node.id}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${tint.dot} text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>
              {initialsOf(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 truncate">{displayName}</span>
                {hasChildren && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    · {node.children.length} report{node.children.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 truncate">
                {role?.name || role?.description || node.role || 'Team member'}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 flex-shrink-0" />
          </div>
        </button>
      </div>

      {hasChildren && isOpen && (
        <ul className="pl-6 ml-[22px] border-l border-dashed border-slate-300 space-y-0">
          {node.children.map((child) => (
            /* Recursion is done via a plain helper (not JSX self-reference)
               so the visual-edits babel plugin doesn't loop on the binding. */
            renderOrgNode({ node: child, depth: depth + 1, roles, onSelect, expanded, toggle })
          ))}
        </ul>
      )}
    </li>
  );
};

// Plain-function wrapper — lowercase name so the visual-edits plugin's
// component-binding walker treats it as a helper, not a React component.
const renderOrgNode = (props) => (
  <OrgNode key={props.node.id} {...props} />
);

const OrgDetailDrawer = ({ user, roles, onClose }) => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [salary, setSalary] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(true);

  const role = roles.find((r) => r.id === user?.role_id) || roles.find((r) => r.name === user?.role);
  const kpiCount = (role?.kpis || []).length;
  const displayName = user?.name || user?.full_name || user?.email;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoadingSalary(true);
    axios
      .get(`${API}/salaries?user_id=${user.id}&limit=1`, { headers: getAuthHeaders() })
      .then(({ data }) => { if (!cancelled) setSalary(Array.isArray(data) && data.length ? data[0] : null); })
      .catch(() => { if (!cancelled) setSalary(null); })
      .finally(() => { if (!cancelled) setLoadingSalary(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;

  const goPerformance = () => {
    navigate(`/admin/users/${user.id}/performance`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
      data-testid="org-detail-drawer"
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-br from-[#0A1F44] to-[#1E3A5F] text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center font-bold flex-shrink-0">
                {initialsOf(displayName)}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold truncate">{displayName}</div>
                <div className="text-sm text-white/70 truncate">{role?.name || role?.description || user.role || 'Team member'}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              data-testid="org-drawer-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/15">
              <UserIcon className="w-3 h-3" /> {user.email}
            </span>
            {user.reports_to_name && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/15">
                <Building2 className="w-3 h-3" /> Reports to {user.reports_to_name}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Salary */}
          <section data-testid="org-drawer-salary">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <IndianRupee className="w-3.5 h-3.5" /> Monthly Salary
            </div>
            {loadingSalary ? (
              <div className="mt-2 h-9 w-40 bg-slate-100 rounded animate-pulse" />
            ) : salary ? (
              <>
                <div className="mt-1 text-3xl font-black text-[#0A1F44]">
                  {formatINR(salary.net_paid ?? salary.base_salary)}
                </div>
                <div className="text-xs text-slate-500">
                  Latest record · {salary.month || '—'}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base</div>
                    <div className="text-sm font-bold text-slate-800">{formatINR(salary.base_salary)}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Incentive</div>
                    <div className="text-sm font-bold text-emerald-800">{formatINR(salary.incentive)}</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 border border-rose-100 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Deduction</div>
                    <div className="text-sm font-bold text-rose-800">{formatINR(salary.deduction)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-slate-500 italic">No salary record yet</div>
            )}
          </section>

          {/* KPIs */}
          <section data-testid="org-drawer-kpis">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Award className="w-3.5 h-3.5" /> KPIs assigned via role · {kpiCount}
            </div>
            {kpiCount === 0 ? (
              <div className="mt-1 text-sm text-slate-500 italic">No KPIs assigned to this role yet</div>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {(role.kpis || []).map((kpi, i) => (
                  <li
                    key={typeof kpi === 'string' ? kpi : kpi.id || i}
                    className="text-sm text-slate-700 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    {typeof kpi === 'string' ? kpi : (kpi.label || kpi.name || kpi.id)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* View Performance CTA */}
          <button
            onClick={goPerformance}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#DC2626] text-white font-semibold hover:bg-[#B91C1C] transition"
            data-testid="org-drawer-performance-btn"
          >
            View Performance <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function OrgChartView({ users, roles }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');

  // Attach reports_to_name so the drawer can show it without extra lookups.
  const enriched = useMemo(() => {
    const nameById = new Map(users.map((u) => [u.id, u.name || u.full_name || u.email]));
    return users.map((u) => ({ ...u, reports_to_name: nameById.get(u.reports_to) }));
  }, [users]);

  const roots = useMemo(() => buildTree(enriched), [enriched]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: prev[id] === false }));
  const expandAll = () => setExpanded({});   // default = expanded
  const collapseAll = () => {
    const all = {};
    enriched.forEach((u) => { all[u.id] = false; });
    setExpanded(all);
  };

  // Search — highlight matching nodes (still show the tree unchanged so the
  // parent chain stays readable).
  const q = search.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q) return null;
    return new Set(
      enriched
        .filter((u) => (u.name || u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q))
        .map((u) => u.id),
    );
  }, [enriched, q]);

  useEffect(() => {
    if (matchIds && matchIds.size === 0) toast.message('No team member matches your search');
  }, [matchIds]);

  return (
    <div className="space-y-4" data-testid="org-chart-view">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or role..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40 focus:border-[#DC2626]"
            data-testid="org-search"
          />
        </div>
        <button
          onClick={expandAll}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          data-testid="org-expand-all"
        >
          Expand all
        </button>
        <button
          onClick={collapseAll}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          data-testid="org-collapse-all"
        >
          Collapse all
        </button>
      </div>

      {roots.length === 0 ? (
        <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
          No team members yet — add users under the "Users" tab and set a "Reports to" manager to build the tree.
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <ul className="space-y-0">
            {roots.map((root) => (
              <div
                key={root.id}
                className={matchIds && !matchIds.has(root.id) ? 'opacity-40' : ''}
              >
                {renderOrgNode({
                  node: root,
                  depth: 0,
                  roles,
                  onSelect: setSelected,
                  expanded,
                  toggle,
                })}
              </div>
            ))}
          </ul>
        </div>
      )}

      {selected && <OrgDetailDrawer user={selected} roles={roles} onClose={() => setSelected(null)} />}
    </div>
  );
}
