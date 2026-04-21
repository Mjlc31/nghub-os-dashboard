import React, { useState, useEffect, useRef } from 'react';
import { Mail, MessageCircle, Phone, Trash2, FileText, DollarSign, ArrowRight, Plus, X, Package, Tag, Palette, Edit2, Check } from 'lucide-react';
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
    productLabels: ProductLabel[];
    onAddProductLabel: (name: string, color: string, hexColor?: string, price?: number) => ProductLabel;
    onUpdateProductLabel_config?: (labelId: string, updates: Partial<ProductLabel>) => void;
    onDeleteProductLabel: (id: string) => void;
    onDeleteLead?: (id: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, selectedLead, events, team,
    onUpdateTag, onUpdateOwner, onUpdateNotes, onUpdateValue,
    onUpdatePipeline, onUpdateProductLabel, productLabels, onAddProductLabel,
    onUpdateProductLabel_config, onDeleteProductLabel, onDeleteLead
}) => {
    const [notesValue, setNotesValue] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [priceValue, setPriceValue] = useState<string>('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    // New label form
    const [showNewLabel, setShowNewLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#6366f1');
    const [newLabelPrice, setNewLabelPrice] = useState('');

    // Edit label
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

    const notesDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const priceDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup debounce timers on unmount to avoid memory leaks / stale updates
    useEffect(() => {
        return () => {
            if (notesDebounceTimer.current) clearTimeout(notesDebounceTimer.current);
            if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current);
        };
    }, []);

    const currentPipeline = selectedLead?.pipeline || 'Geral';

    useEffect(() => {
        if (selectedLead) {
            setNotesValue(selectedLead.notes || '');
            setPriceValue(selectedLead.value?.toString() || '0');
            setShowNewLabel(false);
            setNewLabelName('');
            setNewLabelPrice('');
            setEditingLabelId(null);
        }
    }, [selectedLead?.id]);

    if (!selectedLead) return null;

    const openWhatsApp = (phone?: string) => {
        if (!phone) return;
        window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
    };

    const openEmail = (email?: string) => {
        if (!email) return;
        window.location.href = `mailto:${email}`;
    };

    const handleNotesChange = (value: string) => {
        setNotesValue(value);
        if (notesDebounceTimer.current) clearTimeout(notesDebounceTimer.current);
        notesDebounceTimer.current = setTimeout(async () => {
            setIsSavingNotes(true);
            await onUpdateNotes(selectedLead.id, value);
            setIsSavingNotes(false);
        }, 800);
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
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="space-y-6">
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
                    <div className="flex flex-col gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
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
                    <div className="flex flex-col gap-2 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 mt-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                            <FileText className="w-3.5 h-3.5" /> Respostas do Formulário
                        </p>
                        <div className="space-y-3 pt-1">
                            {Object.entries(selectedLead.form_answers).map(([question, answer]) => (
                                <div key={question}>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">{question}</p>
                                    <p className="text-sm text-zinc-300 bg-zinc-950 p-2 rounded-md border border-zinc-800/50 whitespace-pre-wrap">{String(answer)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PIPELINE SELECTOR */}
                <div className="pt-4 border-t border-zinc-800">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-2">
                        <ArrowRight className="w-3.5 h-3.5" /> Pipeline
                    </label>
                    <div className="flex gap-2">
                        {['Geral', 'Evento', 'Produto'].map(p => (
                            <button
                                key={p}
                                onClick={() => onUpdatePipeline(selectedLead.id, p)}
                                className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                    currentPipeline === p
                                        ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5 italic">
                        Ao mudar de pipeline, a etiqueta atual será removida automaticamente.
                    </p>
                </div>

                {/* TAG / LABEL SECTION */}
                <div className="pt-4 border-t border-zinc-800 grid gap-4">
                    {currentPipeline === 'Produto' ? (
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-2">
                                <Package className="w-3.5 h-3.5" /> Etiqueta de Produto
                            </label>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    onClick={() => onUpdateProductLabel(selectedLead.id, '')}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                        !selectedLead.productLabel
                                            ? 'bg-zinc-700 border-zinc-600 text-white'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
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
                                                        ? 'ring-1 ring-offset-1 ring-offset-zinc-950'
                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                                }`}
                                            >
                                                {label.name}
                                                {label.price ? <span className="ml-1 opacity-70">· R$ {label.price.toLocaleString('pt-BR')}</span> : ''}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteProductLabel(label.id); }}
                                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/label:opacity-100 transition-opacity"
                                                title="Remover etiqueta"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => setShowNewLabel(true)}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-dashed border-zinc-700 text-zinc-500 hover:border-brand-gold hover:text-brand-gold transition-all flex items-center gap-1"
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
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-8 pr-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
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
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                                        placeholder="0.00"
                                    />
                                    {isSavingPrice && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 italic animate-pulse">saving</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Responsável */}
                    <div className="space-y-2">
                        <Select
                            label="Responsável"
                            value={selectedLead.ownerId || ''}
                            onChange={(e) => onUpdateOwner(selectedLead.id, e.target.value)}
                            options={[
                                { value: '', label: 'Sem responsável' },
                                ...team.map(member => ({ value: member.id, label: member.name }))
                            ]}
                        />
                        {selectedLead.ownerId && selectedLead.owner?.phone && (
                            <Button
                                variant="ghost" size="sm" icon={MessageCircle}
                                className="w-full justify-center text-green-500 hover:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                                onClick={() => {
                                    const message = encodeURIComponent(`Olá ${selectedLead.owner?.name}, você tem um novo lead: ${selectedLead.name}.`);
                                    window.open(`https://wa.me/55${selectedLead.owner?.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                }}
                            >
                                Notificar Responsável
                            </Button>
                        )}
                    </div>
                </div>

                {/* NOTES */}
                <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Anotações
                        </label>
                        {isSavingNotes ? (
                            <span className="text-[10px] text-zinc-500 italic animate-pulse">Salvando...</span>
                        ) : notesValue ? (
                            <span className="text-[10px] text-emerald-500">✓ Salvo</span>
                        ) : null}
                    </div>
                    <textarea
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/20 resize-y min-h-[100px] transition-colors custom-scrollbar"
                        placeholder="Adicione observações: contexto da conversa, próximos passos, objeções..."
                        value={notesValue}
                        onChange={(e) => handleNotesChange(e.target.value)}
                    />
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
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
                </div>

                {onDeleteLead && (
                    <Button variant="ghost" icon={Trash2}
                        onClick={() => onDeleteLead(selectedLead.id)}
                        className="w-full justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20">
                        Excluir Lead
                    </Button>
                )}
            </div>
        </Modal>
    );
};
