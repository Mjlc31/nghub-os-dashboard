import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, ChevronDown, ChevronUp, Calendar,
  CheckCircle2, Clock, Lock, Unlock, Users, FileText,
  AlertCircle, Send, X, ChevronRight, BookOpen, Star,
  Target, MessageSquare, RefreshCw, Eye, Trash2, Pencil
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MeetingSession, MeetingMinutes } from '../types';
import { useUserProfile } from '../hooks/useUserProfile';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionWithMinutes extends MeetingSession {
  meeting_minutes?: MeetingMinutes[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  regular: 'Reunião Regular',
  extraordinary: 'Reunião Extraordinária',
  board: 'Reunião de Diretoria',
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  regular: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  extraordinary: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  board: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

// ─── Modal de Nova Reunião (Admin) ────────────────────────────────────────────

interface NewSessionModalProps {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
  initialData?: MeetingSession | null;
}

const NewSessionModal: React.FC<NewSessionModalProps> = ({ onClose, onCreated, userId, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.meeting_date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.meeting_time || '19:00');
  const [agenda, setAgenda] = useState(initialData?.agenda || '');
  const [type, setType] = useState<'regular' | 'extraordinary' | 'board'>(initialData?.type as any || 'regular');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Informe o título da reunião.'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        meeting_date: date,
        meeting_time: time,
        agenda: agenda.trim() || null,
        type,
      };

      if (initialData?.id) {
        const { error: err } = await supabase.from('meeting_sessions').update(payload).eq('id', initialData.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('meeting_sessions').insert({
          ...payload,
          status: 'open',
          created_by: userId,
        });
        if (err) throw err;
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar reunião.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f0f10] border border-brand-gold/20 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Nova Reunião</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Crie uma sessão para coleta de ata</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Reunião Mensal NG — Junho 2026"
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 transition-colors"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Horário</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50 transition-colors"
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['regular', 'extraordinary', 'board'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    type === t
                      ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
                      : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                  }`}
                >
                  {t === 'regular' ? 'Regular' : t === 'extraordinary' ? 'Extraordinária' : 'Diretoria'}
                </button>
              ))}
            </div>
          </div>

          {/* Pauta */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Pauta</label>
            <textarea
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              rows={4}
              placeholder="Descreva os tópicos da reunião..."
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-bold text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {initialData?.id ? 'Salvar Alterações' : 'Criar Reunião'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Formulário de Ata (Membro) ───────────────────────────────────────────────

interface MinutesFormProps {
  session: MeetingSession;
  existingMinutes?: MeetingMinutes;
  userId: string;
  userName: string;
  onSaved: () => void;
}

const MinutesForm: React.FC<MinutesFormProps> = ({ session, existingMinutes, userId, userName, onSaved }) => {
  const [present, setPresent] = useState(existingMinutes?.present ?? true);
  const [highlights, setHighlights] = useState(existingMinutes?.highlights ?? '');
  const [commitments, setCommitments] = useState(existingMinutes?.commitments ?? '');
  const [generalNotes, setGeneralNotes] = useState(existingMinutes?.general_notes ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        session_id: session.id,
        author_id: userId,
        author_name: userName,
        present,
        highlights: highlights.trim() || null,
        commitments: commitments.trim() || null,
        general_notes: generalNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existingMinutes?.id) {
        const { error: err } = await supabase
          .from('meeting_minutes')
          .update(payload)
          .eq('id', existingMinutes.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('meeting_minutes')
          .insert({ ...payload, submitted_at: new Date().toISOString() });
        if (err) throw err;
      }

      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar ata.');
    } finally {
      setLoading(false);
    }
  };

  if (session.status === 'closed') {
    return (
      <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-xl px-5 py-4">
        <Lock className="w-5 h-5 text-zinc-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-zinc-300">Coleta de ata encerrada</p>
          <p className="text-xs text-zinc-600">A diretoria fechou o preenchimento desta reunião.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Ata salva com sucesso!
        </div>
      )}

      {/* Presença */}
      <div className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Confirmação de Presença</p>
          <p className="text-xs text-zinc-500 mt-0.5">Confirme se você participou desta reunião</p>
        </div>
        <button
          type="button"
          onClick={() => setPresent(!present)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
            present
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-800/50 border-white/10 text-zinc-500'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {present ? 'Presente' : 'Ausente'}
        </button>
      </div>

      {/* Destaques */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          <Star className="w-3.5 h-3.5 text-brand-gold" />
          Destaques da Reunião
        </label>
        <textarea
          value={highlights}
          onChange={e => setHighlights(e.target.value)}
          rows={3}
          placeholder="O que mais chamou sua atenção? Quais foram os pontos mais importantes?"
          className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 transition-colors resize-none"
        />
      </div>

      {/* Compromissos */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          <Target className="w-3.5 h-3.5 text-amber-400" />
          Meus Compromissos
        </label>
        <textarea
          value={commitments}
          onChange={e => setCommitments(e.target.value)}
          rows={3}
          placeholder="Que ações você assumiu? Quais são seus próximos passos?"
          className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 transition-colors resize-none"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          Observações Gerais
        </label>
        <textarea
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          rows={2}
          placeholder="Alguma dúvida, sugestão ou comentário adicional?"
          className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/50 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-brand-gold text-black font-bold text-sm hover:bg-brand-gold/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/10"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {existingMinutes?.id ? 'Atualizar Ata' : 'Enviar Ata'}
      </button>
    </form>
  );
};

// ─── Visão do Admin — Card de Sessão ─────────────────────────────────────────

interface AdminSessionCardProps {
  session: SessionWithMinutes;
  onToggleStatus: (id: string, current: string) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onEdit: (session: MeetingSession) => void;
}

const AdminSessionCard: React.FC<AdminSessionCardProps> = ({ session, onToggleStatus, onRefresh, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const presentCount = session.meeting_minutes?.filter(m => m.present).length ?? 0;
  const totalCount = session.meeting_minutes?.length ?? 0;

  return (
    <div className={`bg-zinc-900/40 border rounded-2xl overflow-hidden transition-all ${
      session.status === 'open' ? 'border-brand-gold/20' : 'border-white/5'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${SESSION_TYPE_COLORS[session.type]}`}>
                {SESSION_TYPE_LABELS[session.type]}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                session.status === 'open'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800/50 border-white/10 text-zinc-500'
              }`}>
                {session.status === 'open' ? <><Unlock className="w-2.5 h-2.5" /> Aberta</> : <><Lock className="w-2.5 h-2.5" /> Encerrada</>}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-2 truncate">{session.title}</h3>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(session.meeting_date)} às {session.meeting_time}</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{totalCount} ata{totalCount !== 1 ? 's' : ''} • {presentCount} presente{presentCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggleStatus(session.id, session.status)}
              title={session.status === 'open' ? 'Encerrar coleta' : 'Reabrir coleta'}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                session.status === 'open'
                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                  : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {session.status === 'open' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(session)}
              title="Editar reunião"
              className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(session.id)}
              title="Excluir reunião"
              className="p-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Pauta */}
        {session.agenda && (
          <div className="mt-4 p-3 bg-zinc-900/60 rounded-lg border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Pauta</p>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{session.agenda}</p>
          </div>
        )}
      </div>

      {/* Atas dos membros */}
      {expanded && (
        <div className="border-t border-white/5 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            Atas Submetidas ({totalCount})
          </p>
          {totalCount === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-4">Nenhuma ata submetida ainda.</p>
          ) : (
            <div className="space-y-3">
              {session.meeting_minutes?.map(m => (
                <div key={m.id} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold to-amber-700 flex items-center justify-center text-black text-xs font-bold">
                        {(m.author_name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">{m.author_name || 'Membro'}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      m.present
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                    }`}>
                      {m.present ? '✓ Presente' : '✗ Ausente'}
                    </span>
                  </div>
                  {m.highlights && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 flex items-center gap-1"><Star className="w-2.5 h-2.5 text-brand-gold" /> Destaques</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{m.highlights}</p>
                    </div>
                  )}
                  {m.commitments && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 flex items-center gap-1"><Target className="w-2.5 h-2.5 text-amber-400" /> Compromissos</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{m.commitments}</p>
                    </div>
                  )}
                  {m.general_notes && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5 text-blue-400" /> Observações</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{m.general_notes}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-700 mt-3">
                    Enviado em {m.submitted_at ? new Date(m.submitted_at).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const Meeting: React.FC = () => {
  const { userProfile } = useUserProfile();
  const [sessions, setSessions] = useState<SessionWithMinutes[]>([]);
  const [myMinutes, setMyMinutes] = useState<Record<string, MeetingMinutes>>({});
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingSession, setEditingSession] = useState<MeetingSession | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Normaliza role
  const isAdmin = userProfile?.normalizedRole === 'admin';
  const isMember = userProfile?.normalizedRole === 'member';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar sessões
      const { data: sessionData, error: sessErr } = await supabase
        .from('meeting_sessions')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (sessErr) throw sessErr;

      if (isAdmin) {
        // Admin: carrega todas as atas junto
        const sessionsWithMinutes: SessionWithMinutes[] = [];
        for (const s of sessionData || []) {
          const { data: mins } = await supabase
            .from('meeting_minutes')
            .select('*')
            .eq('session_id', s.id);
          sessionsWithMinutes.push({ ...s, meeting_minutes: mins || [] });
        }
        setSessions(sessionsWithMinutes);
      } else {
        // Membro: apenas sessões
        setSessions(sessionData || []);

        // Carregar próprias atas
        if (currentUserId) {
          const { data: minsData } = await supabase
            .from('meeting_minutes')
            .select('*')
            .eq('author_id', currentUserId);

          const minutesMap: Record<string, MeetingMinutes> = {};
          (minsData || []).forEach(m => { minutesMap[m.session_id] = m; });
          setMyMinutes(minutesMap);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar reuniões:', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUserId]);

  useEffect(() => {
    if (currentUserId || isAdmin) loadData();
  }, [loadData, currentUserId, isAdmin]);

  const handleToggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'open' ? 'closed' : 'open';
    await supabase.from('meeting_sessions').update({ status: newStatus }).eq('id', id);
    loadData();
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('ATENÇÃO: Deseja realmente excluir esta reunião? TODAS as atas preenchidas pelos membros serão excluídas permanentemente.')) return;
    try {
      const { error } = await supabase.from('meeting_sessions').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro: ' + (error.message || 'Ocorreu um erro ao excluir a reunião.'));
    }
  };

  // Sessão mais recente aberta (para membros)
  const latestOpenSession = sessions.find(s => s.status === 'open');
  const pastSessions = sessions.filter(s => s.status === 'closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-gold" />
          <p className="text-sm text-zinc-500">Carregando reuniões...</p>
        </div>
      </div>
    );
  }

  // ── VISÃO ADMIN ──────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-brand-gold" />
              Atas de Reunião
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie as sessões e visualize as atas dos membros</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
            onClick={() => { setEditingSession(null); setShowNewModal(true); }}
            className="px-4 py-2.5 bg-brand-gold text-black text-sm font-bold rounded-xl hover:bg-brand-gold/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-gold/10"
          >
              <Plus className="w-4 h-4" />
              Nova Reunião
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de Reuniões', value: sessions.length, icon: Calendar, color: 'text-blue-400' },
            { label: 'Abertas', value: sessions.filter(s => s.status === 'open').length, icon: Unlock, color: 'text-emerald-400' },
            { label: 'Atas Recebidas', value: sessions.reduce((acc, s) => acc + (s.meeting_minutes?.length ?? 0), 0), icon: FileText, color: 'text-brand-gold' },
          ].map(stat => (
            <div key={stat.label} className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de sessões */}
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-semibold">Nenhuma reunião criada ainda</p>
            <p className="text-xs text-zinc-600 mt-1">Clique em "Nova Reunião" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <AdminSessionCard
                key={session.id}
                session={session}
                onToggleStatus={handleToggleStatus}
                onRefresh={loadData}
                onDelete={handleDeleteSession}
                onEdit={(sess) => { setEditingSession(sess); setShowNewModal(true); }}
              />
            ))}
          </div>
        )}

        {showNewModal && (
          <NewSessionModal
            userId={currentUserId}
            initialData={editingSession}
            onClose={() => { setShowNewModal(false); setEditingSession(null); }}
            onCreated={loadData}
          />
        )}
      </div>
    );
  }

  // ── VISÃO MEMBRO ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header de boas-vindas */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-gold/10 via-zinc-900/80 to-zinc-900 border border-brand-gold/20 p-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold to-amber-700 flex items-center justify-center text-black font-bold text-sm">
              {(userProfile?.name || 'M').charAt(0).toUpperCase()}
            </div>
            <p className="text-sm text-zinc-400">Olá, <span className="text-white font-semibold">{userProfile?.name?.split(' ')[0] || 'Membro'}</span></p>
          </div>
          <h1 className="text-2xl font-bold text-white">Reunião NG</h1>
          <p className="text-sm text-zinc-500 mt-1">Registre sua presença e preencha a ata da reunião.</p>
        </div>
      </div>

      {/* Reunião atual aberta */}
      {latestOpenSession ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Reunião Aberta</span>
          </div>

          <div className="bg-zinc-900/50 border border-brand-gold/20 rounded-2xl overflow-hidden">
            {/* Info da reunião */}
            <div className="p-6 border-b border-white/5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${SESSION_TYPE_COLORS[latestOpenSession.type]}`}>
                {SESSION_TYPE_LABELS[latestOpenSession.type]}
              </span>
              <h2 className="text-lg font-bold text-white mt-3">{latestOpenSession.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(latestOpenSession.meeting_date)}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{latestOpenSession.meeting_time}</span>
              </div>
              {latestOpenSession.agenda && (
                <div className="mt-4 p-3 bg-zinc-900/60 rounded-lg border border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> Pauta
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{latestOpenSession.agenda}</p>
                </div>
              )}
            </div>

            {/* Formulário de ata */}
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-5 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5" />
                {myMinutes[latestOpenSession.id] ? 'Sua Ata (editável)' : 'Preencher Ata'}
              </p>
              <MinutesForm
                session={latestOpenSession}
                existingMinutes={myMinutes[latestOpenSession.id]}
                userId={currentUserId}
                userName={userProfile?.name || 'Membro'}
                onSaved={loadData}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-900/30 border border-white/5 rounded-2xl">
          <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-semibold">Nenhuma reunião aberta no momento</p>
          <p className="text-xs text-zinc-600 mt-1">A diretoria abrirá a próxima reunião em breve.</p>
        </div>
      )}

      {/* Histórico de reuniões */}
      {pastSessions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Histórico de Reuniões
          </p>
          <div className="space-y-3">
            {pastSessions.map(session => {
              const myMin = myMinutes[session.id];
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-300 truncate">{session.title}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{formatDate(session.meeting_date)}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {myMin ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enviada
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-800/50 border border-white/10 text-zinc-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encerrada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Meeting;
