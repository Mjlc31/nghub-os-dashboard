import React from 'react';
import { DollarSign, Users, Activity } from 'lucide-react';

interface ActivityItem {
    type: 'finance' | 'lead';
    title: string;
    value: string;
    date: string;
    status: 'success' | 'danger' | 'neutral';
}

interface RecentActivityProps {
    activities: ActivityItem[];
}

const formatRelativeDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMin / 60);
        const diffD = Math.floor(diffH / 24);

        if (diffMin < 1) return 'agora mesmo';
        if (diffMin < 60) return `há ${diffMin}min`;
        if (diffH < 24) return `há ${diffH}h`;
        if (diffD === 1) return 'ontem';
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    } catch {
        return dateStr;
    }
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-bold text-white text-lg">Atividade Recente</h3>
                <div className="w-6 h-6 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="flex-1 space-y-0">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-600 gap-2">
                        <Activity className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Nenhuma atividade recente.</p>
                    </div>
                ) : (
                    activities.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-3 border-b border-brand-border/50 last:border-0 hover:bg-zinc-800/20 px-2 rounded-lg transition-colors -mx-2 group"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${item.type === 'finance'
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                        : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                        }`}
                                >
                                    {item.type === 'finance' ? (
                                        <DollarSign className="w-4 h-4" />
                                    ) : (
                                        <Users className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white group-hover:text-brand-gold transition-colors truncate max-w-[150px]">{item.title}</p>
                                    <p className="text-[10px] text-zinc-500">
                                        {formatRelativeDate(item.date)}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`text-xs font-bold font-mono shrink-0 ${item.status === 'success'
                                    ? 'text-emerald-400'
                                    : item.status === 'danger'
                                        ? 'text-red-400'
                                        : 'text-zinc-400'
                                    }`}
                            >
                                {item.value}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
