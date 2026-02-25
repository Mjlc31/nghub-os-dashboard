import React from 'react';
import { Lead, LeadStage } from '../../types';
import { LeadCard } from './LeadCard';
import { Skeleton } from '../ui/Skeleton';

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
    onWhatsAppClick: (phone: string) => void;
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
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/60 relative overflow-hidden">
                                {/* Header Skeletons */}
                                <div className="flex gap-2 mb-3">
                                    <Skeleton className="h-4 w-16 !bg-zinc-800 rounded-md" />
                                    <Skeleton className="h-4 w-12 !bg-zinc-800 rounded-md" />
                                </div>
                                {/* Main Skeletons */}
                                <Skeleton className="h-4 w-3/4 mb-2 !rounded-md" />
                                <Skeleton className="h-3 w-1/2 mb-4 !rounded-md" />
                                {/* Footer Skeleton */}
                                <div className="pt-3 border-t border-zinc-800/30">
                                    <Skeleton className="h-3 w-1/3 !rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
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
