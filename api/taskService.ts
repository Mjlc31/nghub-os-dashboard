/**
 * Task Service — Acesso direto ao Supabase para o módulo Gestor (Tasks)
 * Todas as funções são puras: sem state, sem efeitos colaterais.
 */
import { supabase } from '../lib/supabase';
import type { Task, Status, TaskComment, TaskAttachment, TaskSubtask, TaskSpace, TaskFolder, TaskList } from '../types';

// ─── Mappers: DB Row → App Type ────────────────────────────────────────────────
function mapRowToSpace(row: Record<string, unknown>): TaskSpace {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string | undefined,
    color: row.color as string | undefined,
  };
}

function mapRowToFolder(row: Record<string, unknown>): TaskFolder {
  return {
    id: row.id as string,
    spaceId: row.space_id as string,
    name: row.name as string,
  };
}

function mapRowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    statusId: row.status_id as string,
    listId: row.list_id as string | undefined,
    assignees: (row.assignees as string[]) ?? [],
    dueDate: row.due_date as string | undefined,
    priority: row.priority as Task['priority'],
    tags: (row.tags as Task['tags']) ?? [],
    relatedTaskIds: (row.related_task_ids as string[]) ?? [],
    subtasks: (row.subtasks as TaskSubtask[]) ?? [],
    timeSpent: (row.time_spent as number) ?? 0,
    isTimerRunning: (row.is_timer_running as boolean) ?? false,
    customFields: (row.custom_fields as Record<string, any>) ?? {},
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | undefined,
    comments: (row.task_comments as TaskComment[]) ?? [],
    attachments: (row.task_attachments as TaskAttachment[]) ?? [],
  };
}

function mapRowToStatus(row: Record<string, unknown>): Status {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
  };
}

// ─── Status Operations ────────────────────────────────────────────────────────
export async function fetchTaskStatuses(): Promise<Status[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`[taskService] fetchTaskStatuses: ${error.message}`);
  return (data ?? []).map(mapRowToStatus);
}

export async function createTaskStatus(status: Omit<Status, 'id'>): Promise<Status> {
  if (!supabase) throw new Error('[taskService] Supabase não disponível');
  const id = `s-${Date.now()}`;
  const { data, error } = await supabase
    .from('task_statuses')
    .insert({ id, name: status.name, color: status.color })
    .select()
    .single();

  if (error) throw new Error(`[taskService] createTaskStatus: ${error.message}`);
  return mapRowToStatus(data as Record<string, unknown>);
}

// ─── Hierarchy: Spaces, Folders, Lists ──────────────────────────────────────
export async function fetchSpaces(): Promise<TaskSpace[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('spaces').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(`[taskService] fetchSpaces: ${error.message}`);
  return (data ?? []).map(r => ({ id: r.id, name: r.name, color: r.color, icon: r.icon }));
}

export async function createSpace(space: Omit<TaskSpace, 'id'>): Promise<TaskSpace> {
  if (!supabase) throw new Error('Supabase indisponível');
  const { data, error } = await supabase.from('spaces').insert(space).select().single();
  if (error) throw new Error(`[taskService] createSpace: ${error.message}`);
  return { id: data.id, name: data.name, color: data.color, icon: data.icon };
}

export async function deleteSpace(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('spaces').delete().eq('id', id);
}

export async function fetchFolders(): Promise<TaskFolder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('folders').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(`[taskService] fetchFolders: ${error.message}`);
  return (data ?? []).map(r => ({ id: r.id, spaceId: r.space_id, name: r.name }));
}

export async function createFolder(folder: Omit<TaskFolder, 'id'>): Promise<TaskFolder> {
  if (!supabase) throw new Error('Supabase indisponível');
  const { data, error } = await supabase.from('folders').insert({ space_id: folder.spaceId, name: folder.name }).select().single();
  if (error) throw new Error(`[taskService] createFolder: ${error.message}`);
  return { id: data.id, spaceId: data.space_id, name: data.name };
}

export async function deleteFolder(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('folders').delete().eq('id', id);
}

export async function fetchLists(): Promise<TaskList[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('lists').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(`[taskService] fetchLists: ${error.message}`);
  return (data ?? []).map(r => ({ id: r.id, spaceId: r.space_id, folderId: r.folder_id, name: r.name, color: r.color }));
}

export async function createList(list: Omit<TaskList, 'id'>): Promise<TaskList> {
  if (!supabase) throw new Error('Supabase indisponível');
  const { data, error } = await supabase.from('lists').insert({ space_id: list.spaceId, folder_id: list.folderId, name: list.name, color: list.color }).select().single();
  if (error) throw new Error(`[taskService] createList: ${error.message}`);
  return { id: data.id, spaceId: data.space_id, folderId: data.folder_id, name: data.name, color: data.color };
}

export async function deleteList(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('lists').delete().eq('id', id);
}

// ─── Custom Field Definitions ────────────────────────────────────────────────
export async function fetchCustomFieldDefinitions(): Promise<any[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('custom_field_definitions').select('*');
  if (error) throw new Error(`[taskService] fetchCustomFieldDefinitions: ${error.message}`);
  return data ?? [];
}

export async function createCustomFieldDefinition(def: any): Promise<any> {
  if (!supabase) throw new Error('[taskService] Supabase não disponível');
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      id: def.id,
      name: def.name,
      type: def.type,
      options: def.options ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`[taskService] createCustomFieldDefinition: ${error.message}`);
  return data;
}

export async function updateCustomFieldDefinition(id: string, patch: any): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('custom_field_definitions').update(patch).eq('id', id);
  if (error) throw new Error(`[taskService] updateCustomFieldDefinition: ${error.message}`);
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
  if (error) throw new Error(`[taskService] deleteCustomFieldDefinition: ${error.message}`);
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────
export async function fetchTasks(): Promise<Task[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_comments(*), task_attachments(*)')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`[taskService] fetchTasks: ${error.message}`);
  return (data ?? []).map(row => mapRowToTask(row as Record<string, unknown>));
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'comments' | 'attachments'>): Promise<Task> {
  if (!supabase) throw new Error('[taskService] Supabase não disponível');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      name: task.name,
      description: task.description,
      status_id: task.statusId,
      list_id: task.listId,
      assignees: task.assignees,
      due_date: task.dueDate,
      priority: task.priority,
      tags: (task.tags ?? []) as Record<string, unknown>[],
      related_task_ids: task.relatedTaskIds ?? [],
      subtasks: (task.subtasks ?? []) as unknown as Record<string, unknown>[],
      time_spent: task.timeSpent ?? 0,
      is_timer_running: task.isTimerRunning ?? false,
      custom_fields: task.customFields ?? {},
      completed_at: task.completedAt,
    })
    .select()
    .single();

  if (error) throw new Error(`[taskService] createTask: ${error.message}`);
  return mapRowToTask(data as Record<string, unknown>);
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  if (!supabase) return;

  const dbPatch: any = {};
  if (patch.name !== undefined)         dbPatch.name = patch.name;
  if (patch.description !== undefined)  dbPatch.description = patch.description;
  if (patch.statusId !== undefined)     dbPatch.status_id = patch.statusId;
  if (patch.listId !== undefined)       dbPatch.list_id = patch.listId;
  if (patch.assignees !== undefined)    dbPatch.assignees = patch.assignees;
  if (patch.dueDate !== undefined)      dbPatch.due_date = patch.dueDate;
  if (patch.priority !== undefined)     dbPatch.priority = patch.priority;
  if (patch.tags !== undefined)         dbPatch.tags = patch.tags as Record<string, unknown>[];
  if (patch.relatedTaskIds !== undefined) dbPatch.related_task_ids = patch.relatedTaskIds;
  if (patch.subtasks !== undefined)     dbPatch.subtasks = patch.subtasks as unknown as Record<string, unknown>[];
  if (patch.timeSpent !== undefined)    dbPatch.time_spent = patch.timeSpent;
  if (patch.isTimerRunning !== undefined) dbPatch.is_timer_running = patch.isTimerRunning;
  if (patch.customFields !== undefined) dbPatch.custom_fields = patch.customFields;
  if (patch.completedAt !== undefined)  dbPatch.completed_at = patch.completedAt;

  const { error } = await supabase.from('tasks').update(dbPatch).eq('id', id);
  if (error) throw new Error(`[taskService] updateTask: ${error.message}`);
}

export async function deleteTask(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(`[taskService] deleteTask: ${error.message}`);
}

// ─── Comments ────────────────────────────────────────────────────────────────
export async function fetchComments(entityId: string): Promise<TaskComment[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', entityId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      authorName: r.author_name as string,
      authorAvatar: r.author_avatar as string,
      content: r.content as string,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}

export async function addComment(
  entityId: string,
  comment: Omit<TaskComment, 'id' | 'createdAt'>
): Promise<TaskComment> {
  if (!supabase) {
    return {
      ...comment,
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: entityId,
        author_name: comment.authorName,
        author_avatar: comment.authorAvatar,
        content: comment.content,
      })
      .select()
      .single();

    if (error) throw error;
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      authorName: row.author_name as string,
      authorAvatar: row.author_avatar as string,
      content: row.content as string,
      createdAt: row.created_at as string,
    };
  } catch {
    // Graceful degradation
    return {
      ...comment,
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }
}
