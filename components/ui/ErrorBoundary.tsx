import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught component error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans text-zinc-200">
                    <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0"></div>

                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                            <AlertTriangle className="w-8 h-8 text-red-500 drop-shadow-md" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">Oops, algo deu errado</h1>
                        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                            Encontramos um erro inesperado na interface. Nossa equipe técnica provavelmente já foi notificada. Recarregue a página para tentar novamente.
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-brand-gold text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-500 transition-colors active:scale-[0.98] shadow-lg shadow-brand-gold/20"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recarregar Plataforma
                        </button>

                        {/* Somente exibe o texto técnico se estivermos no localhost (dev) para não assustar o usuário final */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mt-8 text-left bg-black/60 p-4 rounded-xl border border-zinc-800 overflow-auto max-h-40 custom-scrollbar">
                                <p className="text-red-400/80 font-mono text-[10px] whitespace-pre-wrap break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
