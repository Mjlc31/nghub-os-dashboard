import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeRole } from '../hooks/useUserProfile';

// Rotas sensíveis que membros NG não podem acessar
const SENSITIVE_ROUTES = ['/crm', '/finance', '/messaging', '/dashboard', '/integrations', '/tasks'];

const RouteGuard = () => {
    const [session, setSession] = useState<any>(null);
    const [profileRole, setProfileRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        let active = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (active) {
                setSession(newSession);
                // Se sessão mudou, recarrega o role do banco
                if (newSession?.user?.id) {
                    supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', newSession.user.id)
                        .single()
                        .then(({ data }) => {
                            if (active) setProfileRole(data?.role ?? null);
                        });
                } else {
                    if (active) setProfileRole(null);
                }
            }
        });

        supabase.auth.getSession()
            .then(async ({ data: { session } }) => {
                if (!active) return;
                setSession(session);
                if (session?.user?.id) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    if (active) setProfileRole(data?.role ?? null);
                }
            })
            .catch(() => { /* sessão inválida */ })
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
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold" />
                    <span className="text-xs text-zinc-600 uppercase tracking-widest">Autenticando...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role vem da tabela profiles (fonte de verdade) com fallback para user_metadata
    const rawRole = profileRole || session.user?.user_metadata?.role || 'EQUIPE';
    const role = session.user?.email === 'nghub@gmail.com' ? 'admin' : normalizeRole(rawRole);

    const isAcademy = location.pathname.startsWith('/academy');
    const isMeeting = location.pathname.startsWith('/meeting');
    const isSettings = location.pathname.startsWith('/settings');
    const isSensitive = SENSITIVE_ROUTES.some(r => location.pathname.startsWith(r));

    // Fluxo de Aprovação: se a conta for pending, mostra tela de bloqueio
    if (role === 'pending') {
        return (
            <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-6">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Conta em Análise</h1>
                <p className="text-zinc-400 max-w-sm mb-8">
                    Seu cadastro foi recebido. Aguarde até que a diretoria autorize o seu acesso ao sistema.
                </p>
                <button
                    onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                    className="px-6 py-2 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-colors"
                >
                    Sair
                </button>
            </div>
        );
    }

    // Membros NG: apenas Reunião + Academy + Configurações (Perfil)
    if (role === 'member') {
        if (isSensitive || (!isAcademy && !isMeeting && !isSettings)) {
            return <Navigate to="/meeting" replace />;
        }
    }

    // Alunos PASS: apenas Academy + Configurações
    if (role === 'pass_student' && !isAcademy && !isSettings) {
        return <Navigate to="/academy" replace />;
    }

    // Sellers: sem academy, sem meeting
    if (role === 'seller' && (isAcademy || isMeeting)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default RouteGuard;
