import React from 'react';
import { ChevronDown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Event } from '../../types';

interface LeadFormState {
    name: string;
    company: string;
    sector: string;
    email: string;
    phone: string;
    tagId: string;
    value: string;
}

interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    formData: LeadFormState;
    setFormData: (data: LeadFormState) => void;
    events: Event[];
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    formData,
    setFormData,
    events,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Lead"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-bold hover:bg-[#c5a059] transition-colors"
                    >
                        Salvar
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Nome Completo
                    </label>
                    <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                            Empresa
                        </label>
                        <input
                            type="text"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                            Setor
                        </label>
                        <input
                            type="text"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
                            value={formData.sector}
                            onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                        />
                    </div>
                </div>

                {/* Tag Selection in Modal */}
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Etiqueta (Evento)
                    </label>
                    <div className="relative">
                        <select
                            value={formData.tagId}
                            onChange={(e) => setFormData({ ...formData, tagId: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm appearance-none"
                        >
                            <option value="">Sem etiqueta</option>
                            {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.title}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Valor Potencial (R$)
                    </label>
                    <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm font-mono"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="0.00"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                            WhatsApp
                        </label>
                        <input
                            type="tel"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-brand-gold focus:outline-none text-sm"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
