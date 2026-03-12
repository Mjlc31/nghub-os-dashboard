import React, { useState, useEffect } from 'react';
import {
    Puzzle,
    Plus,
    Search,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    MoreVertical,
    Zap,
    ShieldCheck,
    RefreshCw,
    Trash2,
    Settings2,
    Lock,
    Database
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';

interface IntegrationProvider {
    id: string;
    name: string;
    description: string;
    icon: string; // URL or name for icon handling
    category: 'payment' | 'form' | 'crm' | 'automation';
    status: 'available' | 'coming_soon';
}

interface WebhookConfig {
    id: string;
    name: string;
    provider: string;
    slug: string;
    secret_token: string;
    target_module: string;
    is_active: boolean;
    created_at: string;
}

interface WebhookLog {
    id: string;
    webhook_id: string;
    status: 'success' | 'error';
    created_at: string;
    payload: any;
    error_message?: string;
}

const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
    { id: 'hotmart', name: 'Hotmart', description: 'Sincronize vendas e alunos automaticamente.', icon: 'https://seeklogo.com/images/H/hotmart-logo-8D3A3B4A2D-seeklogo.com.png', category: 'payment', status: 'available' },
    { id: 'stripe', name: 'Stripe', description: 'Pagamentos globais e assinaturas em real-time.', icon: 'https://seeklogo.com/images/S/stripe-logo-4CE7BC6293-seeklogo.com.png', category: 'payment', status: 'available' },
    { id: 'typeform', name: 'Typeform', description: 'Converta respostas de formulários em leads.', icon: 'https://seeklogo.com/images/T/typeform-logo-1B6F684C1C-seeklogo.com.png', category: 'form', status: 'available' },
    { id: 'evolution', name: 'Evolution API', description: 'Automação de WhatsApp e notificações.', icon: 'https://evolution-api.com/logo.png', category: 'automation', status: 'available' },
    { id: 'kiwify', name: 'Kiwify', description: 'Gestão de infoprodutos e checkout.', icon: 'https://kiwify.com.br/favicon.ico', category: 'payment', status: 'coming_soon' },
    { id: 'eduzz', name: 'Eduzz', description: 'Ecossistema completo para produtores.', icon: 'https://eduzz.com/favicon.ico', category: 'payment', status: 'coming_soon' },
];

const Integrations: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'configured' | 'logs'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [newWebhook, setNewWebhook] = useState({
        name: '',
        provider: 'hotmart',
        target_module: 'crm'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: configs, error: configError } = await supabase
                .from('webhook_configs')
                .select('*')
                .order('created_at', { ascending: false });

            if (configError) throw configError;
            setWebhooks(configs || []);

            const { data: logData, error: logError } = await supabase
                .from('webhook_logs')
                .select(`
          *,
          webhook_configs (name)
        `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (logError) throw logError;
            setLogs(logData || []);

        } catch (err) {
            console.error('Error fetching integration data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        try {
            const slug = `${newWebhook.provider}-${Math.random().toString(36).substring(2, 8)}`;
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('webhook_configs').insert({
                ...newWebhook,
                slug,
                owner_id: user?.id
            });

            if (error) throw error;

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Error creating webhook:', err);
        }
    };

    const copyToClipboard = (text: string) => {
        const url = `${window.location.origin}/api/webhook/${text}`;
        navigator.clipboard.writeText(url);
        // Add toast notification later
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-brand-gold/10 rounded-lg">
                            <Zap className="w-5 h-5 text-brand-gold" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">Integrações</h1>
                    </div>
                    <p className="text-sm text-zinc-400">Conecte o NGHUB OS com suas ferramentas favoritas.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-white/10 hover:bg-white/5"
                        onClick={fetchData}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-brand-gold hover:bg-brand-gold/90 text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Automação
                    </Button>
                </div>
            </div>

            {/* Search and Tabs */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Disponíveis
                    </button>
                    <button
                        onClick={() => setActiveTab('configured')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'configured' ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Ativas ({webhooks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Logs de Execução
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar integração..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-gold/50 transition-all placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {activeTab === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {INTEGRATION_PROVIDERS
                        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((provider) => (
                            <div
                                key={provider.id}
                                className="group relative bg-[#121216] border border-white/5 rounded-2xl p-6 hover:border-brand-gold/30 transition-all duration-500 overflow-hidden"
                            >
                                {/* Background Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center p-3 border border-white/10 group-hover:border-brand-gold/20 transition-colors">
                                        <img src={provider.icon} alt={provider.name} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                    {provider.status === 'coming_soon' && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">Em Breve</span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-gold transition-colors">{provider.name}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                    {provider.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider capitalize">{provider.category}</span>
                                    </div>
                                    {provider.status === 'available' ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-white/10 hover:border-brand-gold group-hover:bg-brand-gold group-hover:text-black transition-all"
                                            onClick={() => {
                                                setNewWebhook({ ...newWebhook, provider: provider.id });
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            Conectar
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled className="opacity-30">
                                            Saber Mais
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {activeTab === 'configured' && (
                <div className="bg-[#121216] border border-white/5 rounded-2xl overflow-hidden">
                    {webhooks.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome / Fluxo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Provedor</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Destino</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">URL do Webhook</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {webhooks.map((webhook) => (
                                        <tr key={webhook.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${webhook.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-white">{webhook.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-zinc-400 capitalize">{webhook.provider}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-zinc-500">
                                                    <Database className="w-3 h-3" />
                                                    <span className="text-sm font-medium uppercase tracking-tighter">{webhook.target_module}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-black/40 px-3 py-1 rounded-lg text-xs text-brand-gold border border-brand-gold/20 font-mono">
                                                        {webhook.slug.substring(0, 15)}...
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(webhook.slug)}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 hover:bg-white/5 rounded-lg text-red-500/50 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <Puzzle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <h3 className="text-white font-bold mb-2">Nenhuma automação ativa</h3>
                            <p className="text-zinc-500 text-sm mb-6">Comece conectando um provedor na aba "Disponíveis".</p>
                            <Button variant="outline" onClick={() => setActiveTab('all')}>Explorar Catálogo</Button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-[#121216] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Automação</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Horário</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Payload</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            {log.status === 'success' ? (
                                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    Sucesso
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase">
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                    Falha
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">
                                            {(log as any).webhook_configs?.name || 'Desconhecido'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 text-sm">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[200px] truncate font-mono text-[10px] text-zinc-500">
                                                {JSON.stringify(log.payload)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-zinc-500 hover:text-white transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Webhook Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Configurar Nova Automação"
            >
                <div className="space-y-6">
                    <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xl flex gap-4">
                        <div className="p-2 bg-brand-gold/10 rounded-lg h-fit">
                            <ShieldCheck className="w-5 h-5 text-brand-gold" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-brand-gold mb-1">Dica de Segurança</p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                Cada automação gera uma URL única. Nunca compartilhe essa URL publicamente para evitar envios não autorizados.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Nome da Integração"
                            placeholder="Ex: Hotmart Leads NG.BASE"
                            value={newWebhook.name}
                            onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                        />

                        <Select
                            label="Provedor"
                            value={newWebhook.provider}
                            onChange={(e) => setNewWebhook({ ...newWebhook, provider: e.target.value })}
                            options={INTEGRATION_PROVIDERS.filter(p => p.status === 'available').map(p => ({ label: p.name, value: p.id }))}
                        />

                        <Select
                            label="Módulo de Destino"
                            value={newWebhook.target_module}
                            onChange={(e) => setNewWebhook({ ...newWebhook, target_module: e.target.value })}
                            options={[
                                { label: 'CRM (Criar Leads)', value: 'crm' },
                                { label: 'Financeiro (Registrar Transação)', value: 'finance' }
                            ]}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 border-white/10"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-brand-gold text-black font-bold"
                            onClick={handleCreateWebhook}
                            disabled={!newWebhook.name}
                        >
                            Gerar Webhook
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Integrations;
