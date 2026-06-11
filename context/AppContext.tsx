/**
 * AppContext — Contexto global para o módulo Gestor (Tasks/ClickUp)
 * Conecta o useTasks hook + rhTeam + clients ao contexto React
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTasks } from '../hooks/useTasks';
import { supabase } from '../lib/supabase';
import type { Task, Status, TaskSpace, TaskFolder, TaskList, CustomFieldDefinition, Automation } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RhTeamMember {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  email?: string;
}

interface Client {
  id: string;
  name: string;
  status?: string;
  avatar?: string;
}

interface ClientStatus {
  id: string;
  name: string;
  color: string;
}

interface AppContextValue {
  // Tasks
  tasks: Task[];
  setTasks: (updater: any) => void;
  taskStatuses: Status[];
  setTaskStatuses: (updater: any) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
  spaces: TaskSpace[];
  folders: TaskFolder[];
  lists: TaskList[];
  isLoading: boolean;
  error: string | null;

  // Task Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'comments' | 'attachments'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addComment: (taskId: string, content: string) => void;
  addAttachment: (taskId: string, attachment: any) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;
  addTaskStatus: (status: Omit<Status, 'id'>) => void;
  addCustomFieldDefinition: (def: Omit<CustomFieldDefinition, 'id'>) => void;
  updateCustomFieldDefinition: (id: string, updates: Partial<CustomFieldDefinition>) => void;
  deleteCustomFieldDefinition: (id: string) => void;
  addSpace: (space: Omit<TaskSpace, 'id'>) => void;
  removeSpace: (id: string) => void;
  addFolder: (folder: Omit<TaskFolder, 'id'>) => void;
  removeFolder: (id: string) => void;
  addList: (list: Omit<TaskList, 'id'>) => void;
  removeList: (id: string) => void;

  // RH / Equipe
  rhTeam: RhTeamMember[];

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  clientStatuses: ClientStatus[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const taskHook = useTasks();
  const [rhTeam, setRhTeam] = useState<RhTeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStatuses] = useState<ClientStatus[]>([
    { id: 'cs1', name: 'Ativo', color: '#10b981' },
    { id: 'cs2', name: 'Em Pausa', color: '#f59e0b' },
    { id: 'cs3', name: 'Encerrado', color: '#6b7280' },
  ]);

  // Carregar time de RH do Supabase
  useEffect(() => {
    const loadRhTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('rh_profiles')
          .select('id, name, role, avatar_url, email')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setRhTeam((data || []).map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          avatar: r.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=3b82f6&color=fff`,
          email: r.email,
        })));
      } catch (e) {
        console.warn('[AppContext] Falha ao carregar rhTeam:', e);
        setRhTeam([]);
      }
    };

    const loadClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, status')
          .order('name');
        if (error) throw error;
        setClients(data || []);
      } catch (e) {
        console.warn('[AppContext] Falha ao carregar clients:', e);
        setClients([]);
      }
    };

    loadRhTeam();
    loadClients();
  }, []);

  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient: Client = { ...client, id: `c-${Date.now()}` };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const value: AppContextValue = {
    // Tasks
    tasks: taskHook.tasks as Task[],
    setTasks: taskHook.setTasks,
    taskStatuses: taskHook.taskStatuses as Status[],
    setTaskStatuses: taskHook.setTaskStatuses,
    customFieldDefinitions: taskHook.customFieldDefinitions as CustomFieldDefinition[],
    automations: taskHook.automations,
    setAutomations: taskHook.setAutomations,
    spaces: taskHook.spaces as TaskSpace[],
    folders: taskHook.folders as TaskFolder[],
    lists: taskHook.lists as TaskList[],
    isLoading: taskHook.isLoading,
    error: taskHook.error,

    // Task Actions
    addTask: taskHook.addTask,
    updateTask: taskHook.updateTask,
    deleteTask: taskHook.deleteTask,
    addComment: taskHook.addComment,
    addAttachment: taskHook.addAttachment,
    removeAttachment: taskHook.removeAttachment,
    addTaskStatus: taskHook.addTaskStatus,
    addCustomFieldDefinition: taskHook.addCustomFieldDefinition,
    updateCustomFieldDefinition: taskHook.updateCustomFieldDefinition,
    deleteCustomFieldDefinition: taskHook.deleteCustomFieldDefinition,
    addSpace: taskHook.addSpace,
    removeSpace: taskHook.removeSpace,
    addFolder: taskHook.addFolder,
    removeFolder: taskHook.removeFolder,
    addList: taskHook.addList,
    removeList: taskHook.removeList,

    // RH / Clients
    rhTeam,
    clients,
    addClient,
    updateClient,
    clientStatuses,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
