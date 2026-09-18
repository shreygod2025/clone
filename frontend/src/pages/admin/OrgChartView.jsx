/**
 * OrgChartView — top-down organisation chart derived from each team_user's
 * `reports_to` link. Renders roots at the top with children fanning out
 * beneath, connected by classic org-chart connector lines (pure CSS).
 *
 * Clicking any node expands the card *in place* on the chart so the
 * selected member's Role, City, Monthly Salary, and KPIs are all visible
 * without leaving the diagram. The expanded card also exposes a "View
 * Performance" button that routes to `/admin/users/:id/performance`.
 *
 * Recursion note — the visual-edits Babel plugin trips on React components
 * that JSX-reference themselves, so children are rendered via the
 * lower-case helper `renderOrgNode` (a plain function), not through
 * <OrgNode> self-reference.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MapPin, IndianRupee, Award, ArrowUpRight, Search, ChevronDown, Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Palette per depth-level so each rung of the tree reads at a glance.
const LEVEL_TINT = [
  { header: 'bg-[#0A1F44] text-white',       ring: 'ring-[#0A1F44]/20',    dot: 'bg-[#0A1F44]' },
  { header: 'bg-[#DC2626] text-white',       ring: 'ring-[#DC2626]/25',    dot: 'bg-[#DC2626]' },
  { header: 'bg-[#F59E0B] text-white',       ring: 'ring-[#F59E0B]/25',    dot: 'bg-[#F59E0B]' },
  { header: 'bg-[#10B981] text-white',       ring: 'ring-[#10B981]/25',    dot: 'bg-[#10B981]' },
  { header: 'bg-[#7C3AED] text-white',       ring: 'ring-[#7C3AED]/25',    dot: 'bg-[#7C3AED]' },
  { header: 'bg-[#0EA5E9] text-white',       ring: 'ring-[#0EA5E9]/25',    dot: 'bg-[#0EA5E9]' },
];

const formatINR = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const initialsOf = (name) => (name || '?')
  .trim()
  .split(/\s+/)
  .map((p) => p[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

// Build the reports_to → children forest from a flat user list.
const buildTree = (users) => {
  const byId = new Map(users.map((u) => [u.id, { ...u, children: [] }]));
  const roots = [];
  byId.forEach((node) => {
    const parentId = node.reports_to;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr) => {
    arr.sort((a, b) => (a.role_id || '').localeCompare(b.role_id || '') || (a.name || '').localeCompare(b.name || ''));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};

// Inline expanded panel with salary / city / KPIs / role details.
const NodeDetails = ({ node, role, salary, loadingSalary, onPerformance }) => (
  <div className="mt-3 border-t border-slate-200 pt-3 text-left space-y-3" data-testid={`org-node-details-${node.id}`}>
    {/* Meta pills */}
    <div className="flex flex-wrap items-center gap-1.5">
      {node.city && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
          <MapPin className="w-3 h-3" /> {node.city}
        </span>
      )}
      {node.email && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium truncate max-w-[160px]">
          {node.email}
        </span>
      )}
    </div>

    {/* Salary */}
    <div data-testid={`org-node-salary-${node.id}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <IndianRupee className="w-3 h-3" /> Monthly Salary
      </div>
      {loadingSalary ? (
        <div className="mt-1 h-6 w-24 bg-slate-100 rounded animate-pulse" />
      ) : salary ? (
        <>
          <div className="text-xl font-black text-[#0A1F44] leading-tight">
            {formatINR(salary.net_paid ?? salary.base_salary)}
          </div>
          <div className="text-[10px] text-slate-500">Latest · {salary.month || '—'}</div>
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
            <div className="rounded bg-slate-50 border border-slate-100 py-1">
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Base</div>
              <div className="text-[11px] font-bold text-slate-800">{formatINR(salary.base_salary)}</div>
            </div>
            <div className="rounded bg-emerald-50 border border-emerald-100 py-1">
              <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Incentive</div>
              <div className="text-[11px] font-bold text-emerald-800">{formatINR(salary.incentive)}</div>
            </div>
            <div className="rounded bg-rose-50 border border-rose-100 py-1">
              <div className="text-[9px] font-bold uppercase tracking-wide text-rose-600">Deduction</div>
              <div className="text-[11px] font-bold text-rose-800">{formatINR(salary.deduction)}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-1 text-[11px] text-slate-500 italic">No salary record yet</div>
      )}
    </div>

    {/* Role details */}
    <div data-testid={`org-node-role-${node.id}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <Briefcase className="w-3 h-3" /> Role
      </div>
      <div className="text-sm font-semibold text-slate-900">{role?.name || node.role || 'Team member'}</div>
      {role?.description && <div className="text-[11px] text-slate-500 leading-snug">{role.description}</div>}
      {(role?.permissions || []).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(role.permissions || []).slice(0, 6).map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
              <ShieldCheck className="w-2.5 h-2.5" /> {p}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* KPIs */}
    <div data-testid={`org-node-kpis-${node.id}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <Award className="w-3 h-3" /> KPIs · {(role?.kpis || []).length}
      </div>
      {(role?.kpis || []).length === 0 ? (
        <div className="mt-0.5 text-[11px] text-slate-500 italic">No KPIs on this role yet</div>
      ) : (
        <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto pr-1">
          {(role.kpis || []).map((kpi, i) => (
            <li
              key={typeof kpi === 'string' ? kpi : (kpi.id || i)}
              className="text-[11px] text-slate-700 px-2 py-1 rounded bg-slate-50 border border-slate-100 leading-snug"
            >
              {typeof kpi === 'string' ? kpi.replace(/_/g, ' ') : (kpi.label || kpi.name || kpi.id)}
            </li>
          ))}
        </ul>
      )}
    </div>

    <button
      type="button"
      onClick={onPerformance}
      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition"
      data-testid={`org-node-performance-${node.id}`}
    >
      View Performance <ArrowUpRight className="w-3.5 h-3.5" />
    </button>
  </div>
);

// Individual chart node — a rounded card with a coloured role header on top
// and the member's name below. Highlights when selected and expands inline.
const OrgNode = ({ node, depth, roles, selectedId, onSelect, salaryFor, onPerformance }) => {
  const tint = LEVEL_TINT[depth % LEVEL_TINT.length];
  const role = roles.find((r) => r.id === node.role_id) || roles.find((r) => r.name === node.role);
  const displayName = node.name || node.full_name || node.email;
  const isSelected = selectedId === node.id;
  const { salary, loading } = salaryFor(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <li className="org-node" data-depth={depth}>
      <div
        className={`org-card ${isSelected ? 'org-card--selected' : ''} ${tint.ring} ring-1`}
        data-testid={`org-node-${node.id}`}
      >
        <button
          type="button"
          onClick={() => onSelect(isSelected ? null : node.id)}
          className="w-full text-left"
          aria-expanded={isSelected}
        >
          {/* Header — role label */}
          <div className={`px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-widest ${tint.header} rounded-t-lg`}>
            {(role?.name || node.role || 'Team').toString().toUpperCase()}
          </div>

          {/* Body — avatar + name */}
          <div className="px-3 pt-2.5 pb-3 flex items-center gap-2 bg-white rounded-b-lg">
            <div className={`w-9 h-9 flex-shrink-0 rounded-full ${tint.dot} text-white flex items-center justify-center font-bold text-[11px]`}>
              {initialsOf(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 truncate leading-tight">{displayName}</div>
              {node.city && (
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {node.city}
                </div>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isSelected && (
          <div className="px-3 pb-3 bg-white rounded-b-lg">
            <NodeDetails
              node={node}
              role={role}
              salary={salary}
              loadingSalary={loading}
              onPerformance={() => onPerformance(node.id)}
            />
          </div>
        )}
      </div>

      {hasChildren && (() => {
        // Group children by role_id — same-role siblings render as a vertical
        // stack so a manager with 6 relationship-managers takes one column
        // instead of six. Different-role groups still branch horizontally.
        const groups = [];
        const seenByRole = new Map();
        node.children.forEach((child) => {
          const roleKey = child.role_id || `__no_role__::${child.role || 'x'}`;
          if (seenByRole.has(roleKey)) {
            groups[seenByRole.get(roleKey)].push(child);
          } else {
            seenByRole.set(roleKey, groups.length);
            groups.push([child]);
          }
        });

        return (
          <ul className="org-children">
            {groups.map((group, gi) => {
              if (group.length === 1) {
                // Single child in this group — render as an ordinary tree node,
                // which itself carries the incoming connector via its <li>.
                return renderOrgNode({
                  node: group[0], depth: depth + 1, roles, selectedId, onSelect,
                  salaryFor, onPerformance,
                });
              }
              // Stack: outer <li.org-node> carries the connector from the parent,
              // inner nodes stack vertically with intra-stack connectors.
              return (
                <li className="org-node" data-depth={depth + 1} key={`group-${gi}-${group[0].id}`}>
                  <div className="org-role-stack" data-testid={`org-role-stack-${gi}`}>
                    {group.map((member) => (
                      <div key={member.id} className="org-role-stack-item">
                        {renderOrgNode({
                          node: member, depth: depth + 1, roles, selectedId, onSelect,
                          salaryFor, onPerformance,
                        })}
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        );
      })()}
    </li>
  );
};

// Helper (lowercase name → not treated as a component by the visual-edits
// babel plugin) so recursion doesn't trip the JSX-metadata walker.
const renderOrgNode = (props) => <OrgNode key={props.node.id} {...props} />;

export default function OrgChartView({ users, roles }) {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  // { [userId]: { salary, loading } }
  const [salaryCache, setSalaryCache] = useState({});

  const roots = useMemo(() => buildTree(users), [users]);

  const salaryFor = (userId) => salaryCache[userId] || { salary: null, loading: false };

  // Lazy-load salary when a node is opened for the first time.
  useEffect(() => {
    if (!selectedId) return;
    if (salaryCache[selectedId]) return;
    setSalaryCache((prev) => ({ ...prev, [selectedId]: { salary: null, loading: true } }));
    axios
      .get(`${API}/salaries?user_id=${selectedId}&limit=1`, { headers: getAuthHeaders() })
      .then(({ data }) => {
        setSalaryCache((prev) => ({
          ...prev,
          [selectedId]: { salary: Array.isArray(data) && data.length ? data[0] : null, loading: false },
        }));
      })
      .catch(() => {
        setSalaryCache((prev) => ({ ...prev, [selectedId]: { salary: null, loading: false } }));
      });
  }, [selectedId]);

  const onPerformance = (userId) => navigate(`/admin/users/${userId}/performance`);

  const q = search.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q) return null;
    return new Set(
      users
        .filter((u) => (u.name || u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q) ||
          (u.city || '').toLowerCase().includes(q))
        .map((u) => u.id),
    );
  }, [users, q]);

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
            placeholder="Search by name, email, city or role..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40 focus:border-[#DC2626]"
            data-testid="org-search"
          />
        </div>
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            data-testid="org-collapse-selected"
          >
            Collapse card
          </button>
        )}
      </div>

      {roots.length === 0 ? (
        <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
          No team members yet — add users under the "Users" tab and set a "Reports to" manager to build the tree.
        </div>
      ) : (
        <div
          className="p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 overflow-x-auto"
          data-testid="org-chart-canvas"
        >
          <ul className="org-tree">
            {roots.map((root) => (
              <li
                key={root.id}
                className={`org-root-wrap ${matchIds && !matchIds.has(root.id) ? 'opacity-40' : ''}`}
              >
                {renderOrgNode({
                  node: root,
                  depth: 0,
                  roles,
                  selectedId,
                  onSelect: setSelectedId,
                  salaryFor,
                  onPerformance,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
