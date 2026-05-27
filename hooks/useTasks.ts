import { useState, useCallback } from 'react';
import { NgTask, NgTaskStatus, NgTaskPriority, NG_DEFAULT_STATUSES } from '../types';

const STORAGE_KEY_TASKS = 'nghub_tasks_v1';
const STORAGE_KEY_STATUSES = 'nghub_task_statuses_v1';

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const DEMO_TASKS: NgTask[] = [
  {
    id: 'demo1',
    name: 'Criar proposta comercial para novo cliente',
    description: 'Preparar uma proposta detalhada com todos os serviços e valores.',
    statusId: 's2',
    assignees: [],
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'High',
    tags: ['Vendas', 'Proposta'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo2',
    name: 'Reunião de alinhamento com equipe',
    description: 'Alinhar os próximos passos e distribuir as tarefas da semana.',
    statusId: 's1',
    assignees: [],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'Normal',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo3',
    name: 'Atualizar apresentação de resultados',
    description: 'Incluir os dados do mês e os próximos objetivos.',
    statusId: 's1',
    assignees: [],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    priority: 'Normal',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'demo4',
    name: 'Follow-up com lead quente',
    description: 'Ligar e confirmar interesse após o envio da proposta.',
    statusId: 's1',
    assignees: [],
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    priority: 'Urgent',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'demo5',
    name: 'Revisar contrato de serviço',
    statusId: 's4',
    assignees: [],
    priority: 'Low',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* silent */ }
};

export const useTasks = () => {
  const [tasks, setTasksState] = useState<NgTask[]>(() =>
    loadFromStorage(STORAGE_KEY_TASKS, DEMO_TASKS)
  );
  const [taskStatuses] = useState<NgTaskStatus[]>(() =>
    loadFromStorage(STORAGE_KEY_STATUSES, NG_DEFAULT_STATUSES)
  );

  const setTasks = useCallback((updater: NgTask[] | ((prev: NgTask[]) => NgTask[])) => {
    setTasksState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEY_TASKS, next);
      return next;
    });
  }, []);

  const createTask = useCallback((data: Omit<NgTask, 'id' | 'createdAt'>) => {
    const newTask: NgTask = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, [setTasks]);

  const updateTask = useCallback((id: string, updates: Partial<NgTask>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      // Se mudou para status fechado, marca completedAt
      const closedStatus = taskStatuses.find(s => s.isClosed && s.id === updates.statusId);
      if (closedStatus && !t.completedAt) updated.completedAt = new Date().toISOString();
      return updated;
    }));
  }, [setTasks, taskStatuses]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [setTasks]);

  const isTaskClosed = useCallback((statusId: string) => {
    return taskStatuses.find(s => s.id === statusId)?.isClosed ?? false;
  }, [taskStatuses]);

  return { tasks, taskStatuses, createTask, updateTask, deleteTask, isTaskClosed };
};
