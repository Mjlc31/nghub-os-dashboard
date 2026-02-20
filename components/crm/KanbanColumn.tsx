import React from 'react';
import { Loader2 } from 'lucide-react';
import { Lead, LeadStage } from '../../types';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
    stage: LeadStage;
    title: string;
    leads: Lead[];
    totalValue: number;
    loading: boolean;
    onDrop: (e: React.DragEvent, stage: LeadStage) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onLeadClick: (lead: Lead) => void;
    // Helper functions passed down for presentation logic
    getTagStyle: (tagId?: string) => { bg: string; border: string; text: string } | null;
    getEventName: (id?: string) => string | undefined;
    isBulkMode?: boolean;
    selectedLeadIds?: string[];
    onToggleSelect?: (id: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
    stage,
    title,
    leads,
    totalValue,
    loading,
    onDrop,
    onDragStart,
    onLeadClick,
    onWhatsAppClick,
    getTagStyle,
    getEventName,
    isBulkMode,
    selectedLeadIds,
    onToggleSelect,
}) => {
    return (
        <div
            className="flex-1 min-w-[280px] bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, stage)}
        >
            {/* Column Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40 rounded-t-2xl">
                <div>
                    <span className="text-sm font-bold text-zinc-200 uppercase tracking-wide block">
                        {title}
                    </span>
                    {totalValue > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                            R$ {totalValue.toLocaleString('pt-BR', { notation: 'compact' })}
                        </span>
                    )}
                </div>
                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-700">
                    {leads.length}
                </span>
            </div>

            {/* Cards List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {loading && leads.length === 0 ? (
                    <Loader2 className="animate-spin mx-auto text-brand-gold mt-4" />
                ) : (
                    leads.map((lead) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            colorStyle={getTagStyle(lead.tagId)}
                            eventName={getEventName(lead.tagId)}
                            onDragStart={onDragStart}
                            onClick={onLeadClick}
                            onWhatsAppClick={onWhatsAppClick}
                            isBulkMode={isBulkMode}
                            isSelected={selectedLeadIds?.includes(lead.id)}
                            onToggleSelect={onToggleSelect}
                        />
                    ))
                )}
                {!loading && leads.length === 0 && (
                    <div className="text-center py-8 opacity-30">
                        <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-2"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
