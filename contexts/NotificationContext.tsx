import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
}

interface NotificationContextData {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    loading: boolean;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAvailable, setIsAvailable] = useState(true);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to realtime changes
        const subscription = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
                const newNotif = payload.new as Notification;
                setNotifications(prev => [newNotif, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // Tabela pode não existir em instâncias sem migração — falha silenciosa
            if (error) {
                if ((error as any).code === '42P01' || error.message?.includes('does not exist')) {
                    setIsAvailable(false);
                }
                return;
            }
            setNotifications(data || []);
        } catch (error) {
            console.warn('Notifications table unavailable:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNotification = async (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        if (!isAvailable) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('notifications')
                .insert([{ user_id: user.id, title, message, type, read: false }])
                .select()
                .single();
        } catch (error) {
            console.warn('Error adding notification:', error);
        }
    };

    const markAsRead = async (id: string) => {
        if (!isAvailable) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.warn('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!isAvailable) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.warn('Error marking all notifications as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, loading }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
