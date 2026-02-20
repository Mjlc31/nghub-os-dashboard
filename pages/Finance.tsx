import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Download, Plus, Loader2, FileText, LayoutDashboard, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const Finance: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cashflow' | 'dre'>('cashflow');
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrans, setNewTrans] = useState({ description: '', amount: '', type: 'income', category: 'Outros' });

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const filteredTransactions = transactions.filter(t => filter === 'all' ? true : t.type === filter);

  const handleDeleteTransaction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Confirma a exclusão deste lançamento?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(current => current.filter(t => t.id !== id));
    } catch (err) { alert('Erro ao excluir transação.'); }
  };

  const handleAddTransaction = async () => {
    if (!newTrans.description || !newTrans.amount) return;
    const amount = parseFloat(newTrans.amount);
    try {
      const { data, error } = await supabase.from('transactions').insert([
        { description: newTrans.description, amount: amount, type: newTrans.type, category: newTrans.category, status: 'paid', date: new Date().toISOString() }
      ]).select();
      if (error) throw error;
      if (data) {
        setTransactions([data[0], ...transactions]);
        setIsModalOpen(false);
        setNewTrans({ description: '', amount: '', type: 'income', category: 'Outros' });
      }
    } catch (error) { console.error(error); }
  };

  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = incomeTotal - expenseTotal;

  const generateDRE = () => {
    const grossIncome = incomeTotal;
    const taxes = grossIncome * 0.06;
    const netIncome = grossIncome - taxes;
    const totalExpenses = expenseTotal;
    const operatingProfit = netIncome - totalExpenses;
    const groupedExpenses: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { groupedExpenses[t.category] = (groupedExpenses[t.category] || 0) + Number(t.amount); });
    return { grossIncome, taxes, netIncome, groupedExpenses, totalExpenses, operatingProfit };
  };
  const dreData = generateDRE();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div><h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">Financeiro</h1><p className="text-zinc-400">Fluxo de caixa, DRE e gestão de inadimplência.</p></div>
        <div className="flex gap-2"><button onClick={() => setIsModalOpen(true)} className="bg-brand-gold text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-[#c5a059] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"><Plus className="w-4 h-4" /> Nova Transação</button></div>
      </div>
      <div className="flex gap-4 border-b border-brand-border">
        <button onClick={() => setViewMode('cashflow')} className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'cashflow' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-zinc-500 hover:text-white'}`}><LayoutDashboard className="w-4 h-4" /> Fluxo de Caixa</button>
        <button onClick={() => setViewMode('dre')} className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'dre' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-zinc-500 hover:text-white'}`}><FileText className="w-4 h-4" /> DRE Contábil</button>
      </div>

      {viewMode === 'cashflow' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-surface p-8 rounded-xl border border-brand-border relative overflow-hidden group hover:border-brand-gold/30 transition-colors">
              <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowUpRight className="w-24 h-24 text-brand-gold" /></div>
              <p className="text-zinc-400 text-sm font-medium tracking-wide">Entradas (Total)</p>
              <p className="text-4xl font-serif font-bold text-brand-gold mt-2">R$ {incomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-brand-surface p-8 rounded-xl border border-brand-border relative overflow-hidden group hover:border-red-500/30 transition-colors">
              <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowDownRight className="w-24 h-24 text-red-400" /></div>
              <p className="text-zinc-400 text-sm font-medium tracking-wide">Saídas (Total)</p>
              <p className="text-4xl font-serif font-bold text-red-400 mt-2">R$ {expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gradient-to-br from-zinc-900 to-[#1e1e24] p-8 rounded-xl border border-brand-border hover:border-white/20 transition-colors">
              <p className="text-zinc-400 text-sm font-medium tracking-wide">Saldo Líquido</p>
              <p className={`text-4xl font-serif font-bold mt-2 ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-brand-surface p-8 rounded-xl border border-brand-border">
              <h3 className="text-lg font-serif font-semibold text-white mb-6">Fluxo de Caixa</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactions.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="category" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontFamily: 'serif' }} />
                    <Bar dataKey="amount" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-xl flex flex-col">
              <div className="p-6 border-b border-brand-border flex justify-between items-center"><h3 className="font-serif font-semibold text-white">Transações Recentes</h3><div className="flex gap-2"><button onClick={() => setFilter('all')} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Todos</button><button onClick={() => setFilter('income')} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${filter === 'income' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Entradas</button><button onClick={() => setFilter('expense')} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${filter === 'expense' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Saídas</button></div></div>
              <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar p-4">
                {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-gold" /></div> : filteredTransactions.length === 0 ? <div className="text-center py-10 text-zinc-500 text-sm">Nenhuma transação encontrada.</div> : filteredTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-red-900/20 text-red-400'}`}>{t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}</div>
                      <div><p className="text-sm font-medium text-white group-hover:text-brand-gold transition-colors">{t.description}</p><p className="text-xs text-zinc-500">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className={`text-sm font-mono font-medium ${t.type === 'income' ? 'text-brand-gold' : 'text-white'}`}>{t.type === 'income' ? '+' : '-'}R$ {Math.abs(t.amount)}</p><p className={`text-[10px] ${t.status === 'paid' ? 'text-zinc-600' : 'text-brand-gold'}`}>{t.status === 'paid' ? 'Pago' : 'Pendente'}</p></div>
                      <button onClick={(e) => handleDeleteTransaction(t.id, e)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Excluir Lançamento"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'dre' && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4"><h3 className="text-2xl font-serif font-bold text-white">Demonstração do Resultado (DRE)</h3><button className="text-sm text-brand-gold hover:underline flex items-center gap-1"><Download className="w-4 h-4" /> Baixar PDF</button></div>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between py-3 border-b border-zinc-800 hover:bg-zinc-900/30 px-2 transition-colors"><span className="text-zinc-300 font-bold">(+) Receita Operacional Bruta</span><span className="text-brand-gold">R$ {dreData.grossIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between py-3 border-b border-zinc-800 hover:bg-zinc-900/30 px-2 transition-colors"><span className="text-zinc-500">(-) Deduções e Impostos (Est. 6%)</span><span className="text-red-400">- R$ {dreData.taxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between py-4 border-b border-zinc-700 bg-zinc-900/20 px-2"><span className="text-white font-bold">(=) Receita Operacional Líquida</span><span className="text-white">R$ {dreData.netIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div className="py-4">
              <span className="text-zinc-500 px-2 block mb-2">(-) Despesas Operacionais</span>
              {Object.entries(dreData.groupedExpenses).map(([category, amount]) => (<div key={category} className="flex justify-between py-1 px-4 text-xs text-zinc-400"><span>{category}</span><span>- R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>))}
              <div className="flex justify-between py-2 px-2 mt-2 border-t border-zinc-800/50"><span className="text-zinc-400 font-medium">Total Despesas</span><span className="text-red-400">- R$ {dreData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="flex justify-between py-6 border-t-2 border-brand-gold/20 bg-brand-gold/5 px-4 rounded mt-4"><span className="text-xl font-serif font-bold text-white">(=) Resultado Operacional (EBITDA)</span><span className={`text-xl font-bold ${dreData.operatingProfit >= 0 ? 'text-brand-gold' : 'text-red-500'}`}>R$ {dreData.operatingProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação" footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button><button onClick={handleAddTransaction} className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-semibold hover:bg-[#c5a059] transition-colors">Salvar</button></>}>
        <div className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Mensalidade Cliente X"
            value={newTrans.description}
            onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              placeholder="0.00"
              value={newTrans.amount}
              onChange={(e) => setNewTrans({ ...newTrans, amount: e.target.value })}
            />
            <Select
              label="Tipo"
              value={newTrans.type}
              onChange={(e) => setNewTrans({ ...newTrans, type: e.target.value })}
              options={[
                { value: 'income', label: 'Receita (Entrada)' },
                { value: 'expense', label: 'Despesa (Saída)' }
              ]}
            />
          </div>
          <Input
            label="Categoria"
            placeholder="Ex: Vendas, Marketing, Software..."
            value={newTrans.category}
            onChange={(e) => setNewTrans({ ...newTrans, category: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
export default Finance;