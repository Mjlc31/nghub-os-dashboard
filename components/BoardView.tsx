import React, { useState, useRef, useMemo } from 'react';
import { Plus, MoreHorizontal, Flag, GripVertical, CalendarDays, ListTodo, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { TaskModal } from './ui/TaskModal';
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, DragStartEvent, DragOverEvent, DragEndEvent, useDroppable
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityConfig: Record<string, { color: string; label: string }> = {
  Urgent: { color: '#ef4444', label: 'Urgente' },
  High: { color: '#eab308', label: 'Alta' },
  Normal: { color: '#3b82f6', label: 'Normal' },
  Low: { color: '#9ca3af', label: 'Baixa' },
  None: { color: 'transparent', label: '' },
};

const DroppableColumn = ({ id, children, isOver }: any) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[300px] max-w-[320px] w-[320px] flex-shrink-0 rounded-2xl transition-all duration-300 ${
        isOver ? 'bg-white/[0.04] ring-1 ring-primary/40 scale-[1.01]' : 'bg-white/[0.01] hover:bg-white/[0.02]'
      } border border-white/5`}
    >
      {children}
    </div>
  );
};

const TaskCardContent = ({ task, isOverlay = false }: { task: Task, isOverlay?: boolean }) => {
  const { rhTeam } = useAppContext();
  const prio = priorityConfig[task.priority] || priorityConfig.None;
  return (
    <>
      {task.priority !== 'None' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: prio.color }}
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm text-gray-200 font-semibold leading-relaxed group-hover:text-white transition-colors">
          {task.name}
        </h4>
        <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md border"
              style={{ color: tag.color, backgroundColor: tag.color + '20', borderColor: tag.color + '30' }}
            >
              {tag.label || tag.color}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
         {task.subtasks && task.subtasks.length > 0 && (
           <div className="flex items-center gap-1 hover:text-gray-300 transition-colors">
             <ListTodo className="w-3.5 h-3.5" />
             <span className="font-medium">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
           </div>
         )}
         <div className="flex items-center gap-1 hover:text-gray-300 transition-colors">
           <MessageSquare className="w-3.5 h-3.5" />
           <span className="font-medium">{task.comments?.length ?? 0}</span>
         </div>
         {task.dueDate && (
           <div className={`flex items-center gap-1 ml-auto font-medium px-2 py-0.5 rounded-md ${
             task.dueDate.includes('atrás') ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-white/5'
           }`}>
             <CalendarDays className="w-3 h-3" />
             {task.dueDate}
           </div>
         )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          {task.priority !== 'None' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide px-2 py-1 rounded-md bg-white/5" style={{ color: prio.color }}>
              <Flag className="w-3 h-3" style={{ fill: prio.color }} />
              {prio.label}
            </div>
          ) : (
             <div className="w-5 h-5" />
          )}
        </div>
        <div className="flex -space-x-1.5">
          {(() => {
            const validAssignees = (task.assignees || []).filter(av => 
              rhTeam.some(rh => (rh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rh.name)}&background=3b82f6&color=fff`) === av)
            );
            return (
              <>
                {validAssignees.slice(0, 3).map((avatar, i) => (
                  <img
                    key={i}
                    src={avatar}
                    alt="Assignee"
                    className="w-6 h-6 rounded-full object-cover border-2 border-[#141414] shadow-sm hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                  />
                ))}
                {validAssignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-[#141414] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white z-0">
                    +{validAssignees.length - 3}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
};

const SortableTask = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`relative bg-[#141414] border rounded-xl p-4 transition-all duration-200 group overflow-hidden ${
        isDragging ? 'cursor-grabbing shadow-inner' : 'cursor-grab border-white/5 shadow-sm hover:border-gray-600 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5'
      }`}
    >
      <TaskCardContent task={task} />
    </div>
  );
};

interface BoardViewProps {
  filteredTasks: Task[];
  searchQuery: string;
  filterPriority: string | null;
  groupBy?: 'status' | 'assignee';
}

const BoardView = ({ filteredTasks, searchQuery, filterPriority, groupBy = 'status' }: BoardViewProps) => {
  const { tasks, setTasks, taskStatuses, addTask, updateTask, rhTeam } = useAppContext();
  const [newTaskName, setNewTaskName] = useState('');
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const isFiltering = !!searchQuery || !!filterPriority;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const assigneesGroups = useMemo(() => {
    const avatars = new Set<string>();
    tasks.forEach(t => {
      if (t.assignees && Array.isArray(t.assignees)) {
        t.assignees.forEach(a => avatars.add(a));
      }
    });
    
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
    ? [...assigneesGroups, { id: 'unassigned', name: 'Não atribuído', color: '#6b7280', avatar: '' }]
    : taskStatuses;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverColumnId(null); return; }

    const overId = over.id as string;
    
    // Se o mouse estiver sobre outra tarefa ou diretamente na coluna
    const isOverAColumn = groups.find((g: any) => g.id === overId);
    
    if (isOverAColumn) {
      setOverColumnId(overId);
    } else {
      // Procurar em qual coluna essa tarefa-alvo está
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        if (groupBy === 'status') {
          setOverColumnId(overTask.statusId);
        } else {
          // Simplificando assignee logic drag over
          const firstAssignee = overTask.assignees?.[0] || 'unassigned';
          setOverColumnId(firstAssignee);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    let targetColumnId = '';

    const isOverColumn = groups.find((g: any) => g.id === overId);
    if (isOverColumn) {
      targetColumnId = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetColumnId = groupBy === 'status' ? overTask.statusId : (overTask.assignees?.[0] || 'unassigned');
      }
    }

    if (targetColumnId && activeTask.statusId !== targetColumnId && groupBy === 'status') {
      updateTask(activeTaskId, { statusId: targetColumnId });
      // Mantemos o setTasks para feedback visual imediato
      setTasks((prev: Task[]) =>
        prev.map((t: Task) => (t.id === activeTaskId ? { ...t, statusId: targetColumnId } : t))
      );
    } else if (targetColumnId && groupBy === 'assignee') {
      const firstAssignee = activeTask.assignees?.[0] || 'unassigned';
      if (firstAssignee !== targetColumnId) {
        const newAssignees = targetColumnId === 'unassigned' ? [] : [targetColumnId];
        updateTask(activeTaskId, { assignees: newAssignees });
        // Mantemos o setTasks para feedback visual imediato
        setTasks((prev: Task[]) =>
          prev.map((t: Task) => (t.id === activeTaskId ? { ...t, assignees: newAssignees } : t))
        );
      }
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div className="flex gap-5 p-8 h-full overflow-x-auto custom-scrollbar bg-[#0a0a0a]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {groups.map((group: any) => {
          const columnTasks = groupBy === 'assignee'
            ? filteredTasks.filter(t => group.id === 'unassigned' ? (!t.assignees || t.assignees.length === 0) : (t.assignees && t.assignees.includes(group.id)))
            : filteredTasks.filter(t => t.statusId === group.id);
            
          const isOver = overColumnId === group.id;

          if (isFiltering && columnTasks.length === 0) return null;

          return (
            <DroppableColumn key={group.id} id={group.id} isOver={isOver}>
              <div className="flex items-center justify-between px-4 py-4 sticky top-0 bg-transparent z-10 backdrop-blur-sm rounded-t-2xl">
                <div className="flex items-center gap-3">
                  {groupBy === 'assignee' && group.avatar ? (
                    <img src={group.avatar} className="w-6 h-6 rounded-full border border-white/20 shadow-sm" alt="Avatar" />
                  ) : (
                    <div className="w-3 h-3 rounded-md shadow-[0_0_10px_currentColor]" style={{ color: group.color, backgroundColor: group.color }} />
                  )}
                  <span className="text-sm font-bold tracking-wide" style={{ color: groupBy === 'status' ? group.color : '#e5e7eb' }}>
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md font-medium border border-white/5">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                  {groupBy === 'status' && (
                    <button
                      onClick={() => setAddingToColumn(group.id)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-3">
                <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {columnTasks.map(task => (
                    <SortableTask key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}
                </SortableContext>

                {addingToColumn === group.id && (
                  <div className="bg-[#141414] border border-primary/50 rounded-xl p-4 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-primary/20">
                    <input
                      type="text"
                      autoFocus
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTaskName.trim()) {
                            const newTask: Omit<Task, 'id'> = {
                              name: newTaskName,
                              statusId: group.id,
                              assignees: ['https://i.pravatar.cc/150?img=11'],
                              dueDate: '',
                              priority: 'Normal' as any,
                              subtasks: [],
                              comments: [],
                              attachments: [],
                              description: '',
                              createdAt: new Date().toISOString(),
                            };
                            addTask(newTask);
                            setNewTaskName('');
                          } else {
                             setAddingToColumn(null);
                          }
                        }
                        if (e.key === 'Escape') { setAddingToColumn(null); setNewTaskName(''); }
                      }}
                      onBlur={() => {
                          if (newTaskName.trim()) {
                              const newTask: Omit<Task, 'id'> = {
                                name: newTaskName,
                                statusId: group.id,
                                assignees: ['https://i.pravatar.cc/150?img=11'],
                                dueDate: '',
                                priority: 'Normal' as any,
                                subtasks: [],
                                comments: [],
                                attachments: [],
                                description: '',
                                createdAt: new Date().toISOString(),
                              };
                              addTask(newTask);
                          }
                          setNewTaskName('');
                          setAddingToColumn(null);
                      }}
                      placeholder="Nome da tarefa... (Enter para salvar)"
                      className="bg-transparent border-none outline-none text-[13px] text-white w-full placeholder-gray-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {addingToColumn !== group.id && groupBy === 'status' && (
                <button
                  onClick={() => setAddingToColumn(group.id)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-colors mx-2 mb-2 rounded-xl group/add"
                >
                  <Plus className="w-4 h-4 group-hover/add:rotate-90 transition-transform" />
                  Adicionar tarefa
                </button>
              )}
            </DroppableColumn>
          );
        })}

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? (
            <div className="bg-[#1c1c1c] border border-primary/50 rounded-xl p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_2px_var(--color-primary)] rotate-3 scale-105 w-[clamp(240px,20vw,320px)] cursor-grabbing backdrop-blur-md">
              <TaskCardContent task={activeTask} isOverlay={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal
          task={filteredTasks.find(t => t.id === selectedTask.id) || selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onRelatedTaskClick={(taskId) => {
            const rt = tasks.find(t => t.id === taskId);
            if (rt) setSelectedTask(rt);
          }}
        />
      )}
    </div>
  );
};

export default BoardView;
