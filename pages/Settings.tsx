import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Shield, 
  Database, 
  Copy, 
  CheckCircle2, 
  Save, 
  Loader2, 
  RefreshCw, 
  Camera, 
  Key,
  Mail,
  Smartphone,
  Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface SettingsProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState<Profile>({
    id: '',
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    avatarUrl: ''
  });

  // Password Update State
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  // System State
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
         console.error('Error fetching profile:', error);
      }

      setProfile({
        id: user.id,
        name: data?.name || user.user_metadata?.full_name || '',
        email: user.email || '',
        company: data?.company || '',
        role: data?.role || 'Membro',
        phone: data?.phone || '',
        avatarUrl: data?.avatar_url || ''
      });
    } catch (error) {
      onNotify('error', 'Erro ao carregar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const updates = {
        id: profile.id,
        name: profile.name,
        company: profile.company,
        phone: profile.phone,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;
      onNotify('success', 'Perfil atualizado com sucesso.');
    } catch (error) {
      onNotify('error', 'Erro ao salvar perfil.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
        return onNotify('error', 'Preencha os campos de senha.');
    }
    if (passwords.new !== passwords.confirm) {
        return onNotify('error', 'As senhas não conferem.');
    }
    if (passwords.new.length < 6) {
        return onNotify('error', 'A senha deve ter no mínimo 6 caracteres.');
    }

    setSaving(true);
    try {
        const { error } = await supabase.auth.updateUser({ password: passwords.new });
        if (error) throw error;
        onNotify('success', 'Senha alterada com sucesso!');
        setPasswords({ new: '', confirm: '' });
    } catch (err: any) {
        onNotify('error', err.message || 'Erro ao alterar senha.');
    } finally {
        setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setSaving(true);
    try {
        // 1. Upload Image
        let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

        // Handle bucket creation if missing (Auto-fix logic)
        if (uploadError && (uploadError.message.includes("Bucket not found") || (uploadError as any).statusCode === '404')) {
            const { error: createError } = await supabase.storage.createBucket('avatars', { public: true });
            if (!createError) {
                const { error: retryError } = await supabase.storage.from('avatars').upload(filePath, file);
                if (retryError) throw retryError;
            } else {
                throw uploadError;
            }
        } else if (uploadError) {
            throw uploadError;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

        // 3. Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({ id: profile.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });

        if (updateError) throw updateError;

        setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
        onNotify('success', 'Foto de perfil atualizada!');

    } catch (error: any) {
        console.error(error);
        onNotify('error', 'Erro ao atualizar foto. Verifique se o bucket "avatars" existe e é público.');
    } finally {
        setSaving(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('Isso irá inserir dados de exemplo nas tabelas. Continuar?')) return;
    setSaving(true);
    try {
        // Seed Events
        await supabase.from('events').insert([
            { title: 'NGHUB Summit 2024', date: new Date(Date.now() + 86400000 * 30).toISOString(), location: 'São Paulo, SP', capacity: 200, price: 299.90, attendees_count: 45, status: 'upcoming', image_url: 'https://images.unsplash.com/photo-1540575467063-178a50935339?w=800&q=80' }
        ]);
        // Seed Lessons
        await supabase.from('lessons').insert([
            { title: 'Gestão de Alta Performance', duration: '55 min', category: 'Gestão', thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', video_url: '#' }
        ]);
        onNotify('success', 'Dados de exemplo inseridos!');
    } catch (err) {
        onNotify('error', 'Erro ao popular banco.');
    } finally {
        setSaving(false);
    }
  };

  const copySql = () => {
    const sql = document.getElementById('sql-schema')?.innerText;
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      onNotify('success', 'SQL copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const sqlSchema = `-- NGHUB OS: SETUP COMPLETO DO BANCO DE DADOS
-- Copie este código e execute no SQL Editor do Supabase

-- 1. Habilitar Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpar triggers antigos (se existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Criar Tabelas
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  name text,
  avatar_url text,
  role text DEFAULT 'Membro',
  company text,
  phone text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  date timestamp with time zone NOT NULL,
  location text,
  capacity integer DEFAULT 100,
  attendees_count integer DEFAULT 0,
  price numeric(10,2) DEFAULT 0.00,
  image_url text,
  status text DEFAULT 'upcoming',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  sector text,
  stage text DEFAULT 'Novo Lead',
  value numeric(10,2) DEFAULT 0.00,
  tag_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  last_contact timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL,
  category text,
  status text DEFAULT 'paid',
  date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  duration text,
  category text,
  thumbnail text,
  video_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  channel text DEFAULT 'whatsapp',
  audience text,
  status text DEFAULT 'draft',
  sent_count integer DEFAULT 0,
  date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Storage Buckets (Inserção segura)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true), ('academy-videos', 'academy-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Simplificadas
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Auth Read Events" ON public.events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Read Leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Read Trans" ON public.transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Read Lessons" ON public.lessons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Read Camp" ON public.campaigns FOR ALL USING (auth.role() = 'authenticated');
-- Storage Policies
CREATE POLICY "Avatar Images are Public" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 6. Trigger para criação automática de perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`;

  if (loading) {
      return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-brand-gold" /></div>;
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all w-full md:w-auto text-left ${
            activeTab === id 
            ? 'bg-zinc-800 text-brand-gold border border-zinc-700 shadow-lg' 
            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
        }`}
    >
        <Icon className={`w-4 h-4 ${activeTab === id ? 'text-brand-gold' : ''}`} /> 
        {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight mb-2">Configurações</h1>
        <p className="text-zinc-400">Personalize sua experiência no NGHUB.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-1 border-r border-zinc-800/50 pr-0 lg:pr-6">
            <TabButton id="profile" label="Meu Perfil" icon={User} />
            <TabButton id="security" label="Segurança" icon={Shield} />
            <div className="h-px bg-zinc-800 my-2 mx-4 lg:mx-0"></div>
            <TabButton id="system" label="Sistema & Banco" icon={Database} />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
            
            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 md:p-8">
                        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8 border-b border-zinc-800/50 pb-8">
                            <div className="relative group">
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border border-zinc-700 p-1 bg-zinc-900">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center relative">
                                        {profile.avatarUrl ? (
                                            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-zinc-700" />
                                        )}
                                        {saving && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={saving}
                                    className="absolute bottom-0 right-0 p-2 bg-brand-gold text-black rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-50 ring-4 ring-[#09090b]"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h2 className="text-xl font-bold text-white mb-1">{profile.name || 'Usuário Sem Nome'}</h2>
                                <p className="text-sm text-zinc-500 mb-4">{profile.email}</p>
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                                    {profile.role}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={profile.name} 
                                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Building className="w-3 h-3" /> Empresa</label>
                                <input 
                                    type="text" 
                                    value={profile.company} 
                                    onChange={(e) => setProfile({...profile, company: e.target.value})}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all text-sm"
                                    placeholder="Sua empresa"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</label>
                                <input 
                                    type="email" 
                                    value={profile.email} 
                                    disabled
                                    className="w-full bg-zinc-950/30 border border-zinc-800/50 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Smartphone className="w-3 h-3" /> Telefone</label>
                                <input 
                                    type="tel" 
                                    value={profile.phone} 
                                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-all text-sm"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <button 
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="bg-brand-gold text-black font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#c5a059] transition-all flex items-center gap-2 disabled:opacity-50 shadow-[0_4px_12px_rgba(212,175,55,0.2)]"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === 'security' && (
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 md:p-8 animate-fade-in">
                    <div className="mb-8 border-b border-zinc-800/50 pb-6">
                        <h2 className="text-xl font-bold text-white mb-1">Segurança</h2>
                        <p className="text-sm text-zinc-500">Mantenha sua conta protegida.</p>
                    </div>

                    <div className="max-w-md space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nova Senha</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input 
                                    type="password" 
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:border-brand-gold focus:outline-none transition-all text-sm"
                                    placeholder="••••••"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confirmar Senha</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:border-brand-gold focus:outline-none transition-all text-sm"
                                    placeholder="••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleUpdatePassword}
                                disabled={saving}
                                className="w-full bg-zinc-800 text-zinc-200 hover:text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Atualizar Senha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SYSTEM */}
            {activeTab === 'system' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Instalação do Banco de Dados</h3>
                                <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
                                    Use este script SQL no Supabase para criar tabelas, triggers e policies. Essencial para o primeiro setup.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button 
                                    onClick={handleSeedDatabase}
                                    disabled={saving}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-brand-gold/50 rounded-lg text-xs font-bold text-zinc-300 hover:text-brand-gold transition-all"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Popular (Seed)
                                </button>
                                <button 
                                    onClick={copySql}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg text-xs font-bold hover:bg-[#c5a059] transition-all"
                                >
                                    {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copiado' : 'Copiar SQL'}
                                </button>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute top-0 right-0 px-4 py-2 bg-zinc-900 rounded-bl-lg border-l border-b border-zinc-800 text-[10px] text-zinc-500 font-mono tracking-wider">
                                POSTGRESQL
                            </div>
                            <pre id="sql-schema" className="bg-[#050505] p-6 rounded-lg border border-zinc-800 text-[10px] md:text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed max-h-[400px] custom-scrollbar selection:bg-brand-gold/30 selection:text-white shadow-inner">
                                {sqlSchema}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default Settings;