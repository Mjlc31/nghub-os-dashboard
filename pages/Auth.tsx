import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle, ChevronLeft, Loader2, User, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface AuthProps {
  onLogin: () => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onNotify }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot' | 'signup'>('login');

  // State Declarations
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Matrix Money Effect
  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = '$$$€€€£££¥¥¥0101NGHUB';
    const fontSize = 14;
    const columns = canvas.width / fontSize;

    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#D4AF37'; // Brand Gold
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);

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
    e.preventDefault();
    if (!email || !password || !name) {
      onNotify('error', 'Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      onNotify('error', 'As senhas não coincidem.');
      return;
    }

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
                <Input
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  icon={<Mail className="w-4 h-4" />}
                />

                <div>
                  <Input
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                  />
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

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                ENTRAR
              </Button>

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

              <Input
                label="Nome Completo"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                icon={<User className="w-4 h-4" />}
              />

              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                icon={<Mail className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  icon={<Lock className="w-4 h-4" />}
                />

                <Input
                  label="Confirmar Senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  icon={<Lock className="w-4 h-4" />}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={loading}
              >
                CADASTRAR
              </Button>
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

              <Input
                label="E-mail Cadastrado"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                icon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="secondary"
                className="w-full mt-4"
                isLoading={loading}
              >
                ENVIAR LINK SEGURO
              </Button>
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