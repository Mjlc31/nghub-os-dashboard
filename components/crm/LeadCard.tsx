import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Lead } from '../../types';

interface LeadCardProps {
    lead: Lead;
    colorStyle: { bg: string; border: string; text: string } | null;
    eventName: string | undefined;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (lead: Lead) => void;
    onWhatsAppClick: (phone: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
    lead,
    colorStyle,
    eventName,
    onDragStart,
    onClick,
    onWhatsAppClick,
}) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            onClick={() => onClick(lead)}
            className={`p-4 rounded-xl cursor-grab transition-all group relative border bg-zinc-900/80 hover:shadow-lg ${colorStyle ? colorStyle.border : 'border-zinc-800/60 hover:border-brand-gold/30'
                }`}
        >
            {/* Colored Left Bar */}
            {colorStyle && (
                <div
                    className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${colorStyle.bg.replace(
                        '/10',
                        ''
                    )}`}
                ></div>
            )}

            {/* Header: Sector & Tag */}
            <div className="flex items-center gap-2 mb-2 pl-2">
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {lead.sector || 'Geral'}
                </span>
                {colorStyle && (
                    <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                    >
                        {eventName}
                    </span>
                )}
            </div>

            {/* Main Info */}
            <div className="pl-2">
                <h4 className="text-white font-bold text-sm group-hover:text-brand-gold transition-colors">
                    {lead.name}
                </h4>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">{lead.company}</p>
            </div>

            {/* Footer: Value & Actions */}
            <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800/50 items-center pl-2">
                {lead.value > 0 ? (
                    <span className="text-xs font-mono font-medium text-zinc-300">
                        R$ {lead.value.toLocaleString('pt-BR')}
                    </span>
                ) : (
                    <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(lead.createdAt || '').toLocaleDateString('pt-BR')}
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
