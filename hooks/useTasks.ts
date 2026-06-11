// @ts-nocheck
/**
 * useTasks — Hook especializado para o módulo Gestor (Tasks)
 * Responsável por: estado, Realtime, automations engine e todas as actions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchTaskStatuses, createTaskStatus, addComment as addTaskCommentService,
  fetchCustomFieldDefinitions, createCustomFieldDefinition, updateCustomFieldDefinition as updateCustomFieldService, deleteCustomFieldDefinition as deleteCustomFieldService,
  fetchSpaces, createSpace, deleteSpace as deleteSpaceService,
  fetchFolders, createFolder, deleteFolder as deleteFolderService,
  fetchLists, createList, deleteList as deleteListService
} from '../services';
import type {
  Task, Status, Automation, TaskComment, TaskAttachment, CustomFieldDefinition, TaskSpace, TaskFolder, TaskList
} from '../types';

// ... (rest of the code ...)

export function useTasks(userFullName?: string, userAvatar?: string) {
  const queryClient = useQueryClient();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks = [], isLoading: isTasksLoading, isError: isTasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const { data: taskStatuses = [], isLoading: isStatusesLoading } = useQuery({
    queryKey: ['taskStatuses'],
    queryFn: fetchTaskStatuses,
  });

  const { data: spaces = [], isLoading: isSpacesLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
  });

  const { data: folders = [], isLoading: isFoldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
  });

  const { data: lists = [], isLoading: isListsLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: fetchLists,
  });

  const { data: customFieldDefinitions = [], isLoading: isFieldsLoading } = useQuery({
    queryKey: ['customFieldDefinitions'],
    queryFn: fetchCustomFieldDefinitions,
  });

  const isLoading = isTasksLoading || isStatusesLoading || isFieldsLoading || isSpacesLoading || isFoldersLoading || isListsLoading;

  useEffect(() => {
    if (isTasksError) {
      setError('Falha ao carregar as tarefas do banco de dados.');
    } else {
      setError(null);
    }
  }, [isTasksError]);

  const setTasks = useCallback((updater: any) => {
    queryClient.setQueryData(['tasks'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  const setTaskStatuses = useCallback((updater: any) => {
    queryClient.setQueryData(['taskStatuses'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  const setCustomFieldDefinitions = useCallback((updater: any) => {
    queryClient.setQueryData(['customFieldDefinitions'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  const setSpaces = useCallback((updater: any) => {
    queryClient.setQueryData(['spaces'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  const setFolders = useCallback((updater: any) => {
    queryClient.setQueryData(['folders'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  const setLists = useCallback((updater: any) => {
    queryClient.setQueryData(['lists'], (prev: any) => {
      const current = prev || [];
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, [queryClient]);

  // Guardar ref das automations para usar em callbacks sem stale closure
  const automationsRef = useRef(automations);
  automationsRef.current = automations;

  // ─── Persistência de automações (config de UI) ─────────────────────────────
  useEffect(() => {
    localStorage.setItem('line_os_automations', JSON.stringify(automations));
  }, [automations]);

  // ─── Realtime Subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks().then(data => {
          setTasks(data);
        }).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Automation Engine ─────────────────────────────────────────────────────
  const runAutomations = useCallback((taskId: string, fromStatusId: string, toStatusId: string) => {
    const activeAutomations = automationsRef.current.filter(a => a.isActive);
    const matching = activeAutomations.filter(a => {
      const fromMatch = a.trigger.fromStatusId === '*' || a.trigger.fromStatusId === fromStatusId;
      return fromMatch && a.trigger.toStatusId === toStatusId;
    });

    if (matching.length === 0) return;

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      let updated = { ...t };
      matching.forEach(automation => {
        automation.actions.forEach(action => {
          switch (action.type) {
            case 'remove_assignee':
              updated = { ...updated, assignees: updated.assignees.filter(a => a !== action.assigneeId) };
              break;
            case 'add_assignee':
              if (!updated.assignees.includes(action.avatar)) {
                updated = { ...updated, assignees: [...updated.assignees, action.avatar] };
              }
              break;
            case 'set_priority':
              updated = { ...updated, priority: action.priority };
              break;
            case 'set_status':
              updated = { ...updated, statusId: action.statusId };
              break;
          }
        });
      });
      return updated;
    }));
  }, []);

  // ─── Task Actions ──────────────────────────────────────────────────────────
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'comments' | 'attachments'>) => {
    // Optimistic update
    const tempId = `task-${Date.now()}`;
    const optimistic: Task = {
      ...task,
      id: tempId,
      createdAt: new Date().toISOString(),
      comments: [],
      attachments: [],
    };
    setTasks(prev => [...prev, optimistic]);

    try {
      const saved = await createTask(task);
      setTasks(prev => prev.map(t => t.id === tempId ? saved : t));
    } catch (err) {
      console.error('[useTasks] addTask falhou, revertendo otimista:', err);
      // Reverte a atualização otimista
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  }, []);

  const editTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const oldTask = prev.find(t => t.id === taskId);
      if (!oldTask) return prev;

      let newActivities = [...(oldTask.activities || [])];
      
      // Registrar mudança de status
      if (updates.statusId && updates.statusId !== oldTask.statusId) {
        setTimeout(() => runAutomations(taskId, oldTask.statusId, updates.statusId!), 50);
        newActivities.push({
          id: `act-${Date.now()}-1`,
          type: 'status_change',
          description: `Status alterado de ${oldTask.statusId} para ${updates.statusId}`,
          createdAt: new Date().toISOString()
        });
      }

      // Registrar mudança de responsável
      if (updates.assignees && JSON.stringify(updates.assignees) !== JSON.stringify(oldTask.assignees)) {
        newActivities.push({
          id: `act-${Date.now()}-2`,
          type: 'assignee_change',
          description: `Responsáveis atualizados`,
          createdAt: new Date().toISOString()
        });
      }

      return prev.map(t => t.id === taskId ? { ...t, ...updates, activities: newActivities } : t);
    });

    try {
      await updateTask(taskId, updates);
    } catch (err) {
      console.error('[useTasks] updateTask falhou:', err);
    }
  }, [runAutomations]);

  const removeTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('[useTasks] deleteTask falhou:', err);
    }
  }, []);

  const addComment = useCallback(async (taskId: string, content: string) => {
    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      authorName: userFullName ?? 'Usuário',
      authorAvatar: userAvatar ?? 'https://i.pravatar.cc/150?img=11',
      content,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, comments: [...(t.comments ?? []), comment] } : t
    ));

    try {
      const saved = await addTaskCommentService(taskId, {
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        content,
      });
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: (t.comments ?? []).map(c => c.id === comment.id ? saved : c),
        };
      }));
    } catch (err) {
      console.error('[useTasks] addComment falhou:', err);
    }
  }, [userFullName, userAvatar]);

  const addAttachment = useCallback((taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => {
    const newAttachment: TaskAttachment = {
      ...attachment,
      id: `att-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, attachments: [...(t.attachments ?? []), newAttachment] } : t
    ));
  }, []);

  const removeAttachment = useCallback((taskId: string, attachmentId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, attachments: (t.attachments ?? []).filter(a => a.id !== attachmentId) }
        : t
    ));
  }, []);

  const addTaskStatus = useCallback(async (status: Omit<Status, 'id'>) => {
    const tempId = `s-${Date.now()}`;
    const optimistic: Status = { ...status, id: tempId };
    setTaskStatuses(prev => [...prev, optimistic]);

    try {
      const saved = await createTaskStatus(status);
      setTaskStatuses(prev => prev.map(s => s.id === tempId ? saved : s));
    } catch (err) {
      console.error('[useTasks] addTaskStatus falhou:', err);
    }
  }, []);

  // ─── Custom Field Actions ──────────────────────────────────────────────────
  const addCustomFieldDefinition = useCallback(async (def: Omit<CustomFieldDefinition, 'id'>) => {
    const tempId = `cf-${Date.now()}`;
    const optimistic: CustomFieldDefinition = { ...def, id: tempId };
    setCustomFieldDefinitions(prev => [...prev, optimistic]);

    try {
      const saved = await createCustomFieldDefinition({ ...def, id: tempId });
      setCustomFieldDefinitions(prev => prev.map(f => f.id === tempId ? saved : f));
    } catch (err) {
      console.error('[useTasks] addCustomFieldDefinition falhou:', err);
      setCustomFieldDefinitions(prev => prev.filter(f => f.id !== tempId));
    }
  }, []);

  const updateCustomFieldDefinition = useCallback(async (id: string, updates: Partial<CustomFieldDefinition>) => {
    setCustomFieldDefinitions(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      await updateCustomFieldService(id, updates);
    } catch (err) {
      console.error('[useTasks] updateCustomFieldDefinition falhou:', err);
    }
  }, []);

  const deleteCustomFieldDefinition = useCallback(async (id: string) => {
    setCustomFieldDefinitions(prev => prev.filter(f => f.id !== id));
    try {
      await deleteCustomFieldService(id);
    } catch (err) {
      console.error('[useTasks] deleteCustomFieldDefinition falhou:', err);
    }
  }, []);

  // ─── Hierarchy Actions ──────────────────────────────────────────────────────
  const addSpace = useCallback(async (space: Omit<TaskSpace, 'id'>) => {
    const tempId = `sp-${Date.now()}`;
    setSpaces(prev => [...prev, { ...space, id: tempId }]);
    try {
      const saved = await createSpace(space);
      setSpaces(prev => prev.map(s => s.id === tempId ? saved : s));
    } catch (err) {
      console.error('[useTasks] addSpace falhou:', err);
      setSpaces(prev => prev.filter(s => s.id !== tempId));
    }
  }, []);

  const removeSpace = useCallback(async (id: string) => {
    setSpaces(prev => prev.filter(s => s.id !== id));
    try { await deleteSpaceService(id); } catch (err) { console.error(err); }
  }, []);

  const addFolder = useCallback(async (folder: Omit<TaskFolder, 'id'>) => {
    const tempId = `fd-${Date.now()}`;
    setFolders(prev => [...prev, { ...folder, id: tempId }]);
    try {
      const saved = await createFolder(folder);
      setFolders(prev => prev.map(f => f.id === tempId ? saved : f));
    } catch (err) {
      console.error('[useTasks] addFolder falhou:', err);
      setFolders(prev => prev.filter(f => f.id !== tempId));
    }
  }, []);

  const removeFolder = useCallback(async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    try { await deleteFolderService(id); } catch (err) { console.error(err); }
  }, []);

  const addList = useCallback(async (list: Omit<TaskList, 'id'>) => {
    const tempId = `ls-${Date.now()}`;
    setLists(prev => [...prev, { ...list, id: tempId }]);
    try {
      const saved = await createList(list);
      setLists(prev => prev.map(l => l.id === tempId ? saved : l));
    } catch (err) {
      console.error('[useTasks] addList falhou:', err);
      setLists(prev => prev.filter(l => l.id !== tempId));
    }
  }, []);

  const removeList = useCallback(async (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
    try { await deleteListService(id); } catch (err) { console.error(err); }
  }, []);

  return {
    tasks, setTasks,
    taskStatuses, setTaskStatuses,
    automations, setAutomations,
    customFieldDefinitions, setCustomFieldDefinitions,
    spaces, folders, lists,
    isLoading,
    error,
    // Actions
    addTask,
    updateTask: editTask,
    deleteTask: removeTask,
    addComment,
    addAttachment,
    removeAttachment,
    addTaskStatus,
    addCustomFieldDefinition,
    updateCustomFieldDefinition,
    deleteCustomFieldDefinition,
    addSpace, removeSpace,
    addFolder, removeFolder,
    addList, removeList,
  };
}
