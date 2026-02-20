import React, { useState, useEffect, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro por etiqueta (ID do evento)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Mobile State
  const [activeMobileStage, setActiveMobileStage] = useState<LeadStage>(LeadStage.NEW_LEAD);
  const [mobileActionLead, setMobileActionLead] = useState<Lead | null>(null); // Lead selecionado para o menu bottom sheet

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
  const [newLeadForm, setNewLeadForm] = useState({ name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '' });

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stageKeys = Object.values(LeadStage);

  useEffect(() => {
    fetchEvents();
    fetchLeads();
    const savedStages = localStorage.getItem('nghub_crm_stages');
    if (savedStages) {
      setStageNames(JSON.parse(savedStages));
      setTempStageNames(JSON.parse(savedStages));
    }
  }, []);

  const saveStageNames = () => {
    setStageNames(tempStageNames);
    localStorage.setItem('nghub_crm_stages', JSON.stringify(tempStageNames));
    setIsEditStagesModalOpen(false);
    onNotify('success', 'Nomes das etapas atualizados!');
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('id, title').order('date', { ascending: false });
    if (data) setEvents(data as any);
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
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
        if (targetStage === LeadStage.WON && lead.value > 0) {
          await supabase.from('transactions').insert([{ description: `Venda: ${lead.name}`, amount: lead.value, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
        }
      }
    }
    setMobileActionLead(null); // Fecha o menu mobile se estiver aberto
  };

  // Logic for Tag Update on Existing Lead
  const handleUpdateLeadTag = async (leadId: string, tagId: string) => {
    try {
      const { error } = await supabase.from('leads').update({ tag_id: tagId || null }).eq('id', leadId);
      if (error) throw error;

      // Update local state
      setLeads(leads.map(l => l.id === leadId ? { ...l, tagId: tagId || undefined } : l));

      // Update selected lead context
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, tagId: tagId || undefined });
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
        stage: LeadStage.NEW_LEAD,
        value: Number(newLeadForm.value) || 0
      }]);
      if (error) throw error;
      onNotify('success', 'Lead adicionado!');
      setIsAddModalOpen(false);
      setNewLeadForm({ name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '' });
      fetchLeads();
    } catch (err) { onNotify('error', 'Erro ao salvar lead.'); }
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
          <div className="relative group flex-1 md:flex-none">
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="w-full md:w-auto appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl pl-9 pr-8 py-2.5 focus:border-brand-gold focus:outline-none hover:bg-zinc-800 transition-colors cursor-pointer min-w-[150px]"
            >
              <option value="all">Todas Etiquetas</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <Tag className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button onClick={() => setIsEditStagesModalOpen(true)} className="p-2.5 text-zinc-400 hover:text-brand-gold bg-zinc-900 border border-zinc-800 rounded-lg transition-colors hidden md:block" title="Editar Etapas">
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex flex-1 md:flex-none items-center bg-brand-surface border border-zinc-800 rounded-xl p-1 gap-1 w-full md:w-auto mt-2 md:mt-0">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 z-10" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-sm pl-9 pr-4 py-2 text-zinc-200 focus:ring-0 placeholder-zinc-600 h-10"
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
            const stageValue = stageLeads.reduce((acc, curr) => acc + curr.value, 0);

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

                  {lead.value > 0 ? (
                    <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                      <span className="text-zinc-600 text-[10px]">R$</span>
                      {lead.value.toLocaleString('pt-BR')}
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Sem valor</div>
                  )}
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
            const totalValue = stageLeads.reduce((acc, l) => acc + l.value, 0);

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
      />

      {/* Edit Stages Modal */}
      <Modal isOpen={isEditStagesModalOpen} onClose={() => setIsEditStagesModalOpen(false)} title="Configurar Etapas do CRM" footer={<><button onClick={() => setIsEditStagesModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white">Cancelar</button><button onClick={saveStageNames} className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-bold hover:bg-[#c5a059]">Salvar Alterações</button></>}>
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 mb-4">Personalize os nomes das colunas do seu funil de vendas.</p>
          {stageKeys.map((key) => (
            <div key={key}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Etapa {key}</label>
              <input
                type="text"
                value={tempStageNames[key]}
                onChange={(e) => setTempStageNames({ ...tempStageNames, [key]: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
              />
            </div>
          ))}
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
              <div className="flex-1">
                <h3 className="text-xl font-serif font-bold text-white">{selectedLead.name}</h3>
                <p className="text-zinc-400 text-sm">{selectedLead.company} • {selectedLead.sector}</p>

                {/* Value display */}
                {selectedLead.value > 0 && <p className="text-emerald-400 font-mono text-sm mt-1">R$ {selectedLead.value.toLocaleString('pt-BR')}</p>}
              </div>
            </div>

            {/* TAG EDITING SECTION */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Etiqueta (Evento)</label>
              <div className="relative">
                <select
                  value={selectedLead.tagId || ''}
                  onChange={(e) => handleUpdateLeadTag(selectedLead.id, e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-brand-gold focus:outline-none text-sm appearance-none cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <option value="">Sem etiqueta</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <button onClick={() => openWhatsApp(selectedLead.phone)} className="flex items-center justify-center gap-2 bg-green-900/20 text-green-500 p-3 rounded-lg border border-green-900/30 font-bold text-sm hover:bg-green-900/30 transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
              <button onClick={() => openEmail(selectedLead.email)} className="flex items-center justify-center gap-2 bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 font-bold text-sm hover:bg-zinc-700 transition-colors"><Mail className="w-4 h-4" /> Email</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default CRM;