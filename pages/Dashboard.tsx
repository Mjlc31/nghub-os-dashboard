import React, { useEffect, useState } from 'react';
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
import { useDashboardData } from '../hooks/useDashboardData';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { loading, kpis, chartData, funnelData, recentActivity } = useDashboardData();

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-gold"></div></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight mb-1">Visão Geral</h1>
          <p className="text-sm text-zinc-400">Métricas de performance em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 bg-brand-surface border border-brand-border rounded-lg p-1 text-xs font-medium text-zinc-400">
          <span className="px-3 py-1 bg-brand-border text-white rounded shadow-sm">Hoje</span>
          <span className="px-3 py-1 hover:text-white cursor-pointer transition-colors">7D</span>
          <span className="px-3 py-1 hover:text-white cursor-pointer transition-colors">30D</span>
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
            onClick={() => onNavigate('finance')}
            className="bg-gradient-to-br from-brand-surface to-[#1e1e24] border border-brand-border rounded-xl p-6 flex flex-col justify-center items-center text-center group hover:border-brand-gold/30 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-brand-gold" />
            </div>
            <h4 className="text-white font-bold mb-1">Novo Recebimento</h4>
            <p className="text-xs text-zinc-500">Ir para Financeiro</p>
          </div>
          <div
            onClick={() => onNavigate('crm')}
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