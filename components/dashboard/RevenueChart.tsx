import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { MoreHorizontal } from 'lucide-react';

interface RevenueChartProps {
    data: any[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    return (
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-serif font-bold text-white text-lg">Fluxo Financeiro</h3>
                    <p className="text-xs text-zinc-500">
                        Movimentação dos últimos 7 lançamentos
                    </p>
                </div>
                <button className="text-zinc-500 hover:text-white transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 w-full h-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
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
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `R$${val}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#09090b',
                                borderColor: '#27272a',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#D4AF37"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
