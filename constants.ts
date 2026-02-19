
import { Campaign, Lead, LeadStage, Event, Lesson, Profile, Transaction } from './types';

export const PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Carlos Mendes',
    company: 'TechFlow Solutions',
    role: 'CEO',
    avatarUrl: 'https://picsum.photos/id/100/200/200',
    phone: '5511999999999'
  }
];

export const LEADS: Lead[] = [
  {
    id: 'l1',
    name: 'Roberto Silva',
    company: 'Invest Smart',
    sector: 'Finanças',
    stage: LeadStage.NEW_LEAD,
    value: 750,
    lastContact: '2023-10-20'
  },
  {
    id: 'l2',
    name: 'Fernanda Lima',
    company: 'Growth MKT',
    sector: 'Marketing',
    stage: LeadStage.QUALIFIED,
    value: 500,
    lastContact: '2023-10-27'
  }
];

export const EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'NGHUB Summit 2024',
    date: '2024-05-15T19:00:00',
    location: 'Rooftop Jardins, SP',
    capacity: 150,
    attendeesCount: 89,
    price: 250,
    imageUrl: 'https://picsum.photos/seed/event1/800/400',
    status: 'upcoming'
  }
];

export const LESSONS: Lesson[] = [
  {
    id: 'l1',
    title: 'Como estruturar seu time de vendas',
    duration: '45 min',
    category: 'Vendas',
    thumbnail: 'https://picsum.photos/seed/lesson1/400/225'
  }
];

export const TRANSACTIONS: Transaction[] = [
  { id: 't1', description: 'Venda Ingresso Summit', amount: 250, type: 'income', date: '2023-10-27', category: 'Eventos', status: 'paid' },
];

export const CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'Lembrete Summit 2024', channel: 'whatsapp', audience: 'Membros Ativos', status: 'scheduled', sentCount: 0, date: '2023-11-01' },
];

export const CHART_DATA_MRR = [
  { name: 'Jan', value: 12000 },
  { name: 'Fev', value: 15000 },
  { name: 'Mar', value: 18000 },
];
