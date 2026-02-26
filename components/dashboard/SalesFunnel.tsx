import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Users } from 'lucide-react';

const STAGE_COLORS = ['#52525b', '#3b82f6', '#a78bfa', '#D4AF37', '#10b981', '#ef4444'];

interface FunnelDataPoint {
    name: string;
    value: number;
}

interface SalesFunnelProps {
    data: FunnelDataPoint[];
    totalLeads: number;
}

interface TooltipPayloadItem {
    value?: number;
    payload?: FunnelDataPoint;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-[11px] text-zinc-400 mb-0.5">{payload[0]?.payload?.name}</p>
                <p className="text-sm font-bold text-white font-mono">{payload[0]?.value} leads</p>
            </div>
        );
    }
    return null;
};

const SalesFunnelComponent: React.FC<SalesFunnelProps> = ({ data, totalLeads }) => {
    const hasData = data.some(d => d.value > 0);

    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col">
            <div className="mb-4">
                <h3 className="font-serif font-bold text-white text-lg">Funil de Vendas</h3>
                <p className="text-xs text-zinc-500">Distribuição atual de leads</p>
            </div>

            {!hasData ? (
                <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <Users className="w-8 h-8 opacity-30" />
                    <p className="text-xs">Nenhum lead no pipeline</p>
                </div>
            ) : (
                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: -20, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#a1a1aa"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                width={100}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    style={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                                />
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                                        fillOpacity={0.85}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-brand-border flex justify-between items-center text-xs">
                <span className="text-zinc-500">Total no Pipeline</span>
                <span className="text-white font-bold font-mono">{totalLeads}</span>
            </div>
        </div>
    );
};

export const SalesFunnel = memo(SalesFunnelComponent);
