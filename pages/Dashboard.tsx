import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  CalendarClock,
  CreditCard,
  Briefcase,
  Target
} from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { SalesFunnel } from '../components/dashboard/SalesFunnel';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { useDashboardData, TimeFilter } from '../hooks/useDashboardData';
import { Skeleton } from '../components/ui/Skeleton';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const { loading, kpis, chartData, funnelData, recentActivity } = useDashboardData(timeFilter);
  const navigate = useNavigate();

  const handleNavigate = (path: string, openModal = false) => {
    navigate(path, { state: { openModal } });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Skeleton className="h-10 w-48 mb-2 !rounded-md" />
            <Skeleton className="h-4 w-64 !rounded-md" />
          </div>
          <Skeleton className="h-8 w-32 !rounded-lg" />
        </div>

        {/* KPI Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <div className="flex justify-between items-end">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-10 w-10 !rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Bento Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
          <div className="lg:col-span-2 bg-brand-surface border border-brand-border p-6 rounded-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24 !rounded-lg" />
            </div>
            <Skeleton className="flex-1 w-full" />
          </div>
          <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl flex flex-col">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="flex flex-col flex-1 gap-2 justify-center">
              {[1, 2, 3, 4].map(i => (
                <React.Fragment key={i}>
                  <Skeleton className={`h-12 w-${[100, 80, 60, 40][i - 1]}% mx-auto`} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl">
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-10 w-10 !rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-full w-full !bg-brand-surface border-brand-border" />
            <Skeleton className="h-full w-full !bg-brand-surface border-brand-border" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight mb-1">Visão Geral</h1>
          <p className="text-sm text-zinc-400">Métricas de performance em tempo real.</p>
        </div>
        <div className="flex items-center gap-1 bg-brand-surface border border-brand-border rounded-lg p-1 text-xs font-medium text-zinc-400 overflow-x-auto no-scrollbar">
          <button onClick={() => setTimeFilter('today')} className={`px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap ${timeFilter === 'today' ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-zinc-800 hover:text-white'}`}>Hoje</button>
          <button onClick={() => setTimeFilter('7d')} className={`px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap ${timeFilter === '7d' ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-zinc-800 hover:text-white'}`}>7 Dias</button>
          <button onClick={() => setTimeFilter('15d')} className={`px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap ${timeFilter === '15d' ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-zinc-800 hover:text-white'}`}>15 Dias</button>
          <button onClick={() => setTimeFilter('30d')} className={`px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap ${timeFilter === '30d' ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-zinc-800 hover:text-white'}`}>30 Dias</button>
          <button onClick={() => setTimeFilter('all')} className={`px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap ${timeFilter === 'all' ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-zinc-800 hover:text-white'}`}>Todos</button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total"
          value={`R$ ${kpis.revenue.toLocaleString('pt-BR', { notation: 'compact' })}`}
          subtitle="Entradas confirmadas"
          icon={DollarSign}
          trend={12.5}
          colorClass="bg-brand-gold/10 text-brand-gold"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          subtitle={`${kpis.activeLeads} vendas fechadas`}
          icon={Target}
          trend={2.4}
          colorClass="bg-blue-500/10 text-blue-400"
        />
        <KPICard
          title="Próximo Evento"
          value={kpis.nextEventDays}
          subtitle={kpis.nextEventName}
          icon={CalendarClock}
          colorClass="bg-violet-500/10 text-violet-400"
        />
        <KPICard
          title="Resultado Líquido"
          value={`R$ ${kpis.netIncome.toLocaleString('pt-BR', { notation: 'compact' })}`}
          subtitle="Após despesas operacionais"
          icon={TrendingUp}
          trend={kpis.netIncome > 0 ? 5.2 : -1.2}
          colorClass={kpis.netIncome >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}
        />
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
        {/* Main Chart - Revenue */}
        <RevenueChart data={chartData} />

        {/* Sales Funnel */}
        <SalesFunnel data={funnelData} totalLeads={kpis.totalLeads} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity activities={recentActivity} />

        {/* Quick Actions / Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => handleNavigate('/finance', true)}
            className="bg-gradient-to-br from-brand-surface to-[#1e1e24] border border-brand-border rounded-xl p-6 flex flex-col justify-center items-center text-center group hover:border-brand-gold/30 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-brand-gold" />
            </div>
            <h4 className="text-white font-bold mb-1">Novo Recebimento</h4>
            <p className="text-xs text-zinc-500">Ir para Financeiro</p>
          </div>
          <div
            onClick={() => handleNavigate('/crm', true)}
            className="bg-gradient-to-br from-brand-surface to-[#1e1e24] border border-brand-border rounded-xl p-6 flex flex-col justify-center items-center text-center group hover:border-brand-gold/30 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6 text-brand-gold" />
            </div>
            <h4 className="text-white font-bold mb-1">Novo Lead</h4>
            <p className="text-xs text-zinc-500">Adicionar ao CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;