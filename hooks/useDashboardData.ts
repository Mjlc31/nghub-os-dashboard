import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LeadStage, Transaction, FinanceSettings } from '../types';

// ── Local types used by the dashboard hook ──────────────────────────────────
export interface ChartDataPoint { name: string; value: number; }
export interface FunnelDataPoint { name: string; value: number; }
export interface ActivityItem {
    type: 'finance' | 'lead';
    title: string;
    value: string;
    date: string;
    status: 'success' | 'danger' | 'neutral';
}

// interface TransactionRow deleted - using Transaction from types.ts
interface LeadRow { stage: string; name: string; created_at: string; owner?: any; pipeline?: string; value?: number; tag?: any; }
interface UpcomingEventRow { date: string; title: string; }
export type TimeFilter = 'today' | '7d' | '15d' | '30d' | 'all';
export interface DashboardFilter { time: TimeFilter; ownerId: string; pipeline: string; }

export const useDashboardData = (filters: DashboardFilter = { time: 'all', ownerId: 'all', pipeline: 'all' }) => {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        activeLeads: 0,
        totalLeads: 0,
        conversionRate: 0,
        nextEventDays: 'N/A',
        nextEventName: ''
    });
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [funnelData, setFunnelData] = useState<FunnelDataPoint[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [availableOwners, setAvailableOwners] = useState<{id: string; name: string}[]>([]);
    const [availablePipelines, setAvailablePipelines] = useState<string[]>([]);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                { data: trans },
                { data: leads },
                { data: events },
                { data: upcomingEvents },
                resSettings
            ] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: true }),
                supabase.from('leads').select('*, tag:events(price, title), owner:sellers(id, name)'),
                supabase.from('events').select('id, price, title'),
                supabase.from('events').select('*').eq('status', 'upcoming').order('date', { ascending: true }).limit(1),
                supabase.from('finance_settings').select('*').limit(1).single()
            ]);

            const settings: FinanceSettings | null = (resSettings as any)?.data;
            const taxRate = (settings?.tax_rate || 0) / 100;
            const fixedCosts = Array.isArray(settings?.fixed_costs) ? settings.fixed_costs : [];
            const fixedCostsTotal = fixedCosts.reduce((acc, c) => acc + Number(c.amount), 0);

            // Filtro de tempo local
            const now = new Date();
            const filterDate = new Date();
            if (filters.time === 'today') filterDate.setHours(0, 0, 0, 0);
            else if (filters.time === '7d') filterDate.setDate(now.getDate() - 7);
            else if (filters.time === '15d') filterDate.setDate(now.getDate() - 15);
            else if (filters.time === '30d') filterDate.setDate(now.getDate() - 30);

            const transactionsList: Transaction[] = trans || [];
            const filteredTransactions = filters.time === 'all'
                ? transactionsList
                : transactionsList.filter(t => new Date(t.date) >= filterDate);

            const allLeads = (leads as any[]) || [];
            
            // Extrair opções de filtros
            const ownersMap = new Map();
            const pipelinesSet = new Set<string>();
            allLeads.forEach(l => {
                if (l.owner && l.owner.id) ownersMap.set(l.owner.id, l.owner.name);
                if (l.pipeline) pipelinesSet.add(l.pipeline);
            });
            
            const leadsList = allLeads.filter(l => {
                const passTime = filters.time === 'all' || new Date(l.created_at) >= filterDate;
                const passOwner = filters.ownerId === 'all' || l.owner?.id === filters.ownerId;
                const passPipeline = filters.pipeline === 'all' || l.pipeline === filters.pipeline;
                return passTime && passOwner && passPipeline;
            });

            // 1. Financeiro (Transactions & Receita)
            // Lógica: Somar todos os leads em Venda Fechada + Entradas não-CRM (para evitar duplicidade)
            let leadsRevenue = 0;
            leadsList.forEach(l => {
                if (l.stage === LeadStage.WON || l.stage === 'Membro Ativo') {
                    const price = (Number(l.value) > 0) ? Number(l.value) : (l.tag?.price || 0);
                    if (price > 0) leadsRevenue += price;
                }
            });

            const otherIncome = filteredTransactions
                .filter(t => t.type === 'income' && t.category !== 'CRM')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            const grossRevenue = leadsRevenue + otherIncome;
            const taxes = grossRevenue * taxRate;
            const netRevenue = grossRevenue - taxes;
            
            const variableExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const totalExpenses = variableExpenses + fixedCostsTotal;
            const netIncome = netRevenue - totalExpenses;

            // Preparar dados para o gráfico de fluxo
            const chartMap: Record<string, number> = {};
            filteredTransactions.forEach(t => {
                const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const val = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
                chartMap[date] = (chartMap[date] || 0) + val;
            });
            const chart = Object.keys(chartMap).slice(-7).map(key => ({ name: key, value: chartMap[key] }));

            // 2. CRM (Leads)
            const totalLeads = leadsList.length;

            // Get Custom Stage Names from LocalStorage or use Default
            const savedStages = localStorage.getItem('nghub_crm_stages');
            const stageMap: Record<string, string> = savedStages ? JSON.parse(savedStages) : {
                [LeadStage.NEW_LEAD]: 'Novo Lead',
                [LeadStage.QUALIFIED]: 'Qualificado',
                [LeadStage.NEGOTIATION]: 'Em Negociação',
                [LeadStage.WON]: 'Venda Fechada',
                [LeadStage.CHURN]: 'Churn'
            };

            // Calculate conversion
            const wonLeads = leadsList.filter(l => l.stage === LeadStage.WON || l.stage === 'Membro Ativo').length;

            // Funnel Data
            const stages = [LeadStage.NEW_LEAD, LeadStage.QUALIFIED, LeadStage.NEGOTIATION, LeadStage.WON];
            const funnel: FunnelDataPoint[] = stages.map(stageKey => ({
                name: stageMap[stageKey],
                value: leadsList.filter(l => l.stage === stageKey || (stageKey === LeadStage.WON && l.stage === 'Membro Ativo')).length
            }));

            // 3. Eventos
            let nextEventDays = 'N/A';
            let nextEventName = 'Sem eventos';

            if (upcomingEvents && upcomingEvents.length > 0) {
                const nextDate = new Date(upcomingEvents[0].date);
                const today = new Date();
                const diffTime = Math.abs(nextDate.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                nextEventDays = `${diffDays} dias`;
                nextEventName = upcomingEvents[0].title;
            }

            // 4. Atividade Recente
            const activity: ActivityItem[] = [
                ...filteredTransactions.slice(-3).map(t => ({
                    type: 'finance' as const,
                    title: t.description,
                    value: `R$ ${t.amount}`,
                    date: t.date,
                    status: (t.type === 'income' ? 'success' : 'danger') as 'success' | 'danger'
                })),
                ...leadsList.slice(-3).map(l => ({
                    type: 'lead' as const,
                    title: `Novo Lead: ${l.name}`,
                    value: stageMap[l.stage] || l.stage,
                    date: l.created_at,
                    status: 'neutral' as const
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

            setKpis({
                revenue: grossRevenue,
                expenses: totalExpenses,
                netIncome,
                activeLeads: wonLeads,
                totalLeads,
                conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
                nextEventDays,
                nextEventName
            });
            setChartData(chart);
            setFunnelData(funnel);
            setRecentActivity(activity);
            setAvailableOwners(Array.from(ownersMap.entries()).map(([id, name]) => ({id, name})));
            setAvailablePipelines(Array.from(pipelinesSet));

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return { loading, kpis, chartData, funnelData, recentActivity, availableOwners, availablePipelines };
};
