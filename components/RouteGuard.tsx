import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const RouteGuard = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
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
