import React, { useState } from 'react';
import { Save, Plus, Trash2, GripVertical } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Etapas padrão que não podem ser removidas
const FIXED_STAGE_KEYS = [
    'Rascunho Em Andamento',
    'Novo Lead',
    'Qualificado',
    'Em Negociação',
    'Venda Fechada',
    'Churn',
];

interface EditStagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    stageKeys: string[];
    tempStageNames: Record<string, string>;
    setTempStageNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onSave: () => void;
    pipelineName?: string;
    onAddCustomStage?: (stageKey: string, stageName: string) => void;
    onRemoveCustomStage?: (stageKey: string) => void;
    customStageKeys?: string[];
}

export const EditStagesModal: React.FC<EditStagesModalProps> = ({
    isOpen, onClose, stageKeys, tempStageNames, setTempStageNames, onSave, pipelineName,
    onAddCustomStage, onRemoveCustomStage, customStageKeys = [],
}) => {
    const [newStageName, setNewStageName] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleAddStage = () => {
        const trimmed = newStageName.trim();
        if (!trimmed) return;
        // Gera um ID único para a nova etapa
        const key = `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        onAddCustomStage?.(key, trimmed);
        setTempStageNames(prev => ({ ...prev, [key]: trimmed }));
        setNewStageName('');
        setShowAddForm(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Etapas — Pipeline ${pipelineName || 'Geral'}`}>
            <div className="space-y-1 mb-5">
                <p className="text-xs text-zinc-500">
                    Renomeie as etapas ou adicione novas colunas. Alterações se aplicam <strong className="text-zinc-300">somente</strong> à pipeline <strong className="text-brand-gold">{pipelineName || 'Geral'}</strong>.
                </p>
            </div>

            <div className="space-y-3">
                {/* Etapas padrão */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Etapas Padrão</p>
                {stageKeys.filter(k => !customStageKeys.includes(k)).map(stage => (
                    <div key={stage} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0" />
                        <div className="flex-1">
                            <Input
                                label={`"${stage}"`}
                                value={tempStageNames[stage] || ''}
                                onChange={(e) => setTempStageNames({ ...tempStageNames, [stage]: e.target.value })}
                                containerClassName="!mb-0"
                            />
                        </div>
                    </div>
                ))}

                {/* Etapas customizadas */}
                {customStageKeys.length > 0 && (
                    <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-4 mb-1">Colunas Customizadas</p>
                        {customStageKeys.map(stageKey => (
                            <div key={stageKey} className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0" />
                                <div className="flex-1">
                                    <Input
                                        label={tempStageNames[stageKey] || stageKey}
                                        value={tempStageNames[stageKey] || ''}
                                        onChange={(e) => setTempStageNames({ ...tempStageNames, [stageKey]: e.target.value })}
                                        containerClassName="!mb-0"
                                    />
                                </div>
                                <button
                                    onClick={() => onRemoveCustomStage?.(stageKey)}
                                    className="flex-shrink-0 p-1.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-4"
                                    title="Remover coluna"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {/* Adicionar nova etapa */}
                <div className="pt-3 border-t border-zinc-800/50">
                    {showAddForm ? (
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input
                                    label="Nome da nova coluna"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="Ex: Proposta Enviada, Follow-up..."
                                    containerClassName="!mb-0"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddStage();
                                        if (e.key === 'Escape') { setShowAddForm(false); setNewStageName(''); }
                                    }}
                                />
                            </div>
                            <Button variant="primary" size="sm" onClick={handleAddStage} disabled={!newStageName.trim()} className="mb-0 flex-shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewStageName(''); }} className="mb-0 flex-shrink-0">
                                Cancelar
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-zinc-700/60 text-zinc-500 hover:border-brand-gold/40 hover:text-brand-gold transition-all text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> Nova Coluna
                        </button>
                    )}
                </div>

                <Button onClick={onSave} className="w-full bg-brand-gold text-black hover:bg-brand-gold/90 font-bold mt-2">
                    <Save className="w-4 h-4 mr-2" /> Salvar Etapas
                </Button>
            </div>
        </Modal>
    );
};
