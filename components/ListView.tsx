// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Flag, Calendar as CalendarIcon,
  MoreHorizontal, CheckCircle2, Trash2, Edit3, ArrowRightLeft, Copy,
  ListTodo, Clock, GripVertical, MessageSquare, User, Circle, Folder as FolderIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { TaskModal } from './ui/TaskModal';

interface ListViewProps {
  filteredTasks: Task[];
  searchQuery: string;
  filterPriority: string | null;
  groupBy?: 'status' | 'assignee';
  showClosed?: boolean;
  selectedLocation?: { type: 'space' | 'folder' | 'list', id: string } | null;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; flag: string }> = {
  Urgent: { label: 'Urgente', color: '#ef4444', flag: '#ef4444' },
  High:   { label: 'Alta',    color: '#f59e0b', flag: '#f59e0b' },
  Normal: { label: 'Normal',  color: '#3b82f6', flag: '#3b82f6' },
  Low:    { label: 'Baixa',   color: '#6b7280', flag: '#6b7280' },
  None:   { label: '',        color: 'transparent', flag: '#374151' },
};

// Formata ISO date para pt-BR
const formatDate = (d?: string): string => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return d;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'AmanhÃ£';
  if (diff === -1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Verifica se data estÃ¡ no passado
const isOverdue = (d?: string): boolean => {
  if (!d) return false;
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return date < today;
};

const ListView = ({
  filteredTasks,
  searchQuery,
  filterPriority,
  groupBy = 'status',
  showClosed = true,
  selectedLocation,
}: ListViewProps) => {
  const { tasks, setTasks, taskStatuses, addTask, deleteTask, updateTask, addTaskStatus, customFieldDefinitions, addCustomFieldDefinition, spaces, folders, lists, rhTeam } = useAppContext();

  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<any>('text');

  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [moveMenuTaskId, setMoveMenuTaskId] = useState<string | null>(null);
  const [openPriorityId, setOpenPriorityId] = useState<string | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [openAssigneeId, setOpenAssigneeId] = useState<string | null>(null);
  const [openDateId, setOpenDateId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingNewStatus, setAddingNewStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);
  const menuRef = useRef<any>(null);

  // Fecha todos os dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
        setMoveMenuTaskId(null);
      }
      // Fecha dropdowns inline se clicar fora
      const closest = (target as HTMLElement).closest?.('[data-dropdown]');
      if (!closest) {
        setOpenPriorityId(null);
        setOpenStatusId(null);
        setOpenAssigneeId(null);
        setOpenDateId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }, []);

  const handleAddTask = useCallback((statusId: string) => {
    const name = (newTaskInputs[statusId] || '').trim();
    if (!name) { setAddingToStatus(null); return; }
    
    // Assign listId if viewing a specific list
    const listId = selectedLocation?.type === 'list' ? selectedLocation.id : undefined;

    addTask({ name, statusId, listId, assignees: [], priority: 'Normal' as any });
    setNewTaskInputs(prev => ({ ...prev, [statusId]: '' }));
    setAddingToStatus(null);
  }, [newTaskInputs, addTask, selectedLocation]);

  const handleDeleteTask = useCallback((taskId: string, taskName: string) => {
    const snapshot = tasks.find(t => t.id === taskId);
    deleteTask(taskId);
    setOpenMenuId(null);
    setTimeout(() => showToast(`"${taskName}" removida`, () => {
      if (snapshot) setTasks(prev => [...prev, snapshot]);
    }), 0);
  }, [tasks, deleteTask, setTasks, showToast]);

  const handleDuplicateTask = useCallback((task: Task) => {
    addTask({ name: `${task.name} (cÃ³pia)`, statusId: task.statusId, assignees: task.assignees, dueDate: task.dueDate, priority: task.priority as any, tags: task.tags });
    setOpenMenuId(null);
  }, [addTask]);

  const handleMoveTask = useCallback((taskId: string, newStatusId: string) => {
    updateTask(taskId, { statusId: newStatusId });
    setOpenMenuId(null);
    setMoveMenuTaskId(null);
  }, [updateTask]);

  const handleStartEditName = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingName(task.name);
  };
  const handleSaveEditName = (id: string) => {
    if (editingName.trim()) updateTask(id, { name: editingName.trim() });
    setEditingTaskId(null);
  };

  const handleDragStart = (taskId: string) => { dragItem.current = taskId; };
  const handleDragOver = (e: React.DragEvent, groupId: string) => { e.preventDefault(); setDragOverGroupId(groupId); };
  const handleDragLeave = () => setDragOverGroupId(null);
  const handleDrop = (groupId: string) => {
    if (dragItem.current && groupBy === 'status') updateTask(dragItem.current, { statusId: groupId });
    dragItem.current = null;
    setDragOverGroupId(null);
  };

  const handleAddStatus = useCallback(() => {
    if (!newStatusName.trim()) { setAddingNewStatus(false); return; }
    const colors = ['#e8384f','#f2c744','#fd7120','#20c997','#3b82f6','#8b5cf6','#ec4899'];
    addTaskStatus({ name: newStatusName.toUpperCase(), color: colors[taskStatuses.length % colors.length] });
    setNewStatusName(''); setAddingNewStatus(false);
  }, [newStatusName, taskStatuses.length, addTaskStatus]);

  const assigneesGroups = useMemo(() => {
    const avatars = new Set<string>();
    tasks.forEach(t => t.assignees.forEach(a => avatars.add(a)));
    
    return rhTeam
      .filter(rh => {
        const uAvatar = rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`;
        return avatars.has(uAvatar);
      })
      .map(rh => {
        const uAvatar = rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`;
        return { id: uAvatar, name: rh.name, color: '#3b82f6', avatar: uAvatar };
      });
  }, [tasks, rhTeam]);

  const groups = groupBy === 'assignee'
    ? [...assigneesGroups, { id: 'unassigned', name: 'NÃ£o atribuÃ­do', color: '#6b7280', avatar: '' }]
    : taskStatuses;

  const isFiltering = !!searchQuery || !!filterPriority;

  // Determine "closed" status ids
  const closedStatusIds = useMemo(() =>
    taskStatuses.filter(s => s.name.toUpperCase().includes('PRONTO') || s.name.toUpperCase().includes('CONCLU') || s.name.toUpperCase().includes('DONE')).map(s => s.id),
    [taskStatuses]
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1f] overflow-hidden">
      {/* Breadcrumbs Top Bar */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-[#2e2e35] bg-[#1a1a1f] shrink-0 text-sm">
        <span className="text-gray-400">LINE OS Workspace</span>
        {selectedLocation && (() => {
          if (selectedLocation.type === 'list') {
            const list = lists.find(l => l.id === selectedLocation.id);
            const folder = list?.folderId ? folders.find(f => f.id === list.folderId) : null;
            const space = spaces.find(s => s.id === list?.spaceId);
            return (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-gray-400">{space?.name || 'Space'}</span>
                {folder && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-gray-400">{folder.name}</span>
                  </>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-white font-medium flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list?.color || '#3b82f6' }} />
                  {list?.name}
                </span>
              </>
            );
          } else if (selectedLocation.type === 'folder') {
            const folder = folders.find(f => f.id === selectedLocation.id);
            const space = spaces.find(s => s.id === folder?.spaceId);
            return (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-gray-400">{space?.name || 'Space'}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-white font-medium flex items-center gap-1.5">
                  <FolderIcon className="w-4 h-4 text-gray-400" />
                  {folder?.name}
                </span>
              </>
            );
          } else if (selectedLocation.type === 'space') {
            const space = spaces.find(s => s.id === selectedLocation.id);
            return (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-white font-medium flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded text-[9px] flex items-center justify-center bg-gray-700 text-white">
                    {space?.icon || space?.name[0]}
                  </div>
                  {space?.name}
                </span>
              </>
            );
          }
          return null;
        })()}
        {!selectedLocation && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-white font-medium">Tudo (Everything)</span>
          </>
        )}
      </div>

      {/* Sticky Column Headers */}
      <div className="sticky top-0 z-20 bg-[#1a1a1f] border-b border-[#2e2e35] flex items-center text-xs font-medium text-gray-500 select-none">
        <div className="w-8 flex-shrink-0" />
        <div className="flex-1 min-w-[280px] px-4 py-2.5 flex items-center gap-1">
          Nome
        </div>
        <div className="w-[120px] px-2 py-2.5 flex-shrink-0">ResponsÃ¡vel</div>
        <div className="w-[130px] px-2 py-2.5 flex-shrink-0">Vencimento</div>
        <div className="w-[110px] px-2 py-2.5 flex-shrink-0">Prioridade</div>
        <div className="w-[120px] px-2 py-2.5 flex-shrink-0">Status</div>
        <div className="w-[80px] px-2 py-2.5 flex-shrink-0 text-center">Coment.</div>
        {customFieldDefinitions.map(cf => (
          <div key={cf.id} className="w-[120px] px-2 py-2.5 flex-shrink-0 truncate font-semibold" title={cf.name}>{cf.name}</div>
        ))}
        <div className="w-10 flex-shrink-0 flex items-center justify-center relative">
           <button onClick={() => setAddingField(!addingField)} className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"><Plus className="w-4 h-4" /></button>
           <AnimatePresence>
             {addingField && (
               <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                 className="absolute top-full right-0 mt-2 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-2xl z-50 w-56 p-3 flex flex-col gap-2"
               >
                 <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Novo Campo</div>
                 <input type="text" placeholder="Nome do Campo" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-primary/50" />
                 <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as 'text' | 'number' | 'date')} className="bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none">
                   <option value="text">Texto</option>
                   <option value="number">NÃºmero</option>
                   <option value="date">Data</option>
                 </select>
                 <button className="bg-primary hover:bg-primary/80 text-white rounded py-1.5 text-xs font-bold mt-1" onClick={() => {
                   if(newFieldName.trim()){
                     addCustomFieldDefinition({ name: newFieldName.trim(), type: newFieldType });
                     setAddingField(false);
                     setNewFieldName('');
                   }
                 }}>Criar</button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
        <div className="w-10 flex-shrink-0" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Filter indicator */}
        {isFiltering && (
          <div className="mx-4 mt-3 mb-1 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-primary font-medium">
            Mostrando {filteredTasks.length} de {tasks.length} tarefas
            {searchQuery && <span className="bg-primary/20 px-2 py-0.5 rounded">Busca: "{searchQuery}"</span>}
            {filterPriority && <span className="bg-primary/20 px-2 py-0.5 rounded">Prioridade: {filterPriority}</span>}
          </div>
        )}

        <div className="pb-12">
          {groups.map((group: any) => {
            let groupTasks = groupBy === 'assignee'
              ? filteredTasks.filter(t => group.id === 'unassigned' ? t.assignees.length === 0 : t.assignees.includes(group.id))
              : filteredTasks.filter(t => t.statusId === group.id);

            // Filter closed if showClosed=false
            if (!showClosed && closedStatusIds.includes(group.id)) return null;

            if (isFiltering && groupTasks.length === 0) return null;

            const isCollapsed = collapsedGroups.has(group.id);
            const isDragOver = dragOverGroupId === group.id;

            return (
              <div
                key={group.id}
                className={`transition-all ${isDragOver ? 'bg-primary/5' : ''}`}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(group.id)}
              >
                {/* Group Header â€” ClickUp Style */}
                <div className="flex items-center gap-1 px-3 py-2 sticky top-[37px] bg-[#1a1a1f] z-10 border-b border-[#2e2e35]/50 group/header">
                  <button
                    onClick={() => toggleCollapse(group.id)}
                    className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />
                    }
                  </button>

                  {/* Status Icon */}
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: group.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                  </div>

                  <span className="text-[11px] font-bold uppercase tracking-wider ml-0.5" style={{ color: group.color }}>
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-500 font-medium ml-1.5">{groupTasks.length}</span>

                  {/* Add Task inline from header */}
                  {groupBy === 'status' && (
                    <button
                      className="ml-2 opacity-0 group-hover/header:opacity-100 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-all"
                      onClick={() => { setAddingToStatus(group.id); if(isCollapsed) toggleCollapse(group.id); }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tasks */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.15 }}
                      className="relative"
                    >
                      {groupTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          taskStatuses={taskStatuses}
                          customFieldDefinitions={customFieldDefinitions}
                          editingTaskId={editingTaskId}
                          editingName={editingName}
                          setEditingName={setEditingName}
                          openMenuId={openMenuId}
                          moveMenuTaskId={moveMenuTaskId}
                          openPriorityId={openPriorityId}
                          openStatusId={openStatusId}
                          openAssigneeId={openAssigneeId}
                          openDateId={openDateId}
                          menuRef={menuRef}
                          onOpenTask={() => setSelectedTask(task)}
                          onStartEditName={() => handleStartEditName(task)}
                          onSaveEditName={() => handleSaveEditName(task.id)}
                          onUpdateTask={(updates) => updateTask(task.id, updates)}
                          onDeleteTask={() => handleDeleteTask(task.id, task.name)}
                          onDuplicateTask={() => handleDuplicateTask(task)}
                          onMoveTask={(newStatusId) => handleMoveTask(task.id, newStatusId)}
                          onToggleMenu={() => { setOpenMenuId(openMenuId === task.id ? null : task.id); setMoveMenuTaskId(null); }}
                          onToggleMoveMenu={() => setMoveMenuTaskId(moveMenuTaskId === task.id ? null : task.id)}
                          onTogglePriority={() => setOpenPriorityId(openPriorityId === task.id ? null : task.id)}
                          onToggleStatus={() => setOpenStatusId(openStatusId === task.id ? null : task.id)}
                          onToggleAssignee={() => setOpenAssigneeId(openAssigneeId === task.id ? null : task.id)}
                          onToggleDate={() => setOpenDateId(openDateId === task.id ? null : task.id)}
                          onDragStart={() => handleDragStart(task.id)}
                          closeAllDropdowns={() => {
                            setOpenMenuId(null); setMoveMenuTaskId(null);
                            setOpenPriorityId(null); setOpenStatusId(null);
                            setOpenAssigneeId(null); setOpenDateId(null);
                          }}
                        />
                      ))}

                      {/* Add Task Input */}
                      {addingToStatus === group.id ? (
                        <div className="flex items-center border-b border-[#2e2e35] bg-[#1e1e25] px-3 py-2 gap-2">
                          <div className="w-5 flex-shrink-0" />
                          <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            value={newTaskInputs[group.id] || ''}
                            onChange={e => setNewTaskInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddTask(group.id); }
                              if (e.key === 'Escape') { setAddingToStatus(null); setNewTaskInputs(prev => ({ ...prev, [group.id]: '' })); }
                            }}
                            onBlur={() => {
                              if ((newTaskInputs[group.id] || '').trim()) handleAddTask(group.id);
                              else setAddingToStatus(null);
                            }}
                            placeholder="Nome da tarefa"
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-600"
                          />
                          <span className="text-xs text-gray-600">Enter para salvar â€¢ Esc para cancelar</span>
                        </div>
                      ) : (
                        <button
                          className="w-full flex items-center gap-2 px-6 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] transition-colors border-b border-[#2e2e35]/50 group/add"
                          onClick={() => setAddingToStatus(group.id)}
                        >
                          <Plus className="w-3.5 h-3.5 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                          Adicionar tarefa
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* No results */}
          {isFiltering && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="text-4xl mb-3">ðŸ”</div>
              <div className="text-sm font-medium text-gray-400">Nenhuma tarefa encontrada</div>
              <div className="text-xs mt-1">Tente ajustar seus filtros</div>
            </div>
          )}

          {/* New Status button */}
          {!isFiltering && (
            <div className="px-4 pt-4">
              {addingNewStatus ? (
                <input
                  type="text"
                  autoFocus
                  value={newStatusName}
                  onChange={e => setNewStatusName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddStatus(); if (e.key === 'Escape') { setAddingNewStatus(false); setNewStatusName(''); } }}
                  onBlur={handleAddStatus}
                  placeholder="Nome do status..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none text-sm text-white placeholder-gray-600 w-56 focus:border-primary/50"
                />
              ) : (
                <button
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors px-1 py-1 rounded hover:bg-white/5"
                  onClick={() => setAddingNewStatus(true)}
                >
                  <Plus className="w-4 h-4" />
                  Novo status
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={filteredTasks.find(t => t.id === selectedTask.id) || selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onRelatedTaskClick={taskId => {
            const rt = tasks.find(t => t.id === taskId);
            if (rt) setSelectedTask(rt);
          }}
        />
      )}
    </div>
  );
};

// â”€â”€â”€ TaskRow Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TaskRowProps {
  task: Task;
  taskStatuses: any[];
  customFieldDefinitions: any[];
  editingTaskId: string | null;
  editingName: string;
  setEditingName: (v: string) => void;
  openMenuId: string | null;
  moveMenuTaskId: string | null;
  openPriorityId: string | null;
  openStatusId: string | null;
  openAssigneeId: string | null;
  openDateId: string | null;
  menuRef: React.RefObject<HTMLDivElement>;
  onOpenTask: () => void;
  onStartEditName: () => void;
  onSaveEditName: () => void;
  onUpdateTask: (updates: Partial<Task>) => void;
  onDeleteTask: () => void;
  onDuplicateTask: () => void;
  onMoveTask: (statusId: string) => void;
  onToggleMenu: () => void;
  onToggleMoveMenu: () => void;
  onTogglePriority: () => void;
  onToggleStatus: () => void;
  onToggleAssignee: () => void;
  onToggleDate: () => void;
  onDragStart: () => void;
  closeAllDropdowns: () => void;
}

const TaskRow = ({
  task, taskStatuses, customFieldDefinitions, editingTaskId, editingName, setEditingName,
  openMenuId, moveMenuTaskId, openPriorityId, openStatusId, openAssigneeId, openDateId,
  menuRef, onOpenTask, onStartEditName, onSaveEditName, onUpdateTask,
  onDeleteTask, onDuplicateTask, onMoveTask, onToggleMenu, onToggleMoveMenu,
  onTogglePriority, onToggleStatus, onToggleAssignee, onToggleDate, onDragStart, closeAllDropdowns,
}: TaskRowProps) => {
  const { rhTeam } = useAppContext();
  const status = taskStatuses.find(s => s.id === task.statusId);
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.None;
  const isEditing = editingTaskId === task.id;
  const overdue = isOverdue(task.dueDate);
  const dateLabel = formatDate(task.dueDate);
  const isMenuOpen = openMenuId === task.id;
  const isPriorityOpen = openPriorityId === task.id;
  const isStatusOpen = openStatusId === task.id;
  const isAssigneeOpen = openAssigneeId === task.id;
  const isDateOpen = openDateId === task.id;

  const nextStatus = () => {
    const idx = taskStatuses.findIndex(s => s.id === task.statusId);
    const next = taskStatuses[(idx + 1) % taskStatuses.length];
    onUpdateTask({ statusId: next.id });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center border-b border-[#2e2e35]/60 hover:bg-white/[0.02] group/row transition-colors cursor-default relative"
      style={{ minHeight: '37px' }}
    >
      {/* Drag handle (hidden until hover) */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab" />
      </div>

      {/* Status Circle */}
      <div
        className="flex-shrink-0 w-4 h-4 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center mr-2"
        style={{ borderColor: status?.color || '#555' }}
        onClick={nextStatus}
        title={`Status: ${status?.name} â€” clique para avanÃ§ar`}
      >
        <CheckCircle2 className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-60" style={{ color: status?.color }} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-[200px] pr-2 flex items-center gap-2 py-2">
        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onBlur={onSaveEditName}
            onKeyDown={e => { if (e.key === 'Enter') onSaveEditName(); if (e.key === 'Escape') { setEditingName(task.name); onSaveEditName(); } }}
            className="flex-1 bg-[#111] border border-primary/50 rounded px-2 py-0.5 text-sm text-white outline-none ring-1 ring-primary/20"
          />
        ) : (
          <span
            className="text-[13px] text-gray-200 font-medium cursor-pointer hover:text-white hover:underline decoration-dotted underline-offset-2 transition-colors truncate"
            onClick={onOpenTask}
            onDoubleClick={onStartEditName}
            title={task.name}
          >
            {task.name}
          </span>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/5">
              <ListTodo className="w-3 h-3" />
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </span>
          )}
          {task.isTimerRunning && (
            <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" /> Gravando
            </span>
          )}
          {task.tags?.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded border"
              style={{ color: tag.color, backgroundColor: tag.color + '20', borderColor: tag.color + '40' }}>
              {tag.label || tag.color}
            </span>
          ))}
        </div>
      </div>

      {/* Assignee */}
      <div className="w-[120px] flex-shrink-0 px-2 relative" data-dropdown>
        <div
          className="flex items-center gap-1 cursor-pointer"
          onClick={onToggleAssignee}
        >
          {(() => {
            const validAssignees = task.assignees.filter(av => 
              rhTeam.some(rh => (rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`) === av)
            );
            return validAssignees.length > 0 ? (
              <>
                {validAssignees.slice(0, 3).map((av, i) => (
                  <img key={i} src={av} alt="Assignee"
                    className="w-5 h-5 rounded-full object-cover border border-[#1a1a1f] -ml-1 first:ml-0 hover:scale-110 transition-transform" />
                ))}
                {validAssignees.length > 3 && (
                  <span className="text-[10px] text-gray-400 bg-white/10 rounded-full w-5 h-5 flex items-center justify-center -ml-1">
                    +{validAssignees.length - 3}
                  </span>
                )}
              </>
            ) : (
              <div className="opacity-0 group-hover/row:opacity-100 transition-opacity w-5 h-5 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-600">
                <User className="w-3 h-3" />
              </div>
            );
          })()}
        </div>
        <AnimatePresence>
          {isAssigneeOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-2xl z-50 w-48 py-1.5 backdrop-blur"
              data-dropdown
            >
              <div className="px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wide">ResponsÃ¡veis</div>
              {rhTeam.map(user => {
                const uAvatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`;
                const assigned = task.assignees.includes(uAvatar);
                return (
                  <button key={user.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors ${assigned ? 'text-white bg-primary/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                    onClick={() => {
                      const newAssignees = assigned
                        ? task.assignees.filter(a => a !== uAvatar)
                        : [...task.assignees, uAvatar];
                      onUpdateTask({ assignees: newAssignees });
                    }}
                  >
                    <img src={uAvatar} className="w-6 h-6 rounded-full object-cover" />
                    <span>{user.name}</span>
                    {assigned && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Due Date */}
      <div className="w-[130px] flex-shrink-0 px-2 relative" data-dropdown>
        <div
          className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium py-1 px-2 rounded transition-colors ${
            overdue ? 'text-red-400 bg-red-500/10' : dateLabel ? 'text-gray-300 hover:bg-white/5' : 'opacity-0 group-hover/row:opacity-100 text-gray-600 hover:text-gray-400'
          }`}
          onClick={onToggleDate}
        >
          <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
          {dateLabel || <span className="text-gray-600">Setar data</span>}
        </div>
        <AnimatePresence>
          {isDateOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-2xl z-50 p-3 backdrop-blur"
              data-dropdown
            >
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">Data de Vencimento</div>
              <input
                type="date"
                value={task.dueDate && !isNaN(new Date(task.dueDate).getTime()) ? task.dueDate : ''}
                onChange={e => {
                  onUpdateTask({ dueDate: e.target.value || undefined });
                  onToggleDate();
                }}
                className="bg-[#111] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-primary/50 w-full"
              />
              {task.dueDate && (
                <button className="mt-2 w-full text-xs text-red-400 hover:text-red-300 transition-colors py-1"
                  onClick={() => { onUpdateTask({ dueDate: undefined }); onToggleDate(); }}>
                  Remover data
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Priority */}
      <div className="w-[110px] flex-shrink-0 px-2 relative" data-dropdown>
        <div
          className="flex items-center gap-1.5 cursor-pointer group/prio py-1 px-2 rounded hover:bg-white/5 transition-colors"
          onClick={onTogglePriority}
        >
          <Flag
            className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
            style={{ color: prio.flag, fill: task.priority !== 'None' ? prio.flag : 'none' }}
          />
          {task.priority !== 'None' && (
            <span className="text-xs font-medium" style={{ color: prio.color }}>{prio.label}</span>
          )}
          {task.priority === 'None' && (
            <span className="text-xs text-gray-600 opacity-0 group-hover/row:opacity-100 transition-opacity">Setar</span>
          )}
        </div>
        <AnimatePresence>
          {isPriorityOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-2xl z-50 w-40 py-1.5 backdrop-blur"
              data-dropdown
            >
              <div className="px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wide">Prioridade</div>
              {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                <button key={key}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors ${task.priority === key ? 'text-white bg-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                  onClick={() => { onUpdateTask({ priority: key as any }); onTogglePriority(); }}
                >
                  <Flag className="w-3.5 h-3.5" style={{ color: val.flag, fill: key !== 'None' ? val.flag : 'none' }} />
                  {key === 'None' ? 'Nenhuma' : val.label}
                  {task.priority === key && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status */}
      <div className="w-[120px] flex-shrink-0 px-2 relative" data-dropdown>
        <div
          className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md text-[11px] font-bold border border-transparent hover:border-white/10 transition-all"
          style={{ backgroundColor: (status?.color || '#555') + '20', color: status?.color || '#888' }}
          onClick={onToggleStatus}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status?.color }} />
          <span className="truncate max-w-[80px]">{status?.name || 'Sem Status'}</span>
        </div>
        <AnimatePresence>
          {isStatusOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 top-full mt-1 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-2xl z-50 w-44 py-1.5 backdrop-blur"
              data-dropdown
            >
              <div className="px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wide">Status</div>
              {taskStatuses.map(s => (
                <button key={s.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors ${task.statusId === s.id ? 'text-white bg-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                  onClick={() => { onUpdateTask({ statusId: s.id }); onToggleStatus(); }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {task.statusId === s.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comments */}
      <div className="w-[80px] flex-shrink-0 px-2 flex items-center justify-center">
        <button
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors py-1 px-2 rounded hover:bg-white/5"
          onClick={onOpenTask}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {task.comments && task.comments.length > 0 && (
            <span className="font-medium">{task.comments.length}</span>
          )}
        </button>
      </div>

      {/* Custom Fields */}
      {customFieldDefinitions.map(cf => {
        const val = task.customFields?.[cf.id] ?? '';
        return (
          <div key={cf.id} className="w-[120px] flex-shrink-0 px-2 flex items-center">
            {cf.type === 'text' || cf.type === 'number' ? (
              <input 
                type={cf.type === 'number' ? 'number' : 'text'}
                className="w-full bg-transparent border border-transparent hover:border-white/10 rounded px-1.5 py-1 text-[11px] text-gray-300 outline-none focus:border-primary/50 focus:bg-white/[0.02] transition-colors"
                value={val}
                placeholder="-"
                onChange={e => {
                  const updatedFields = { ...(task.customFields || {}), [cf.id]: e.target.value };
                  onUpdateTask({ customFields: updatedFields });
                }}
              />
            ) : cf.type === 'date' ? (
              <input
                type="date"
                className="w-full bg-transparent border border-transparent hover:border-white/10 rounded px-1.5 py-1 text-[11px] text-gray-300 outline-none focus:border-primary/50 focus:bg-white/[0.02] transition-colors"
                value={val}
                onChange={e => {
                  const updatedFields = { ...(task.customFields || {}), [cf.id]: e.target.value };
                  onUpdateTask({ customFields: updatedFields });
                }}
              />
            ) : (
               <div className="text-[11px] text-gray-500">{val}</div>
            )}
          </div>
        );
      })}

      {/* Context Menu */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center relative"
        ref={isMenuOpen ? menuRef : undefined}
      >
        <button
          className={`p-1.5 rounded transition-all ${isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover/row:opacity-100 text-gray-500 hover:text-white hover:bg-white/10'}`}
          onClick={e => { e.stopPropagation(); onToggleMenu(); }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-8 top-0 bg-[#1e1e2a] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 w-48 py-1.5 backdrop-blur-xl overflow-hidden"
            >
              <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={() => { onStartEditName(); onToggleMenu(); }}>
                <Edit3 className="w-3.5 h-3.5 text-gray-500" /> Renomear
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={onDuplicateTask}>
                <Copy className="w-3.5 h-3.5 text-gray-500" /> Duplicar
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                onClick={onToggleMoveMenu}>
                <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" /> Mover para...
              </button>
              <AnimatePresence>
                {moveMenuTaskId === task.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/20 border-t border-white/5"
                  >
                    {taskStatuses.filter(s => s.id !== task.statusId).map(s => (
                      <button key={s.id} className="w-full flex items-center gap-3 px-6 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                        onClick={() => onMoveTask(s.id)}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="border-t border-white/5 my-1" />
              <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={onDeleteTask}>
                <Trash2 className="w-3.5 h-3.5" /> Deletar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ListView;

