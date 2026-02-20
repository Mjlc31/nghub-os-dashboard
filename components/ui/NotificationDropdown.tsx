import React, { useRef, useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { useNotifications, Notification } from '../../contexts/NotificationContext';

export const NotificationDropdown: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Agora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
        return `${Math.floor(seconds / 86400)}d atrás`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-zinc-400 hover:text-brand-gold transition-colors block focus:outline-none"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050505] animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#09090b] border border-zinc-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-fade-in origin-top-right">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm">
                        <h3 className="font-serif font-bold text-white text-sm">Notificações</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-[10px] text-brand-gold hover:text-white uppercase tracking-wider font-bold transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Marcar lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-zinc-500 text-xs">Carregando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-500">
                                <Bell className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-xs">Nenhuma notificação recente.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 hover:bg-zinc-900/50 transition-colors relative group ${!notif.read ? 'bg-brand-gold/5' : ''}`}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-zinc-800 ${!notif.read ? 'bg-zinc-900' : 'bg-transparent'}`}>
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className={`text-sm font-medium leading-none ${!notif.read ? 'text-white' : 'text-zinc-400'}`}>{notif.title}</h4>
                                                    <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{getTimeAgo(notif.created_at)}</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{notif.message}</p>
                                            </div>
                                        </div>
                                        {!notif.read && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-2 border-t border-zinc-800 bg-zinc-900/30 text-center">
                        <button className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-widest font-bold">Ver todas</button>
                    </div>
                </div>
            )}
        </div>
    );
};
