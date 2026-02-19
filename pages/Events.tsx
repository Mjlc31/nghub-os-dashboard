import React, { useState, useEffect, useRef } from 'react';
import {
   Calendar,
   MapPin,
   Plus,
   CheckCircle2,
   Ticket,
   Trash2,
   Users,
   TrendingUp,
   Clock,
   Search,
   MoreVertical,
   ChevronRight,
   UserCheck,
   DollarSign,
   PieChart,
   ArrowLeft,
   Image as ImageIcon,
   Loader2,
   UploadCloud
} from 'lucide-react';
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   Cell
} from 'recharts';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { Event, Lead, LeadStage } from '../types';

interface EventsProps {
   onNotify: (type: 'success' | 'error', msg: string) => void;
}

const Events: React.FC<EventsProps> = ({ onNotify }) => {
   // Navigation State
   const [view, setView] = useState<'list' | 'finance'>('list');
   const [selectedEventFinance, setSelectedEventFinance] = useState<Event | null>(null);

   // Data State
   const [events, setEvents] = useState<Event[]>([]);
   const [leads, setLeads] = useState<Lead[]>([]);
   const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

   // Modals
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [isGuestListModalOpen, setIsGuestListModalOpen] = useState(false);
   const [selectedEventForGuestlist, setSelectedEventForGuestlist] = useState<Event | null>(null);

   // Form & Upload
   const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', capacity: '', price: '', imageUrl: '' });
   const [uploading, setUploading] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetchData();
   }, []);

   const fetchData = async () => {
      try {
         setLoading(true);
         // Fetch Events
         const { data: eventsData, error: eventsError } = await supabase.from('events').select('*').order('date', { ascending: true });
         if (eventsError) throw eventsError;

         // Fetch Leads (to link as guests)
         const { data: leadsData, error: leadsError } = await supabase.from('leads').select('*');
         if (leadsError) throw leadsError;

         const mappedEvents: Event[] = (eventsData || []).map((e: any) => ({
            id: e.id, title: e.title, date: e.date, location: e.location, capacity: e.capacity,
            attendeesCount: e.attendees_count, price: e.price, imageUrl: e.image_url || 'https://picsum.photos/seed/eventdefault/800/400', status: e.status
         }));

         const mappedLeads: Lead[] = (leadsData || []).map((l: any) => ({
            id: l.id, name: l.name, email: l.email, phone: l.phone, company: l.company, sector: l.sector,
            stage: l.stage as LeadStage, value: Number(l.value), lastContact: l.last_contact, tagId: l.tag_id, createdAt: l.created_at
         }));

         setEvents(mappedEvents);
         setLeads(mappedLeads);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploading(true);
      try {
         // 1. Ensure bucket exists (Safe check)
         const { error: bucketError } = await supabase.storage.getBucket('event-images');
         if (bucketError) {
            await supabase.storage.createBucket('event-images', { public: true });
         }

         // 2. Upload
         const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, file);
         if (uploadError) throw uploadError;

         // 3. Get URL
         const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);

         setNewEvent({ ...newEvent, imageUrl: publicUrl });
         onNotify('success', 'Imagem carregada com sucesso!');

      } catch (error) {
         console.error(error);
         onNotify('error', 'Erro ao fazer upload da imagem.');
      } finally {
         setUploading(false);
      }
   };

   const handleCreateEvent = async () => {
      if (!newEvent.title || !newEvent.date) return;
      try {
         const { data, error } = await supabase.from('events').insert([
            {
               title: newEvent.title,
               date: newEvent.date,
               location: newEvent.location,
               capacity: Number(newEvent.capacity),
               price: Number(newEvent.price),
               attendees_count: 0,
               status: 'upcoming',
               image_url: newEvent.imageUrl || `https://picsum.photos/seed/${newEvent.title}/800/400`
            }
         ]).select();

         if (error) throw error;
         if (data) {
            onNotify('success', 'Evento criado com sucesso!');
            setIsCreateModalOpen(false);
            setNewEvent({ title: '', date: '', location: '', capacity: '', price: '', imageUrl: '' });
            fetchData();
         }
      } catch (error) { onNotify('error', 'Erro ao criar evento'); }
   };

   const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
      try {
         const { error } = await supabase.from('events').delete().eq('id', id);
         if (error) throw error;
         setEvents(current => current.filter(e => e.id !== id));
         onNotify('success', 'Evento excluído.');
      } catch (err) { onNotify('error', 'Erro ao excluir evento.'); }
   };

   const openGuestList = (event: Event) => {
      setSelectedEventForGuestlist(event);
      setIsGuestListModalOpen(true);
   };

   const openFinanceView = (event: Event) => {
      setSelectedEventFinance(event);
      setView('finance');
   };

   // --- VIEW: FINANCE DETAIL PAGE ---
   if (view === 'finance' && selectedEventFinance) {
      // Finance Calculations specific to this event
      const eventLeads = leads.filter(l => l.tagId === selectedEventFinance.id);
      const confirmedLeads = eventLeads.filter(l => l.stage === LeadStage.WON);
      const potentialLeads = eventLeads.filter(l => l.stage !== LeadStage.WON && l.stage !== LeadStage.CHURN);

      // Revenue Logic: Confirmed Leads * Event Price
      const confirmedRevenue = confirmedLeads.length * selectedEventFinance.price;
      const potentialRevenue = potentialLeads.length * selectedEventFinance.price;
      const totalCapacityRevenue = selectedEventFinance.capacity * selectedEventFinance.price;

      const occupancyRate = (confirmedLeads.length / selectedEventFinance.capacity) * 100;

      const chartData = [
         { name: 'Confirmada', value: confirmedRevenue, fill: '#10b981' }, // Emerald
         { name: 'Pendente', value: potentialRevenue, fill: '#D4AF37' }, // Gold
         { name: 'Perdida', value: (eventLeads.filter(l => l.stage === LeadStage.CHURN).length * selectedEventFinance.price), fill: '#ef4444' } // Red
      ];

      return (
         <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setView('list')} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-brand-gold/50 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div>
                  <div className="flex items-center gap-2">
                     <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{selectedEventFinance.title}</h1>
                     <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-widest font-bold">Financeiro</span>
                  </div>
                  <p className="text-zinc-400 text-sm mt-1">Gestão de receita e bilheteria deste evento.</p>
               </div>
            </div>

            {/* Financial Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-brand-surface border border-brand-border p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-6 opacity-5"><DollarSign className="w-24 h-24 text-emerald-500" /></div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Receita Confirmada</p>
                  <h2 className="text-4xl font-serif font-bold text-emerald-400">R$ {confirmedRevenue.toLocaleString('pt-BR')}</h2>
                  <p className="text-xs text-zinc-500 mt-2">{confirmedLeads.length} vendas fechadas (Tickets)</p>
               </div>

               <div className="bg-brand-surface border border-brand-border p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-6 opacity-5"><TrendingUp className="w-24 h-24 text-brand-gold" /></div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Potencial de Pipeline</p>
                  <h2 className="text-4xl font-serif font-bold text-brand-gold">R$ {potentialRevenue.toLocaleString('pt-BR')}</h2>
                  <p className="text-xs text-zinc-500 mt-2">{potentialLeads.length} leads em negociação</p>
               </div>

               <div className="bg-brand-surface border border-brand-border p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-6 opacity-5"><PieChart className="w-24 h-24 text-blue-500" /></div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Ocupação Financeira</p>
                  <h2 className="text-4xl font-serif font-bold text-white">{occupancyRate.toFixed(1)}%</h2>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                     <div className="h-full bg-blue-500" style={{ width: `${occupancyRate}%` }}></div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Meta: R$ {totalCapacityRevenue.toLocaleString('pt-BR')}</p>
               </div>
            </div>

            {/* Charts & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-brand-surface border border-brand-border p-6 rounded-xl">
                  <h3 className="text-white font-serif font-bold mb-6">Composição da Receita</h3>
                  <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                           <XAxis type="number" stroke="#52525b" fontSize={12} tickFormatter={(val) => `R$${val}`} />
                           <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={80} />
                           <Tooltip
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                           />
                           <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                              {chartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-brand-surface border border-brand-border p-6 rounded-xl flex flex-col">
                  <h3 className="text-white font-serif font-bold mb-4">Últimas Vendas</h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[300px]">
                     {confirmedLeads.length === 0 ? (
                        <p className="text-zinc-500 text-sm italic">Nenhuma venda confirmada ainda.</p>
                     ) : (
                        confirmedLeads.map(lead => (
                           <div key={lead.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                                    {lead.name.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="text-sm text-white font-medium">{lead.name}</p>
                                    <p className="text-[10px] text-zinc-500">{new Date(lead.createdAt || '').toLocaleDateString('pt-BR')}</p>
                                 </div>
                              </div>
                              <span className="text-emerald-400 font-mono text-sm">+R${selectedEventFinance.price}</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </div>
      );
   }

   // --- VIEW: DEFAULT LIST ---

   // Stats Calculations
   const totalEvents = events.length;
   const upcomingEvents = events.filter(e => new Date(e.date) > new Date());
   const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

   // Calculate revenue potential based on leads linked to events with stage WON
   const totalProjectedRevenue = leads
      .filter(l => l.stage === LeadStage.WON && l.tagId)
      .reduce((acc, lead) => {
         const event = events.find(e => e.id === lead.tagId);
         return acc + (event ? Number(event.price) : 0);
      }, 0);

   // Filter Logic
   const filteredEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      const now = new Date();
      if (filter === 'upcoming') return eventDate >= now;
      if (filter === 'past') return eventDate < now;
      return true;
   });

   const StatCard = ({ label, value, icon: Icon, subtext }: any) => (
      <div className="bg-brand-surface border border-brand-border p-5 rounded-xl flex items-center justify-between group hover:border-brand-gold/20 transition-all">
         <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold mb-1">{label}</p>
            <h3 className="text-2xl font-serif font-bold text-white">{value}</h3>
            {subtext && <p className="text-xs text-zinc-600 mt-1">{subtext}</p>}
         </div>
         <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-brand-gold group-hover:border-brand-gold/30 transition-colors">
            <Icon className="w-5 h-5" />
         </div>
      </div>
   );

   return (
      <div className="space-y-8 animate-fade-in pb-20">

         {/* Header & Stats */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
               <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight mb-2">Eventos & Experiências</h1>
               <p className="text-zinc-400 max-w-lg">Gerencie o calendário, controle a lista de convidados (Guestlist) e acompanhe a receita de bilheteria.</p>
            </div>
            <StatCard label="Total de Eventos" value={totalEvents} icon={Calendar} subtext={`${upcomingEvents.length} agendados`} />
            <StatCard label="Receita Projetada" value={`R$ ${totalProjectedRevenue.toLocaleString('pt-BR', { notation: 'compact' })}`} icon={TrendingUp} subtext="Via convidados confirmados" />
         </div>

         {/* Featured Next Event */}
         {nextEvent && filter !== 'past' && (
            <div className="relative rounded-2xl overflow-hidden border border-brand-border group">
               <div className="absolute inset-0">
                  <img src={nextEvent.imageUrl} className="w-full h-full object-cover filter brightness-[0.4] group-hover:brightness-[0.5] group-hover:scale-105 transition-all duration-700" />
               </div>
               <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                  <div className="space-y-4 max-w-2xl">
                     <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold text-black text-xs font-bold uppercase tracking-wide">
                        <Clock className="w-3 h-3" /> Próximo Evento
                     </span>
                     <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight shadow-lg">{nextEvent.title}</h2>
                     <div className="flex flex-wrap gap-6 text-zinc-300">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-gold" /> {new Date(nextEvent.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-gold" /> {nextEvent.location}</span>
                        <span className="flex items-center gap-2"><Ticket className="w-4 h-4 text-brand-gold" /> {nextEvent.price > 0 ? `R$ ${nextEvent.price}` : 'Gratuito'}</span>
                     </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                     <button onClick={() => openFinanceView(nextEvent)} className="flex-1 md:flex-none px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-lg font-bold text-sm transition-all">
                        Gestão Financeira
                     </button>
                     <button onClick={() => openGuestList(nextEvent)} className="flex-1 md:flex-none px-6 py-3 bg-brand-gold text-black rounded-lg font-bold text-sm hover:bg-[#c5a059] transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                        Lista de Convidados
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Controls & Filters */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
               <button onClick={() => setFilter('upcoming')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'upcoming' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Próximos</button>
               <button onClick={() => setFilter('past')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'past' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Realizados</button>
               <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Todos</button>
            </div>
            <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto bg-zinc-900 border border-zinc-800 hover:border-brand-gold/50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
               <Plus className="w-4 h-4 text-brand-gold" /> Criar Evento
            </button>
         </div>

         {/* Events Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.filter(e => e.id !== nextEvent?.id || filter === 'all').map((event) => {
               // Calculate real attendees based on leads linked to this event
               const realAttendees = leads.filter(l => l.tagId === event.id).length;
               const occupancy = Math.min((realAttendees / event.capacity) * 100, 100);

               return (
                  <div key={event.id} onClick={() => openFinanceView(event)} className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden group hover:border-brand-gold/30 hover:shadow-xl transition-all duration-300 flex flex-col relative cursor-pointer">
                     <div className="absolute top-3 right-3 z-20 flex gap-2">
                        <button onClick={(e) => handleDeleteEvent(event.id, e)} className="p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>

                     <div className="h-40 relative overflow-hidden">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter grayscale group-hover:grayscale-0" />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-surface to-transparent opacity-90"></div>
                        <div className="absolute bottom-4 left-5 right-5">
                           <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-1 block">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                           <h3 className="text-xl font-serif font-bold text-white leading-tight truncate">{event.title}</h3>
                        </div>
                     </div>

                     <div className="p-5 flex flex-col flex-1">
                        <div className="space-y-3 mb-5 flex-1">
                           <div className="flex items-center text-xs text-zinc-400"><MapPin className="w-3.5 h-3.5 mr-2 text-zinc-600" /> {event.location}</div>
                           <div className="flex items-center text-xs text-zinc-400"><Ticket className="w-3.5 h-3.5 mr-2 text-zinc-600" /> {event.price === 0 ? 'Gratuito' : `R$ ${event.price},00`}</div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                              <span>Guestlist: {realAttendees}</span>
                              <span>Cap: {event.capacity}</span>
                           </div>
                           <div className="h-1.5 bg-zinc-800 w-full rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${occupancy > 90 ? 'bg-red-500' : 'bg-brand-gold'}`} style={{ width: `${occupancy}%` }} />
                           </div>
                           <div className="pt-3 border-t border-zinc-800 mt-2 flex justify-between items-center group/btn">
                              <span className="text-xs text-zinc-500 group-hover:text-white transition-colors">Gestão Financeira</span>
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-gold group-hover/btn:translate-x-1 transition-all" />
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Guest List Modal */}
         <Modal isOpen={isGuestListModalOpen} onClose={() => setIsGuestListModalOpen(false)} title={selectedEventForGuestlist?.title || 'Lista de Convidados'}>
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <div>
                     <p className="text-xs text-zinc-500 uppercase font-bold">Total na Lista</p>
                     <p className="text-2xl font-serif text-white">{leads.filter(l => l.tagId === selectedEventForGuestlist?.id).length}</p>
                  </div>
                  <div>
                     <p className="text-xs text-zinc-500 uppercase font-bold">Confirmados (Venda Fechada)</p>
                     <p className="text-2xl font-serif text-brand-gold">{leads.filter(l => l.tagId === selectedEventForGuestlist?.id && l.stage === LeadStage.WON).length}</p>
                  </div>
                  <div className="text-right">
                     <button className="text-xs bg-brand-gold/10 text-brand-gold px-3 py-1.5 rounded hover:bg-brand-gold/20 border border-brand-gold/20 transition-colors">Exportar CSV</button>
                  </div>
               </div>

               <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                  {leads.filter(l => l.tagId === selectedEventForGuestlist?.id).length === 0 ? (
                     <div className="text-center py-8 text-zinc-500 text-sm">Nenhum convidado vinculado a este evento no CRM.</div>
                  ) : (
                     leads.filter(l => l.tagId === selectedEventForGuestlist?.id).map(guest => (
                        <div key={guest.id} className="flex items-center justify-between p-3 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-colors group">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${guest.stage === LeadStage.WON ? 'bg-brand-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                 {guest.name.charAt(0)}
                              </div>
                              <div>
                                 <p className="text-sm font-medium text-white">{guest.name}</p>
                                 <p className="text-xs text-zinc-500">{guest.company || 'Sem empresa'} • {guest.email}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${guest.stage === LeadStage.WON
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                    : 'border-zinc-700 bg-zinc-800 text-zinc-500'
                                 }`}>
                                 {guest.stage === LeadStage.WON ? 'Confirmado' : 'Pendente'}
                              </span>
                              <button className="p-1.5 text-zinc-600 hover:text-white rounded hover:bg-zinc-800" title="Check-in Manual">
                                 <UserCheck className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </Modal>

         {/* Create Event Modal */}
         <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Criar Novo Evento" footer={<><button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button><button onClick={handleCreateEvent} className="px-4 py-2 rounded-lg text-sm bg-brand-gold text-black font-semibold hover:bg-[#c5a059] transition-colors">Publicar Evento</button></>}>
            <div className="space-y-4">

               {/* Image Upload Field */}
               <div className="w-full">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Imagem de Capa</label>
                  <div
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full h-32 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-gold/50 hover:bg-zinc-900 transition-all overflow-hidden relative group"
                  >
                     {newEvent.imageUrl ? (
                        <>
                           <img src={newEvent.imageUrl} alt="Capa" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs font-bold text-white">Alterar Imagem</p>
                           </div>
                        </>
                     ) : (
                        <>
                           {uploading ? <Loader2 className="w-6 h-6 animate-spin text-brand-gold" /> : <UploadCloud className="w-6 h-6 text-zinc-500 mb-2" />}
                           <span className="text-xs text-zinc-500">{uploading ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                        </>
                     )}
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                     />
                  </div>
               </div>

               <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nome do Evento</label><input type="text" className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2.5 text-white focus:border-brand-gold focus:outline-none text-sm" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Data</label><input type="datetime-local" className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2.5 text-white focus:border-brand-gold focus:outline-none text-sm" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} /></div>
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Capacidade</label><input type="number" className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2.5 text-white focus:border-brand-gold focus:outline-none text-sm" value={newEvent.capacity} onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })} /></div>
               </div>
               <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Local</label><input type="text" className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2.5 text-white focus:border-brand-gold focus:outline-none text-sm" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} /></div>
               <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Preço do Ingresso (R$)</label><input type="number" className="w-full bg-zinc-950 border border-brand-border rounded-lg px-3 py-2.5 text-white focus:border-brand-gold focus:outline-none text-sm" value={newEvent.price} onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })} /></div>
            </div>
         </Modal>
      </div>
   );
};
export default Events;