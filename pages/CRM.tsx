import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Lead, LeadStage, Event } from '../types';
import {
  MoreHorizontal, Plus, Search, Filter, Phone, Calendar, ArrowRight,
  Save, MessageCircle, Loader2, UserPlus, Upload, FileSpreadsheet,
  Download, Trash2, Settings, CheckCircle, Mail, ChevronRight, Briefcase, ChevronDown, Tag, Edit2,
  X, MoveRight, MoveLeft, DollarSign, Circle, MessageSquare, ArrowRightLeft
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { KanbanColumn } from '../components/crm/KanbanColumn';
import { LeadFormModal } from '../components/crm/LeadFormModal';
import { ImportLeadsModal } from '../components/crm/ImportLeadsModal';
import { SellersModal } from '../components/crm/SellersModal';
import { LeadDetailModal, getLabelColor } from '../components/crm/LeadDetailModal';
import { EditStagesModal } from '../components/crm/EditStagesModal';
import { useCRM } from '../hooks/useCRM';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    leads, setLeads,
    events,
    team,
    loading,
    getStageNames,
    saveStageNames,
    updateLeadStage,
    updateLeadPipeline,
    bulkUpdatePipeline,
    updateLeadTag,
    updateLeadOwner,
    updateLeadNotes,
    updateLeadValue,
    productLabels,
    addProductLabel,
    updateProductLabel,
    deleteProductLabel,
    updateLeadProductLabel,
    addLead,
    bulkAssignLeads,
    addSeller,
    deleteSeller,
    refreshLeads
  } = useCRM(onNotify);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('Geral');
  const [activeMobileStage, setActiveMobileStage] = useState<LeadStage>(LeadStage.DRAFT);
  const [mobileActionLead, setMobileActionLead] = useState<Lead | null>(null);

  // Compute stageNames for current pipeline
  const stageNames = getStageNames(selectedPipeline);
  const [tempStageNames, setTempStageNames] = useState<Record<string, string>>(stageNames);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditStagesModalOpen, setIsEditStagesModalOpen] = useState(false);
  const [isSellersModalOpen, setIsSellersModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '', ownerId: '', pipeline: 'Geral'
  });

  // Bulk Selection
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState('');

  const [importing, setImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stageKeys = Object.values(LeadStage);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
    // Ponto 4: lê ?search= vindo da busca global do header
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [location, searchParams]);

  // Sync tempStageNames when pipeline changes
  useEffect(() => {
    setTempStageNames(getStageNames(selectedPipeline));
  }, [selectedPipeline, getStageNames]);

  const handleSaveStageNames = () => {
    saveStageNames(selectedPipeline, tempStageNames);
    setIsEditStagesModalOpen(false);
  };

  const getTagStyle = useCallback((tagId?: string) => {
    if (!tagId) return null;
    const index = events.findIndex(e => e.id === tagId);
    if (index === -1) return null;
    return TAG_STYLES[index % TAG_STYLES.length];
  }, [events]);

  const getEventName = useCallback((id?: string) => events.find(e => e.id === id)?.title, [events]);

  const getProductLabelInfo = useCallback((labelId?: string) => {
    if (!labelId) return null;
    const label = productLabels.find(l => l.id === labelId);
    if (!label) return null;
    return { name: label.name, hexColor: label.hexColor || '#6366f1', price: label.price || 0 };
  }, [productLabels]);

  const filteredLeads = leads.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (l.name || '').toLowerCase().includes(term) ||
      (l.company || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.phone || '').toLowerCase().includes(term);
    const matchesTag = selectedTagFilter === 'all' || l.tagId === selectedTagFilter;
    const matchesPipeline = (l.pipeline || 'Geral') === selectedPipeline;
    return matchesSearch && matchesTag && matchesPipeline;
  });

  // Desktop Drag & Drop Logic
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id);
  }, []);

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    if (isBulkMode && selectedLeadIds.includes(id)) {
      await handleBulkMoveSubmit(targetStage);
    } else {
      await updateLeadStage(id, targetStage);
    }
  };

  const handleAddLead = async () => {
    if (!newLeadForm.name) return onNotify('error', 'O nome é obrigatório.');
    setIsSubmitting(true);
    try {
      await addLead({
        name: newLeadForm.name,
        company: newLeadForm.company,
        sector: newLeadForm.sector,
        email: newLeadForm.email,
        phone: newLeadForm.phone,
        tagId: newLeadForm.tagId,
        ownerId: newLeadForm.ownerId,
        stage: LeadStage.NEW_LEAD,
        value: Number(newLeadForm.value) || 0,
        pipeline: newLeadForm.pipeline
      });
      setIsAddModalOpen(false);
      setNewLeadForm({ name: '', company: '', sector: '', email: '', phone: '', tagId: '', value: '', ownerId: '', pipeline: selectedPipeline });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (!bulkOwnerId) return onNotify('error', 'Selecione um responsável.');
    await bulkAssignLeads(selectedLeadIds, bulkOwnerId);
    setIsBulkMode(false);
    setSelectedLeadIds([]);
    setBulkOwnerId('');
  };

  const handleBulkMoveSubmit = async (targetStage: LeadStage) => {
    await Promise.all(selectedLeadIds.map(id => updateLeadStage(id, targetStage)));
    setIsBulkMode(false);
    setSelectedLeadIds([]);
    onNotify('success', `${selectedLeadIds.length} leads movidos!`);
  };

  const handleBulkDeleteSubmit = async () => {
    if (!window.confirm(`Excluir ${selectedLeadIds.length} leads?`)) return;
    const { error } = await supabase.from('leads').delete().in('id', selectedLeadIds);
    if (!error) {
      refreshLeads();
      setIsBulkMode(false);
      setSelectedLeadIds([]);
      onNotify('success', 'Leads excluídos!');
    }
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
        phone: String(row.Telefone || row.phone || ''),
        company: row.Empresa || row.company,
        sector: row.Setor || row.sector,
        stage: LeadStage.NEW_LEAD,
        value: 0
      }));

      const { error } = await supabase.from('leads').insert(leadsToInsert);
      if (error) throw error;
      onNotify('success', `${leadsToInsert.length} leads importados!`);
      setIsImportModalOpen(false);
      refreshLeads();
    } catch (err) { onNotify('error', 'Erro na importação.'); }
    finally { setImporting(false); }
  };

  const handleExportLeads = () => {
    try {
      if (filteredLeads.length === 0) {
        onNotify('info', 'Nenhum lead para exportar.');
        return;
      }

      const dataToExport = filteredLeads.map(l => ({
        'Nome': l.name,
        'Email': l.email,
        'Telefone': l.phone,
        'Empresa': l.company,
        'Setor': l.sector,
        'Fase': stageNames[l.stage] || l.stage,
        'Valor (R$)': l.tagId ? (events.find(e => e.id === l.tagId)?.price || l.value) : l.value,
        'Etiqueta': getEventName(l.tagId) || 'Sem etiqueta',
        'Responsável': l.owner?.name || 'Sem responsável',
        'Pipeline': l.pipeline || 'Geral',
        'Data de Criação': new Date(l.createdAt || '').toLocaleDateString('pt-BR')
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `Leads_${selectedPipeline}_${new Date().toISOString().split('T')[0]}.xlsx`);
      onNotify('success', '100% Funcional! Leads exportados.');
    } catch (err) {
      onNotify('error', 'Erro ao exportar leads.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Tem certeza?')) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) {
      refreshLeads();
      onNotify('success', 'Lead excluído!');
      if (selectedLead?.id === id) {
        setIsDetailModalOpen(false);
        setSelectedLead(null);
      }
    }
  };

  // Helper for quick actions
  const openWhatsApp = useCallback((phone?: string) => {
    if (!phone) return onNotify('info', 'Sem telefone cadastrado');
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  }, [onNotify]);

  // Navegar para Conversas com o lead já aberto
  const openInternalChat = useCallback((phone?: string) => {
    if (!phone) return onNotify('info', 'Sem telefone cadastrado');
    const cleanPhone = phone.replace(/\D/g, '');
    navigate(`/messaging?phone=${cleanPhone}`);
  }, [onNotify, navigate]);

  const openPhone = useCallback((phone?: string) => {
    if (!phone) return onNotify('info', 'Sem telefone cadastrado');
    window.location.href = `tel:${phone}`;
  }, [onNotify]);

  const openEmail = useCallback((email?: string) => {
    if (!email) return onNotify('info', 'Sem email cadastrado');
    window.location.href = `mailto:${email}`;
  }, [onNotify]);

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
          {/* Pipeline Filter */}
          <div className="relative group flex-1 md:flex-none min-w-[120px]">
            <Select
              value={selectedPipeline}
              onChange={(e) => {
                setSelectedPipeline(e.target.value);
                setNewLeadForm(prev => ({ ...prev, pipeline: e.target.value }));
              }}
              options={[
                { value: 'Geral', label: 'Pipeline: Geral' },
                { value: 'Evento', label: 'Pipeline: Evento' },
                { value: 'Produto', label: 'Pipeline: Produto' }
              ]}
              icon={<Briefcase className="w-4 h-4" />}
            />
          </div>

          {/* Tag Filter */}
          <div className="relative group flex-1 md:flex-none min-w-[180px]">
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
            <button onClick={() => setIsImportModalOpen(true)} className="p-2.5 text-zinc-400 hover:text-brand-gold bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Importar Leads">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={handleExportLeads} className="p-2.5 text-zinc-400 hover:text-brand-gold bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Exportar Leads (XLSX)">
              <Download className="w-4 h-4" />
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
                placeholder="Buscar (Nome, Email, Tel ou Empresa)..."
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
      <div className="md:hidden sticky top-20 z-40 bg-brand-darker/95 backdrop-blur-md py-2 border-b border-zinc-800/50 -mx-4 px-4 mb-4">
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
          <div className="space-y-4 px-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative overflow-hidden rounded-xl p-4 border bg-zinc-900 border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <Skeleton className="h-5 w-1/2 !bg-zinc-800" />
                  <Skeleton className="h-4 w-12 !bg-zinc-800" />
                </div>
                <Skeleton className="h-4 w-1/3 mb-4 !bg-zinc-800" />
                <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50">
                  <Skeleton className="h-4 w-20 !bg-zinc-800" />
                  <Skeleton className="h-4 w-4 rounded-full !bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
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
                    active:scale-[0.99] ${selectedLeadIds.includes(lead.id) ? 'bg-brand-gold/10 border-brand-gold/50' : ''}
                 `}
                onClick={() => {
                  if (isBulkMode) {
                    setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(l => l !== lead.id) : [...prev, lead.id]);
                  } else {
                    setMobileActionLead(lead);
                  }
                }}
              >
                {style && <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg.replace('/10', '')}`}></div>}

                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-10">
                    <h4 className="text-white font-bold text-base leading-tight mb-1 flex justify-between items-start">
                      <span className="truncate pr-4">{lead.name}</span>
                      {isBulkMode && (
                        <div className="text-zinc-500">
                          {selectedLeadIds.includes(lead.id) ? <CheckCircle className="w-5 h-5 text-brand-gold" /> : <Circle className="w-5 h-5" />}
                        </div>
                      )}
                    </h4>
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
          <div className="relative bg-brand-dark border-t border-zinc-800 rounded-t-2xl p-6 pb-10 shadow-2xl animate-slide-up-fast max-h-[85vh] overflow-y-auto">
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

            <div className="grid grid-cols-4 gap-2 mb-6">
              <button onClick={() => openInternalChat(mobileActionLead.phone)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 active:bg-zinc-800 active:border-brand-gold/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20"><MessageSquare className="w-5 h-5" /></div>
                <span className="text-xs font-medium text-zinc-300">Conversar</span>
              </button>
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

            {/* Mover Pipeline */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5"><ArrowRightLeft className="w-3 h-3" /> Mover para Pipeline</p>
              <div className="flex gap-2">
                {['Geral', 'Evento', 'Produto'].map(p => (
                  <button
                    key={p}
                    onClick={() => { updateLeadPipeline(mobileActionLead.id, p); setMobileActionLead(null); }}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                      (mobileActionLead.pipeline || 'Geral') === p
                        ? 'bg-brand-gold/10 border-brand-gold text-brand-gold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 active:bg-zinc-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Mover Etapa */}
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
                  <span>{getStageNames(mobileActionLead.pipeline || 'Geral')[stage]}</span>
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
              <button
                onClick={() => {
                  handleDeleteLead(mobileActionLead.id);
                  setMobileActionLead(null);
                }}
                className="text-sm font-medium text-red-500 hover:text-red-400 flex items-center gap-2 py-3 px-4 rounded-lg hover:bg-red-500/10 transition-colors"
              >
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
                getProductLabelInfo={getProductLabelInfo}
                isBulkMode={isBulkMode}
                selectedLeadIds={selectedLeadIds}
                onToggleSelect={(id) => {
                  setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]);
                }}
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
        isSubmitting={isSubmitting}
      />

      <EditStagesModal
        isOpen={isEditStagesModalOpen}
        onClose={() => setIsEditStagesModalOpen(false)}
        stageKeys={stageKeys}
        tempStageNames={tempStageNames}
        setTempStageNames={setTempStageNames}
        onSave={handleSaveStageNames}
        pipelineName={selectedPipeline}
      />

      <SellersModal
        isOpen={isSellersModalOpen}
        onClose={() => setIsSellersModalOpen(false)}
        team={team}
        onAddSeller={addSeller}
        onDeleteSeller={deleteSeller}
      />

      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedLead={selectedLead}
        events={events}
        team={team}
        onUpdateTag={updateLeadTag}
        onUpdateOwner={updateLeadOwner}
        onUpdateNotes={updateLeadNotes}
        onUpdateValue={updateLeadValue}
        onUpdatePipeline={updateLeadPipeline}
        onUpdateProductLabel={updateLeadProductLabel}
        productLabels={productLabels}
        onAddProductLabel={addProductLabel}
        onUpdateProductLabel_config={updateProductLabel}
        onDeleteProductLabel={deleteProductLabel}
        onDeleteLead={handleDeleteLead}
      />

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
                { value: '', label: 'Atribuir a...' },
                ...team.map(member => ({ value: member.id, label: member.name }))
              ]}
            />
            {bulkOwnerId && (
              <Button onClick={handleBulkAssignSubmit} variant="primary" size="md" className="whitespace-nowrap px-4">
                Atribuir
              </Button>
            )}

            <div className="w-px h-8 bg-zinc-800 mx-2 hidden sm:block"></div>

            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkMoveSubmit(e.target.value as LeadStage);
              }}
              options={[
                { value: '', label: 'Mover etapa...' },
                ...stageKeys.map(k => ({ value: k, label: stageNames[k] }))
              ]}
            />

            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdatePipeline(selectedLeadIds, e.target.value);
                  setIsBulkMode(false);
                  setSelectedLeadIds([]);
                }
              }}
              options={[
                { value: '', label: 'Mover pipeline...' },
                { value: 'Geral', label: 'Pipeline: Geral' },
                { value: 'Evento', label: 'Pipeline: Evento' },
                { value: 'Produto', label: 'Pipeline: Produto' }
              ]}
            />

            <div className="w-px h-8 bg-zinc-800 mx-2 hidden sm:block"></div>

            <Button onClick={handleBulkDeleteSubmit} variant="ghost" size="md" className="whitespace-nowrap text-red-500 hover:bg-red-500/10 border border-red-500/20 px-4">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;