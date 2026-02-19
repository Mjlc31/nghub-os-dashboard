import React from 'react';
import { DollarSign, Users } from 'lucide-react';

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

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <h3 className="font-serif font-bold text-white text-lg mb-4">
                Atividade Recente
            </h3>
            <div className="space-y-0">
                {activities.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Nenhuma atividade.</p>
                ) : (
                    activities.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-3 border-b border-brand-border/50 last:border-0 hover:bg-zinc-800/20 px-2 rounded-lg transition-colors -mx-2"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.type === 'finance'
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
                                <div>
                                    <p className="text-sm font-medium text-white">{item.title}</p>
                                    <p className="text-[10px] text-zinc-500">
                                        {new Date(item.date).toLocaleDateString('pt-BR', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`text-xs font-bold ${item.status === 'success'
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
