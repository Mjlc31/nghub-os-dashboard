import React from 'react';
import { MessageCircle, CheckCircle, Circle } from 'lucide-react';
import { Lead } from '../../types';

interface LeadCardProps {
    lead: Lead;
    colorStyle: { bg: string; border: string; text: string } | null;
    eventName: string | undefined;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (lead: Lead) => void;
    onWhatsAppClick: (phone: string) => void;
    isBulkMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

const LeadCardComponent: React.FC<LeadCardProps> = ({
    lead,
    colorStyle,
    eventName,
    onDragStart,
    onClick,
    onWhatsAppClick,
    isBulkMode,
    isSelected,
    onToggleSelect
}) => {
    const handleClick = () => {
        if (isBulkMode && onToggleSelect) {
            onToggleSelect(lead.id);
        } else {
            onClick(lead);
        }
    };

    const formattedDate = lead.createdAt
        ? new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : '';

    return (
        <div
            draggable={!isBulkMode}
            onDragStart={(e) => !isBulkMode && onDragStart(e, lead.id)}
            onClick={handleClick}
            className={`p-4 rounded-xl transition-all group relative border ${isSelected ? 'bg-brand-gold/10 border-brand-gold/50' : 'bg-zinc-900/80'} ${!isBulkMode && 'cursor-grab hover:shadow-lg'} ${colorStyle && !isSelected ? colorStyle.border : ''} ${!isSelected && !colorStyle ? 'border-zinc-800/60 hover:border-brand-gold/30' : ''}`}
        >
            {/* Colored Left Bar for Tags */}
            {colorStyle && (
                <div
                    className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${colorStyle.bg.replace('/10', '')}`}
                ></div>
            )}

            {/* Header: Sector & Tag */}
            <div className="flex items-center gap-2 mb-2 pl-2">
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {lead.sector || 'Geral'}
                </span>
                {colorStyle && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                        {eventName}
                    </span>
                )}
            </div>

            {/* Main Info */}
            <div className="pl-2">
                <h4 className="text-white font-bold text-sm group-hover:text-brand-gold transition-colors flex justify-between items-start">
                    <span className="truncate pr-4">{lead.name}</span>
                    {isBulkMode && (
                        <div className="absolute top-4 right-4 text-zinc-500">
                            {isSelected ? <CheckCircle className="w-5 h-5 text-brand-gold" /> : <Circle className="w-5 h-5" />}
                        </div>
                    )}
                </h4>
                <p className="text-zinc-500 text-xs mt-0.5 shrink-0 truncate flex items-center gap-1.5">
                    {lead.company || 'Sem empresa'}
                    {lead.owner && (
                        <>
                            <span className="text-zinc-700">•</span>
                            <span className="text-zinc-400 font-medium ml-0.5 truncate flex-shrink">
                                {lead.owner.name.split(' ')[0]}
                            </span>
                        </>
                    )}
                </p>
            </div>

            {/* Footer: Value & Actions */}
            <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800/50 items-center pl-2">
                {lead.value > 0 ? (
                    <span className="text-xs font-mono font-medium text-zinc-300">
                        R$ {lead.value.toLocaleString('pt-BR')}
                    </span>
                ) : (
                    <span className="text-[10px] text-zinc-600 font-mono">
                        {formattedDate}
                    </span>
                )}

                {/* Actions (visible on hover) */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {lead.phone && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onWhatsAppClick(lead.phone!);
                            }}
                            className="text-zinc-500 hover:text-green-500"
                            title="Abrir WhatsApp"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Custom memo comparison: only re-render if the lead's own data or selection state changed
export const LeadCard = React.memo(LeadCardComponent, (prev, next) =>
    prev.lead.id === next.lead.id &&
    prev.lead.stage === next.lead.stage &&
    prev.lead.value === next.lead.value &&
    prev.lead.tagId === next.lead.tagId &&
    prev.lead.ownerId === next.lead.ownerId &&
    prev.lead.name === next.lead.name &&
    prev.isSelected === next.isSelected &&
    prev.isBulkMode === next.isBulkMode &&
    prev.colorStyle?.text === next.colorStyle?.text &&
    prev.eventName === next.eventName
);
