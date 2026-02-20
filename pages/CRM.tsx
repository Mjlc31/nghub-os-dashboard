import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Lead, LeadStage, Event } from '../types';
import {
  MoreHorizontal, Plus, Search, Filter, Phone, Calendar, ArrowRight,
  Save, MessageCircle, Loader2, UserPlus, Upload, FileSpreadsheet,
  Download, Trash2, Settings, CheckCircle, Mail, ChevronRight, Briefcase, ChevronDown, Tag, Edit2,
  X, MoveRight, MoveLeft, DollarSign
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { KanbanColumn } from '../components/crm/KanbanColumn';
import { LeadFormModal } from '../components/crm/LeadFormModal';
import { ImportLeadsModal } from '../components/crm/ImportLeadsModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface CRMProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

// Cores para as etiquetas (Tags) - Estilo Neon/Glass
const TAG_STYLES = [
  { name: 'Emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50' },
  { name: 'Blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-500/50' },
  { name: 'Violet', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', hover: 'hover:border-violet-500/50' },
  { name: 'Orange', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', hover: 'hover:border-orange-500/50' },
  { name: 'Rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', hover: 'hover:border-rose-500/50' },
  { name: 'Cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', hover: 'hover:border-cyan-500/50' },
];

const CRM: React.FC<CRMProps> = ({ onNotify }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [team, setTeam] = useState<{ id: string, name: string, phone?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro por etiqueta (ID do evento)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Mobile State
  const [activeMobileStage, setActiveMobileStage] = useState<LeadStage>(LeadStage.NEW_LEAD);
  const [mobileActionLead, setMobileActionLead] = useState<Lead | null>(null); // Lead selecionado para o menu bottom sheet

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openModal) {
      setIsAddModalOpen(true);
      // Clear state to prevent reopening on refresh? (Optional, but good practice in some routers, though standard history usually keeps it)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Initial stage names config
  const defaultStageNames = {
    [LeadStage.NEW_LEAD]: 'Novo Lead',
    [LeadStage.QUALIFIED]: 'Qualificado',
    [LeadStage.NEGOTIATION]: 'Em Negociação',
    [LeadStage.WON]: 'Venda Fechada',
    [LeadStage.CHURN]: 'Churn'
  };

  const [stageNames, setStageNames] = useState<Record<string, string>>(defaultStageNames);
  const [tempStageNames, setTempStageNames] = useState<Record<string, string>>(defaultStageNames);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditStagesModalOpen, setIsEditStagesModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '', ownerId: '' });

  // Bulk Selection
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState('');

  // Sellers Management
  const [isSellersModalOpen, setIsSellersModalOpen] = useState(false);
  const [newSellerForm, setNewSellerForm] = useState({ name: '', phone: '' });

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stageKeys = Object.values(LeadStage);

  useEffect(() => {
    fetchEvents();
    fetchTeam();
    fetchLeads();
    const savedStages = localStorage.getItem('nghub_crm_stages');
    if (savedStages) {
      setStageNames(JSON.parse(savedStages));
      setTempStageNames(JSON.parse(savedStages));
    }
  }, []);

  const fetchTeam = async () => {
    const { data } = await supabase.from('sellers').select('id, name, phone');
    if (data) setTeam(data);
  };

  const saveStageNames = () => {
    setStageNames(tempStageNames);
    localStorage.setItem('nghub_crm_stages', JSON.stringify(tempStageNames));
    setIsEditStagesModalOpen(false);
    onNotify('success', 'Nomes das etapas atualizados!');
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('id, title, price').order('date', { ascending: false });
    if (data) setEvents(data as any);
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('leads').select('*, owner:sellers(name, phone)').order('created_at', { ascending: false });
      if (error) throw error;

      const mappedLeads: Lead[] = (data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        sector: l.sector,
        stage: l.stage as LeadStage,
        value: Number(l.value),
        lastContact: l.last_contact,
        tagId: l.tag_id,
        ownerId: l.owner_id,
        owner: l.owner ? { id: l.owner_id, name: l.owner.name, phone: l.owner.phone } : undefined,
        createdAt: l.created_at
      }));

      setLeads(mappedLeads);
    } catch (error) {
      onNotify('error', 'Erro ao carregar leads.');
    } finally {
      setLoading(false);
    }
  };

  const getTagStyle = (tagId?: string) => {
    if (!tagId) return null;
    const index = events.findIndex(e => e.id === tagId);
    if (index === -1) return null;
    return TAG_STYLES[index % TAG_STYLES.length];
  };

  const getEventName = (id?: string) => events.find(e => e.id === id)?.title;

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter === 'all' || l.tagId === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  // Desktop Drag & Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    await updateLeadStage(id, targetStage);
  };

  // Shared Logic for Stage Update
  const updateLeadStage = async (id: string, targetStage: LeadStage) => {
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== targetStage) {
      setLeads(leads.map(l => l.id === id ? { ...l, stage: targetStage } : l));
      const { error } = await supabase.from('leads').update({ stage: targetStage }).eq('id', id);
      if (error) fetchLeads();
      else {
        onNotify('success', `Lead movido para ${stageNames[targetStage]}`);
        if (targetStage === LeadStage.WON) {
          const eventPrice = lead.tagId ? (events.find(e => e.id === lead.tagId)?.price || lead.value) : lead.value;
          if (eventPrice > 0) {
            await supabase.from('transactions').insert([{ description: `Venda: ${lead.name}`, amount: eventPrice, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
          }
        } else if ((lead.stage as string) === LeadStage.WON) {
          // Se o lead saiu de Venda Fechada, remove a transação
          await supabase.from('transactions')
            .delete()
            .eq('description', `Venda: ${lead.name}`)
            .eq('category', 'CRM');
        }
      }
    }
    setMobileActionLead(null); // Fecha o menu mobile se estiver aberto
  };

  // Logic for Tag Update on Existing Lead
  const handleUpdateLeadTag = async (leadId: string, tagId: string) => {
    try {
      const selectedEvent = events.find(e => e.id === tagId);
      const newEventPrice = selectedEvent ? selectedEvent.price : 0;
      const currentLead = leads.find(l => l.id === leadId);
      const finalValueToSave = newEventPrice > 0 ? newEventPrice : (currentLead?.value || 0);

      const { error } = await supabase.from('leads').update({ tag_id: tagId || null, value: finalValueToSave }).eq('id', leadId);
      if (error) throw error;

      // Update local state
      setLeads(leads.map(l => l.id === leadId ? { ...l, tagId: tagId || undefined, value: finalValueToSave } : l));

      // Synchronize transaction if lead is WON
      if (currentLead?.stage === LeadStage.WON && currentLead.name) {
        // Verifica se já existe uma transação
        const { data: existingTx } = await supabase.from('transactions')
          .select('id')
          .eq('description', `Venda: ${currentLead.name}`)
          .eq('category', 'CRM')
          .limit(1);

        if (existingTx && existingTx.length > 0) {
          if (finalValueToSave > 0) {
            await supabase.from('transactions')
              .update({ amount: finalValueToSave })
              .eq('id', existingTx[0].id);
          } else {
            await supabase.from('transactions')
              .delete()
              .eq('id', existingTx[0].id);
          }
        } else if (finalValueToSave > 0) {
          await supabase.from('transactions').insert([{ description: `Venda: ${currentLead.name}`, amount: finalValueToSave, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
        }
      }

      // Update selected lead context
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, tagId: tagId || undefined, value: finalValueToSave });
      }

      onNotify('success', 'Etiqueta atualizada!');
    } catch (error) {
      console.error(error);
      onNotify('error', 'Erro ao atualizar etiqueta.');
    }
  };

  const handleAddLead = async () => {
    if (!newLeadForm.name) return onNotify('error', 'O nome é obrigatório.');
    try {
      const { error } = await supabase.from('leads').insert([{
        name: newLeadForm.name,
        company: newLeadForm.company,
        sector: newLeadForm.sector,
        email: newLeadForm.email,
        phone: newLeadForm.phone,
        tag_id: newLeadForm.tagId || null,
        owner_id: newLeadForm.ownerId || null,
        stage: LeadStage.NEW_LEAD,
        value: Number(newLeadForm.value) || 0
      }]);
      if (error) throw error;
      onNotify('success', 'Lead adicionado!');
      setIsAddModalOpen(false);
      setNewLeadForm({ name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '', ownerId: '' });
      fetchLeads();
    } catch (err) { onNotify('error', 'Erro ao salvar lead.'); }
  };

  const handleUpdateLeadOwner = async (leadId: string, ownerId: string) => {
    try {
      const { error } = await supabase.from('leads').update({ owner_id: ownerId || null }).eq('id', leadId);
      if (error) throw error;

      const newOwnerInfo = ownerId ? team.find(m => m.id === ownerId) : undefined;

      setLeads(leads.map(l => l.id === leadId ? { ...l, ownerId: ownerId || undefined, owner: newOwnerInfo ? { id: newOwnerInfo.id, name: newOwnerInfo.name, phone: newOwnerInfo.phone } : undefined } : l));

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, ownerId: ownerId || undefined, owner: newOwnerInfo ? { id: newOwnerInfo.id, name: newOwnerInfo.name, phone: newOwnerInfo.phone } : undefined });
      }

      onNotify('success', 'Responsável atualizado!');
    } catch (error) {
      console.error(error);
      onNotify('error', 'Erro ao atualizar responsável.');
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (!bulkOwnerId) return onNotify('error', 'Selecione um responsável.');
    if (selectedLeadIds.length === 0) return onNotify('error', 'Nenhum lead selecionado.');

    try {
      const { error } = await supabase.from('leads')
        .update({ owner_id: bulkOwnerId })
        .in('id', selectedLeadIds);

      if (error) throw error;

      const newOwnerInfo = team.find(m => m.id === bulkOwnerId);

      // Update local state
      setLeads(leads.map(l => selectedLeadIds.includes(l.id) ? { ...l, ownerId: bulkOwnerId, owner: newOwnerInfo ? { id: newOwnerInfo.id, name: newOwnerInfo.name, phone: newOwnerInfo.phone } : undefined } : l));

      onNotify('success', `${selectedLeadIds.length} leads atribuídos!`);

      // Trigger WhatsApp
      if (newOwnerInfo?.phone) {
        const cleanPhone = newOwnerInfo.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${newOwnerInfo.name}, você tem ${selectedLeadIds.length} novos leads na NGHUB OS aguardando atendimento.`);
        window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
      }

      setIsBulkMode(false);
      setSelectedLeadIds([]);
      setBulkOwnerId('');
    } catch (err) { onNotify('error', 'Erro ao atribuir leads em lote.'); }
  };

  const handleAddSeller = async () => {
    if (!newSellerForm.name || !newSellerForm.phone) return onNotify('error', 'Nome e telefone (WhatsApp) são obrigatórios.');
    try {
      const { error } = await supabase.from('sellers').insert([{
        name: newSellerForm.name,
        phone: newSellerForm.phone
      }]);
      if (error) throw error;
      onNotify('success', 'Vendedor adicionado!');
      setNewSellerForm({ name: '', phone: '' });
      fetchTeam(); // Refresh team list
    } catch (err) { onNotify('error', 'Erro ao adicionar vendedor.'); }
  };

  const handleDeleteSeller = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este vendedor? Leads sob sua responsabilidade perderão este vínculo.')) return;
    try {
      const { error } = await supabase.from('sellers').delete().eq('id', id);
      if (error) throw error;
      onNotify('success', 'Vendedor removido!');
      fetchTeam();
      fetchLeads(); // Sync leads that might have lost their owner
    } catch (err) { onNotify('error', 'Erro ao remover vendedor.'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];

      const leadsToInsert = jsonData.map(row => ({
        name: row.Nome || row.name || 'Sem Nome',
        email: row.Email || row.email,
        phone: row.Telefone || row.phone,
        company: row.Empresa || row.company,
        sector: row.Setor || row.sector,
        stage: LeadStage.NEW_LEAD,
        value: 0
      }));

      const { error } = await supabase.from('leads').insert(leadsToInsert);
      if (error) throw error;
      onNotify('success', `${leadsToInsert.length} leads importados!`);
      setIsImportModalOpen(false);
      fetchLeads();
    } catch (err) { onNotify('error', 'Erro na importação.'); }
    finally { setImporting(false); }
  };

  // Helper for quick actions
  const openWhatsApp = (phone?: string) => {
    if (!phone) return onNotify('info', 'Sem telefone cadastrado');
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const openPhone = (phone?: string) => {
    if (!phone) return onNotify('info', 'Sem telefone cadastrado');
    window.location.href = `tel:${phone}`;
  };

  const openEmail = (email?: string) => {
    if (!email) return onNotify('info', 'Sem email cadastrado');
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="h-auto md:h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Header Adaptativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">CRM & Leads</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestão de pipeline e conversão.</p>
        </div>

        {/* Mobile Search & Controls Row */}
        <div className="flex w-full md:w-auto items-center gap-2 flex-wrap">
          {/* Tag Filter */}
          <div className="relative group flex-1 md:flex-none min-w-[200px]">
            <Select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas Etiquetas' },
                ...events.map(event => ({ value: event.id, label: event.title }))
              ]}
              icon={<Tag className="w-4 h-4" />}
            />
          </div>

          <div className="flex gap-2 hidden md:flex">
            <button
              onClick={() => { setIsBulkMode(!isBulkMode); setSelectedLeadIds([]); setBulkOwnerId(''); }}
              className={`p-2.5 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${isBulkMode ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-brand-gold'}`}
              title="Selecionar Vários"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden lg:inline">{isBulkMode ? 'Cancelar Seleção' : 'Selecionar Vários'}</span>
            </button>
            <button onClick={() => setIsSellersModalOpen(true)} className="p-2.5 text-zinc-400 hover:text-brand-gold bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Gerenciar Equipe / Responsáveis">
              <UserPlus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditStagesModalOpen(true)} className="p-2.5 text-zinc-400 hover:text-brand-gold bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Editar Etapas">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-1 md:flex-none items-center bg-brand-surface border border-zinc-800 rounded-xl p-1 gap-1 w-full md:w-auto mt-2 md:mt-0">
            <div className="relative flex-1 md:w-64">
              <Input
                placeholder="Buscar (Nome ou Empresa)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-3.5 h-3.5" />}
                className="bg-transparent border-none focus:ring-0 h-10"
                containerClassName="!mb-0"
              />
            </div>
            {/* Desktop Only Button */}
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              size="sm"
              className="hidden md:flex ml-2 whitespace-nowrap"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Novo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE: Sticky Stage Selector (Pill Tabs) */}
      <div className="md:hidden sticky top-20 z-40 bg-[#050505]/95 backdrop-blur-md py-2 border-b border-zinc-800/50 -mx-4 px-4 mb-4">
        <div className="flex overflow-x-auto gap-2 no-scrollbar scroll-smooth snap-x">
          {stageKeys.map((stage) => {
            const isActive = activeMobileStage === stage;
            const stageLeads = leads.filter(l => l.stage === stage);
            const stageValue = stageLeads.reduce((acc, curr) => {
              const eventPrice = curr.tagId ? events.find(e => e.id === curr.tagId)?.price : undefined;
              return acc + (eventPrice !== undefined && eventPrice > 0 ? eventPrice : curr.value);
            }, 0);

            return (
              <button
                key={stage}
                onClick={() => setActiveMobileStage(stage as LeadStage)}
                className={`
                    flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-lg border transition-all snap-center min-w-[110px]
                    ${isActive
                    ? 'bg-zinc-800 border-brand-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}
                 `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isActive ? 'text-brand-gold' : ''}`}>{stageNames[stage]}</span>
                <span className="text-xs font-medium">{stageLeads.length} leads</span>
                {stageValue > 0 && isActive && <span className="text-[9px] text-emerald-400 mt-0.5 font-mono">R$ {stageValue.toLocaleString('pt-BR', { notation: 'compact' })}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* MOBILE: Optimized Vertical List */}
      <div className="md:hidden flex-1 space-y-3 pb-32">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-gold" /></div>
        ) : filteredLeads.filter(l => l.stage === activeMobileStage).length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center animate-fade-in">
            <Briefcase className="w-10 h-10 mb-3 opacity-20" />
            <p className="font-medium">Nenhum lead nesta etapa.</p>
          </div>
        ) : (
          filteredLeads.filter(l => l.stage === activeMobileStage).map(lead => {
            const style = getTagStyle(lead.tagId);

            return (
              <div
                key={lead.id}
                className={`
                    relative overflow-hidden rounded-xl p-4 border shadow-sm transition-all animate-fade-in bg-zinc-900 border-zinc-800
                    active:scale-[0.99]
                 `}
                onClick={() => setMobileActionLead(lead)}
              >
                {style && <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg.replace('/10', '')}`}></div>}

                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-10">
                    <h4 className="text-white font-bold text-base leading-tight mb-1">{lead.name}</h4>
                    <p className="text-zinc-400 text-xs flex items-center gap-1.5">
                      {lead.company || 'Sem empresa'}
                      {lead.sector && <span className="text-zinc-600">•</span>}
                      {lead.sector && <span className="text-zinc-500">{lead.sector}</span>}
                    </p>
                  </div>
                  {/* Direct WhatsApp Action - No menu required */}
                  {lead.phone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone); }}
                      className="absolute right-3 top-3 p-2.5 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20 active:bg-green-500/20 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Tags & Value Line */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {style ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border} truncate max-w-[120px]`}>
                        {getEventName(lead.tagId)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-600 italic">Sem etiqueta</span>
                    )}
                  </div>

                  {(() => {
                    const displayPrice = lead.tagId ? (events.find(e => e.id === lead.tagId)?.price || lead.value) : lead.value;
                    if (displayPrice > 0) {
                      return (
                        <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                          <span className="text-zinc-600 text-[10px]">R$</span>
                          {displayPrice.toLocaleString('pt-BR')}
                        </div>
                      );
                    }
                    return <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Sem valor</div>;
                  })()}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MOBILE: Floating Action Button (FAB) */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="md:hidden fixed bottom-24 right-4 z-50 w-14 h-14 bg-brand-gold text-black rounded-full shadow-[0_4px_20px_rgba(212,175,55,0.4)] flex items-center justify-center animate-scale-in active:scale-90 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* MOBILE ACTION SHEET (Bottom Sheet) */}
      {mobileActionLead && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileActionLead(null)}></div>

          {/* Sheet Content */}
          <div className="relative bg-[#09090b] border-t border-zinc-800 rounded-t-2xl p-6 pb-10 shadow-2xl animate-slide-up-fast max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-brand-gold border border-zinc-700">
                {mobileActionLead.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{mobileActionLead.name}</h3>
                <p className="text-sm text-zinc-400">{mobileActionLead.company}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button onClick={() => openWhatsApp(mobileActionLead.phone)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 active:border-brand-gold/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20"><MessageCircle className="w-5 h-5" /></div>
                <span className="text-xs font-medium text-zinc-300">WhatsApp</span>
              </button>
              <button onClick={() => openPhone(mobileActionLead.phone)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 active:border-brand-gold/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20"><Phone className="w-5 h-5" /></div>
                <span className="text-xs font-medium text-zinc-300">Ligar</span>
              </button>
              <button onClick={() => openEmail(mobileActionLead.email)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 active:border-brand-gold/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20"><Mail className="w-5 h-5" /></div>
                <span className="text-xs font-medium text-zinc-300">Email</span>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Mover para etapa</p>
              {stageKeys.map(stage => (
                <button
                  key={stage}
                  onClick={() => updateLeadStage(mobileActionLead.id, stage as LeadStage)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium border transition-colors ${mobileActionLead.stage === stage
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 active:bg-zinc-800'
                    }`}
                >
                  <span>{stageNames[stage]}</span>
                  {mobileActionLead.stage === stage && <CheckCircle className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between">
              <button
                onClick={() => { setSelectedLead(mobileActionLead); setIsDetailModalOpen(true); setMobileActionLead(null); }}
                className="text-sm font-medium text-zinc-300 hover:text-white flex items-center gap-2 py-3 px-4 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Ver Detalhes
              </button>
              <button className="text-sm font-medium text-red-500 hover:text-red-400 flex items-center gap-2 py-3 px-4 rounded-lg hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP: Kanban Board (Hidden on Mobile) */}
      <div className="hidden md:flex flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px] h-full">
          {stageKeys.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage);
            const totalValue = stageLeads.reduce((acc, l) => {
              const eventPrice = l.tagId ? events.find(e => e.id === l.tagId)?.price : undefined;
              return acc + (eventPrice !== undefined && eventPrice > 0 ? eventPrice : l.value);
            }, 0);

            return (
              <KanbanColumn
                key={stage}
                stage={stage as LeadStage}
                title={stageNames[stage]}
                leads={stageLeads}
                totalValue={totalValue}
                loading={loading}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onLeadClick={(lead) => { setSelectedLead(lead); setIsDetailModalOpen(true); }}
                onWhatsAppClick={openWhatsApp}
                getTagStyle={getTagStyle}
                getEventName={getEventName}
              />
            );
          })}
        </div>
      </div>

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onFileSelect={handleFileUpload}
        importing={importing}
      />

      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddLead}
        formData={newLeadForm}
        setFormData={setNewLeadForm}
        events={events}
        team={team}
      />

      {/* Edit Stages Modal */}
      <Modal isOpen={isEditStagesModalOpen} onClose={() => setIsEditStagesModalOpen(false)} title="Configurar Etapas do CRM" footer={<><button onClick={() => setIsEditStagesModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white">Cancelar</button><button onClick={saveStageNames} className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-bold hover:bg-[#c5a059]">Salvar Alterações</button></>}>
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 mb-4">Personalize os nomes das colunas do seu funil de vendas.</p>
          {stageKeys.map((key) => (
            <div key={key}>
              <Input
                label={`Etapa ${key}`}
                value={tempStageNames[key]}
                onChange={(e) => setTempStageNames({ ...tempStageNames, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* Gerenciar Equipe (Sellers) Modal */}
      <Modal isOpen={isSellersModalOpen} onClose={() => setIsSellersModalOpen(false)} title="Equipe de Vendas (Responsáveis)">
        <div className="space-y-6">
          <p className="text-xs text-zinc-500">Cadastre o nome e WhatsApp dos responsáveis para poder distribuir leads e notificá-los com 1 clique.</p>

          <div className="bg-zinc-900/50 p-4 border border-zinc-800 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-white mb-2">Novo Vendedor</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nome Ex: João"
                value={newSellerForm.name}
                onChange={(e) => setNewSellerForm({ ...newSellerForm, name: e.target.value })}
                icon={<UserPlus className="w-4 h-4" />}
              />
              <Input
                placeholder="WhatsApp (com DDD)"
                value={newSellerForm.phone}
                onChange={(e) => setNewSellerForm({ ...newSellerForm, phone: e.target.value })}
                icon={<Phone className="w-4 h-4" />}
              />
            </div>
            <Button onClick={handleAddSeller} variant="primary" className="w-full">Cadastrar Membro</Button>
          </div>

          <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-sm font-bold text-white mb-3">Membros Cadastrados ({team.length})</h4>
            {team.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhum membro cadastrado ainda.</p>
            ) : (
              team.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <div>
                    <p className="text-sm font-bold text-zinc-200">{member.name}</p>
                    <p className="text-xs text-brand-gold font-mono">{member.phone}</p>
                  </div>
                  <button onClick={() => handleDeleteSeller(member.id)} className="p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Lead Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Lead">
        {selectedLead && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-brand-gold border border-zinc-700">
                {selectedLead.name.charAt(0)}
              </div>
              <div className="flex-[1]">
                <h3 className="text-xl font-serif font-bold text-white">{selectedLead.name}</h3>
                <p className="text-zinc-400 text-sm">{selectedLead.company} • {selectedLead.sector}</p>

                {/* Value display */}
                {(() => {
                  const displayPrice = selectedLead.tagId ? (events.find(e => e.id === selectedLead.tagId)?.price || selectedLead.value) : selectedLead.value;
                  if (displayPrice > 0) {
                    return <p className="text-emerald-400 font-mono text-sm mt-1">R$ {displayPrice.toLocaleString('pt-BR')}</p>;
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* TAG E OWNER EDITING SECTION */}
            <div className="mt-4 pt-4 border-t border-zinc-800 grid gap-4">
              <Select
                label="Etiqueta (Evento)"
                value={selectedLead.tagId || ''}
                onChange={(e) => handleUpdateLeadTag(selectedLead.id, e.target.value)}
                options={[
                  { value: '', label: 'Sem etiqueta' },
                  ...events.map(ev => ({ value: ev.id, label: ev.title }))
                ]}
              />

              <div className="space-y-2">
                <Select
                  label="Responsável"
                  value={selectedLead.ownerId || ''}
                  onChange={(e) => handleUpdateLeadOwner(selectedLead.id, e.target.value)}
                  options={[
                    { value: '', label: 'Sem responsável' },
                    ...team.map(member => ({ value: member.id, label: member.name }))
                  ]}
                />
                {selectedLead.ownerId && selectedLead.owner?.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-green-500 hover:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                    onClick={() => {
                      const message = encodeURIComponent(`Olá ${selectedLead.owner?.name}, você tem um novo lead na NGHUB OS: ${selectedLead.name}.`);
                      window.open(`https://wa.me/55${selectedLead.owner?.phone?.replace(/\\D/g, '')}?text=${message}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Notificar Responsável
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <button onClick={() => openWhatsApp(selectedLead.phone)} className="flex items-center justify-center gap-2 bg-green-900/20 text-green-500 p-3 rounded-lg border border-green-900/30 font-bold text-sm hover:bg-green-900/30 transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
              <button onClick={() => openEmail(selectedLead.email)} className="flex items-center justify-center gap-2 bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 font-bold text-sm hover:bg-zinc-700 transition-colors"><Mail className="w-4 h-4" /> Email</button>
            </div>
          </div>
        )}
      </Modal>

      {/* FLOATING BULK ACTION BAR */}
      {isBulkMode && selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-slide-up">
          <div className="flex flex-col border-r border-zinc-800 pr-6">
            <span className="text-white font-bold">{selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'lead selecionado' : 'leads selecionados'}</span>
            <span className="text-xs text-zinc-500">Prontos para atribuição</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Select
              value={bulkOwnerId}
              onChange={(e) => setBulkOwnerId(e.target.value)}
              options={[
                { value: '', label: 'Escolha um responsável...' },
                ...team.map(member => ({ value: member.id, label: member.name }))
              ]}
            />
            <Button onClick={handleBulkAssign} variant="primary" size="md" className="whitespace-nowrap px-6">
              <MessageCircle className="w-4 h-4 mr-2" />
              Salvar e Notificar
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CRM;