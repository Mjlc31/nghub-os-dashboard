import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
    item: {
        icon: LucideIcon;
        label: string;
        path: string;
    };
    onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ item, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
        <Link
            to={item.path}
            onClick={onClick}
            className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
        ${isActive
                    ? 'bg-brand-gold/10 text-brand-gold font-bold shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-brand-gold/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'}
      `}
        >
            <div className={`
        absolute inset-0 bg-gradient-to-r from-brand-gold/0 via-brand-gold/5 to-brand-gold/0 translate-x-[-100%] transition-transform duration-700
        ${isActive ? 'translate-x-[100%]' : 'group-hover:translate-x-[100%]'}
      `}></div>

            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="relative z-10">{item.label}</span>

            {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brand-gold shadow-[0_0_10px_#D4AF37]"></div>
            )}
        </Link>
    );
};
