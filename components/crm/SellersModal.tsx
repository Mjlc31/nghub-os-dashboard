import React, { useState } from 'react';
import { UserPlus, Trash2, Phone, User } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Seller } from '../../types';

interface SellersModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Seller[];
    onAddSeller: (name: string, phone: string) => Promise<void>;
    onDeleteSeller: (id: string) => Promise<void>;
}

export const SellersModal: React.FC<SellersModalProps> = ({ isOpen, onClose, team, onAddSeller, onDeleteSeller }) => {
    const [newSellerForm, setNewSellerForm] = useState({ name: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!newSellerForm.name || !newSellerForm.phone) return;
        setIsSubmitting(true);
        try {
            await onAddSeller(newSellerForm.name, newSellerForm.phone);
            setNewSellerForm({ name: '', phone: '' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = newSellerForm.name.trim().length > 0 && newSellerForm.phone.trim().length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestão de Vendedores">
            <div className="space-y-6">
                {/* Add Form */}
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Adicionar Vendedor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Nome"
                            icon={User}
                            placeholder="Nome do vendedor"
                            value={newSellerForm.name}
                            onChange={(e) => setNewSellerForm({ ...newSellerForm, name: e.target.value })}
                        />
                        <Input
                            label="WhatsApp"
                            icon={Phone}
                            placeholder="5511999999999"
                            value={newSellerForm.phone}
                            onChange={(e) => setNewSellerForm({ ...newSellerForm, phone: e.target.value })}
                            hint="Somente números com DDD e código do país"
                        />
                    </div>
                    <Button
                        variant="primary"
                        icon={UserPlus}
                        onClick={handleAdd}
                        isLoading={isSubmitting}
                        disabled={!isValid || isSubmitting}
                        className="w-full justify-center"
                    >
                        Cadastrar Vendedor
                    </Button>
                </div>

                {/* Team List */}
                <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-gold inline-block" />
                        Equipe Atual ({team.length})
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {team.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold text-sm font-bold border border-brand-gold/20 flex items-center justify-center">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{member.name}</p>
                                        <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                                            <Phone className="w-3 h-3" /> {member.phone}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    icon={Trash2}
                                    onClick={() => onDeleteSeller(member.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover vendedor"
                                />
                            </div>
                        ))}
                        {team.length === 0 && (
                            <div className="text-center py-8 text-zinc-600 text-sm">
                                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                Nenhum vendedor cadastrado ainda.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
