import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const RouteGuard = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        let active = true;

        // Listener registrado ANTES do getSession para não perder eventos
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active) setSession(session);
        });

        // getSession com finally infalível — loading sempre resolve
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (active) setSession(session);
            })
            .catch(() => { /* sessão inválida — redireciona para /login */ })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const role = session.user?.user_metadata?.role || 'admin';
    const isAcademy = location.pathname.startsWith('/academy');

    // Restrict PASS students to Academy only
    if (role === 'pass_student' && !isAcademy) {
        return <Navigate to="/academy" replace />;
    }

    // Restrict sellers from accessing Academy
    if (role === 'seller' && isAcademy) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default RouteGuard;
