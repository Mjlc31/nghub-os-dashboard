
// ─── Generic Client (Gestor ClickUp module) ───────────────────────────────────
export interface Client {
  id: string;
  name: string;
  status?: string;
  statusId?: string;
  avatar?: string;
  assignees?: string[];
  faturamento?: string;
  segmento?: string;
  repositorio?: string;
  ultimaReuniao?: string;
  [key: string]: any;
}

export enum LeadStage {

  DRAFT = 'Rascunho Em Andamento',
  NEW_LEAD = 'Novo Lead',
  QUALIFIED = 'Qualificado',
  NEGOTIATION = 'Em Negociação',
  WON = 'Venda Fechada',
  CHURN = 'Churn'
}

export interface Profile {
  id: string; // Referência direta ao ID do Auth.Users do Supabase
  name: string;
  email?: string;
  avatarUrl: string;
  role: string;
  company?: string;
  phone?: string;
  createdAt?: string;
}

export interface Seller {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  sector?: string;
  stage: LeadStage;
  value: number;
  lastContact: string;
  tagId?: string;
  ownerId?: string;
  owner?: Seller;
  createdAt?: string;
  instagram?: string;
  revenue_text?: string;
  headcount?: string;
  pain_point?: string;
  origin?: string;
  notes?: string;
  pipeline?: string;
  productLabel?: string;
  form_answers?: Record<string, any>;
  source_tags?: string[];
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  capacity: number;
  attendeesCount: number;
  price: number;
  imageUrl: string;
  status: 'upcoming' | 'live' | 'past';
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  category: string;
  thumbnail: string;
  videoUrl?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  status: 'paid' | 'pending' | 'failed';
  due_date?: string;
  recurrence?: 'once' | 'monthly' | 'annual';
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export interface FinanceSettings {
  id?: string;
  tax_rate: number;
  tax_regime: 'simples' | 'presumido' | 'real';
  fixed_costs: FixedCost[];
  updated_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email';
  audience: string;
  status: 'scheduled' | 'sent' | 'draft';
  sentCount: number;
  date: string;
}

// Shared utility types
export interface TagStyle {
  name: string;
  bg: string;
  border: string;
  text: string;
  hover: string;
}

export interface DashboardKPIs {
  revenue: number;
  expenses: number;
  netIncome: number;
  activeLeads: number;
  totalLeads: number;
  conversionRate: number;
  nextEventDays: string;
  nextEventName: string;
}

// ─── Task System ───────────────────────────────────────────────────────────────
export type NgTaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low' | 'None';

export interface NgTaskStatus {
  id: string;
  name: string;
  color: string;
  isClosed?: boolean;
}

export interface NgTaskComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface NgTaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface NgTask {
  id: string;
  name: string;
  description?: string;
  statusId: string;
  assignees: string[]; // avatar URLs or user names
  dueDate?: string;
  priority: NgTaskPriority;
  tags?: string[];
  comments?: NgTaskComment[];
  subtasks?: NgTaskSubtask[];
  createdAt?: string;
  completedAt?: string;
}

export const NG_DEFAULT_STATUSES: NgTaskStatus[] = [
  { id: 's1', name: 'A Fazer', color: '#6b7280' },
  { id: 's2', name: 'Em Progresso', color: '#D4AF37' },
  { id: 's3', name: 'Em Revisão', color: '#f59e0b' },
  { id: 's4', name: 'Concluído', color: '#10b981', isClosed: true },
];

// ─── Gestor (ClickUp-like) — tipos completos usados pelo useTasks + taskService ──
export type TaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low' | 'None';

export interface Status {
  id: string;
  name: string;
  color: string;
  isClosed?: boolean;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'url' | 'person';
  options?: string[];
}

export interface TaskSpace {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface TaskFolder {
  id: string;
  spaceId: string;
  name: string;
}

export interface TaskList {
  id: string;
  spaceId?: string;
  folderId?: string;
  name: string;
  color?: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  statusId: string;
  listId?: string;
  assignees: string[];
  dueDate?: string;
  priority: TaskPriority;
  tags?: { label: string; color: string }[];
  relatedTaskIds?: string[];
  subtasks?: TaskSubtask[];
  timeSpent?: number;
  isTimerRunning?: boolean;
  customFields?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  activities?: { id: string; type: string; description: string; createdAt: string }[];
}

export interface Automation {
  id: string;
  name: string;
  isActive: boolean;
  trigger: {
    fromStatusId: string;
    toStatusId: string;
  };
  actions: Array<
    | { type: 'set_status'; statusId: string }
    | { type: 'set_priority'; priority: TaskPriority }
    | { type: 'add_assignee'; avatar: string; assigneeId?: string }
    | { type: 'remove_assignee'; assigneeId: string }
  >;
}



// ─── Meeting System ─────────────────────────────────────────────────────────────
export type MeetingSessionType = 'regular' | 'extraordinary' | 'board';
export type MeetingSessionStatus = 'open' | 'closed';

export interface MeetingSession {
  id: string;
  title: string;
  meeting_date: string;
  meeting_time?: string;
  agenda?: string;
  type: MeetingSessionType;
  status: MeetingSessionStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  minutes_count?: number;
}

export interface MeetingMinutes {
  id: string;
  session_id: string;
  author_id: string;
  author_name?: string;
  present: boolean;
  highlights?: string;
  commitments?: string;
  general_notes?: string;
  submitted_at?: string;
  updated_at?: string;
}