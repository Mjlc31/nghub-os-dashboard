import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
}

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
                setUserProfile({
                    email: user.email || '',
                    name: user.user_metadata?.full_name || 'Usuário',
                    avatar: user.user_metadata?.avatar_url
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
