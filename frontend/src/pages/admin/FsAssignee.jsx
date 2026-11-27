import { createContext, useContext, useState } from 'react';
import { UserCircle2, Lock, ChevronDown, Check, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';

// Shared assignee state for every Future Skills CRM table.
export const FsAssigneeContext = createContext({ assignees: [], me: null, isManager: false, assign: async () => {} });

export const entityForRow = (tab, row) => {
  if (tab === 'leads') return 'leads';
  if (tab === 'trials') return 'trials';
  if (tab === 'lost') return { lead: 'leads', trial: 'trials', customer: 'subscriptions' }[row.entity_type];
  return 'subscriptions';
};

const PickerList = ({ items, value, onPick, testPrefix }) => (
  <Command>
    <CommandInput placeholder="Search team…" data-testid={`${testPrefix}-search`} />
    <CommandList className="max-h-64">
      <CommandEmpty>No team member found.</CommandEmpty>
      <CommandGroup>
        {items.map((it) => (
          <CommandItem key={it.value || 'none'} value={`${it.label} ${it.sub || ''}`} onSelect={() => onPick(it.value)}
            data-testid={`${testPrefix}-option-${it.value || 'none'}`}>
            <Check className={`w-3.5 h-3.5 mr-1.5 ${value === it.value ? 'opacity-100' : 'opacity-0'}`} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{it.label}</div>
              {it.sub && <div className="text-[10px] text-slate-400 truncate">{it.sub}</div>}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  </Command>
);

const memberItems = (assignees, me) => assignees.map((a) => ({
  value: a.id,
  label: a.id === me ? `${a.name} (me)` : a.name,
  sub: a.type === 'centre_owner' ? `Centre owner · ${a.center_name || ''}` : a.email,
}));

export const AssigneeCell = ({ row, entity }) => {
  const { assignees, me, isManager, assign } = useContext(FsAssigneeContext);
  const [open, setOpen] = useState(false);
  const locked = !isManager && row.assignee_id && row.assignee_id !== me;
  const label = row.assignee_name || 'Unassigned';
  const pill = row.assignee_id
    ? (row.assignee_id === me ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-800 border-slate-200')
    : 'bg-white text-slate-400 border-dashed border-slate-300';
  if (locked) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${pill}`} title="Assigned to someone else" data-testid={`assignee-locked-${row.id}`}>
        <Lock className="w-3 h-3" /> {label}
      </span>
    );
  }
  const items = [...(row.assignee_id ? [{ value: '', label: 'Unassign' }] : []), ...memberItems(assignees, me)];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} data-testid={`assignee-btn-${row.id}`}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border max-w-[160px] hover:border-blue-400 transition-colors ${pill}`}>
          <UserCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <PickerList items={items} value={row.assignee_id || ''} testPrefix={`assignee-${row.id}`}
          onPick={async (v) => { setOpen(false); await assign(entity, row, v || null); }} />
      </PopoverContent>
    </Popover>
  );
};

export const AssigneeFilter = ({ value, onChange }) => {
  const { assignees, me, isManager } = useContext(FsAssigneeContext);
  const [open, setOpen] = useState(false);
  const base = [{ value: 'all', label: isManager ? 'All assignees' : 'Mine + unassigned' }, { value: 'me', label: 'Assigned to me' }, { value: 'unassigned', label: 'Unassigned' }];
  const items = [...base, ...(isManager ? memberItems(assignees, me) : [])];
  const current = items.find((i) => i.value === value)?.label || 'All assignees';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" data-testid="assignee-filter-btn"
          className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${value !== 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
          <Filter className="w-3.5 h-3.5" /> {value !== 'all' ? current : 'Assignee'} <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <PickerList items={items} value={value} testPrefix="assignee-filter" onPick={(v) => { setOpen(false); onChange(v); }} />
      </PopoverContent>
    </Popover>
  );
};
