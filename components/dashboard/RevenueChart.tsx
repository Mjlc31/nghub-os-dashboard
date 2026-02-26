import React, { memo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartDataPoint {
    name: string;
    value: number;
}

interface RevenueChartProps {
    data: ChartDataPoint[];
}

interface TooltipPayloadItem {
    value?: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 shadow-xl">
                <p className="text-[11px] text-zinc-500 mb-1 uppercase tracking-wider">{label}</p>
                <p className="text-base font-bold text-brand-gold font-mono">
                    R$ {Number(payload[0]?.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
            </div>
        );
    }
    return null;
};

const formatYAxis = (value: number) => {
    if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
    return `R$${value}`;
};

const RevenueChartComponent: React.FC<RevenueChartProps> = ({ data }) => {
    const avg = data.length > 0
        ? data.reduce((s, d) => s + (d.value || 0), 0) / data.length
        : 0;

    return (
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-serif font-bold text-white text-lg">Fluxo Financeiro</h3>
                    <p className="text-xs text-zinc-500">
                        Movimentação dos últimos lançamentos
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Entradas</span>
                </div>
            </div>
            <div className="flex-1 w-full h-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ left: 0, right: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#27272a"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            stroke="#3f3f46"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            tick={{ fill: '#71717a' }}
                        />
                        <YAxis
                            stroke="#3f3f46"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxis}
                            tick={{ fill: '#71717a' }}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {avg > 0 && (
                            <ReferenceLine
                                y={avg}
                                stroke="#D4AF37"
                                strokeDasharray="4 4"
                                strokeOpacity={0.4}
                                label={{
                                    value: 'Média',
                                    fill: '#a16207',
                                    fontSize: 10,
                                    position: 'right',
                                }}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#D4AF37"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            dot={{ r: 3, fill: '#D4AF37', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#D4AF37', stroke: '#09090b', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const RevenueChart = memo(RevenueChartComponent);
