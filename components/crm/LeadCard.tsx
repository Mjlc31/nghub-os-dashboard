import React from 'react';
import { MessageCircle, CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';
import { Lead } from '../../types';

interface LeadCardProps {
    lead: Lead;
    colorStyle: { bg: string; border: string; text: string } | null;
    eventName: string | undefined;
    productLabelName?: string;
    productLabelHexColor?: string;
    productLabelPrice?: number;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (lead: Lead) => void;
    onWhatsAppClick: (phone: string) => void;
    isBulkMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

// Compute lead completeness score (0–100)
function getLeadScore(lead: Lead): number {
    let score = 0;
    if (lead.name) score += 20;
    if (lead.phone) score += 20;
    if (lead.email) score += 20;
    if (lead.company) score += 15;
    if (lead.sector) score += 10;
    if (lead.value > 0) score += 15;
    return score;
}

// How many days since created
function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const LeadCardComponent: React.FC<LeadCardProps> = ({
    lead,
    colorStyle,
    eventName,
    productLabelName,
    productLabelHexColor,
    productLabelPrice,
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

    const score = getLeadScore(lead);
    const daysInStage = daysSince(lead.createdAt);
    const isStale = daysInStage !== null && daysInStage > 7;

    // Product label inline style
    const productLabelStyle: React.CSSProperties | undefined = productLabelHexColor ? {
        backgroundColor: `${productLabelHexColor}18`,
        borderColor: `${productLabelHexColor}50`,
        color: productLabelHexColor,
    } : undefined;

    // Score color
    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBarColor = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

    return (
        <div
            draggable={!isBulkMode}
            onDragStart={(e) => !isBulkMode && onDragStart(e, lead.id)}
            onClick={handleClick}
            className={`p-4 rounded-xl transition-all group relative border ${isSelected ? 'bg-brand-gold/10 border-brand-gold/50' : 'bg-zinc-900/80'} ${!isBulkMode && 'cursor-grab hover:shadow-lg'} ${colorStyle && !isSelected ? colorStyle.border : ''} ${!isSelected && !colorStyle && !productLabelHexColor ? 'border-zinc-800/60 hover:border-brand-gold/30' : ''}`}
            style={!isSelected && productLabelHexColor && !colorStyle ? { borderColor: `${productLabelHexColor}40` } : undefined}
        >
            {/* Stale indicator */}
            {isStale && !isBulkMode && (
                <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity" title={`${daysInStage} dias nesta etapa`}>
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                </div>
            )}

            {/* Colored Left Bar for Tags or Product Label */}
            {colorStyle && (
                <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${colorStyle.bg.replace('/10', '')}`} />
            )}
            {!colorStyle && productLabelHexColor && (
                <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: productLabelHexColor }} />
            )}

            {/* Header: Sector & Tag */}
            <div className="flex items-center gap-2 mb-2 pl-2 flex-wrap">
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {lead.sector || 'Geral'}
                </span>
                {colorStyle && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                        {eventName}
                    </span>
                )}
                {productLabelName && productLabelStyle && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border" style={productLabelStyle}>
                        {productLabelName}
                        {productLabelPrice ? ` · R$ ${productLabelPrice.toLocaleString('pt-BR')}` : ''}
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

            {/* Score bar — progress */}
            <div className="pl-2 mt-2 group/score relative">
                <div className="flex justify-between items-center mb-1 opacity-0 group-hover/score:opacity-100 transition-opacity absolute -top-5 left-2 right-0 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[9px] text-zinc-400 z-10 shadow-lg">
                    <span>Lead Score (Perfil Completo)</span>
                    <span className={scoreColor}>{score}%</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden cursor-help" title={`Score de completude do lead: ${score}%`}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%`, backgroundColor: scoreBarColor }}
                    />
                </div>
            </div>

            {/* Footer: Value & Actions */}
            <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800/50 items-center pl-2">
                <div className="flex items-center gap-2">
                    {lead.value > 0 ? (
                        <span className="text-xs font-mono font-medium text-zinc-300">
                            R$ {lead.value.toLocaleString('pt-BR')}
                        </span>
                    ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">
                            {formattedDate}
                        </span>
                    )}
                    {daysInStage !== null && (
                        <span className={`text-[9px] flex items-center gap-0.5 ${isStale ? 'text-amber-500' : 'text-zinc-700'}`}>
                            <Clock className="w-2.5 h-2.5" />{daysInStage}d
                        </span>
                    )}
                </div>

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

// Custom memo comparison
export const LeadCard = React.memo(LeadCardComponent, (prev, next) =>
    prev.lead.id === next.lead.id &&
    prev.lead.stage === next.lead.stage &&
    prev.lead.value === next.lead.value &&
    prev.lead.tagId === next.lead.tagId &&
    prev.lead.ownerId === next.lead.ownerId &&
    prev.lead.name === next.lead.name &&
    prev.lead.productLabel === next.lead.productLabel &&
    prev.isSelected === next.isSelected &&
    prev.isBulkMode === next.isBulkMode &&
    prev.colorStyle?.text === next.colorStyle?.text &&
    prev.eventName === next.eventName &&
    prev.productLabelName === next.productLabelName &&
    prev.productLabelHexColor === next.productLabelHexColor
);
