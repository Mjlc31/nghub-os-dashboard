import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    trend?: number;
    colorClass: string;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    colorClass,
}) => (
    <div className="bg-brand-surface border border-brand-border p-6 rounded-xl relative overflow-hidden group hover:border-brand-gold/20 transition-all duration-300">
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-2.5 rounded-lg border border-white/5 ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend && (
                <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${trend > 0
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-red-500/20 bg-red-500/10 text-red-400'
                        }`}
                >
                    {trend > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">
                {title}
            </h3>
            <div className="text-2xl md:text-3xl font-serif font-bold text-white mb-1">
                {value}
            </div>
            <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
        </div>
        {/* Background decoration */}
        <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
            <Icon className="w-32 h-32" />
        </div>
    </div>
);
