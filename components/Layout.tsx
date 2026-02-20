import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  GraduationCap,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronRight
} from 'lucide-react';
import { NotificationDropdown } from './ui/NotificationDropdown';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SidebarItem } from './ui/SidebarItem';
import { useUserProfile } from '../hooks/useUserProfile';

// Sidebar Navigation Items
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
  { icon: Users, label: 'CRM & Leads', path: '/crm' },
  { icon: Calendar, label: 'Eventos', path: '/events' },
  { icon: GraduationCap, label: 'Academy', path: '/academy' },
  { icon: DollarSign, label: 'Financeiro', path: '/finance' },
  { icon: MessageSquare, label: 'Mensagens', path: '/messaging' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userProfile, loading } = useUserProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };



  return (
    <div className="min-h-screen bg-brand-dark flex font-sans text-zinc-100 selection:bg-brand-gold/30 selection:text-white overflow-hidden">

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#08080a] border-r border-white/5 flex flex-col transition-transform duration-300 ease-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="h-24 flex items-center px-8 border-b border-white/5 relative">
          <div className="flex flex-col">
            <h1 className="font-serif text-3xl text-brand-gold tracking-tighter" style={{ fontVariantLigatures: 'common-ligatures' }}>
              NG
            </h1>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-medium">Operating System</span>
          </div>

          {/* Shine Effect */}
          <div className="absolute top-0 right-0 w-32 h-24 bg-brand-gold/5 blur-3xl rounded-full pointer-events-none"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Menu Principal</p>
          {NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.path}
              item={item}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/30">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-[#8a7035] flex items-center justify-center text-black font-bold shadow-lg">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{userProfile?.name || 'Carregando...'}</p>
              <p className="text-xs text-zinc-500 truncate">{userProfile?.email || '...'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-brand-dark">

        {/* Header (Mobile & Desktop) */}
        <header className="h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 lg:px-12">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumb / Title Placeholder */}
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-500">
            <span className="text-zinc-600">NGHUB</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-zinc-200 capitalize">{location.pathname.replace('/', '') || 'Dashboard'}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-zinc-900/50 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-gold/50 focus:bg-zinc-900 transition-all w-64 text-zinc-300 placeholder-zinc-600"
              />
            </div>

            <NotificationDropdown />
          </div>
        </header>

        {/* View Content (Outlet) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-24 relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-0 w-full h-96 bg-brand-gold/5 blur-[100px] pointer-events-none rounded-full translate-y-[-50%]"></div>

          <div className="relative z-10 max-w-[1920px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>

      </main>
    </div>
  );
};

export default Layout;