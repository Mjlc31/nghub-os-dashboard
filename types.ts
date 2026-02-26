
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