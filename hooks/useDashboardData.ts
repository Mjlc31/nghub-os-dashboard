import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LeadStage } from '../types';

export const useDashboardData = () => {
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
    const [chartData, setChartData] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. Financeiro (Transactions)
            const { data: trans } = await supabase.from('transactions').select('*').order('date', { ascending: true });

            const revenue = (trans || []).filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const expenses = (trans || []).filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);

            // Preparar dados para o gráfico de fluxo
            const chartMap: Record<string, number> = {};
            trans?.forEach(t => {
                const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const val = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
                chartMap[date] = (chartMap[date] || 0) + val;
            });
            const chart = Object.keys(chartMap).slice(-7).map(key => ({ name: key, value: chartMap[key] }));

            // 2. CRM (Leads)
            const { data: leads } = await supabase.from('leads').select('*');
            const totalLeads = leads?.length || 0;

            // Get Custom Stage Names from LocalStorage or use Default
            const savedStages = localStorage.getItem('nghub_crm_stages');
            const stageMap = savedStages ? JSON.parse(savedStages) : {
                [LeadStage.NEW_LEAD]: 'Novo Lead',
                [LeadStage.QUALIFIED]: 'Qualificado',
                [LeadStage.NEGOTIATION]: 'Em Negociação',
                [LeadStage.WON]: 'Venda Fechada', // Using new default
                [LeadStage.CHURN]: 'Churn'
            };

            // Calculate conversion based on WON stage (Venda Fechada)
            const wonLeads = leads?.filter(l => l.stage === LeadStage.WON || l.stage === 'Membro Ativo').length || 0;

            // Funnel Data
            const stages = [LeadStage.NEW_LEAD, LeadStage.QUALIFIED, LeadStage.NEGOTIATION, LeadStage.WON];
            const funnel = stages.map(stageKey => ({
                name: stageMap[stageKey],
                value: leads?.filter(l => l.stage === stageKey || (stageKey === LeadStage.WON && l.stage === 'Membro Ativo')).length || 0
            }));

            // 3. Eventos
            const { data: events } = await supabase.from('events').select('*').eq('status', 'upcoming').order('date', { ascending: true }).limit(1);
            let nextEventDays = 'N/A';
            let nextEventName = 'Sem eventos';

            if (events && events.length > 0) {
                const nextDate = new Date(events[0].date);
                const today = new Date();
                const diffTime = Math.abs(nextDate.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                nextEventDays = `${diffDays} dias`;
                nextEventName = events[0].title;
            }

            // 4. Atividade Recente (Mock + Real Mix)
            const activity = [
                ...(trans?.slice(-3).map(t => ({
                    type: 'finance' as const,
                    title: t.description,
                    value: `R$ ${t.amount}`,
                    date: t.date,
                    status: (t.type === 'income' ? 'success' : 'danger') as 'success' | 'danger'
                })) || []),
                ...(leads?.slice(-3).map(l => ({
                    type: 'lead' as const,
                    title: `Novo Lead: ${l.name}`,
                    value: stageMap[l.stage] || l.stage,
                    date: l.created_at,
                    status: 'neutral' as const
                })) || [])
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

            setKpis({
                revenue,
                expenses,
                netIncome: revenue - expenses,
                activeLeads: wonLeads,
                totalLeads,
                conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
                nextEventDays,
                nextEventName
            });
            setChartData(chart);
            setFunnelData(funnel);
            setRecentActivity(activity);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return { loading, kpis, chartData, funnelData, recentActivity };
};
