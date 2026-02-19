import React, { useRef } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import Modal from '../ui/Modal';

interface ImportLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importing: boolean;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
    isOpen,
    onClose,
    onFileSelect,
    importing,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importar Leads (XLSX/CSV)"
        >
            <div className="text-center py-10">
                <FileSpreadsheet className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">Importação em Massa</h3>
                <p className="text-zinc-500 text-sm mb-6">
                    Suba sua lista e o sistema criará os leads automaticamente no funil.
                </p>
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="w-full bg-zinc-800 border-2 border-dashed border-zinc-700 p-8 rounded-xl flex flex-col items-center gap-2 hover:border-brand-gold/50 transition-colors"
                >
                    {importing ? (
                        <Loader2 className="animate-spin text-brand-gold" />
                    ) : (
                        <>
                            <Upload className="w-5 h-5 text-zinc-500" />
                            <span>Selecionar Arquivo</span>
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};
