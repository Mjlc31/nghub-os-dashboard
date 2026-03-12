import React, { useState, useEffect, useRef } from 'react';
import { Mail, MessageCircle, Phone, Trash2, FileText, DollarSign } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Lead, Event, Seller } from '../../types';

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
    onDeleteLead?: (id: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, selectedLead, events, team,
    onUpdateTag, onUpdateOwner, onUpdateNotes, onUpdateValue, onDeleteLead
}) => {
    const [notesValue, setNotesValue] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    
    const [priceValue, setPriceValue] = useState<string>('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    
    const notesDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const priceDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync fields when the selected lead changes
    useEffect(() => {
        if (selectedLead) {
            setNotesValue(selectedLead.notes || '');
            setPriceValue(selectedLead.value?.toString() || '0');
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
        // Allow only numbers and dots/commas
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

    const initials = selectedLead.name
        .split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase();

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
                                R$ {Number(priceValue || 0).toLocaleString('pt-BR')}
                            </span>
                            {isSavingPrice && (
                                <span className="text-[10px] text-zinc-500 italic animate-pulse">Salvando...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTACT INFO */}
                {(selectedLead.email || selectedLead.phone) && (
                    <div className="flex flex-col gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                        {selectedLead.phone && (
                            <p className="text-xs text-zinc-400 flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-zinc-600" />
                                {selectedLead.phone}
                            </p>
                        )}
                        {selectedLead.email && (
                            <p className="text-xs text-zinc-400 flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-zinc-600" />
                                {selectedLead.email}
                            </p>
                        )}
                    </div>
                )}

                {/* TAG & OWNER SELECTION */}
                <div className="pt-4 border-t border-zinc-800 grid gap-4">
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
                            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Valor do Ingresso (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={priceValue}
                                    onChange={(e) => handlePriceChange(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-brand-gold/50 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

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
                                variant="ghost"
                                size="sm"
                                icon={MessageCircle}
                                className="w-full justify-center text-green-500 hover:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                                onClick={() => {
                                    const message = encodeURIComponent(`Olá ${selectedLead.owner?.name}, você tem um novo lead na NGHUB OS: ${selectedLead.name}.`);
                                    window.open(`https://wa.me/55${selectedLead.owner?.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                }}
                            >
                                Notificar Responsável
                            </Button>
                        )}
                    </div>
                </div>

                {/* NOTES SECTION */}
                <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Anotações
                        </label>
                        {isSavingNotes && (
                            <span className="text-[10px] text-zinc-500 italic animate-pulse">Salvando...</span>
                        )}
                        {!isSavingNotes && notesValue && (
                            <span className="text-[10px] text-emerald-500">✓ Salvo</span>
                        )}
                    </div>
                    <textarea
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/20 resize-y min-h-[100px] transition-colors custom-scrollbar"
                        placeholder="Adicione observações sobre este lead: contexto da conversa, próximos passos, objeções..."
                        value={notesValue}
                        onChange={(e) => handleNotesChange(e.target.value)}
                    />
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                    <Button
                        variant="outline"
                        icon={MessageCircle}
                        onClick={() => openWhatsApp(selectedLead.phone)}
                        className="justify-center text-green-500 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40"
                    >
                        WhatsApp
                    </Button>
                    <Button
                        variant="outline"
                        icon={Mail}
                        onClick={() => openEmail(selectedLead.email)}
                        className="justify-center"
                    >
                        Email
                    </Button>
                </div>

                {/* DELETE */}
                {onDeleteLead && (
                    <Button
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => onDeleteLead(selectedLead.id)}
                        className="w-full justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20"
                    >
                        Excluir Lead
                    </Button>
                )}
            </div>
        </Modal>
    );
};
