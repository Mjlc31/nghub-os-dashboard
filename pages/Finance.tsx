import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, Download, Plus, Loader2, FileText,
  LayoutDashboard, Trash2, Settings, Edit3, AlertCircle, CheckCircle,
  Clock, TrendingUp, TrendingDown, X, Save
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Transaction, FinanceSettings, FixedCost } from '../types';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const pct = (v: number, total: number) => total === 0 ? '0,00%' : `${((v / total) * 100).toFixed(1)}%`;

const PIE_COLORS = ['#D4AF37', '#f87171', '#60a5fa', '#34d399', '#a78bfa', '#fb923c', '#e879f9', '#38bdf8'];

const REGIME_LABELS: Record<string, string> = {
  simples: 'Simples Nacional',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
};

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Única',
  monthly: 'Mensal',
  annual: 'Anual',
};

function getTransactionStatus(t: Transaction): 'paid' | 'pending' | 'overdue' {
  if (t.status === 'paid') return 'paid';
  if (t.due_date && new Date(t.due_date) < new Date()) return 'overdue';
  return 'pending';
}

function getMonthlyChart(data: { amount: number; type: string; date: string }[]) {
  const months: Record<string, { month: string; Receita: number; Despesa: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months[key] = { month: label, Receita: 0, Despesa: 0 };
  }
  data.forEach(t => {
    const key = t.date.slice(0, 7);
    if (months[key]) {
      if (t.type === 'income') months[key].Receita += Number(t.amount);
      else months[key].Despesa += Number(t.amount);
    }
  });
  return Object.values(months);
}

function filterByPeriod<T extends { date: string }>(items: T[], period: string): T[] {
  if (period === 'all') return items;
  const now = new Date();
  const start = new Date();
  if (period === 'month') start.setDate(1);
  else if (period === 'quarter') start.setMonth(now.getMonth() - 2, 1);
  else if (period === 'year') start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  const startTime = start.getTime();
  return items.filter(t => new Date(t.date).getTime() >= startTime);
}

const DEFAULT_SETTINGS: FinanceSettings = {
  tax_rate: 6,
  tax_regime: 'simples',
  fixed_costs: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

const Finance: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cashflow' | 'dre'>('cashflow');
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allDataList, setAllDataList] = useState<{ amount: number; type: string; category: string; date: string; status: string; due_date?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Settings
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<FinanceSettings>(DEFAULT_SETTINGS);
  const [newFixedCost, setNewFixedCost] = useState({ name: '', amount: '', category: 'Fixo' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Transaction modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTrans, setNewTrans] = useState({
    description: '', amount: '', type: 'income', category: 'Outros',
    status: 'paid', due_date: '', recurrence: 'once',
  });

  const location = useLocation();

  useEffect(() => { fetchAllData(); fetchSettings(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filter, periodFilter]);
  useEffect(() => { fetchPaginatedTransactions(); }, [currentPage, filter, periodFilter]);
  useEffect(() => {
    if (location.state?.openModal) { setIsAddOpen(true); window.history.replaceState({}, document.title); }
  }, [location]);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('finance_settings').select('*').limit(1).single();
      if (data) {
        setSettings({
          ...data,
          fixed_costs: Array.isArray(data.fixed_costs) ? data.fixed_costs : [],
        });
      }
    } catch { /* use defaults */ }
  };

  const fetchAllData = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, category, date, status, due_date');
      if (error) throw error;
      setAllDataList(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchPaginatedTransactions = async () => {
    try {
      setIsListLoading(true);
      let query = supabase.from('transactions').select('*', { count: 'exact' });
      if (filter !== 'all') query = query.eq('type', filter);
      if (periodFilter !== 'all') {
        const now = new Date();
        const start = new Date();
        if (periodFilter === 'month') start.setDate(1);
        else if (periodFilter === 'quarter') start.setMonth(now.getMonth() - 2, 1);
        else if (periodFilter === 'year') start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        query = query.gte('date', start.toISOString());
      }
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, count, error } = await query.order('date', { ascending: false }).range(start, start + ITEMS_PER_PAGE - 1);
      if (error) throw error;
      setTransactions(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE) || 1);
    } catch (e) { console.error(e); } finally { setIsListLoading(false); }
  };

  const refresh = useCallback(() => { fetchAllData(); fetchPaginatedTransactions(); }, [currentPage, filter, periodFilter]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleDeleteTransaction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Confirma a exclusão deste lançamento?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      refresh();
    } catch { alert('Erro ao excluir transação.'); }
  };

  const handleAddTransaction = async () => {
    if (!newTrans.description || !newTrans.amount) return;
    try {
      const { error } = await supabase.from('transactions').insert([{
        description: newTrans.description,
        amount: parseFloat(newTrans.amount),
        type: newTrans.type,
        category: newTrans.category,
        status: newTrans.status,
        date: new Date().toISOString(),
        due_date: newTrans.due_date || null,
        recurrence: newTrans.recurrence,
      }]);
      if (error) throw error;
      setIsAddOpen(false);
      setNewTrans({ description: '', amount: '', type: 'income', category: 'Outros', status: 'paid', due_date: '', recurrence: 'once' });
      refresh();
    } catch (e) { console.error(e); }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    try {
      const { error } = await supabase.from('transactions').update({
        description: editingTransaction.description,
        amount: Number(editingTransaction.amount),
        type: editingTransaction.type,
        category: editingTransaction.category,
        status: editingTransaction.status,
        due_date: editingTransaction.due_date || null,
        recurrence: editingTransaction.recurrence || 'once',
      }).eq('id', editingTransaction.id);
      if (error) throw error;
      setEditingTransaction(null);
      refresh();
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const payload = {
        tax_rate: draftSettings.tax_rate,
        tax_regime: draftSettings.tax_regime,
        fixed_costs: draftSettings.fixed_costs,
        updated_at: new Date().toISOString(),
      };
      if (settings.id) {
        await supabase.from('finance_settings').update(payload).eq('id', settings.id);
      } else {
        const { data } = await supabase.from('finance_settings').insert([payload]).select().single();
        if (data) setSettings({ ...draftSettings, id: data.id });
      }
      setSettings({ ...draftSettings });
      setIsSettingsOpen(false);
    } catch (e) { console.error(e); } finally { setIsSavingSettings(false); }
  };

  const openSettings = () => {
    setDraftSettings({ ...settings, fixed_costs: settings.fixed_costs.map(c => ({ ...c })) });
    setIsSettingsOpen(true);
  };

  const addFixedCost = () => {
    if (!newFixedCost.name || !newFixedCost.amount) return;
    const cost: FixedCost = {
      id: crypto.randomUUID(),
      name: newFixedCost.name,
      amount: parseFloat(newFixedCost.amount),
      category: newFixedCost.category,
    };
    setDraftSettings(s => ({ ...s, fixed_costs: [...s.fixed_costs, cost] }));
    setNewFixedCost({ name: '', amount: '', category: 'Fixo' });
  };

  const removeFixedCost = (id: string) => {
    setDraftSettings(s => ({ ...s, fixed_costs: s.fixed_costs.filter(c => c.id !== id) }));
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Descrição,Valor,Tipo,Categoria,Status,Data,Vencimento,Recorrência';
    const rows = transactions.map(t =>
      [t.description, t.amount, t.type === 'income' ? 'Receita' : 'Despesa', t.category,
      t.status, new Date(t.date).toLocaleDateString('pt-BR'), t.due_date || '', RECURRENCE_LABELS[t.recurrence || 'once'] || ''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transacoes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const periodData = filterByPeriod(allDataList, periodFilter) as any[];

  const incomeTotal = periodData.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const expenseTotal = periodData.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  const fixedCostsTotal = settings.fixed_costs.reduce((a, c) => a + Number(c.amount), 0);
  const balance = incomeTotal - expenseTotal - fixedCostsTotal;

  // Previous month for deltas
  const prevMonthStart = new Date(); prevMonthStart.setMonth(prevMonthStart.getMonth() - 1, 1); prevMonthStart.setHours(0, 0, 0, 0);
  const prevMonthEnd = new Date(); prevMonthEnd.setDate(0); prevMonthEnd.setHours(23, 59, 59, 999);
  const prevData = allDataList.filter(t => { const d = new Date(t.date); return d >= prevMonthStart && d <= prevMonthEnd; });
  const prevIncome = prevData.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const prevExpense = prevData.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  const delta = (curr: number, prev: number) => prev === 0 ? null : ((curr - prev) / prev) * 100;

  const incomeTransactions = periodData.filter(t => t.type === 'income');
  const ticketAvg = incomeTransactions.length > 0 ? incomeTotal / incomeTransactions.length : 0;

  const today = new Date();
  const inadimplencia = periodData
    .filter(t => t.status !== 'paid' && t.due_date && new Date(t.due_date) < today)
    .reduce((a, t) => a + Number(t.amount), 0);

  const monthlyChartData = getMonthlyChart(allDataList);

  // Grouped expenses for pie chart
  const expenseByCategory: Record<string, number> = {};
  periodData.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount);
  });
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  // ─── DRE ─────────────────────────────────────────────────────────────────

  const generateDRE = () => {
    const grossIncome = incomeTotal;
    const taxRate = settings.tax_rate / 100;
    const taxes = grossIncome * taxRate;
    const netIncome = grossIncome - taxes;

    const cmvCategory = (periodData || []).filter(t => t.type === 'expense' && (t.category || '').toLowerCase().includes('cmv'));
    const cmv = cmvCategory.reduce((a, t) => a + Number(t.amount), 0);
    const grossProfit = netIncome - cmv;

    const operationalExpenses: Record<string, number> = {};
    (periodData || []).filter(t => t.type === 'expense' && !(t.category || '').toLowerCase().includes('cmv'))
      .forEach(t => { operationalExpenses[t.category] = (operationalExpenses[t.category] || 0) + Number(t.amount); });
    const totalOpex = Object.values(operationalExpenses).reduce((a, v) => a + v, 0);

    const groupedFixed: Record<string, number> = {};
    (settings?.fixed_costs || []).forEach(c => { groupedFixed[c.category] = (groupedFixed[c.category] || 0) + Number(c.amount); });

    const ebitda = grossProfit - totalOpex - fixedCostsTotal;
    const ebit = ebitda;
    const lucroLiquido = ebit;

    return { grossIncome, taxes, taxRate, netIncome, cmv, grossProfit, operationalExpenses, totalOpex, groupedFixed, ebitda, ebit, lucroLiquido };
  };

  const dre = generateDRE();

  // ─── Render Helpers ───────────────────────────────────────────────────────


  const DeltaBadge = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const up = value >= 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const DRELine = ({ label, value, indent = false, isSubtotal = false, isTotal = false, showPct = false, base = 0, positive = true }: {
    label: string; value: number; indent?: boolean; isSubtotal?: boolean; isTotal?: boolean; showPct?: boolean; base?: number; positive?: boolean;
  }) => (
    <div className={`flex justify-between items-center px-2 transition-colors
      ${isTotal ? 'py-5 border-t-2 border-brand-gold/40 bg-brand-gold/5 rounded-lg mt-2' : isSubtotal ? 'py-3 border-t border-zinc-800 bg-zinc-900/20' : 'py-2 hover:bg-zinc-900/20'}
      ${indent ? 'pl-6 text-xs text-zinc-400' : ''}`}>
      <span className={`font-mono ${isTotal ? 'text-lg font-bold text-white' : isSubtotal ? 'font-semibold text-zinc-200' : 'text-zinc-300'}`}>{label}</span>
      <div className="flex items-center gap-4">
        {showPct && base > 0 && <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{pct(value, base)}</span>}
        <span className={`font-mono tabular-nums ${isTotal ? 'text-xl font-bold text-brand-gold' : positive ? (value >= 0 ? 'text-brand-gold' : 'text-red-400') : 'text-red-400'}`}>
          {!positive && value > 0 ? '- ' : ''}R$ {fmt(Math.abs(value))}
        </span>
      </div>
    </div>
  );

  const StatusBadge = ({ t }: { t: Transaction }) => {
    const s = getTransactionStatus(t);
    if (s === 'paid') return <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" />Pago</span>;
    if (s === 'overdue') return <span className="text-[9px] uppercase font-bold tracking-wider text-red-400 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />Vencido</span>;
    return <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Pendente</span>;
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-1">Financeiro</h1>
          <p className="text-zinc-400">Fluxo de caixa, DRE e gestão financeira.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-brand-border">
            {(['month', 'quarter', 'year', 'all'] as const).map(p => {
              const labels = { month: 'Mês', quarter: 'Trimestre', year: 'Ano', all: 'Tudo' };
              return (
                <button key={p} onClick={() => setPeriodFilter(p)}
                  className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-md transition-all duration-200 ${periodFilter === p ? 'bg-brand-border text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {labels[p]}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={exportCSV} icon={Download}>CSV</Button>
          <Button variant="ghost" onClick={openSettings} icon={Settings}>Config.</Button>
          <Button variant="primary" onClick={() => setIsAddOpen(true)} icon={Plus}>Nova Transação</Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-4 border-b border-brand-border">
        <button onClick={() => setViewMode('cashflow')} className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'cashflow' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-zinc-500 hover:text-white'}`}>
          <LayoutDashboard className="w-4 h-4" /> Fluxo de Caixa
        </button>
        <button onClick={() => setViewMode('dre')} className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'dre' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-zinc-500 hover:text-white'}`}>
          <FileText className="w-4 h-4" /> DRE Contábil
        </button>
      </div>

      {/* ═══════════════════════ CASHFLOW VIEW ═══════════════════════ */}
      {viewMode === 'cashflow' && (
        <>
          {/* ── 5 KPI Cards ── */}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-gold" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Receita */}
              <div className="bg-brand-surface p-6 rounded-xl border border-brand-border relative overflow-hidden group hover:border-brand-gold/30 transition-colors col-span-1">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowUpRight className="w-16 h-16 text-brand-gold" /></div>
                <p className="text-zinc-400 text-xs font-medium tracking-wide uppercase mb-1">Receita</p>
                <p className="text-2xl font-serif font-bold text-brand-gold">R$ {fmt(incomeTotal)}</p>
                <DeltaBadge value={delta(incomeTotal, prevIncome)} />
              </div>
              {/* Despesas */}
              <div className="bg-brand-surface p-6 rounded-xl border border-brand-border relative overflow-hidden group hover:border-red-500/30 transition-colors col-span-1">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowDownRight className="w-16 h-16 text-red-400" /></div>
                <p className="text-zinc-400 text-xs font-medium tracking-wide uppercase mb-1">Despesas</p>
                <p className="text-2xl font-serif font-bold text-red-400">R$ {fmt(expenseTotal + fixedCostsTotal)}</p>
                <DeltaBadge value={delta(expenseTotal, prevExpense)} />
              </div>
              {/* Lucro Líquido */}
              <div className="bg-gradient-to-br from-zinc-900 to-[#1e1e24] p-6 rounded-xl border border-brand-border hover:border-white/20 transition-colors col-span-1">
                <p className="text-zinc-400 text-xs font-medium tracking-wide uppercase mb-1">Lucro Líquido</p>
                <p className={`text-2xl font-serif font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {fmt(balance)}</p>
                <span className="text-[10px] text-zinc-500 font-mono">{pct(balance, incomeTotal)} de margem</span>
              </div>
              {/* Ticket Médio */}
              <div className="bg-brand-surface p-6 rounded-xl border border-brand-border hover:border-indigo-400/30 transition-colors col-span-1">
                <p className="text-zinc-400 text-xs font-medium tracking-wide uppercase mb-1">Ticket Médio</p>
                <p className="text-2xl font-serif font-bold text-indigo-300">R$ {fmt(ticketAvg)}</p>
                <span className="text-[10px] text-zinc-500">{incomeTransactions.length} receitas</span>
              </div>
              {/* Inadimplência */}
              <div className="bg-brand-surface p-6 rounded-xl border border-brand-border hover:border-amber-500/30 transition-colors col-span-1">
                <p className="text-zinc-400 text-xs font-medium tracking-wide uppercase mb-1">Inadimplência</p>
                <p className={`text-2xl font-serif font-bold ${inadimplencia > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>R$ {fmt(inadimplencia)}</p>
                <span className="text-[10px] text-zinc-500">vencidos e pendentes</span>
              </div>
            </div>
          )}

          {/* ── Charts + List ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly chart */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-brand-surface p-6 rounded-xl border border-brand-border">
                <h3 className="text-base font-serif font-semibold text-white mb-4">Fluxo Mensal — últimos 12 meses</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        formatter={(val: number) => [`R$ ${fmt(val)}`, undefined]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                      <Bar dataKey="Receita" fill="#D4AF37" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Despesa" fill="#f87171" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie chart */}
              {pieData.length > 0 && (
                <div className="bg-brand-surface p-6 rounded-xl border border-brand-border">
                  <h3 className="text-base font-serif font-semibold text-white mb-4">Despesas por Categoria</h3>
                  <div className="flex items-center gap-6">
                    <div className="h-[180px] w-[180px] flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(val: number) => [`R$ ${fmt(val)}`, undefined]} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-zinc-300 truncate">{d.name}</span>
                          </div>
                          <span className="font-mono text-zinc-400 flex-shrink-0">R$ {fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction list */}
            <div className="bg-brand-surface border border-brand-border rounded-xl flex flex-col">
              <div className="p-5 border-b border-brand-border flex justify-between items-center">
                <h3 className="font-serif font-semibold text-white">Lançamentos</h3>
                <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-brand-border">
                  {(['all', 'income', 'expense'] as const).map(f => {
                    const labels = { all: 'Todos', income: 'Entradas', expense: 'Saídas' };
                    return (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-md transition-all duration-200 ${filter === f ? 'bg-brand-border text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        {labels[f]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[420px] custom-scrollbar p-3">
                {isListLoading
                  ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-gold" /></div>
                  : transactions.length === 0
                    ? <div className="text-center py-10 text-zinc-500 text-sm">Nenhuma transação encontrada.</div>
                    : transactions.map(t => (
                      <div key={t.id}
                        onClick={() => setEditingTransaction({ ...t })}
                        className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-zinc-800">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-red-900/20 text-red-400'}`}>
                            {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white group-hover:text-brand-gold transition-colors truncate">{t.description}</p>
                            <p className="text-xs text-zinc-500 truncate">{t.category} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                            <StatusBadge t={t} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-mono font-medium ${t.type === 'income' ? 'text-brand-gold' : 'text-white'}`}>
                              {t.type === 'income' ? '+' : '-'}R$ {fmt(Number(t.amount))}
                            </p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setEditingTransaction({ ...t }); }}
                            className="p-1.5 text-zinc-600 hover:text-brand-gold hover:bg-brand-gold/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => handleDeleteTransaction(t.id, e)}
                            className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                }
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-brand-border flex items-center justify-between bg-zinc-900/40 rounded-b-xl">
                  <span className="text-xs text-zinc-500">Página {currentPage} de {totalPages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isListLoading}
                      className="px-3 py-1 rounded border border-zinc-800 text-xs font-medium text-zinc-400 disabled:opacity-30 hover:bg-zinc-800">Anterior</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isListLoading}
                      className="px-3 py-1 rounded border border-zinc-800 text-xs font-medium text-zinc-400 disabled:opacity-30 hover:bg-zinc-800">Próximo</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════ DRE VIEW ═══════════════════════ */}
      {viewMode === 'dre' && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-2xl font-serif font-bold text-white">Demonstração do Resultado (DRE)</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Regime: <span className="text-zinc-300">{REGIME_LABELS[settings.tax_regime]}</span>
                {' · '}Alíquota: <span className="text-zinc-300">{settings.tax_rate}%</span>
                {' · '}Período: <span className="text-zinc-300">{{ month: 'Mês atual', quarter: 'Trimestre', year: 'Ano atual', all: 'Todo o período' }[periodFilter]}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={openSettings} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 border border-zinc-800 px-3 py-1.5 rounded-lg hover:border-zinc-600 transition-colors">
                <Settings className="w-3.5 h-3.5" /> Configurar
              </button>
              <button onClick={exportCSV} className="text-xs text-brand-gold hover:underline flex items-center gap-1">
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>

          <div className="space-y-0.5 font-mono text-sm">
            <DRELine label="(+) Receita Operacional Bruta" value={dre.grossIncome} />

            {/* Receita por categoria */}
            {Object.entries(
              periodData.filter((t: any) => t.type === 'income').reduce<Record<string, number>>((acc, t: any) => {
                acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc;
              }, {})
            ).map(([cat, val]) => <React.Fragment key={cat}><DRELine label={`  ${cat}`} value={val} indent positive /></React.Fragment>)}

            <div className="h-px bg-zinc-800 my-1" />
            <DRELine label={`(-) ${REGIME_LABELS[settings.tax_regime]} (${settings.tax_rate}%)`} value={dre.taxes} positive={false} />
            <DRELine label="(=) Receita Operacional Líquida" value={dre.netIncome} isSubtotal showPct base={dre.grossIncome} />

            <div className="h-px bg-zinc-800 my-2" />
            {dre.cmv > 0 && <DRELine label="(-) CMV — Custo das Mercadorias/Serviços" value={dre.cmv} positive={false} />}
            <DRELine label="(=) Lucro Bruto" value={dre.grossProfit} isSubtotal showPct base={dre.grossIncome} />

            <div className="h-px bg-zinc-800 my-2" />
            <p className="text-zinc-500 text-xs px-2 py-1">(-) Despesas Operacionais</p>
            {Object.entries(dre.operationalExpenses).map(([cat, val]) =>
              <React.Fragment key={cat}><DRELine label={`  ${cat}`} value={val} indent positive={false} /></React.Fragment>
            )}
            {Object.keys(dre.operationalExpenses).length > 0 && (
              <div className="flex justify-between py-1.5 px-2 border-t border-zinc-800/50 mt-1">
                <span className="text-zinc-400 font-mono text-xs">Subtotal Despesas Operacionais</span>
                <span className="font-mono text-xs text-red-400">- R$ {fmt(dre.totalOpex)}</span>
              </div>
            )}

            {settings.fixed_costs.length > 0 && (
              <>
                <div className="h-px bg-zinc-800/50 my-1" />
                <p className="text-zinc-500 text-xs px-2 py-1">(-) Custos Fixos</p>
                {Object.entries(dre.groupedFixed).map(([cat, val]) =>
                  <React.Fragment key={cat}><DRELine label={`  ${cat}`} value={val} indent positive={false} /></React.Fragment>
                )}
                <div className="flex justify-between py-1.5 px-2 border-t border-zinc-800/50 mt-1">
                  <span className="text-zinc-400 font-mono text-xs">Subtotal Custos Fixos</span>
                  <span className="font-mono text-xs text-red-400">- R$ {fmt(fixedCostsTotal)}</span>
                </div>
              </>
            )}

            <DRELine label="(=) EBITDA — Resultado Operacional" value={dre.ebitda} isSubtotal showPct base={dre.grossIncome} />
            <DRELine label="(=) EBIT — Resultado Antes de Juros e IR" value={dre.ebit} isSubtotal />
            <DRELine label="(=) Lucro Líquido do Exercício" value={dre.lucroLiquido} isTotal showPct base={dre.grossIncome} />
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODAL: Nova Transação ═══════════════════════ */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Transação" footer={
        <><Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleAddTransaction} icon={Plus}>Salvar</Button></>
      }>
        <div className="space-y-4">
          <Input label="Descrição" placeholder="Ex: Mensalidade Cliente X" value={newTrans.description} onChange={e => setNewTrans({ ...newTrans, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$)" type="number" placeholder="0.00" value={newTrans.amount} onChange={e => setNewTrans({ ...newTrans, amount: e.target.value })} />
            <Select label="Tipo" value={newTrans.type} onChange={e => setNewTrans({ ...newTrans, type: e.target.value })}
              options={[{ value: 'income', label: 'Receita (Entrada)' }, { value: 'expense', label: 'Despesa (Saída)' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Categoria" placeholder="Ex: Vendas, Marketing..." value={newTrans.category} onChange={e => setNewTrans({ ...newTrans, category: e.target.value })} />
            <Select label="Status" value={newTrans.status} onChange={e => setNewTrans({ ...newTrans, status: e.target.value })}
              options={[{ value: 'paid', label: 'Pago' }, { value: 'pending', label: 'Pendente' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de Vencimento" type="date" value={newTrans.due_date} onChange={e => setNewTrans({ ...newTrans, due_date: e.target.value })} />
            <Select label="Recorrência" value={newTrans.recurrence} onChange={e => setNewTrans({ ...newTrans, recurrence: e.target.value })}
              options={[{ value: 'once', label: 'Única' }, { value: 'monthly', label: 'Mensal' }, { value: 'annual', label: 'Anual' }]} />
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════ MODAL: Editar Transação ═══════════════════════ */}
      <Modal isOpen={!!editingTransaction} onClose={() => setEditingTransaction(null)} title="Editar Transação" footer={
        <><Button variant="ghost" onClick={() => setEditingTransaction(null)}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateTransaction} icon={Save}>Salvar Alterações</Button></>
      }>
        {editingTransaction && (
          <div className="space-y-4">
            <Input label="Descrição" value={editingTransaction.description}
              onChange={e => setEditingTransaction({ ...editingTransaction, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Valor (R$)" type="number" value={String(editingTransaction.amount)}
                onChange={e => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })} />
              <Select label="Tipo" value={editingTransaction.type}
                onChange={e => setEditingTransaction({ ...editingTransaction, type: e.target.value as 'income' | 'expense' })}
                options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Categoria" value={editingTransaction.category}
                onChange={e => setEditingTransaction({ ...editingTransaction, category: e.target.value })} />
              <Select label="Status" value={editingTransaction.status}
                onChange={e => setEditingTransaction({ ...editingTransaction, status: e.target.value as 'paid' | 'pending' | 'failed' })}
                options={[{ value: 'paid', label: 'Pago' }, { value: 'pending', label: 'Pendente' }, { value: 'failed', label: 'Falhou' }]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data de Vencimento" type="date" value={editingTransaction.due_date || ''}
                onChange={e => setEditingTransaction({ ...editingTransaction, due_date: e.target.value })} />
              <Select label="Recorrência" value={editingTransaction.recurrence || 'once'}
                onChange={e => setEditingTransaction({ ...editingTransaction, recurrence: e.target.value as 'once' | 'monthly' | 'annual' })}
                options={[{ value: 'once', label: 'Única' }, { value: 'monthly', label: 'Mensal' }, { value: 'annual', label: 'Anual' }]} />
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════ MODAL: Configurações ═══════════════════════ */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Configurações Financeiras" footer={
        <><Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveSettings} icon={isSavingSettings ? Loader2 : Save}>
            {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
          </Button></>
      }>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Alíquota de Imposto (%)"
              type="number"
              placeholder="6"
              value={String(draftSettings.tax_rate)}
              onChange={e => setDraftSettings({ ...draftSettings, tax_rate: parseFloat(e.target.value) || 0 })}
            />
            <Select
              label="Regime Tributário"
              value={draftSettings.tax_regime}
              onChange={e => setDraftSettings({ ...draftSettings, tax_regime: e.target.value as FinanceSettings['tax_regime'] })}
              options={[
                { value: 'simples', label: 'Simples Nacional' },
                { value: 'presumido', label: 'Lucro Presumido' },
                { value: 'real', label: 'Lucro Real' },
              ]}
            />
          </div>

          {/* Fixed costs */}
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-3">Custos Fixos Recorrentes</p>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
              {draftSettings.fixed_costs.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-3">Nenhum custo fixo cadastrado.</p>
              )}
              {draftSettings.fixed_costs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div>
                    <p className="text-sm text-white font-medium">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-red-400">R$ {fmt(c.amount)}</span>
                    <button onClick={() => removeFixedCost(c.id)} className="p-1 text-zinc-600 hover:text-red-500 rounded transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <Input placeholder="Ex: Aluguel" value={newFixedCost.name} onChange={e => setNewFixedCost({ ...newFixedCost, name: e.target.value })} />
              <Input type="number" placeholder="Valor R$" value={newFixedCost.amount} onChange={e => setNewFixedCost({ ...newFixedCost, amount: e.target.value })} />
              <div className="flex gap-2">
                <Input placeholder="Categoria" value={newFixedCost.category} onChange={e => setNewFixedCost({ ...newFixedCost, category: e.target.value })} />
                <button onClick={addFixedCost} className="flex-shrink-0 p-2 bg-brand-gold text-black rounded-lg hover:bg-brand-gold/90 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;