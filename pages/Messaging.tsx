import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, CalendarClock, Plus, Filter, Smartphone, Mail, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Campaign } from '../types';
import { supabase } from '../lib/supabase';

interface MessagingProps {
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

const Messaging: React.FC<MessagingProps> = ({ onNotify }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    channel: 'whatsapp',
    audience: 'Todos os Membros',
    message: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedCampaigns: Campaign[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        audience: c.audience,
        status: c.status,
        sentCount: c.sent_count,
        date: c.date || c.created_at
      }));

      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      onNotify('error', 'Nome da campanha é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase.from('campaigns').insert([
        {
          name: newCampaign.name,
          channel: newCampaign.channel,
          audience: newCampaign.audience,
          status: 'scheduled',
          sent_count: 0,
          date: new Date().toISOString()
        }
      ]).select();

      if (error) throw error;

      if (data) {
        onNotify('success', 'Campanha agendada com sucesso!');
        setIsModalOpen(false);
        setNewCampaign({ name: '', channel: 'whatsapp', audience: 'Todos os Membros', message: '' });
        fetchCampaigns();
      }
    } catch (error) {
      onNotify('error', 'Erro ao criar campanha');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">Disparos & Campanhas</h1>
          <p className="text-zinc-400">Engaje sua comunidade via WhatsApp e Email.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-gold text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-[#c5a059] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-gold" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 bg-brand-surface border border-brand-border rounded-xl">Nenhuma campanha encontrada.</div>
          ) : (
            campaigns.map((camp) => (
              <div key={camp.id} className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between hover:border-zinc-600 transition-all group">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border border-white/5 ${camp.channel === 'whatsapp' ? 'bg-green-900/20 text-green-400' : 'bg-blue-900/20 text-blue-400'}`}>
                    {camp.channel === 'whatsapp' ? <Smartphone className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-white font-serif font-medium text-lg group-hover:text-brand-gold transition-colors">{camp.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {camp.audience}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {new Date(camp.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className={`block text-[10px] font-bold uppercase tracking-widest ${camp.status === 'sent' ? 'text-brand-gold' : camp.status === 'draft' ? 'text-zinc-600' : 'text-yellow-600'
                      }`}>
                      {camp.status === 'sent' ? 'Enviado' : camp.status === 'draft' ? 'Rascunho' : 'Agendado'}
                    </span>
                    {camp.status === 'sent' && <span className="text-xs text-zinc-500">{camp.sentCount} entregues</span>}
                  </div>
                  <button className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats / Info */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-zinc-900 to-brand-surface border border-brand-border p-8 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <MessageSquare className="w-32 h-32 text-brand-gold" />
            </div>
            <h3 className="text-lg font-serif font-semibold text-white mb-6 relative z-10">Créditos de Disparo</h3>
            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">WhatsApp</span>
                  <span className="text-white font-mono">850 / 1.000</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500/80 w-[85%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white font-mono">4.200 / 10.000</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/80 w-[42%]"></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 border border-brand-border hover:bg-zinc-800 text-white text-sm rounded-lg transition-colors hover:border-brand-gold/30 hover:text-brand-gold">
              Comprar Créditos
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Campanha"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              Salvar Rascunho
            </button>
            <button onClick={handleCreateCampaign} className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-semibold hover:bg-[#c5a059] transition-colors flex items-center gap-2">
              <Send className="w-3 h-3" />
              Agendar Disparo
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Nome da Campanha</label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2 text-white focus:border-brand-gold focus:outline-none"
              placeholder="Ex: Lembrete Evento X"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Canal</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewCampaign({ ...newCampaign, channel: 'whatsapp' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-medium transition-colors ${newCampaign.channel === 'whatsapp' ? 'border-brand-gold bg-brand-gold/10 text-white' : 'border-brand-border bg-zinc-900 text-zinc-400'}`}
              >
                <Smartphone className={`w-4 h-4 ${newCampaign.channel === 'whatsapp' ? 'text-brand-gold' : ''}`} /> WhatsApp
              </button>
              <button
                onClick={() => setNewCampaign({ ...newCampaign, channel: 'email' })}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-medium transition-colors ${newCampaign.channel === 'email' ? 'border-brand-gold bg-brand-gold/10 text-white' : 'border-brand-border bg-zinc-900 text-zinc-400'}`}
              >
                <Mail className={`w-4 h-4 ${newCampaign.channel === 'email' ? 'text-brand-gold' : ''}`} /> Email
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Público Alvo</label>
            <select
              value={newCampaign.audience}
              onChange={(e) => setNewCampaign({ ...newCampaign, audience: e.target.value })}
              className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2 text-white focus:border-brand-gold focus:outline-none"
            >
              <option>Todos os Membros</option>
              <option>Leads Qualificados</option>
              <option>Inscritos no Último Evento</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Mensagem</label>
            <textarea
              rows={5}
              value={newCampaign.message}
              onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
              className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2 text-white focus:border-brand-gold focus:outline-none resize-none"
              placeholder="Olá {{nome}}, ..."
            />
            <p className="text-[10px] text-zinc-500 mt-1">Variáveis disponíveis: {'{{nome}}'}, {'{{empresa}}'}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Messaging;