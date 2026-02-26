import React from 'react';
import { Save } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface EditStagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    stageKeys: string[];
    tempStageNames: Record<string, string>;
    setTempStageNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onSave: () => void;
}

export const EditStagesModal: React.FC<EditStagesModalProps> = ({
    isOpen, onClose, stageKeys, tempStageNames, setTempStageNames, onSave
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Nomes das Etapas">
            <div className="space-y-4">
                {stageKeys.map(stage => (
                    <Input
                        key={stage}
                        label={`Nome para: ${stage}`}
                        value={tempStageNames[stage] || ''}
                        onChange={(e) => setTempStageNames({ ...tempStageNames, [stage]: e.target.value })}
                    />
                ))}
                <Button onClick={onSave} className="w-full bg-brand-gold text-black hover:bg-brand-gold/90 font-bold">
                    <Save className="w-4 h-4 mr-2" /> Salvar Etapas
                </Button>
            </div>
        </Modal>
    );
};
