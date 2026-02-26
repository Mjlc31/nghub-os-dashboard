import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Lead, Event, Seller } from '../../types';

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLead: Lead | null;
    events: Event[];
    team: Seller[];
    onUpdateTag: (leadId: string, tagId: string) => Promise<void>;
    onUpdateOwner: (leadId: string, ownerId: string) => Promise<void>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, selectedLead, events, team, onUpdateTag, onUpdateOwner
}) => {
    if (!selectedLead) return null;

    const openWhatsApp = (phone?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    };

    const openEmail = (email?: string) => {
        if (!email) return;
        window.location.href = `mailto:${email}`;
    };

    const displayPrice = selectedLead.tagId ? (events.find(e => e.id === selectedLead.tagId)?.price || selectedLead.value) : selectedLead.value;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-brand-gold border border-zinc-700">
                        {selectedLead.name.charAt(0)}
                    </div>
                    <div className="flex-[1]">
                        <h3 className="text-xl font-serif font-bold text-white">{selectedLead.name}</h3>
                        <p className="text-zinc-400 text-sm">{selectedLead.company} • {selectedLead.sector}</p>

                        {displayPrice > 0 && (
                            <p className="text-emerald-400 font-mono text-sm mt-1">R$ {displayPrice.toLocaleString('pt-BR')}</p>
                        )}
                    </div>
                </div>

                {/* TAG & OWNER SELECTION */}
                <div className="mt-4 pt-4 border-t border-zinc-800 grid gap-4">
                    <Select
                        label="Etiqueta (Evento)"
                        value={selectedLead.tagId || ''}
                        onChange={(e) => onUpdateTag(selectedLead.id, e.target.value)}
                        options={[
                            { value: '', label: 'Sem etiqueta' },
                            ...events.map(ev => ({ value: ev.id, label: ev.title }))
                        ]}
                    />

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
                                className="w-full text-green-500 hover:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                                onClick={() => {
                                    const message = encodeURIComponent(`Olá ${selectedLead.owner?.name}, você tem um novo lead na NGHUB OS: ${selectedLead.name}.`);
                                    window.open(`https://wa.me/55${selectedLead.owner?.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                                }}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Notificar Responsável
                            </Button>
                        )}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                    <button onClick={() => openWhatsApp(selectedLead.phone)} className="flex items-center justify-center gap-2 bg-green-900/20 text-green-500 p-3 rounded-lg border border-green-900/30 font-bold text-sm hover:bg-green-900/30 transition-colors">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button onClick={() => openEmail(selectedLead.email)} className="flex items-center justify-center gap-2 bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 font-bold text-sm hover:bg-zinc-700 transition-colors">
                        <Mail className="w-4 h-4" /> Email
                    </button>
                </div>
            </div>
        </Modal>
    );
};
