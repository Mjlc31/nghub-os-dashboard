import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle, ChevronLeft, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onLogin: () => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onNotify }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot' | 'signup'>('login');

  // ... state declarations ...

  // Matrix Money Effect
  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    // ... canvas logic ...
  }, [navigate]);

  // ... canvas rendering ...

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      onNotify('error', 'Por favor, preencha suas credenciais.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setLoading(false);
      onNotify('success', 'Acesso autorizado.');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setLoading(false);
      onNotify('error', error.message || 'Erro ao autenticar.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    // ... validation ...

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      setLoading(false);

      if (data.session) {
        onNotify('success', 'Cadastro realizado e login efetuado!');
        navigate('/dashboard', { replace: true });
      } else {
        onNotify('success', 'Cadastro realizado! Verifique seu email para ativar a conta.');
        setView('login');
      }

      // ... reset form ...

      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      setLoading(false);
      onNotify('error', error.message || 'Erro ao criar conta.');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      onNotify('error', 'Digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      setLoading(false);
      onNotify('success', `Link de recuperação enviado para ${email}`);
      setView('login');
    } catch (error: any) {
      setLoading(false);
      onNotify('error', error.message || 'Erro ao enviar email de recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Matrix Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
      />

      {/* Radial Gradient Overlay for focus */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-brand-dark/80 to-brand-dark pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-8xl text-brand-gold mb-2 tracking-tighter drop-shadow-2xl" style={{ fontVariantLigatures: 'common-ligatures' }}>
            NG
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-medium border-b border-brand-gold/30 inline-block pb-1">Operating System</p>
        </div>

        {/* Card */}
        <div className="bg-brand-surface/80 backdrop-blur-xl border border-brand-gold/20 p-8 md:p-10 rounded-2xl shadow-2xl relative group">
          {/* Subtle gold glow border effect */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 pointer-events-none"></div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-tight">Login</h2>
                <p className="text-zinc-500 text-sm">Identifique-se para acessar o painel.</p>
              </div>

              <div className="space-y-5">
                <div className="group">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 group-focus-within:text-brand-gold transition-colors">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg py-3.5 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700 shadow-inner"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold group-focus-within:text-brand-gold transition-colors">Senha</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg py-3.5 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700 shadow-inner"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="text-right mt-2">
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[10px] uppercase tracking-wide text-zinc-600 hover:text-brand-gold transition-colors font-semibold"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gold text-black font-bold py-4 rounded-lg hover:bg-[#E5C158] transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.3)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="tracking-wide">ENTRAR</span>}
              </button>

              <div className="text-center border-t border-brand-border pt-6 mt-6">
                <p className="text-xs text-zinc-500 mb-3">Ainda não possui conta?</p>
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="text-xs font-bold uppercase tracking-widest text-brand-gold hover:text-white transition-colors border border-brand-gold/30 hover:border-brand-gold px-4 py-2 rounded-full hover:bg-brand-gold/10"
                >
                  Solicitar Acesso
                </button>
              </div>
            </form>
          ) : view === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-5 animate-fade-in">
              <button
                type="button"
                onClick={() => setView('login')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-brand-gold mb-2 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Voltar
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Novo Cadastro</h2>
                <p className="text-zinc-500 text-sm">Crie sua conta para acessar a plataforma.</p>
              </div>

              <div className="group">
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg py-3 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg py-3 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="group">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg py-3 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700"
                      placeholder="••••••"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg py-3 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700"
                      placeholder="••••••"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gold text-black font-bold py-3.5 rounded-lg hover:bg-[#E5C158] transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_4px_20px_rgba(212,175,55,0.15)] disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="tracking-wide text-xs">CADASTRAR</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecover} className="space-y-6 animate-fade-in">
              <button
                type="button"
                onClick={() => setView('login')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-brand-gold mb-6 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Voltar
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Recuperar Acesso</h2>
                <p className="text-zinc-500 text-sm">Protocolo de segurança para redefinição.</p>
              </div>

              <div className="group">
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 group-focus-within:text-brand-gold transition-colors">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-lg py-3.5 pl-10 pr-4 text-zinc-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all placeholder-zinc-700 shadow-inner"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-800 border border-zinc-700 text-white font-bold py-3.5 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="tracking-wide text-xs">ENVIAR LINK SEGURO</span>}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4">NGHUB Exclusive Member Access</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-[10px] text-zinc-700 hover:text-brand-gold transition-colors">Privacidade</a>
            <div className="w-px h-3 bg-zinc-800"></div>
            <a href="#" className="text-[10px] text-zinc-700 hover:text-brand-gold transition-colors">Termos</a>
            <div className="w-px h-3 bg-zinc-800"></div>
            <a href="#" className="text-[10px] text-zinc-700 hover:text-brand-gold transition-colors">Suporte</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;