import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface SalesFunnelProps {
    data: any[];
    totalLeads: number;
}

export const SalesFunnel: React.FC<SalesFunnelProps> = ({ data, totalLeads }) => {
    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col">
            <div className="mb-4">
                <h3 className="font-serif font-bold text-white text-lg">Funil de Vendas</h3>
                <p className="text-xs text-zinc-500">Distribuição atual de leads</p>
            </div>
            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: -20 }}>
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
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === 3 ? '#D4AF37' : '#27272a'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border flex justify-between items-center text-xs">
                <span className="text-zinc-500">Total no Pipeline</span>
                <span className="text-white font-bold">{totalLeads}</span>
            </div>
        </div>
    );
};
