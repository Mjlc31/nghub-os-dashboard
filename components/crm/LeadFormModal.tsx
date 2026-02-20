import React from 'react';
import { User, Building, Briefcase, Mail, Phone, DollarSign, ChevronDown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Event } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface LeadFormState {
    name: string;
    company: string;
    sector: string;
    email: string;
    phone: string;
    tagId: string;
    value: string;
    ownerId: string;
}

interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    formData: LeadFormState;
    setFormData: (data: LeadFormState) => void;
    events: Event[];
    team: { id: string; name: string }[];
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    formData,
    setFormData,
    events,
    team,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Lead"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={onSave}>
                        Salvar
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Input
                    label="Nome Completo"
                    icon={<User className="w-4 h-4" />}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Empresa"
                        icon={<Building className="w-4 h-4" />}
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                    <Input
                        label="Setor"
                        icon={<Briefcase className="w-4 h-4" />}
                        value={formData.sector}
                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    />
                </div>

                {/* Tag Selection */}
                <div className="relative">
                    <label htmlFor="tag-select" className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5 opacity-70">
                        Etiqueta (Evento)
                    </label>
                    <div className="relative">
                        <select
                            id="tag-select"
                            value={formData.tagId}
                            onChange={(e) => {
                                const selectedTagId = e.target.value;
                                const selectedEvent = events.find(ev => ev.id === selectedTagId);
                                const eventPrice = selectedEvent ? selectedEvent.price.toString() : '';

                                setFormData({
                                    ...formData,
                                    tagId: selectedTagId,
                                    value: eventPrice || formData.value
                                });
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 text-sm appearance-none shadow-inner transition-all hover:border-zinc-700"
                        >
                            <option value="">Sem etiqueta</option>
                            {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.title} {ev.price > 0 && `(R$ ${ev.price})`}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Owner Selection */}
                <div className="relative">
                    <label htmlFor="owner-select" className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5 opacity-70">
                        Responsável
                    </label>
                    <div className="relative">
                        <select
                            id="owner-select"
                            value={formData.ownerId}
                            onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 text-sm appearance-none shadow-inner transition-all hover:border-zinc-700"
                        >
                            <option value="">Sem responsável</option>
                            {team.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <Input
                    label="Valor Potencial (R$)"
                    type="number"
                    icon={<DollarSign className="w-4 h-4" />}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                    className="font-mono"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email"
                        type="email"
                        icon={<Mail className="w-4 h-4" />}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="WhatsApp"
                        type="tel"
                        icon={<Phone className="w-4 h-4" />}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
            </div>
        </Modal >
    );
};
