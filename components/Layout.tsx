import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  GraduationCap,
  Wallet,
  Settings,
  Bell,
  Search,
  Menu,
  LogOut,
  MessageSquare,
  Command,
  PlusCircle,
  CreditCard,
  UserPlus,
  X,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative border border-transparent ${active
      ? 'bg-zinc-800/50 text-brand-gold border-zinc-700/50 shadow-inner'
      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
      }`}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-brand-gold' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
    <span className="font-medium text-sm tracking-wide">{label}</span>
    {badge && (
      <span className="ml-auto bg-brand-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]">
        {badge}
      </span>
    )}
    {active && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Derive current view from path
  const currentPath = location.pathname.substring(1) || 'dashboard';

  // Fetch real user profile for header
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setUserProfile({
            id: user.id,
            name: data.name || 'Usuário',
            email: user.email,
            avatarUrl: data.avatar_url,
            role: data.role || 'Membro'
          });
        }
      }
    };
    fetchProfile();
  }, [location.pathname]);

  // Command Palette Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCmdKOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavigation = (view: string) => {
    navigate('/' + view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigate
  };

  const commands = [
    { id: 'nav-dash', label: 'Ir para Dashboard', icon: LayoutDashboard, action: () => handleNavigation('dashboard'), type: 'Navigation' },
    { id: 'nav-crm', label: 'Ir para CRM', icon: Users, action: () => handleNavigation('crm'), type: 'Navigation' },
    { id: 'nav-events', label: 'Ir para Eventos', icon: CalendarDays, action: () => handleNavigation('events'), type: 'Navigation' },
    { id: 'nav-fin', label: 'Ir para Financeiro', icon: Wallet, action: () => handleNavigation('finance'), type: 'Navigation' },
    { id: 'act-lead', label: 'Novo Lead', icon: UserPlus, action: () => handleNavigation('crm'), type: 'Action' },
    { id: 'act-event', label: 'Criar Evento', icon: PlusCircle, action: () => handleNavigation('events'), type: 'Action' },
    { id: 'act-trans', label: 'Nova Transação', icon: CreditCard, action: () => handleNavigation('finance'), type: 'Action' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const NavigationContent = () => (
    <>
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3 mb-8 cursor-pointer group" onClick={() => handleNavigation('dashboard')}>
          <div className="w-10 h-10 bg-brand-gold text-black rounded-xl flex items-center justify-center font-serif font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            NG
          </div>
          <div>
            <h1 className="font-serif text-xl text-white tracking-tight leading-none">NGHUB</h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-medium">OS v2.0</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-4">Principal</h3>
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentPath === 'dashboard'} onClick={() => handleNavigation('dashboard')} />
              <SidebarItem icon={Users} label="CRM & Leads" active={currentPath === 'crm'} onClick={() => handleNavigation('crm')} />
              <SidebarItem icon={MessageSquare} label="Disparos" active={currentPath === 'messaging'} onClick={() => handleNavigation('messaging')} />
            </nav>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-4">Operacional</h3>
            <nav className="space-y-1">
              <SidebarItem icon={CalendarDays} label="Eventos" active={currentPath === 'events'} onClick={() => handleNavigation('events')} badge="3" />
              <SidebarItem icon={GraduationCap} label="Academy" active={currentPath === 'academy'} onClick={() => handleNavigation('academy')} />
              <SidebarItem icon={Wallet} label="Financeiro" active={currentPath === 'finance'} onClick={() => handleNavigation('finance')} />
            </nav>
          </div>
        </div>
      </div>

      <div className="mt-auto px-2 pt-6 border-t border-zinc-800/50">
        <SidebarItem icon={Settings} label="Configurações" active={currentPath === 'settings'} onClick={() => handleNavigation('settings')} />
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all mt-1 group">
          <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-brand-dark flex font-sans text-zinc-100 selection:bg-brand-gold/30 selection:text-white">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-brand-border bg-brand-dark fixed h-full z-20 p-6">
        <NavigationContent />
      </aside>

      {/* Mobile Drawer (Sidebar) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Content */}
          <aside className="absolute top-0 left-0 bottom-0 w-[85%] max-w-xs bg-brand-surface border-r border-brand-border p-6 flex flex-col shadow-2xl animate-slide-in-right transform transition-transform">
            <div className="flex justify-end mb-2">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50">
                <X className="w-6 h-6" />
              </button>
            </div>
            <NavigationContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen relative bg-brand-dark">
        {/* Header */}
        <header className="h-20 border-b border-brand-border bg-brand-dark/80 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between transition-all">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-serif font-bold text-brand-gold text-2xl tracking-tight">NG</span>
          </div>

          <div
            className="hidden lg:flex items-center max-w-md w-full relative group cursor-text"
            onClick={() => setIsCmdKOpen(true)}
          >
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-brand-gold transition-colors" />
            <div className="bg-brand-surface/50 border border-brand-border rounded-full pl-10 pr-4 py-2.5 text-sm text-zinc-500 w-full group-hover:border-zinc-700 group-hover:bg-brand-surface transition-all flex justify-between items-center shadow-inner">
              <span>Buscar...</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-500 font-medium bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button className="relative p-2 text-zinc-400 hover:text-white transition-colors group rounded-full hover:bg-zinc-800/50">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-gold rounded-full ring-2 ring-brand-dark animate-pulse" />
            </button>

            <div className="h-8 w-px bg-brand-border hidden md:block" />

            <div
              className="flex items-center gap-3 pl-2 cursor-pointer p-1.5 rounded-xl hover:bg-zinc-800/50 transition-all group"
              onClick={() => handleNavigation('settings')}
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-white leading-tight font-sans">{userProfile?.name || 'Carregando...'}</p>
                <p className="text-[11px] text-zinc-500 group-hover:text-brand-gold transition-colors">{userProfile?.role || '...'}</p>
              </div>
              <div className="w-9 h-9 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-brand-gold/20 transition-all shadow-lg">
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-brand-gold font-bold">{userProfile?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full animate-fade-in pb-24">
          {children}
        </div>
      </main>

      {/* Command Palette Overlay */}
      {isCmdKOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCmdKOpen(false)} />
          <div className="relative w-full max-w-xl bg-brand-surface border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in ring-1 ring-white/10">
            <div className="flex items-center px-4 py-4 border-b border-brand-border">
              <Command className="w-5 h-5 text-brand-gold mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="O que você deseja fazer?"
                className="w-full bg-transparent border-none outline-none text-white text-lg placeholder-zinc-600 font-sans"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">ESC</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              {filteredCommands.length > 0 ? (
                <>
                  <div className="text-[10px] font-bold text-zinc-600 px-3 py-2 uppercase tracking-widest mt-1">Ações Rápidas</div>
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setIsCmdKOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all group"
                    >
                      <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800 group-hover:border-brand-gold/30 transition-colors">
                        <cmd.icon className="w-4 h-4 group-hover:text-brand-gold transition-colors" />
                      </div>
                      <span className="group-hover:translate-x-1 transition-transform">{cmd.label}</span>
                      {cmd.type === 'Action' && <ChevronRight className="w-3 h-3 ml-auto text-zinc-600 group-hover:text-brand-gold" />}
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-sm italic">Nenhum comando encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;