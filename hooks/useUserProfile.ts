import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
    role: string;
    /** Role normalizado para uso interno: 'admin' | 'member' | 'seller' | 'pass_student' | 'pending' */
    normalizedRole: 'admin' | 'member' | 'seller' | 'pass_student' | 'pending';
}

/** Normaliza qualquer variação de role para os valores internos da UI */
export const normalizeRole = (role: string): UserProfile['normalizedRole'] => {
    const r = (role || '').toLowerCase();
    if (r === 'membro' || r === 'member') return 'member';
    if (r === 'pendente' || r === 'pending') return 'pending';
    if (r === 'admin' || r === 'equipe' || r === 'equipe') return 'admin';
    if (r === 'seller' || r === 'vendedor') return 'seller';
    if (r === 'pass_student' || r === 'cliente') return 'pass_student';
    return 'admin'; // fallback seguro
};

export const useUserProfile = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Tenta buscar o role da tabela profiles (fonte de verdade)
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, email, avatar_url, role')
                    .eq('id', user.id)
                    .single();

                const rawRole = profileData?.role
                    || user.user_metadata?.role
                    || 'EQUIPE';

                setUserProfile({
                    email: profileData?.email || user.email || '',
                    name: profileData?.full_name || user.user_metadata?.full_name || 'Usuário',
                    avatar: profileData?.avatar_url || user.user_metadata?.avatar_url,
                    role: user.email === 'nghub@gmail.com' ? 'admin' : rawRole,
                    normalizedRole: user.email === 'nghub@gmail.com' ? 'admin' : normalizeRole(rawRole),
                });
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return { userProfile, loading, refreshProfile: getProfile };
};
