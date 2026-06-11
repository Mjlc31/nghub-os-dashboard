// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, ChevronRight, Calendar, Sparkles, CheckCircle2, 
  Settings, Inbox, Flag, MoreHorizontal, Plus, Circle, CalendarDays, X, Layout as LayoutIcon,
  GripVertical, LayoutDashboard, FileText, Timer, PieChart, Tag, Users, Table2, MonitorPlay
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, isToday, isPast, parseISO, isValid } from 'date-fns';
import { TaskModal } from './ui/TaskModal';
import { CreateTaskModal } from './ui/CreateTaskModal';
import { ManageCardsModal } from './ui/ManageCardsModal';
import useLocalStorage from '../hooks/useLocalStorage';

// Prioridades do ClickUp
const PRIORITY_CONFIG: Record<string, { label: string; color: string; flag: string }> = {
  Urgent: { label: 'Urgente', color: '#ef4444', flag: '#ef4444' },
  High:   { label: 'Alta',    color: '#f59e0b', flag: '#f59e0b' },
  Normal: { label: 'Normal',  color: '#3b82f6', flag: '#3b82f6' },
  Low:    { label: 'Baixa',   color: '#6b7280', flag: '#6b7280' },
  None:   { label: '',        color: 'transparent', flag: '#374151' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return format(d, 'M/d/yy');
};

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  if (!isValid(d)) return false;
  return isPast(d) && !isToday(d);
};

const isTaskClosed = (statusId: string, statuses: any[]) => {
  if (statusId === 's4') return true;
  const s = statuses.find(st => st.id === statusId);
  return !!s && (s.name.toUpperCase().includes('PRONTO') || s.name.toUpperCase().includes('CONCLU') || s.name.toUpperCase().includes('DONE'));
};

const DEFAULT_LAYOUT: any[] = [
  { i: 'assigned-to-me', x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
  { i: 'assigned-comments', x: 6, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
  { i: 'my-tasks', x: 0, y: 4, w: 6, h: 3, minW: 2, minH: 3 },
  { i: 'calendar', x: 6, y: 4, w: 6, h: 3, minW: 2, minH: 3 },
];

const TEAM_DATA = [
  { name: 'Ana', tarefas: 24 },
  { name: 'Carlos', tarefas: 18 },
  { name: 'Arthur', tarefas: 32 },
  { name: 'Maria', tarefas: 15 },
  { name: 'JoÃ£o', tarefas: 27 },
];

const COMPLETION_DATA = [
  { date: 'Seg', concluidas: 12 },
  { date: 'Ter', concluidas: 19 },
  { date: 'Qua', concluidas: 15 },
  { date: 'Qui', concluidas: 22 },
  { date: 'Sex', concluidas: 28 },
];

const PRIORITY_DATA = [
  { name: 'Urgente', value: 12, color: '#ef4444' },
  { name: 'Alta', value: 25, color: '#f59e0b' },
  { name: 'Normal', value: 45, color: '#3b82f6' },
  { name: 'Baixa', value: 18, color: '#6b7280' },
];

const TaskDashboard = () => {
  const { tasks, taskStatuses, updateTask, rhTeam } = useAppContext();
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'delegated'>('pending');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    next: true,
    unscheduled: false
  });
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [layout, setLayout] = useLocalStorage<any[]>('clickup-dashboard-layout-v2', DEFAULT_LAYOUT);
  
  // Apenas garantindo que o layout serÃ¡ carregado montado corretamente no grid
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const { overdue, today, next, unscheduled, closedTasks } = useMemo(() => {
    // Avatar do usuÃ¡rio logado para filtrar
    const myAvatar = profile?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=E31837&color=fff`;
    const myRhProfile = rhTeam.find(rh =>
      (rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`) === myAvatar
    );
    const myRhAvatar = myRhProfile
      ? (myRhProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(myRhProfile.name)}&background=3b82f6&color=fff`)
      : myAvatar;

    // Filtra tarefas do usuÃ¡rio logado (ou todas se nÃ£o tiver assignees)
    const myTasks = tasks.filter(t => t.assignees.length === 0 || t.assignees.includes(myRhAvatar));

    const activeTasks = myTasks.filter(t => !isTaskClosed(t.statusId, taskStatuses));
    const closed = myTasks.filter(t => isTaskClosed(t.statusId, taskStatuses));

    const ov: Task[] = [];
    const td: Task[] = [];
    const nx: Task[] = [];
    const un: Task[] = [];

    activeTasks.forEach(task => {
      if (!task.dueDate) {
        un.push(task);
      } else {
        const d = parseISO(task.dueDate);
        if (!isValid(d)) {
          un.push(task);
        } else if (isToday(d)) {
          td.push(task);
        } else if (isPast(d)) {
          ov.push(task);
        } else {
          nx.push(task);
        }
      }
    });

    ov.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    td.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    nx.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return { overdue: ov, today: td, next: nx, unscheduled: un, closedTasks: closed };
  }, [tasks, taskStatuses, profile, rhTeam]);

  const recentTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 8);
  }, [tasks]);

  // Dados reais para o grÃ¡fico de prioridades
  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { Urgent: 0, High: 0, Normal: 0, Low: 0 };
    tasks.filter(t => !isTaskClosed(t.statusId, taskStatuses)).forEach(t => {
      if (t.priority && counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return [
      { name: 'Urgente', value: counts.Urgent, color: '#ef4444' },
      { name: 'Alta',    value: counts.High,   color: '#f59e0b' },
      { name: 'Normal',  value: counts.Normal, color: '#3b82f6' },
      { name: 'Baixa',   value: counts.Low,    color: '#6b7280' },
    ].filter(d => d.value > 0);
  }, [tasks, taskStatuses]);

  // Dados reais para o grÃ¡fico de equipe
  const teamChartData = useMemo(() => {
    const activeTasks = tasks.filter(t => !isTaskClosed(t.statusId, taskStatuses));
    return rhTeam.map(rh => {
      const avatar = rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`;
      return {
        name: rh.name.split(' ')[0],
        tarefas: activeTasks.filter(t => t.assignees.includes(avatar)).length,
      };
    }).filter(d => d.tarefas > 0).slice(0, 6);
  }, [tasks, taskStatuses, rhTeam]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout);
  };

  const addWidget = (widgetId: string) => {
    setLayout(prev => {
      if (prev.find(p => p.i === widgetId)) return prev;
      return [...prev, { i: widgetId, x: 0, y: Infinity, w: 4, h: 3, minW: 2, minH: 2 }];
    });
  };

  const removeWidget = (widgetId: string) => {
    setLayout(prev => prev.filter(p => p.i !== widgetId));
  };

  const TaskRow = ({ task, isCompact = false }: { task: Task; isCompact?: boolean }) => {
    const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.None;
    const dateStr = formatDate(task.dueDate);
    const overdueFlag = isOverdue(task.dueDate);

    return (
      <div className={`flex items-center group hover:bg-white/[0.03] ${isCompact ? 'py-1.5' : 'py-2'} px-3 cursor-default border-b border-white/[0.03] last:border-0 transition-all`}>
        <div className={`flex-shrink-0 ${isCompact ? 'w-4' : 'w-5'} mr-3 flex items-center justify-center`}>
          <Circle 
            className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-600 hover:text-gray-400 cursor-pointer transition-colors`} 
            onClick={() => updateTask(task.id, { statusId: taskStatuses.find(s => isTaskClosed(s.id, taskStatuses))?.id || task.statusId })}
          />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p 
            className="text-[13px] font-medium text-gray-300 truncate group-hover:text-white transition-colors cursor-pointer hover:underline underline-offset-2"
            onClick={() => setSelectedTask(task)}
          >
            {task.name}
          </p>
        </div>
        
        <div className="w-[80px] flex-shrink-0 px-2 flex items-center opacity-100">
          {task.priority !== 'None' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: prio.color }}>
              <Flag className="w-3.5 h-3.5" style={{ fill: prio.color, color: prio.color }} />
              {prio.label}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 opacity-0 group-hover:opacity-100">
              <Flag className="w-3.5 h-3.5" /> Setar
            </div>
          )}
        </div>

        <div className="w-[90px] flex-shrink-0 px-2 flex items-center justify-end">
          {dateStr ? (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${overdueFlag ? 'text-red-400' : 'text-gray-400'}`}>
              {overdueFlag && <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-0.5" />}
              {dateStr}
            </span>
          ) : (
            <span className="text-[11px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Setar
            </span>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, count, isExpanded, onToggle, tasks, emptyMessage }: any) => {
    return (
      <div className="flex flex-col">
        <div 
          className="flex items-center gap-2 px-2 py-2 hover:bg-white/[0.04] rounded-md cursor-pointer transition-colors group select-none"
          onClick={onToggle}
        >
          <button className="text-gray-500 group-hover:text-gray-300 transition-colors">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-gray-200 transition-colors">
            {title === 'Pendente' && <span className="w-3 h-3 border border-gray-400 rounded-full flex items-center justify-center opacity-50" />}
            {title}
          </div>
          <span className="text-xs font-medium text-gray-500">{count}</span>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {tasks.length === 0 ? (
                <div className="py-4 px-8 text-xs text-gray-500 font-medium">
                  {emptyMessage || "Nenhuma tarefa."}
                </div>
              ) : (
                <div className="flex flex-col mb-4 pl-4 border-l-2 border-white/5 ml-3 mt-1">
                  <div className="flex items-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <div className="w-5 mr-3" />
                    <div className="flex-1 pr-4">Nome</div>
                    <div className="w-[80px] px-2">Prioridade</div>
                    <div className="w-[90px] px-2 text-right">Data</div>
                  </div>
                  {tasks.map((task: Task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const TabButton = ({ active, onClick, children }: any) => (
    <button 
      onClick={onClick}
      className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
        active ? 'border-primary text-gray-100' : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  );

  const WidgetCard = ({ title, actionIcon, id, children, hasSettings = false }: any) => (
    <div className="bg-[#1a1a1a] border border-[#2b2b2b] rounded-xl flex flex-col hover:border-[#3a3a3a] transition-colors h-full w-full group relative" style={{ overflow: 'visible' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div className="drag-handle cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors p-1 -ml-2">
            <GripVertical className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-200">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasSettings && (
            <button 
              onMouseDown={(e) => e.stopPropagation()} 
              onClick={() => setEditingWidget(id)}
              className="text-gray-500 hover:text-white transition-colors p-1"
              title="ConfiguraÃ§Ãµes"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {actionIcon && <div className="text-gray-500 hover:text-gray-300 cursor-pointer">{actionIcon}</div>}
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => removeWidget(id)}
            className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
            title="Remover CartÃ£o"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );

  const renderWidgetConfig = (id: string, title: string) => (
    <WidgetCard id={id} title={`Configurar: ${title}`}>
      <div className="p-6 flex flex-col h-full bg-[#161616]">
        <h4 className="text-sm font-semibold text-white mb-4">Selecione os dados do grÃ¡fico</h4>
        <select className="w-full bg-[#222] border border-[#333] text-gray-200 rounded-md p-2 text-sm focus:outline-none focus:border-primary mb-4">
          <option>Todos os usuÃ¡rios (Geral)</option>
          <option>Apenas minha equipe</option>
          <option>Somente eu</option>
        </select>
        <div className="flex-1"></div>
        <button 
          onClick={() => setEditingWidget(null)}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-md py-2 text-sm font-semibold transition-colors"
        >
          Salvar ConfiguraÃ§Ãµes
        </button>
      </div>
    </WidgetCard>
  );

  const renderWidget = (id: string) => {
    if (editingWidget === id && id.startsWith('chart-')) {
      let title = "GrÃ¡fico";
      if (id === 'chart-team-performance') title = "Desempenho da Equipe";
      if (id === 'chart-tasks-completion') title = "HistÃ³rico de Entregas";
      if (id === 'chart-priority-dist') title = "DistribuiÃ§Ã£o de Prioridades";
      return renderWidgetConfig(id, title);
    }

    switch (id) {
      case 'assigned-to-me':
        return (
          <WidgetCard id={id} title={
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded border border-indigo-500/30">
                <LayoutDashboard className="w-3.5 h-3.5" />
              </div>
              AtribuÃ­das a mim
            </div>
          } actionIcon={<MoreHorizontal className="w-4 h-4" />}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] cursor-pointer transition-colors border-b border-[#2b2b2b]">
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border border-gray-600 rounded-full px-2">Pendente</span>
                <span className="text-[11px] font-bold text-gray-500">{today.length + overdue.length}</span>
              </div>
              <div className="flex items-center py-2 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-[#2b2b2b] bg-[#141414]">
                <div className="flex-1 pr-4">Nome</div>
                <div className="w-[80px] px-2">Prioridade</div>
                <div className="w-[90px] px-2 text-right">Data</div>
              </div>
              <div className="flex-1 p-2 flex flex-col gap-0.5">
                {[...overdue, ...today].map(task => (
                  <TaskRow key={task.id} task={task} isCompact />
                ))}
                {overdue.length === 0 && today.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-500">Nenhuma tarefa atribuÃ­da a vocÃª no momento.</div>
                )}
                <div className="px-3 py-2 mt-2">
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
                  </button>
                </div>
              </div>
            </div>
          </WidgetCard>
        );
      case 'assigned-comments':
        return (
          <WidgetCard id={id} title="ComentÃ¡rios atribuÃ­dos" actionIcon={<MoreHorizontal className="w-4 h-4" />}>
             <div className="flex flex-col items-center justify-center h-full text-center p-8">
               <Inbox className="w-12 h-12 text-gray-600 mb-4 opacity-50" />
               <p className="text-sm font-medium text-gray-400">VocÃª estÃ¡ em dia com seus comentÃ¡rios!</p>
             </div>
          </WidgetCard>
        );
      case 'my-tasks':
        return (
          <WidgetCard id={id} title="Minhas tarefas" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 mb-4 opacity-40 flex items-center justify-center relative">
                <Inbox className="w-12 h-12 text-gray-400" strokeWidth={1} />
                <div className="absolute bottom-2 right-0 bg-[#1a1a1a] rounded-full p-0.5 border-2 border-[#1a1a1a]">
                  <div className="w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-400 max-w-[200px] mb-6">
                A lista pessoal contÃ©m todas as suas tarefas. <span className="text-primary hover:underline cursor-pointer">Saiba mais</span>
              </p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-200 transition-colors"
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
              <div className="mb-4 text-gray-500 opacity-60">
                <CalendarDays className="w-12 h-12" strokeWidth={1} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 px-4 mb-6 max-w-[260px]">
                Conecte seu calendÃ¡rio para ver os prÃ³ximos eventos e entrar na sua prÃ³xima chamada
              </p>
              
              <div className="flex flex-col gap-2 w-full max-w-[220px]">
                <button className="flex items-center justify-between px-3 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] rounded-lg transition-colors w-full group">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-300 group-hover:text-gray-100 transition-colors">
                    <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm">
                      <span className="text-blue-500 font-extrabold text-[10px]">G</span>
                    </div>
                    Google Agenda
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">Conectar</span>
                </button>

                <button className="flex items-center justify-between px-3 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] rounded-lg transition-colors w-full group">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-300 group-hover:text-gray-100 transition-colors">
                    <div className="w-4 h-4 bg-[#0078D4] rounded flex items-center justify-center shadow-sm">
                      <span className="text-white font-extrabold text-[10px]">O</span>
                    </div>
                    Microsoft Outlook
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">Conectar</span>
                </button>
              </div>
            </div>
          </WidgetCard>
        );
      case 'priorities':
        return (
          <WidgetCard id={id} title="Prioridades" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 mb-4 opacity-40 flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center relative bg-transparent">
                  <div className="absolute -bottom-1 -right-1 bg-[#1a1a1a] rounded-full p-0.5">
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-400 max-w-[220px] mb-6">
                As Prioridades mantÃªm as tarefas importantes em uma Ãºnica lista. <span className="text-primary hover:underline cursor-pointer">Saiba mais</span>
              </p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Criar uma tarefa
              </button>
            </div>
          </WidgetCard>
        );
      case 'ai-standup':
        return (
          <WidgetCard id={id} title={<div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> StandUp da IA</div>}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-12 h-12 mb-4 relative">
                <div className="w-full h-full bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-500 rounded-xl animate-pulse opacity-90 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-400 max-w-[240px] mb-6 leading-relaxed">
                Use a IA ClickUp para criar resumos recorrentes das atividades recentes.
              </p>
              <button className="flex items-center gap-1.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-200 transition-colors">
                Criar uma recapitulaÃ§Ã£o
              </button>
            </div>
          </WidgetCard>
        );
      case 'custom-text':
        return (
          <WidgetCard id={id} title="Bloco de Texto" actionIcon={<MoreHorizontal className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <FileText className="w-10 h-10 mb-4" />
              <p className="text-sm font-medium">Bloco de Texto Personalizado</p>
            </div>
          </WidgetCard>
        );
      case 'sprint-velocity':
        return (
          <WidgetCard id={id} title="Velocidade da Sprint" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <Timer className="w-10 h-10 mb-4 text-emerald-500" />
              <p className="text-sm font-medium">GrÃ¡fico de Velocidade da Sprint</p>
            </div>
          </WidgetCard>
        );
      case 'workload-by-status':
        return (
          <WidgetCard id={id} title="Tarefas por Status" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <PieChart className="w-10 h-10 mb-4 text-blue-500" />
              <p className="text-sm font-medium">DistribuiÃ§Ã£o de Status</p>
            </div>
          </WidgetCard>
        );
      case 'task-by-tag':
        return (
          <WidgetCard id={id} title="Tarefas por Tag" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <Tag className="w-10 h-10 mb-4 text-pink-500" />
              <p className="text-sm font-medium">GrÃ¡fico de Barras de Tags</p>
            </div>
          </WidgetCard>
        );
      case 'workload-by-assignee':
        return (
          <WidgetCard id={id} title="Carga por ResponsÃ¡vel" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <Users className="w-10 h-10 mb-4 text-indigo-500" />
              <p className="text-sm font-medium">Carga de Trabalho da Equipe</p>
            </div>
          </WidgetCard>
        );
      case 'time-tracked':
        return (
          <WidgetCard id={id} title="Tempo Rastreado" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <Timer className="w-10 h-10 mb-4 text-sky-500" />
              <p className="text-sm font-medium">RelatÃ³rio de Horas</p>
            </div>
          </WidgetCard>
        );
      case 'task-table':
        return (
          <WidgetCard id={id} title="Tabela de Tarefas" actionIcon={<Settings className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <Table2 className="w-10 h-10 mb-4 text-slate-500" />
              <p className="text-sm font-medium">VisualizaÃ§Ã£o em Tabela</p>
            </div>
          </WidgetCard>
        );
      case 'figma-embed':
        return (
          <WidgetCard id={id} title="Embed do Figma" actionIcon={<MoreHorizontal className="w-4 h-4" />}>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60 hover:opacity-100 transition-opacity">
              <MonitorPlay className="w-10 h-10 mb-4 text-pink-500" />
              <p className="text-sm font-medium">Visualizador do Figma</p>
            </div>
          </WidgetCard>
        );
      case 'chart-team-performance':
        return (
          <WidgetCard id={id} title="Desempenho da Equipe" hasSettings={true}>
            <div className="h-full w-full p-4 pb-2">
              {teamChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Users className="w-10 h-10 text-gray-600 mb-3 opacity-50" />
                  <p className="text-xs text-gray-500">Nenhuma tarefa atribuÃ­da Ã  equipe.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="tarefas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </WidgetCard>
        );
      case 'chart-tasks-completion':
        return (
          <WidgetCard id={id} title="HistÃ³rico de Entregas" hasSettings={true}>
            <div className="h-full w-full p-4 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={COMPLETION_DATA}>
                  <defs>
                    <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="concluidas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConcluidas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'chart-priority-dist':
        return (
          <WidgetCard id={id} title="DistribuiÃ§Ã£o de Prioridades" hasSettings={true}>
            <div className="h-full w-full p-4 flex items-center justify-center">
              {priorityChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <PieChart className="w-10 h-10 text-gray-600 mb-3 opacity-50" />
                  <p className="text-xs text-gray-500">Nenhuma tarefa ativa.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={priorityChartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </WidgetCard>
        );
      default:
        return <WidgetCard id={id} title="Desconhecido"><div className="p-4 text-gray-500">Widget "{id}" nÃ£o encontrado.</div></WidgetCard>;
    }
  };

  const autoArrange = () => {
    // Distribui cartÃµes em 2 colunas de largura igual, empurrando tudo pro topo
    const cols = 12;
    let x = 0;
    let y = 0;
    const newLayout = layout.map((item) => {
      const w = Math.min(item.w, cols);
      if (x + w > cols) {
        x = 0;
        y += item.h || 3;
      }
      const placed = { ...item, x, y, w };
      x += w;
      return placed;
    });
    // Limpa o cache do localStorage para forÃ§ar repintura correta
    setLayout([]);
    setTimeout(() => setLayout(newLayout), 50);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#111111] overflow-y-auto custom-scrollbar text-white relative">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-white tracking-tight">
          {greeting}, {profile?.fullName?.split(' ')[0] || 'Arthur'}
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={autoArrange}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-md text-xs font-semibold text-gray-300 transition-colors"
          >
            <LayoutIcon className="w-3.5 h-3.5" /> Organizar Grid
          </button>
          <button 
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-md text-xs font-semibold text-gray-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Gerenciar cartÃµes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row px-8 pb-12 gap-6 w-full h-full">
        {/* Coluna Esquerda: Recentes e Meu Trabalho (Fixa) */}
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col gap-6">
          {/* Recentes */}
          <div className="bg-[#1a1a1a] border border-[#2b2b2b] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-colors">
            <div className="px-5 py-3 border-b border-white/[0.02]">
              <h2 className="text-sm font-bold text-gray-200">Recentes</h2>
            </div>
            <div className="p-2">
              {recentTasks.map(task => (
                <div key={task.id} 
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors group"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center text-xs">
                    <span className="font-medium text-gray-300 truncate group-hover:text-white transition-colors">{task.name}</span>
                    <span className="text-gray-600 mx-1.5">â€¢</span>
                    <span className="text-gray-500 truncate">em Clientes</span>
                  </div>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-500 text-center">Nenhum item recente.</div>
              )}
            </div>
          </div>

          {/* Meu Trabalho */}
          <div className="bg-[#1a1a1a] border border-[#2b2b2b] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-colors flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-white/[0.02]">
              <h2 className="text-sm font-bold text-gray-200">Meu trabalho</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-5 px-5 pt-2 border-b border-[#2b2b2b]">
              <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>Pendente</TabButton>
              <TabButton active={activeTab === 'done'} onClick={() => setActiveTab('done')}>Feito</TabButton>
              <TabButton active={activeTab === 'delegated'} onClick={() => setActiveTab('delegated')}>Delegado</TabButton>
            </div>

            <div className="p-2 flex-1">
              {activeTab === 'pending' && (
                <div className="flex flex-col gap-0.5">
                  <Section 
                    title="Hoje" count={today.length} 
                    isExpanded={expandedSections.today} onToggle={() => toggleSection('today')}
                    emptyMessage="As tarefas e os lembretes atribuÃ­dos a vocÃª serÃ£o exibidos aqui."
                    tasks={today}
                  />
                  <Section 
                    title="Em atraso" count={overdue.length} 
                    isExpanded={expandedSections.overdue} onToggle={() => toggleSection('overdue')}
                    tasks={overdue}
                  />
                  <Section 
                    title="PrÃ³ximo" count={next.length} 
                    isExpanded={expandedSections.next} onToggle={() => toggleSection('next')}
                    tasks={next}
                  />
                  <Section 
                    title="NÃ£o programado" count={unscheduled.length} 
                    isExpanded={expandedSections.unscheduled} onToggle={() => toggleSection('unscheduled')}
                    tasks={unscheduled}
                  />
                </div>
              )}
              {activeTab === 'done' && (
                <div className="py-12 text-center text-[13px] font-medium text-gray-500">
                  {closedTasks.length === 0 ? "Nenhuma tarefa concluÃ­da recentemente." : `${closedTasks.length} tarefas concluÃ­das.`}
                </div>
              )}
              {activeTab === 'delegated' && (
                <div className="py-12 text-center text-[13px] font-medium text-gray-500">
                  Nenhuma tarefa delegada.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Dashboard DinÃ¢mico (Grid Layout) */}
        <div className="flex-1 min-h-[600px]">
          {mounted && (
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={100}
              margin={[16, 16]}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              isResizable={true}
              resizeHandles={['se', 's', 'e']}
              isDraggable={true}
              compactType="vertical"
              preventCollision={false}
            >
              {layout.map(item => (
                <div key={item.i} style={{ overflow: 'visible' }}>
                  {renderWidget(item.i)}
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
          
          {layout.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-[#333] rounded-xl text-center p-10 bg-white/[0.01]">
               <LayoutDashboard className="w-12 h-12 text-gray-600 mb-4" />
               <h3 className="text-lg font-bold text-gray-300 mb-2">Seu dashboard estÃ¡ vazio</h3>
               <p className="text-sm text-gray-500 mb-6">Adicione cartÃµes para personalizar seu espaÃ§o de trabalho.</p>
               <button 
                 onClick={() => setIsManageModalOpen(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-semibold transition-colors"
               >
                 <Plus className="w-4 h-4" /> Adicionar cartÃ£o
               </button>
            </div>
          )}
        </div>
      </div>

      <ManageCardsModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        onAddWidget={addWidget}
        existingWidgets={layout.map(l => l.i)}
      />

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {isCreateModalOpen && (
        <CreateTaskModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

export default TaskDashboard;

