import React from 'react';
import { Mail, MessageCircle, Phone, ExternalLink } from 'lucide-react';
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
    onDelete?: (id: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen, onClose, selectedLead, events, team, onUpdateTag, onUpdateOwner, onDelete
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

    const displayPrice = selectedLead.tagId
        ? (events.find(e => e.id === selectedLead.tagId)?.price || selectedLead.value)
        : selectedLead.value;

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
                        {displayPrice > 0 && (
                            <p className="text-emerald-400 font-mono text-sm mt-1 font-bold">
                                R$ {displayPrice.toLocaleString('pt-BR')}
                            </p>
                        )}
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
            </div>
        </Modal>
    );
};
