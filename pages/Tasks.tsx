// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Calendar, Sparkles, CheckCircle2,
  Settings, Inbox, Flag, MoreHorizontal, Plus, Circle, CalendarDays, X,
  Layout as LayoutIcon, GripVertical, LayoutDashboard, FileText, Timer,
  PieChart, Tag, Users, Table2, Loader2, Trash2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { format, isToday, isPast, parseISO, isValid, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTasks } from '../hooks/useTasks';
import { Task } from '../types';
type NgTask = Task;
type NgTaskPriority = Task['priority'];

// â”€â”€â”€ Config de Prioridades com identidade NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Urgent: { label: 'Urgente', color: '#ef4444', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  High:   { label: 'Alta',    color: '#f59e0b', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  Normal: { label: 'Normal',  color: '#D4AF37', bg: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' },
  Low:    { label: 'Baixa',   color: '#6b7280', bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  None:   { label: '',        color: 'transparent', bg: '' },
};

const COMPLETION_DATA = [
  { date: 'Seg', concluidas: 3 },
  { date: 'Ter', concluidas: 7 },
  { date: 'Qua', concluidas: 5 },
  { date: 'Qui', concluidas: 9 },
  { date: 'Sex', concluidas: 11 },
];

const DEFAULT_LAYOUT: any[] = [
  { i: 'assigned-to-me', x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
  { i: 'my-tasks',       x: 6, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
  { i: 'chart-completion', x: 0, y: 4, w: 6, h: 3, minW: 2, minH: 3 },
  { i: 'chart-priority',   x: 6, y: 4, w: 6, h: 3, minW: 2, minH: 3 },
];

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "d MMM", { locale: ptBR });
};

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isValid(d) && isPast(d) && !isToday(d);
};

// â”€â”€â”€ Modal de Criar Tarefa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CreateTaskModal = ({ onClose, onCreate, statuses }: {
  onClose: () => void;
  onCreate: (data: Omit<NgTask, 'id' | 'createdAt'>) => void;
  statuses: any[];
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<NgTaskPriority>('Normal');
  const [dueDate, setDueDate] = useState('');
  const [statusId, setStatusId] = useState(statuses[0]?.id || 's1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description, priority, dueDate: dueDate || undefined, statusId, assignees: [] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f0f11] border border-brand-gold/20 rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-brand-gold" />
            </div>
            <h2 className="text-white font-bold text-base">Nova Tarefa</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome da tarefa..."
              className="w-full bg-zinc-900/80 border border-white/10 focus:border-brand-gold/40 focus:ring-1 focus:ring-brand-gold/20 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none transition-all"
            />
          </div>

          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="DescriÃ§Ã£o (opcional)..."
              rows={3}
              className="w-full bg-zinc-900/80 border border-white/10 focus:border-brand-gold/40 focus:ring-1 focus:ring-brand-gold/20 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Status</label>
              <select
                value={statusId}
                onChange={e => setStatusId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as NgTaskPriority)}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {(['Urgent', 'High', 'Normal', 'Low', 'None'] as NgTaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label || 'Nenhuma'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Vencimento</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-brand-gold hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
            >
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// â”€â”€â”€ Modal de Detalhes da Tarefa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TaskDetailModal = ({ task, statuses, onClose, onUpdate, onDelete }: {
  task: NgTask;
  statuses: any[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<NgTask>) => void;
  onDelete: (id: string) => void;
}) => {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || '');
  const [editingName, setEditingName] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-start gap-4">
            <button
              onClick={() => {
                const closedStatus = statuses.find(s => s.isClosed);
                onUpdate(task.id, { statusId: closedStatus?.id || task.statusId });
              }}
              className="mt-0.5 flex-shrink-0"
            >
              <Circle className="w-5 h-5 text-zinc-600 hover:text-brand-gold transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => { onUpdate(task.id, { name }); setEditingName(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { onUpdate(task.id, { name }); setEditingName(false); } }}
                  className="w-full bg-transparent text-white font-bold text-lg outline-none border-b border-brand-gold/40"
                />
              ) : (
                <h2 className="text-white font-bold text-lg cursor-text hover:text-brand-gold/80 transition-colors" onClick={() => setEditingName(true)}>
                  {task.name}
                </h2>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Criada {task.createdAt ? format(parseISO(task.createdAt), "d MMM 'Ã s' HH:mm", { locale: ptBR }) : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onDelete(task.id); onClose(); }}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">DescriÃ§Ã£o</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => onUpdate(task.id, { description })}
                placeholder="Adicione uma descriÃ§Ã£o..."
                rows={4}
                className="w-full bg-zinc-900/50 border border-white/[0.08] focus:border-brand-gold/30 rounded-xl px-4 py-3 text-zinc-300 text-sm placeholder-zinc-600 outline-none transition-all resize-none"
              />
            </div>

            {/* Subtarefas placeholder */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 block">Subtarefas</label>
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">Subtarefas em breve</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Status</label>
              <select
                value={task.statusId}
                onChange={e => onUpdate(task.id, { statusId: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Prioridade</label>
              <select
                value={task.priority}
                onChange={e => onUpdate(task.id, { priority: e.target.value as NgTaskPriority })}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {(['Urgent', 'High', 'Normal', 'Low', 'None'] as NgTaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label || 'Nenhuma'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Vencimento</label>
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={e => onUpdate(task.id, { dueDate: e.target.value || undefined })}
                className="w-full bg-zinc-900 border border-white/10 focus:border-brand-gold/40 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              />
            </div>

            {task.dueDate && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${isOverdue(task.dueDate) ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'}`}>
                <Calendar className="w-3.5 h-3.5" />
                {isOverdue(task.dueDate) ? 'Em atraso' : formatDate(task.dueDate)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Componente Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Tasks: React.FC = () => {
  const { tasks, taskStatuses, addTask, updateTask, deleteTask } = useTasks();
  const isTaskClosed = (statusId: string) => {
    const s = taskStatuses.find(s => s.id === statusId);
    return s ? !!s.isClosed : false;
  };
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'delegated'>('pending');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true, today: true, next: true, unscheduled: false,
  });
  const [selectedTask, setSelectedTask] = useState<NgTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [layout, setLayout] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nghub_task_layout_v1');
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch { return DEFAULT_LAYOUT; }
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const saveLayout = (l: any[]) => {
    setLayout(l);
    localStorage.setItem('nghub_task_layout_v1', JSON.stringify(l));
  };

  const removeWidget = (id: string) => saveLayout(layout.filter(l => l.i !== id));
  const addWidget = (id: string) => {
    if (layout.find(l => l.i === id)) return;
    saveLayout([...layout, { i: id, x: 0, y: Infinity, w: 4, h: 3, minW: 2, minH: 2 }]);
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const { overdue, today, next, unscheduled, closedTasks } = useMemo(() => {
    const active = tasks.filter(t => !isTaskClosed(t.statusId));
    const closed = tasks.filter(t => isTaskClosed(t.statusId));
    const ov: NgTask[] = [], td: NgTask[] = [], nx: NgTask[] = [], un: NgTask[] = [];

    active.forEach(task => {
      if (!task.dueDate) { un.push(task); return; }
      const d = parseISO(task.dueDate);
      if (!isValid(d)) { un.push(task); return; }
      if (isToday(d)) td.push(task);
      else if (isPast(d)) ov.push(task);
      else nx.push(task);
    });

    return { overdue: ov, today: td, next: nx, unscheduled: un, closedTasks: closed };
  }, [tasks, isTaskClosed]);

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 8),
  [tasks]);

  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { Urgent: 0, High: 0, Normal: 0, Low: 0 };
    tasks.filter(t => !isTaskClosed(t.statusId)).forEach(t => {
      if (t.priority && counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return [
      { name: 'Urgente', value: counts.Urgent, color: '#ef4444' },
      { name: 'Alta',    value: counts.High,   color: '#f59e0b' },
      { name: 'Normal',  value: counts.Normal, color: '#D4AF37' },
      { name: 'Baixa',   value: counts.Low,    color: '#6b7280' },
    ].filter(d => d.value > 0);
  }, [tasks, isTaskClosed]);

  // â”€â”€â”€ Sub-componentes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const TaskRow = ({ task, isCompact = false }: { task: NgTask; isCompact?: boolean }) => {
    const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.None;
    const dateStr = formatDate(task.dueDate);
    const overdueFlag = isOverdue(task.dueDate);
    const closedStatus = taskStatuses.find(s => s.isClosed);

    return (
      <div className={`flex items-center group hover:bg-white/[0.03] ${isCompact ? 'py-1.5' : 'py-2.5'} px-3 cursor-default border-b border-white/[0.04] last:border-0 transition-all`}>
        <div className={`flex-shrink-0 ${isCompact ? 'w-4' : 'w-5'} mr-3 flex items-center justify-center`}>
          <button onClick={() => updateTask(task.id, { statusId: closedStatus?.id || task.statusId })}>
            <Circle className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-zinc-700 hover:text-brand-gold cursor-pointer transition-colors`} />
          </button>
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p
            className="text-[13px] font-medium text-zinc-300 truncate group-hover:text-white transition-colors cursor-pointer hover:underline underline-offset-2"
            onClick={() => setSelectedTask(task)}
          >
            {task.name}
          </p>
        </div>

        <div className="w-[80px] flex-shrink-0 px-2 flex items-center">
          {task.priority !== 'None' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: prio.color }}>
              <Flag className="w-3.5 h-3.5" style={{ fill: prio.color, color: prio.color }} />
              {prio.label}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-700 opacity-0 group-hover:opacity-100">
              <Flag className="w-3.5 h-3.5" /> Setar
            </div>
          )}
        </div>

        <div className="w-[80px] flex-shrink-0 px-2 flex items-center justify-end">
          {dateStr ? (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${overdueFlag ? 'text-red-400 bg-red-500/10' : 'text-brand-gold/70'}`}>
              {overdueFlag && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
              {dateStr}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Setar
            </span>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, count, isExpanded, onToggle, tasks: sectionTasks, emptyMessage }: any) => (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-2 px-2 py-2 hover:bg-white/[0.03] rounded-md cursor-pointer transition-colors group select-none"
        onClick={onToggle}
      >
        <button className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
          {title}
        </div>
        <span className="text-xs font-medium text-zinc-600">{count}</span>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {sectionTasks.length === 0 ? (
              <div className="py-4 px-8 text-xs text-zinc-600 font-medium">
                {emptyMessage || 'Nenhuma tarefa.'}
              </div>
            ) : (
              <div className="flex flex-col mb-4 pl-4 border-l-2 border-white/[0.04] ml-3 mt-1">
                <div className="flex items-center py-2 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-white/[0.04]">
                  <div className="w-5 mr-3" />
                  <div className="flex-1 pr-4">Nome</div>
                  <div className="w-[80px] px-2">Prioridade</div>
                  <div className="w-[80px] px-2 text-right">Data</div>
                </div>
                {sectionTasks.map((task: NgTask) => <TaskRow key={task.id} task={task} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const TabButton = ({ active, onClick, children }: any) => (
    <button
      onClick={onClick}
      className={`text-sm font-semibold pb-2 border-b-2 transition-all ${
        active ? 'border-brand-gold text-white' : 'border-transparent text-zinc-600 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );

  const WidgetCard = ({ id, title, children, actionIcon }: any) => (
    <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl flex flex-col hover:border-brand-gold/20 transition-colors h-full w-full group relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors p-1 -ml-2">
            <GripVertical className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {actionIcon && <div className="text-zinc-600 hover:text-zinc-400 cursor-pointer">{actionIcon}</div>}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => removeWidget(id)}
            className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
            title="Remover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );

  const renderWidget = (id: string) => {
    switch (id) {
      case 'assigned-to-me':
        return (
          <WidgetCard id={id} title={
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-brand-gold/10 text-brand-gold flex items-center justify-center rounded border border-brand-gold/20">
                <LayoutDashboard className="w-3 h-3" />
              </div>
              AtribuÃ­das a Mim
            </div>
          } actionIcon={<MoreHorizontal className="w-4 h-4" />}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 rounded-full px-2">Pendente</span>
                <span className="text-[11px] font-bold text-zinc-600">{today.length + overdue.length}</span>
              </div>
              <div className="flex items-center py-2 px-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-white/[0.04]">
                <div className="flex-1 pr-4">Nome</div>
                <div className="w-[80px] px-2">Prioridade</div>
                <div className="w-[80px] px-2 text-right">Data</div>
              </div>
              <div className="flex-1 p-2 flex flex-col gap-0.5">
                {[...overdue, ...today].map(task => <TaskRow key={task.id} task={task} isCompact />)}
                {overdue.length === 0 && today.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-600">Nenhuma tarefa para hoje.</div>
                )}
                <div className="px-3 py-2 mt-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-brand-gold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
                  </button>
                </div>
              </div>
            </div>
          </WidgetCard>
        );

      case 'my-tasks':
        return (
          <WidgetCard id={id} title="Minhas Tarefas" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-brand-gold/60" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xs font-medium text-zinc-500 max-w-[200px] mb-6 leading-relaxed">
                Lista pessoal com todas as suas tarefas ativas e em andamento.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 rounded-lg text-xs font-bold text-brand-gold transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Criar uma tarefa
              </button>
            </div>
          </WidgetCard>
        );

      case 'calendar':
        return (
          <WidgetCard id={id} title="Agenda" actionIcon={<MoreHorizontal className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <CalendarDays className="w-10 h-10 text-zinc-700 mb-4" strokeWidth={1} />
              <p className="text-[11px] font-medium text-zinc-500 px-4 mb-6 max-w-[240px]">
                Conecte seu calendÃ¡rio para ver os prÃ³ximos eventos e reuniÃµes.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                {[
                  { name: 'Google Agenda', bg: 'bg-white', letter: 'G', color: 'text-blue-500' },
                  { name: 'Microsoft Outlook', bg: 'bg-blue-600', letter: 'O', color: 'text-white' },
                ].map(cal => (
                  <button key={cal.name} className="flex items-center justify-between px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] rounded-lg transition-colors w-full group">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-300 group-hover:text-zinc-100">
                      <div className={`w-4 h-4 ${cal.bg} rounded flex items-center justify-center shadow-sm`}>
                        <span className={`${cal.color} font-extrabold text-[10px]`}>{cal.letter}</span>
                      </div>
                      {cal.name}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">Conectar</span>
                  </button>
                ))}
              </div>
            </div>
          </WidgetCard>
        );

      case 'ai-standup':
        return (
          <WidgetCard id={id} title={
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold" /> StandUp IA
            </div>
          }>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-12 h-12 mb-4 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <p className="text-[11px] font-medium text-zinc-500 max-w-[230px] mb-6 leading-relaxed">
                Use a IA para criar resumos inteligentes das atividades recentes da equipe.
              </p>
              <button className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 rounded-lg text-xs font-bold text-brand-gold transition-all">
                Gerar RecapitulaÃ§Ã£o
              </button>
            </div>
          </WidgetCard>
        );

      case 'chart-completion':
        return (
          <WidgetCard id={id} title="HistÃ³rico de Entregas">
            <div className="h-full w-full p-4 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={COMPLETION_DATA}>
                  <defs>
                    <linearGradient id="ngGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f0f11', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', color: '#D4AF37' }} />
                  <Area type="monotone" dataKey="concluidas" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#ngGold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );

      case 'chart-priority':
        return (
          <WidgetCard id={id} title="DistribuiÃ§Ã£o de Prioridades">
            <div className="h-full w-full p-4 flex items-center justify-center">
              {priorityChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <PieChart className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-xs text-zinc-600">Nenhuma tarefa ativa.</p>
                </div>
              ) : (
                <div className="flex items-center gap-6 w-full h-full">
                  <ResponsiveContainer width="60%" height="100%">
                    <RechartsPieChart>
                      <Pie data={priorityChartData} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                        {priorityChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f0f11', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {priorityChartData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-zinc-400">{d.name}</span>
                        <span className="font-bold ml-auto pl-2" style={{ color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </WidgetCard>
        );

      default:
        return (
          <WidgetCard id={id} title="Widget">
            <div className="p-4 text-xs text-zinc-600">Widget nÃ£o encontrado.</div>
          </WidgetCard>
        );
    }
  };

  const ALL_WIDGETS = [
    { id: 'assigned-to-me', label: 'AtribuÃ­das a Mim', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'Minhas Tarefas', icon: Inbox },
    { id: 'calendar', label: 'Agenda', icon: CalendarDays },
    { id: 'ai-standup', label: 'StandUp IA', icon: Sparkles },
    { id: 'chart-completion', label: 'HistÃ³rico de Entregas', icon: Timer },
    { id: 'chart-priority', label: 'DistribuiÃ§Ã£o de Prioridades', icon: PieChart },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-1">{greeting} ðŸ‘‹</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tarefas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            <span className="text-brand-gold font-semibold">{today.length + overdue.length}</span> para hoje Â·{' '}
            <span className="text-zinc-400">{tasks.filter(t => !isTaskClosed(t.statusId)).length}</span> ativas no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageOpen(p => !p)}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] rounded-xl text-xs font-bold text-zinc-300 transition-all"
          >
            <Settings className="w-3.5 h-3.5" /> Gerenciar Cards
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-yellow-400 rounded-xl text-xs font-bold text-black transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Painel de Gerenciar Cards */}
      <AnimatePresence>
        {isManageOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#0c0c0f] border border-brand-gold/20 rounded-xl p-4">
              <h3 className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-3">Adicionar Cards ao Dashboard</h3>
              <div className="flex flex-wrap gap-2">
                {ALL_WIDGETS.map(w => {
                  const active = !!layout.find(l => l.i === w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => active ? removeWidget(w.id) : addWidget(w.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        active
                          ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold'
                          : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Coluna Esquerda â€” Recentes + Meu Trabalho */}
        <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-5">
          {/* Recentes */}
          <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h2 className="text-sm font-bold text-zinc-200">Recentes</h2>
            </div>
            <div className="p-2">
              {recentTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-lg cursor-pointer transition-colors group"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-zinc-700 group-hover:text-brand-gold transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1 text-xs">
                    <span className="font-medium text-zinc-400 truncate group-hover:text-white transition-colors">{task.name}</span>
                    {isTaskClosed(task.statusId) && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </div>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <div className="px-3 py-6 text-xs text-zinc-600 text-center">Nenhuma tarefa ainda.</div>
              )}
            </div>
          </div>

          {/* Meu Trabalho */}
          <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h2 className="text-sm font-bold text-zinc-200">Meu Trabalho</h2>
            </div>
            <div className="flex items-center gap-5 px-5 pt-2 border-b border-white/[0.04]">
              <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>Pendente</TabButton>
              <TabButton active={activeTab === 'done'} onClick={() => setActiveTab('done')}>Feito</TabButton>
              <TabButton active={activeTab === 'delegated'} onClick={() => setActiveTab('delegated')}>Delegado</TabButton>
            </div>
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'pending' && (
                <div className="flex flex-col gap-0.5">
                  <Section title="Hoje" count={today.length} isExpanded={expandedSections.today} onToggle={() => setExpandedSections(p => ({ ...p, today: !p.today }))} tasks={today} emptyMessage="Nenhuma tarefa para hoje. Aproveite! âœ¨" />
                  <Section title="Em Atraso" count={overdue.length} isExpanded={expandedSections.overdue} onToggle={() => setExpandedSections(p => ({ ...p, overdue: !p.overdue }))} tasks={overdue} />
                  <Section title="PrÃ³ximo" count={next.length} isExpanded={expandedSections.next} onToggle={() => setExpandedSections(p => ({ ...p, next: !p.next }))} tasks={next} />
                  <Section title="Sem Data" count={unscheduled.length} isExpanded={expandedSections.unscheduled} onToggle={() => setExpandedSections(p => ({ ...p, unscheduled: !p.unscheduled }))} tasks={unscheduled} />
                </div>
              )}
              {activeTab === 'done' && (
                <div className="py-8 text-center text-[13px] font-medium text-zinc-600">
                  {closedTasks.length === 0 ? 'Nenhuma tarefa concluÃ­da ainda.' : `${closedTasks.length} tarefa${closedTasks.length > 1 ? 's' : ''} concluÃ­da${closedTasks.length > 1 ? 's' : ''}.`}
                  {closedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 mt-2 text-left hover:bg-white/[0.03] rounded-lg cursor-pointer" onClick={() => setSelectedTask(t)}>
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs text-zinc-500 line-through truncate">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'delegated' && (
                <div className="py-12 text-center text-[13px] font-medium text-zinc-600">Nenhuma tarefa delegada.</div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita â€” Grid DinÃ¢mico */}
        <div className="flex-1 min-h-[500px]">
          {mounted && layout.length > 0 && (
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout as any, md: layout as any, sm: layout as any, xs: layout as any, xxs: layout as any }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={90}
              margin={[16, 16]}
              onLayoutChange={(newLayout) => saveLayout(newLayout)}
              draggableHandle=".drag-handle"
              isResizable={true}
              resizeHandles={['se', 's', 'e']}
              isDraggable={true}
              compactType="vertical"
            >
              {layout.map(item => (
                <div key={item.i}>
                  {renderWidget(item.i)}
                </div>
              ))}
            </ResponsiveGridLayout>
          )}

          {mounted && layout.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/[0.06] rounded-xl text-center p-10">
              <LayoutDashboard className="w-12 h-12 text-zinc-800 mb-4" />
              <h3 className="text-base font-bold text-zinc-400 mb-2">Dashboard vazio</h3>
              <p className="text-sm text-zinc-600 mb-6">Adicione cards para personalizar sua visÃ£o.</p>
              <button
                onClick={() => setIsManageOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-yellow-400 rounded-xl text-xs font-bold text-black transition-all"
              >
                <Plus className="w-4 h-4" /> Adicionar Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {isCreateModalOpen && (
        <CreateTaskModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={(data) => createTask(data)}
          statuses={taskStatuses}
        />
      )}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          statuses={taskStatuses}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
};

export default Tasks;

