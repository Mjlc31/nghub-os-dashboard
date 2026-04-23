import React, { useState, useEffect, useRef } from 'react';
import { Mail, MessageCircle, Phone, Trash2, FileText, DollarSign, ArrowRight, Plus, X, Package, Tag, Palette, Edit2, Check, History, Send } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Lead, Event, Seller } from '../../types';
import { ProductLabel } from '../../hooks/useCRM';

// Simple color palette for quick picks
const QUICK_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#D4AF37', '#a78bfa', '#fb923c', '#34d399', '#38bdf8',
];

export interface NoteEntry {
    id: string;
    text: string;
    date: string;
    author: string;
}


export const getLabelColor = (label?: ProductLabel | null): { bg: string; border: string; text: string } => {
    const hex = label?.hexColor || '#6366f1';
    return {
        bg: `${hex}20`,
        border: `${hex}60`,
        text: hex,
    };
};

// Convert hex to inline style
const labelStyle = (label?: ProductLabel | null): React.CSSProperties => {
    const hex = label?.hexColor || '#6366f1';
    return {
        backgroundColor: `${hex}18`,
        borderColor: `${hex}50`,
        color: hex,
    };
};

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLead: Lead | null;
    events: Event[];
    team: Seller[];
    onUpdateTag: (leadId: string, tagId: string) => Promise<void>;
    onUpdateOwner: (leadId: string, ownerId: string) => Promise<void>;
    onUpdateNotes: (leadId: string, notes: string) => Promise<void>;
    onUpdateValue: (leadId: string, value: number) => Promise<void>;
    onUpdatePipeline: (leadId: string, pipeline: string) => Promise<void>;
    onUpdateProductLabel: (leadId: string, labelId: string) => Promise<void>;
    onUpdateSourceTags: (leadId: string, tags: string[]) => Promise<void>;
    productLabels: ProductLabel[];
    onAddProductLabel: (name: string, color: string, hexColor?: string, price?: number) => ProductLabel;
    onUpdateProductLabel_config?: (labelId: string, updates: Partial<ProductLabel>) => void;
    onDeleteProductLabel: (id: string) => void;
    onDeleteLead?: (id: string) => void;
    availablePipelines: string[];
}

// Default source tags available to all leads
const DEFAULT_SOURCE_TAGS = ['Anúncios', 'Indicação', 'Instagram Orgânico'];
const SOURCE_TAGS_STORAGE_KEY = 'nghub_source_tags';

const getAvailableSourceTags = (): string[] => {
    try {
        const saved = localStorage.getItem(SOURCE_TAGS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as string[];
            // Merge defaults with saved custom tags
            return Array.from(new Set([...DEFAULT_SOURCE_TAGS, ...parsed]));
        }
    } catch { /* fallback */ }
    return [...DEFAULT_SOURCE_TAGS];
};

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, selectedLead, events, team,
    onUpdateTag, onUpdateOwner, onUpdateNotes, onUpdateValue,
    onUpdatePipeline, onUpdateProductLabel, onUpdateSourceTags,
    productLabels, onAddProductLabel,
    onUpdateProductLabel_config, onDeleteProductLabel, onDeleteLead,
    availablePipelines,
}) => {
    const [newNote, setNewNote] = useState('');
    const [notesHistory, setNotesHistory] = useState<NoteEntry[]>([]);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [priceValue, setPriceValue] = useState<string>('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    const notesEndRef = useRef<HTMLDivElement>(null);

    // New label form
    const [showNewLabel, setShowNewLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#6366f1');
    const [newLabelPrice, setNewLabelPrice] = useState('');

    // Edit label
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

    // Source tags
    const [availableSourceTags, setAvailableSourceTags] = useState<string[]>(getAvailableSourceTags());
    const [newSourceTag, setNewSourceTag] = useState('');
    const [showNewSourceTag, setShowNewSourceTag] = useState(false);

    const priceDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup debounce timers on unmount to avoid memory leaks / stale updates
    useEffect(() => {
        return () => {
            if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current);
        };
    }, []);

    const currentPipeline = selectedLead?.pipeline || 'Geral';

    useEffect(() => {
        if (selectedLead) {
            setPriceValue(selectedLead.value?.toString() || '0');
            setShowNewLabel(false);
            setNewLabelName('');
            setNewLabelPrice('');
            setEditingLabelId(null);
            
            if (selectedLead.notes) {
                try {
                    const parsed = JSON.parse(selectedLead.notes);
                    if (Array.isArray(parsed)) {
                        setNotesHistory(parsed);
                    } else {
                        throw new Error('Not array');
                    }
                } catch {
                    if (selectedLead.notes.trim()) {
                        setNotesHistory([{
                            id: 'legacy',
                            text: selectedLead.notes,
                            date: selectedLead.createdAt || new Date().toISOString(),
                            author: 'Sistema'
                        }]);
                    } else {
                        setNotesHistory([]);
                    }
                }
            } else {
                setNotesHistory([]);
            }
        }
    }, [selectedLead?.id, selectedLead?.notes]);

    // Scroll to bottom when new notes are added
    useEffect(() => {
        if (notesEndRef.current) {
            notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [notesHistory]);

    if (!selectedLead) return null;

    const openWhatsApp = (phone?: string) => {
        if (!phone) return;
        window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
    };

    const openEmail = (email?: string) => {
        if (!email) return;
        window.location.href = `mailto:${email}`;
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSavingNotes(true);
        const entry: NoteEntry = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            text: newNote.trim(),
            date: new Date().toISOString(),
            author: 'Usuário',
        };
        const updatedHistory = [...notesHistory, entry];
        setNotesHistory(updatedHistory);
        setNewNote('');
        
        await onUpdateNotes(selectedLead!.id, JSON.stringify(updatedHistory));
        setIsSavingNotes(false);
    };

    const handlePriceChange = (value: string) => {
        const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
        setPriceValue(cleanValue);
        const numericValue = parseFloat(cleanValue);
        if (isNaN(numericValue)) return;
        if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current);
        priceDebounceTimer.current = setTimeout(async () => {
            setIsSavingPrice(true);
            await onUpdateValue(selectedLead.id, numericValue);
            setIsSavingPrice(false);
        }, 800);
    };

    const handleCreateLabel = () => {
        if (!newLabelName.trim()) return;
        const price = parseFloat(newLabelPrice.replace(',', '.')) || 0;
        const label = onAddProductLabel(newLabelName.trim(), 'custom', newLabelColor, price);
        onUpdateProductLabel(selectedLead.id, label.id);
        setShowNewLabel(false);
        setNewLabelName('');
        setNewLabelPrice('');
    };

    const activeLabelObj = productLabels.find(l => l.id === selectedLead.productLabel);

    const initials = selectedLead.name
        .split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead" size="xl">
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-8 h-[75vh] lg:h-[65vh]">
                
                {/* COLUNA ESQUERDA - Detalhes do Lead */}
                <div className="space-y-6 lg:pr-6 lg:border-r border-zinc-800/60 overflow-y-auto custom-scrollbar pb-6">
                    {/* HEADER */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center text-xl font-bold text-brand-gold border border-zinc-700 shrink-0 shadow-inner">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-serif font-bold text-white truncate">{selectedLead.name}</h3>
                            <p className="text-zinc-400 text-sm truncate">
                                {[selectedLead.company, selectedLead.sector].filter(Boolean).join(' • ')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-emerald-400 font-mono text-sm font-bold">
                                    R$ {Number(priceValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {activeLabelObj && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                                        style={labelStyle(activeLabelObj)}>
                                        {activeLabelObj.name}
                                        {activeLabelObj.price ? ` · R$ ${activeLabelObj.price.toLocaleString('pt-BR')}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CONTACT INFO */}
                    {(selectedLead.email || selectedLead.phone) && (
                        <div className="flex flex-col gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
                            {selectedLead.phone && (
                                <p className="text-xs text-zinc-400 flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-zinc-600" />{selectedLead.phone}
                                </p>
                            )}
                            {selectedLead.email && (
                                <p className="text-xs text-zinc-400 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-zinc-600" />{selectedLead.email}
                                </p>
                            )}
                        </div>
                    )}

                    {/* FORM ANSWERS */}
                    {selectedLead.form_answers && Object.keys(selectedLead.form_answers).length > 0 && (
                        <div className="flex flex-col gap-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80 mt-2">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 border-b border-zinc-800/50 pb-2">
                                <FileText className="w-3.5 h-3.5" /> Respostas do Formulário
                            </p>
                            <div className="space-y-3 pt-1">
                                {Object.entries(selectedLead.form_answers).map(([question, answer]) => (
                                    <div key={question}>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{question}</p>
                                        <p className="text-sm text-zinc-300 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/30 whitespace-pre-wrap">{String(answer)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PIPELINE SELECTOR */}
                    <div className="pt-4 border-t border-zinc-800/50">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-2">
                            <ArrowRight className="w-3.5 h-3.5" /> Pipeline
                        </label>
                        <div className="flex flex-wrap gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800/50">
                            {availablePipelines.map(p => (
                                <button
                                    key={p}
                                    onClick={() => onUpdatePipeline(selectedLead.id, p)}
                                    className={`flex-1 min-w-[70px] px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        currentPipeline === p
                                            ? 'bg-zinc-800 text-brand-gold shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TAG / LABEL SECTION */}
                    <div className="pt-4 border-t border-zinc-800/50 grid gap-4">
                        {currentPipeline === 'Produto' ? (
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-3">
                                    <Package className="w-3.5 h-3.5" /> Etiqueta de Produto
                                </label>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <button
                                        onClick={() => onUpdateProductLabel(selectedLead.id, '')}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                            !selectedLead.productLabel
                                                ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm'
                                                : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                                        }`}
                                    >
                                        Sem etiqueta
                                    </button>

                                    {productLabels.map(label => {
                                        const isActive = selectedLead.productLabel === label.id;
                                        return (
                                            <div key={label.id} className="relative group/label">
                                                <button
                                                    onClick={() => onUpdateProductLabel(selectedLead.id, label.id)}
                                                    style={isActive ? labelStyle(label) : {}}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                        isActive
                                                            ? 'ring-1 ring-offset-1 ring-offset-zinc-950 shadow-sm'
                                                            : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                                                    }`}
                                                >
                                                    {label.name}
                                                    {label.price ? <span className="ml-1 opacity-70">· R$ {label.price.toLocaleString('pt-BR')}</span> : ''}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteProductLabel(label.id); }}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/label:opacity-100 transition-opacity shadow-sm"
                                                    title="Remover etiqueta"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    <button
                                        onClick={() => setShowNewLabel(true)}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-dashed border-zinc-700/50 text-zinc-500 hover:border-brand-gold/50 hover:text-brand-gold transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Nova
                                    </button>
                                </div>

                                {/* Create label form */}
                                {showNewLabel && (
                                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-3">
                                        <Input
                                            label="Nome do Produto/Serviço"
                                            value={newLabelName}
                                            onChange={(e) => setNewLabelName(e.target.value)}
                                            placeholder="Ex: Mentoria Premium, Ingresso VIP..."
                                            icon={<Tag className="w-4 h-4" />}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Preço (R$)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={newLabelPrice}
                                                        onChange={(e) => setNewLabelPrice(e.target.value)}
                                                        placeholder="0,00"
                                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-8 pr-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                                                    <Palette className="w-3 h-3" /> Cor
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={newLabelColor}
                                                        onChange={(e) => setNewLabelColor(e.target.value)}
                                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                                    />
                                                    <div className="flex gap-1 flex-wrap">
                                                        {QUICK_COLORS.slice(0, 8).map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => setNewLabelColor(c)}
                                                                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${newLabelColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110' : ''}`}
                                                                style={{ backgroundColor: c }}
                                                                title={c}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {newLabelName && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-500">Preview:</span>
                                                <span
                                                    className="text-[11px] font-bold px-2 py-1 rounded-lg border"
                                                    style={labelStyle({ id: '', name: newLabelName, color: 'custom', hexColor: newLabelColor })}
                                                >
                                                    {newLabelName}{newLabelPrice ? ` · R$ ${parseFloat(newLabelPrice || '0').toLocaleString('pt-BR')}` : ''}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-1">
                                            <Button variant="primary" size="sm" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                                                <Check className="w-3.5 h-3.5 mr-1" /> Criar Etiqueta
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setShowNewLabel(false)}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // EVENT TAGS (Geral and Evento pipelines)
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Etiqueta (Evento)"
                                    value={selectedLead.tagId || ''}
                                    onChange={(e) => onUpdateTag(selectedLead.id, e.target.value)}
                                    options={[
                                        { value: '', label: 'Sem etiqueta' },
                                        ...events.map(ev => ({ value: ev.id, label: ev.title }))
                                    ]}
                                />
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Valor (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                        <input
                                            type="text"
                                            value={priceValue}
                                            onChange={(e) => handlePriceChange(e.target.value)}
                                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-brand-gold/50 transition-colors"
                                            placeholder="0.00"
                                        />
                                        {isSavingPrice && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 italic animate-pulse">saving</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Responsável */}
                        <div className="space-y-2 mt-2">
                            <Select
                                label="Responsável"
                                value={selectedLead.ownerId || ''}
                                onChange={(e) => onUpdateOwner(selectedLead.id, e.target.value)}
                                options={[
                                    { value: '', label: 'Sem responsável' },
                                    ...team.map(member => ({ value: member.id, label: member.name }))
                                ]}
                            />
                        </div>

                        {/* SOURCE TAGS - Origem do Lead */}
                        <div className="pt-3 border-t border-zinc-800/40">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-3">
                                <Tag className="w-3.5 h-3.5" /> Origem do Lead
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableSourceTags.map(tag => {
                                    const isActive = (selectedLead.source_tags || []).includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                const current = selectedLead.source_tags || [];
                                                const next = isActive
                                                    ? current.filter(t => t !== tag)
                                                    : [...current, tag];
                                                onUpdateSourceTags(selectedLead.id, next);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                isActive
                                                    ? 'bg-brand-gold/15 border-brand-gold/60 text-brand-gold shadow-sm'
                                                    : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                            }`}
                                        >
                                            {tag}
                                            {isActive && <span className="ml-1.5 opacity-70">✓</span>}
                                        </button>
                                    );
                                })}

                                {/* Adicionar nova tag de origem */}
                                {showNewSourceTag ? (
                                    <div className="flex items-center gap-2 w-full mt-1">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newSourceTag}
                                            onChange={e => setNewSourceTag(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newSourceTag.trim()) {
                                                    const trimmed = newSourceTag.trim();
                                                    const updated = Array.from(new Set([...availableSourceTags, trimmed]));
                                                    setAvailableSourceTags(updated);
                                                    // persist custom tags (excluding defaults)
                                                    const custom = updated.filter(t => !DEFAULT_SOURCE_TAGS.includes(t));
                                                    localStorage.setItem(SOURCE_TAGS_STORAGE_KEY, JSON.stringify(custom));
                                                    // auto-apply to lead
                                                    const current = selectedLead.source_tags || [];
                                                    if (!current.includes(trimmed)) {
                                                        onUpdateSourceTags(selectedLead.id, [...current, trimmed]);
                                                    }
                                                    setNewSourceTag('');
                                                    setShowNewSourceTag(false);
                                                } else if (e.key === 'Escape') {
                                                    setShowNewSourceTag(false);
                                                    setNewSourceTag('');
                                                }
                                            }}
                                            placeholder="Nome da origem..."
                                            className="flex-1 bg-zinc-950/80 border border-zinc-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-brand-gold/50"
                                        />
                                        <button onClick={() => { setShowNewSourceTag(false); setNewSourceTag(''); }} className="text-zinc-600 hover:text-zinc-400 p-1">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewSourceTag(true)}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-dashed border-zinc-700/50 text-zinc-500 hover:border-brand-gold/50 hover:text-brand-gold transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Nova
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/50">
                        <Button variant="outline" icon={MessageCircle}
                            onClick={() => openWhatsApp(selectedLead.phone)}
                            className="justify-center text-green-500 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40">
                            WhatsApp
                        </Button>
                        <Button variant="outline" icon={Mail}
                            onClick={() => openEmail(selectedLead.email)}
                            className="justify-center">
                            Email
                        </Button>
                        {selectedLead.ownerId && selectedLead.owner?.phone && (
                            <Button
                                variant="ghost" size="sm" icon={MessageCircle}
                                className="col-span-2 justify-center text-zinc-400 hover:text-white border border-zinc-800"
                                onClick={() => {
                                    const message = encodeURIComponent(`Olá ${selectedLead.owner?.name}, você tem um novo lead: ${selectedLead.name}.`);
                                    window.open(`https://wa.me/55${selectedLead.owner?.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                }}
                            >
                                Notificar {selectedLead.owner.name}
                            </Button>
                        )}
                        {onDeleteLead && (
                            <Button variant="ghost" icon={Trash2}
                                onClick={() => onDeleteLead(selectedLead.id)}
                                className="col-span-2 justify-center text-red-500/80 hover:text-red-400 hover:bg-red-500/10 border border-transparent">
                                Excluir Lead permanentemente
                            </Button>
                        )}
                    </div>
                </div>

                {/* COLUNA DIREITA - Histórico de Anotações */}
                <div className="flex flex-col h-full overflow-hidden bg-zinc-950/30 rounded-xl border border-zinc-800/40 relative">
                    {/* Header History */}
                    <div className="p-4 border-b border-zinc-800/40 bg-zinc-900/40 flex items-center justify-between shrink-0">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5" /> Histórico e Atividades
                        </label>
                        {isSavingNotes && <span className="text-[10px] text-brand-gold italic animate-pulse">Salvando...</span>}
                    </div>

                    {/* Timeline Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {notesHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 opacity-50">
                                <FileText className="w-8 h-8" />
                                <p className="text-xs">Nenhuma anotação registrada.</p>
                            </div>
                        ) : (
                            notesHistory.map((note) => (
                                <div key={note.id} className="group relative">
                                    <div className="flex items-center gap-2 mb-1 pl-1">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{note.author}</span>
                                        <span className="text-[9px] text-zinc-600">
                                            {new Date(note.date).toLocaleString('pt-BR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-900/80 border border-zinc-800/50 p-3 rounded-tr-xl rounded-b-xl rounded-tl-sm text-sm text-zinc-300 whitespace-pre-wrap shadow-sm">
                                        {note.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={notesEndRef} />
                    </div>

                    {/* Input Field */}
                    <div className="p-4 bg-zinc-900/60 border-t border-zinc-800/60 shrink-0">
                        <div className="relative">
                            <textarea
                                className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/20 resize-none min-h-[80px] custom-scrollbar"
                                placeholder="Registrar nova interação, resumo da call..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddNote();
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={!newNote.trim() || isSavingNotes}
                                className="absolute right-2 bottom-3 p-2 rounded-lg bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-brand-gold/10 disabled:hover:text-brand-gold"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-zinc-600 mt-2 ml-1">Pressione <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono">Enter</kbd> para enviar, <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono">Shift + Enter</kbd> para quebrar linha.</p>
                    </div>
                </div>

            </div>
        </Modal>
    );
};
