import React, { useState } from 'react';
import { UserPlus, Trash2, Phone, X } from 'lucide-react';
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestão de Vendedores">
            <div className="space-y-6">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    <h4 className="text-sm font-bold text-white mb-3">Adicionar Novo Vendedor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <Input
                            placeholder="Nome do Vendedor"
                            value={newSellerForm.name}
                            onChange={(e) => setNewSellerForm({ ...newSellerForm, name: e.target.value })}
                        />
                        <Input
                            placeholder="WhatsApp (ex: 5511999999999)"
                            value={newSellerForm.phone}
                            onChange={(e) => setNewSellerForm({ ...newSellerForm, phone: e.target.value })}
                        />
                    </div>
                    <Button
                        className="w-full bg-brand-gold text-black hover:bg-brand-gold/90 font-bold"
                        onClick={handleAdd}
                        disabled={!newSellerForm.name || !newSellerForm.phone || isSubmitting}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Cadastrar Vendedor
                    </Button>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                        Equipe Atual ({team.length})
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {team.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div>
                                    <p className="font-bold text-white text-sm">{member.name}</p>
                                    <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" /> {member.phone}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDeleteSeller(member.id)}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    title="Remover vendedor"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {team.length === 0 && (
                            <p className="text-center text-sm text-zinc-500 py-4">Nenhum vendedor cadastrado ainda.</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
