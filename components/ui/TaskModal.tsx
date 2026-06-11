// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Flag, Calendar, Users, Tag as TagIcon, Paperclip,
  Link2, MessageSquare, Send, Trash2, Plus, CheckCircle2,
  Clock, AlertCircle, ChevronDown, Image as ImageIcon, FileText, Video,
  Play, Square, ListTodo, Circle
} from 'lucide-react';
import { Task, Priority, TaskComment, TaskAttachment } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import useEscapeKey from '../../hooks/useEscapeKey';
import { useToast } from '../Toast';

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onRelatedTaskClick?: (taskId: string) => void;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  Urgent: { label: 'Urgente',  color: 'text-red-400',    icon: 'ðŸ”´' },
  High:   { label: 'Alta',     color: 'text-yellow-400', icon: 'ðŸŸ¡' },
  Normal: { label: 'Normal',   color: 'text-blue-400',   icon: 'ðŸ”µ' },
  Low:    { label: 'Baixa',    color: 'text-gray-400',   icon: 'âšª' },
  None:   { label: 'Nenhuma',  color: 'text-gray-600',   icon: 'â€”'  },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (type === 'video') return <Video className="w-4 h-4 text-purple-400" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
};

// â”€â”€â”€ TaskModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TaskModal: React.FC<TaskModalProps> = ({ task, isOpen, onClose, onRelatedTaskClick }) => {
  const { updateTask, addComment, addAttachment, removeAttachment, taskStatuses, tasks, addTask, customFieldDefinitions, rhTeam } = useAppContext();
  const { profile } = useAuth();
  const { showToast, ToastContainer } = useToast();
  useEscapeKey(onClose);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.name);
  const [descVal, setDescVal] = useState(task.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHeaderStatusMenu, setShowHeaderStatusMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [dueDateVal, setDueDateVal] = useState(task.dueDate || '');
  const [relatedInput, setRelatedInput] = useState('');
  const [showRelatedSearch, setShowRelatedSearch] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [activeTimer, setActiveTimer] = useState(task.isTimerRunning || false);
  const [localTimeSpent, setLocalTimeSpent] = useState(task.timeSpent || 0);

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => setLocalTimeSpent(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    setLocalTimeSpent(task.timeSpent || 0);
    setActiveTimer(task.isTimerRunning || false);
  }, [task.id, task.timeSpent, task.isTimerRunning]);

  const handleToggleTimer = () => {
    const nextState = !activeTimer;
    setActiveTimer(nextState);
    updateTask(task.id, { isTimerRunning: nextState, timeSpent: localTimeSpent });
  };
  
  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentStatus = taskStatuses.find(s => s.id === task.statusId);
  const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.None;

  // Sync local state when task changes from outside
  useEffect(() => {
    setTitleVal(task.name);
    setDescVal(task.description || '');
    setDueDateVal(task.dueDate || '');
  }, [task.id, task.name, task.description, task.dueDate]);

  // Scroll to bottom of comments
  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task.comments?.length, activeTab]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleTitleSave = () => {
    if (titleVal.trim()) updateTask(task.id, { name: titleVal.trim() });
    setEditingTitle(false);
  };

  const handleDescSave = () => {
    updateTask(task.id, { description: descVal });
    setEditingDesc(false);
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addComment(task.id, commentText.trim());
    setCommentText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image'
               : file.type.startsWith('video/') ? 'video'
               : file.type === 'application/pdf' ? 'pdf'
               : 'file';
    const url = URL.createObjectURL(file);
    const uploadId = `upload-${Date.now()}`;
    
    setUploadingFiles(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);
    
    // Simula progresso de upload
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
          addAttachment(task.id, { name: file.name, url, type, size: file.size });
        }, 500);
      }
      setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress } : f));
    }, 300);
    
    e.target.value = '';
  };

  const toggleAssignee = (avatar: string) => {
    const current = task.assignees || [];
    const newAssignees = current.includes(avatar)
      ? current.filter(a => a !== avatar)
      : [...current, avatar];
    updateTask(task.id, { assignees: newAssignees });
  };

  const addRelatedTask = (relId: string) => {
    if (relId === task.id) return;
    const current = task.relatedTaskIds || [];
    if (!current.includes(relId)) {
      updateTask(task.id, { relatedTaskIds: [...current, relId] });
    }
    setRelatedInput('');
    setShowRelatedSearch(false);
  };

  const removeRelatedTask = (relId: string) => {
    updateTask(task.id, { relatedTaskIds: (task.relatedTaskIds || []).filter(id => id !== relId) });
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const existing = task.tags || [];
    const colors = ['#e31837', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    const bg = ['#e3183720', '#3b82f620', '#8b5cf620', '#10b98120', '#f59e0b20', '#ec489920'];
    const i = existing.length % colors.length;
    updateTask(task.id, {
      tags: [...existing, { name: tagInput.trim(), color: colors[i], bgColor: bg[i] }]
    });
    setTagInput('');
  };

  const removeTag = (tagName: string) => {
    updateTask(task.id, { tags: (task.tags || []).filter(t => t.name !== tagName) });
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    const existing = task.subtasks || [];
    updateTask(task.id, {
      subtasks: [...existing, { id: `st-${Date.now()}`, title: subtaskInput.trim(), completed: false }]
    });
    setSubtaskInput('');
  };

  const toggleSubtask = (stId: string) => {
    const existing = task.subtasks || [];
    updateTask(task.id, {
      subtasks: existing.map(st => st.id === stId ? { ...st, completed: !st.completed } : st)
    });
  };

  const removeSubtask = (stId: string) => {
    updateTask(task.id, { subtasks: (task.subtasks || []).filter(st => st.id !== stId) });
  };

  const relatedTasks = tasks.filter(t =>
    (task.relatedTaskIds || []).includes(t.id)
  );

  const searchableTasks = tasks.filter(t =>
    t.id !== task.id &&
    !(task.relatedTaskIds || []).includes(t.id) &&
    relatedInput.length > 0 &&
    t.name.toLowerCase().includes(relatedInput.toLowerCase())
  ).slice(0, 5);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay + Modal Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-5xl max-h-[90vh] flex rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06]"
              style={{ background: 'var(--surface-1)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* â”€â”€ Coluna Principal (conteÃºdo) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">
                {/* CabeÃ§alho */}
                <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
                  {/* Status badge */}
                  <div className="relative mt-0.5 flex-shrink-0">
                    <button
                      onClick={() => setShowHeaderStatusMenu(!showHeaderStatusMenu)}
                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors hover:bg-white/5"
                      style={{ borderColor: currentStatus?.color || '#555' }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" style={{ color: currentStatus?.color }} />
                    </button>
                    {showHeaderStatusMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-[100] min-w-[200px] py-1 overflow-hidden"
                      >
                        {taskStatuses.map(s => (
                          <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { statusId: s.id }); setShowHeaderStatusMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors text-left"
                          >
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="whitespace-nowrap">{s.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* TÃ­tulo */}
                  <div className="flex-1 min-w-0">
                    {editingTitle ? (
                      <input
                        ref={titleRef}
                        autoFocus
                        value={titleVal}
                        onChange={e => setTitleVal(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                        className="w-full bg-transparent text-white text-xl font-semibold outline-none border-b border-primary/50 pb-1"
                      />
                    ) : (
                      <h2
                        className="text-xl font-semibold text-white cursor-pointer hover:text-gray-200 transition-colors line-clamp-2"
                        onClick={() => setEditingTitle(true)}
                      >
                        {task.name}
                      </h2>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: currentStatus?.color || '#555' }}
                      >
                        {currentStatus?.name || 'Sem status'}
                      </span>
                      {task.createdAt && (
                        <span className="text-[10px] text-gray-500">
                          Criada em {formatDate(task.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.06] flex-shrink-0 px-6">
                  {(['details', 'comments', 'attachments'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                        activeTab === tab
                          ? 'text-white border-primary'
                          : 'text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      {tab === 'details' && 'Detalhes'}
                      {tab === 'comments' && `Atividades${task.comments?.length ? ` (${task.comments.length})` : ''}`}
                      {tab === 'attachments' && `Anexos${task.attachments?.length ? ` (${task.attachments.length})` : ''}`}
                    </button>
                  ))}
                </div>

                {/* ConteÃºdo das tabs */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">

                  {/* â”€â”€ Tab: Detalhes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* DescriÃ§Ã£o */}
                      <div>
                        <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
                          DescriÃ§Ã£o
                        </label>
                        {editingDesc ? (
                          <div className="relative">
                            <RichTextEditor
                              value={descVal}
                              onChange={setDescVal}
                              placeholder="Adicione uma descriÃ§Ã£o rica..."
                              minHeight="120px"
                            />
                            <div className="flex gap-2 mt-2">
                              <button onClick={handleDescSave} className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg font-medium">Salvar</button>
                              <button onClick={() => { setEditingDesc(false); setDescVal(task.description || ''); }} className="px-3 py-1.5 text-gray-400 text-xs hover:text-white">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="min-h-[60px] rounded-lg p-3 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all flex flex-col justify-center"
                          >
                            {task.description ? (
                              <div 
                                dangerouslySetInnerHTML={{ __html: task.description }} 
                                className="prose prose-invert prose-sm max-w-none cursor-pointer"
                                onClick={() => setEditingDesc(true)}
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <p 
                                  className="text-sm text-gray-600 italic cursor-pointer hover:text-gray-400"
                                  onClick={() => setEditingDesc(true)}
                                >
                                  Clique para adicionar uma descriÃ§Ã£o...
                                </p>
                                <div className="h-4 w-px bg-gray-700" />
                                <button
                                  onClick={() => {
                                    const template = `<h3><strong>Objetivo da Tarefa</strong></h3><p></p><ul><li><p>Detalhar o escopo da entrega.</p></li></ul><p></p><h3><strong>Requisitos</strong></h3><p></p><ol><li><p>Item 1</p></li><li><p>Item 2</p></li></ol><p></p><h3><strong>CritÃ©rios de Aceite</strong></h3><p></p><ul><li><p>[ ] Deve cumprir X</p></li></ul>`;
                                    setDescVal(template);
                                    updateTask(task.id, { description: template });
                                  }}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Usar template padrÃ£o
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Subtarefas */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">
                            Subtarefas
                          </label>
                          {(task.subtasks || []).length > 0 && (
                            <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                              {(task.subtasks || []).filter(st => st.completed).length}/{(task.subtasks || []).length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 mb-2">
                          {(task.subtasks || []).map(st => (
                            <div key={st.id} className="flex items-center gap-2 group hover:bg-white/[0.03] p-1.5 rounded transition-colors border border-transparent hover:border-white/[0.06]">
                              <button onClick={() => toggleSubtask(st.id)} className="text-gray-400 hover:text-primary transition-colors flex-shrink-0">
                                {st.completed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
                              </button>
                              <span className={`text-sm flex-1 ${st.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                {st.title}
                              </span>
                              <button
                                onClick={() => removeSubtask(st.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <ListTodo className="w-4 h-4 text-gray-500" />
                          <input
                            value={subtaskInput}
                            onChange={e => setSubtaskInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                            placeholder="Adicionar subtarefa..."
                            className="bg-transparent border-none text-sm text-gray-300 outline-none w-full placeholder-gray-600"
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(task.tags || []).map(tag => (
                            <span
                              key={tag.name}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded border group cursor-pointer"
                              style={{ color: tag.color, backgroundColor: tag.bgColor, borderColor: tag.color + '40' }}
                            >
                              {tag.name}
                              <X
                                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeTag(tag.name)}
                              />
                            </span>
                          ))}
                          <div className="flex items-center gap-1">
                            <input
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                              placeholder="+ Tag"
                              className="bg-transparent border border-dashed border-[#444] rounded px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-gray-400 w-20 placeholder-gray-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tarefas Relacionadas */}
                      <div>
                        <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
                          Tarefas Relacionadas
                        </label>
                        <div className="space-y-1.5 mb-2">
                          {relatedTasks.map(rt => {
                            const rtStatus = taskStatuses.find(s => s.id === rt.statusId);
                            return (
                              <div key={rt.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] group">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rtStatus?.color || '#555' }} />
                                <span 
                                  className="text-sm text-gray-300 flex-1 truncate cursor-pointer hover:text-white hover:underline transition-colors"
                                  onClick={() => onRelatedTaskClick?.(rt.id)}
                                >
                                  {rt.name}
                                </span>
                                <button
                                  onClick={() => removeRelatedTask(rt.id)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="relative">
                          <input
                            value={relatedInput}
                            onChange={e => { setRelatedInput(e.target.value); setShowRelatedSearch(true); }}
                            onFocus={() => setShowRelatedSearch(true)}
                            placeholder="Buscar tarefa para vincular..."
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-primary/50 placeholder-gray-600"
                          />
                          {showRelatedSearch && searchableTasks.length > 0 && (
                            <div className="absolute top-full mt-1 left-0 right-0 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-30 overflow-hidden">
                              {searchableTasks.map(rt => (
                                <button
                                  key={rt.id}
                                  onClick={() => addRelatedTask(rt.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors text-left"
                                >
                                  <Link2 className="w-3.5 h-3.5 text-gray-500" />
                                  {rt.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* â”€â”€ Tab: ComentÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                  {activeTab === 'comments' && (
                    <div className="flex flex-col gap-4">
                      {(task.comments || []).length === 0 && (
                        <div className="text-center py-12 text-gray-600">
                          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma atividade registrada.</p>
                          <p className="text-xs mt-1">Seja o primeiro a adicionar um comentÃ¡rio.</p>
                        </div>
                      )}
                      {(task.comments || []).map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-white">{comment.authorName}</span>
                              <span className="text-[11px] text-gray-500">{formatDate(comment.createdAt)}</span>
                            </div>
                            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}

                  {/* â”€â”€ Tab: Anexos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                  {activeTab === 'attachments' && (
                    <div>
                      {(task.attachments || []).length === 0 && (
                        <div className="text-center py-12 text-gray-600">
                          <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhum anexo ainda.</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {uploadingFiles.map(up => (
                          <div
                            key={up.id}
                            className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 bottom-0 bg-primary/20 transition-all duration-300" style={{ width: `${up.progress}%` }} />
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 z-10 animate-pulse">
                              <FileText className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0 z-10">
                              <p className="text-sm text-gray-200 truncate font-medium">{up.name}</p>
                              <p className="text-[11px] text-primary">Enviando {up.progress}%...</p>
                            </div>
                          </div>
                        ))}
                        {(task.attachments || []).map(att => (
                          <div
                            key={att.id}
                            className="group flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-colors"
                          >
                            {att.type === 'image' && att.url ? (
                              <img src={att.url} alt={att.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                <AttachmentIcon type={att.type} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 truncate font-medium">{att.name}</p>
                              <p className="text-[11px] text-gray-500">{formatBytes(att.size)}</p>
                            </div>
                            <button
                              onClick={() => removeAttachment(task.id, att.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 w-full border border-dashed border-[#333] rounded-xl py-4 text-sm text-gray-500 hover:text-gray-300 hover:border-[#555] transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Anexo
                      </button>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                    </div>
                  )}
                </div>

                {/* Caixa de comentÃ¡rio (fixa na base, sÃ³ na tab comments) */}
                {activeTab === 'comments' && (
                  <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
                    <div className="flex items-end gap-3">
                      <img 
                        src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=E31837&color=fff`} 
                        alt="me" 
                        className="w-8 h-8 rounded-full flex-shrink-0 mb-0.5 object-cover" 
                      />
                      <div className="flex-1 relative">
                        <textarea
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                          placeholder="Adicionar comentÃ¡rio ou registrar atividade... (Enter para enviar)"
                          rows={2}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-primary/50 placeholder-gray-600 resize-none pr-12"
                        />
                        <button
                          onClick={handleSendComment}
                          disabled={!commentText.trim()}
                          className="absolute right-2 bottom-2 p-1.5 text-primary hover:bg-primary/10 rounded-lg disabled:opacity-30 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* â”€â”€ Sidebar de metadados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar" style={{ background: 'var(--surface-2)' }}>
                <div className="p-5 space-y-5">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Detalhes da Tarefa</h3>

                  {/* Status */}
                  <MetaItem label="Status" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className="flex items-center gap-2 text-sm text-white"
                      >
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                          style={{ backgroundColor: currentStatus?.color || '#555' }}
                        >
                          {currentStatus?.name || 'Sem status'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      {showStatusMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-full mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-[100] min-w-[200px] py-1"
                        >
                          {taskStatuses.map(s => (
                            <button
                              key={s.id}
                              onClick={() => { updateTask(task.id, { statusId: s.id }); setShowStatusMenu(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="whitespace-nowrap">{s.name}</span>
                          </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </MetaItem>

                  {/* Prioridade */}
                  <MetaItem label="Prioridade" icon={<Flag className="w-3.5 h-3.5" />}>
                    <div className="relative">
                      <button
                        onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                        className={`flex items-center gap-1.5 text-sm font-medium ${priorityConf.color}`}
                      >
                        <span>{priorityConf.icon}</span>
                        {priorityConf.label}
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      {showPriorityMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-full mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-50 w-40 py-1"
                        >
                          {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, conf]) => (
                            <button
                              key={key}
                              onClick={() => { updateTask(task.id, { priority: key }); setShowPriorityMenu(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${conf.color}`}
                            >
                              <span>{conf.icon}</span> {conf.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </MetaItem>

                  {/* Timer */}
                  <MetaItem label="Tempo Gasto" icon={<Clock className="w-3.5 h-3.5" />}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 font-mono text-sm text-gray-300 bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 flex items-center justify-between">
                        {formatTimer(localTimeSpent)}
                        {activeTimer && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                      <button
                        onClick={handleToggleTimer}
                        className={`p-2 rounded-lg transition-colors border ${
                          activeTimer 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
                            : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                        }`}
                      >
                        {activeTimer ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                    </div>
                  </MetaItem>

                  {/* Data de Entrega */}
                  <MetaItem label="Data de Entrega" icon={<Calendar className="w-3.5 h-3.5" />}>
                    <input
                      type="date"
                      value={dueDateVal}
                      onChange={e => { setDueDateVal(e.target.value); updateTask(task.id, { dueDate: e.target.value }); }}
                      className="bg-transparent text-sm text-gray-300 outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </MetaItem>

                  {/* ResponsÃ¡veis */}
                  <MetaItem label="ResponsÃ¡veis" icon={<Users className="w-3.5 h-3.5" />}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {rhTeam
                          .filter(u => task.assignees?.includes(u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`))
                          .map(u => {
                            const uAvatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`;
                            return (
                              <div key={u.id} className="relative group/avatar">
                                <img src={uAvatar} alt={u.name} className="w-7 h-7 rounded-full object-cover border-2 border-[#1a1a1a]" />
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#111] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10">
                                  {u.name}
                                </div>
                              </div>
                            );
                          })}
                        <div className="relative">
                          <button
                            onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                            className="w-7 h-7 rounded-full border-2 border-dashed border-[#444] flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-300 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {showAssigneeMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute left-0 top-full mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-50 w-44 py-1"
                            >
                              {rhTeam.map(u => {
                                const uAvatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`;
                                return (
                                  <button
                                    key={u.id}
                                    onClick={() => toggleAssignee(uAvatar)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                                  >
                                    <img src={uAvatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                                    {u.name}
                                    {task.assignees?.includes(uAvatar) && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                                    )}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </MetaItem>

                  {/* Anexar arquivo rÃ¡pido */}
                  <MetaItem label="Anexar Arquivo" icon={<Paperclip className="w-3.5 h-3.5" />}>
                    <button
                      onClick={() => { fileInputRef.current?.click(); setActiveTab('attachments'); }}
                      className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </MetaItem>

                  {/* Custom Fields DinÃ¢micos */}
                  {customFieldDefinitions?.length > 0 && customFieldDefinitions.map(cf => {
                    const val = task.customFields?.[cf.id] ?? '';
                    return (
                      <MetaItem key={cf.id} label={cf.name} icon={<FileText className="w-3.5 h-3.5" />}>
                        {cf.type === 'text' || cf.type === 'number' ? (
                          <input 
                            type={cf.type === 'number' ? 'number' : 'text'}
                            value={val}
                            onChange={e => {
                              const updatedFields = { ...(task.customFields || {}), [cf.id]: e.target.value };
                              updateTask(task.id, { customFields: updatedFields });
                            }}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-primary/50"
                          />
                        ) : cf.type === 'date' ? (
                          <input 
                            type="date"
                            value={val}
                            onChange={e => {
                              const updatedFields = { ...(task.customFields || {}), [cf.id]: e.target.value };
                              updateTask(task.id, { customFields: updatedFields });
                            }}
                            className="bg-transparent text-sm text-gray-300 outline-none cursor-pointer [color-scheme:dark]"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{val}</div>
                        )}
                      </MetaItem>
                    );
                  })}

                  {/* Linha separadora */}
                  <div className="border-t border-white/[0.06]" />

                  {/* EstatÃ­sticas rÃ¡pidas */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Atividade</h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ComentÃ¡rios</span>
                      <span className="font-medium text-gray-300">{task.comments?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Anexos</span>
                      <span className="font-medium text-gray-300">{task.attachments?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Relacionadas</span>
                      <span className="font-medium text-gray-300">{task.relatedTaskIds?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// â”€â”€â”€ Componente auxiliar MetaItem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MetaItem: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
      {icon}
      {label}
    </div>
    {children}
  </div>
);

export default TaskModal;

