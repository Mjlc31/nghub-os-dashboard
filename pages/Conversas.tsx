import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Send, Search, Smartphone,
  MoreVertical, Wand2, CheckCheck, Loader2,
  Tag, X, WifiOff, Users, Hash, LogOut,
  ChevronRight, Pencil, Check, Plus,
  Video, Phone, Paperclip, Smile, Mic,
  BrainCircuit, Sparkles, Activity, ShieldCheck, Zap, StopCircle
} from 'lucide-react';
import { format, fromUnixTime, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversasProps {
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

interface MessageData {
  id: string;
  chatId: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  type?: string;
  mimetype?: string;
  caption?: string;
  fileName?: string;
  ptt?: boolean;
}

interface ChatTag {
  id: string;
  label: string;
  color: string;
  dot: string;
}

interface ChatSession {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  lastMessage: string;
  lastTime: number;
  unread: number;
  profilePic: string | null;
  tags: ChatTag[];
}

const TAGS: ChatTag[] = [
  { id: 'hot', label: 'Quente', color: 'bg-red-500/15 text-red-400 border-red-500/25', dot: 'bg-red-400' },
  { id: 'followup', label: 'Follow-up', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  { id: 'closed', label: 'Fechado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  { id: 'support', label: 'Suporte', color: 'bg-sky-500/15 text-sky-400 border-sky-500/25', dot: 'bg-sky-400' },
  { id: 'vip', label: 'VIP', color: 'bg-brand-gold/15 text-brand-gold border-brand-gold/25', dot: 'bg-brand-gold' },
];

const chatTagsStore: Record<string, ChatTag[]> = {};

// Gradient avatars for contacts without photos
const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-red-600',
  'from-pink-600 to-rose-600',
  'from-amber-600 to-orange-600',
];

const getGradient = (name: string) => AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];

const Conversas: React.FC<ConversasProps> = ({ onNotify }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'qr' | 'ready' | 'disconnected'>('connecting');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQrPanel, setShowQrPanel] = useState(false);

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups'>('all');
  
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [localTags, setLocalTags] = useState<Record<string, ChatTag[]>>({});
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});

  // Media & Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copilot AI States
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<ChatSession | null>(null);
  const socketRef = useRef<Socket | null>(null);
  selectedChatRef.current = selectedChat;

  useEffect(() => {
    const sock = io('http://localhost:5000', {
      timeout: 8000,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    setSocket(sock);
    socketRef.current = sock;

    sock.on('connect', () => console.log('✅ Socket conectado'));
    sock.on('connect_error', () => setWsStatus('disconnected'));

    sock.on('qr', (qr: string) => {
      setWsStatus('qr');
      setQrCodeData(qr);
      setShowQrPanel(true);
    });

    sock.on('ready', () => {
      setWsStatus('ready');
      setShowQrPanel(false);
      onNotify('success', 'WhatsApp conectado com sucesso!');
    });

    sock.on('disconnected', () => { setWsStatus('disconnected'); });

    sock.on('logged_out', () => {
      setWsStatus('qr');
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      onNotify('success', 'Sessão encerrada. Escaneie o QR para reconectar.');
    });

    sock.on('chats', (serverChats: Omit<ChatSession, 'tags'>[]) => {
      setChats(serverChats.map(c => ({
        ...c,
        tags: chatTagsStore[c.id] || [],
        profilePic: c.profilePic,
      })));
      serverChats.slice(0, 20).forEach(c => {
        if (!c.profilePic) sock.emit('get_profile_pic', { jid: c.id });
      });
    });

    sock.on('profile_pic', ({ jid, url }: { jid: string; url: string | null }) => {
      if (url) setProfilePics(prev => ({ ...prev, [jid]: url }));
    });

    sock.on('message', (msg: MessageData) => {
      if (selectedChatRef.current?.id === msg.chatId) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
      setChats(prev => prev.map(c =>
        c.id === msg.chatId
          ? { ...c, lastMessage: msg.body, lastTime: msg.timestamp, unread: msg.fromMe ? c.unread : c.unread + 1 }
          : c
      ));
    });

    sock.on('messages_history', ({ chatId, messages: msgs }: { chatId: string; messages: MessageData[] }) => {
      if (selectedChatRef.current?.id === chatId) {
        setMessages(msgs);
        setLoadingMsgs(false);
      }
    });

    const timeout = setTimeout(() => {
      setWsStatus(prev => prev === 'connecting' ? 'disconnected' : prev);
    }, 10000);

    return () => { clearTimeout(timeout); sock.disconnect(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectChat = useCallback((chat: ChatSession) => {
    setSelectedChat(chat);
    setMessages([]);
    setLoadingMsgs(true);
    setEditingName(false);
    setShowTagMenu(false);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    socketRef.current?.emit('load_messages', { chatId: chat.id, limit: 40 });
    
    const pic = profilePics[chat.id];
    if (!pic && !chat.profilePic) socketRef.current?.emit('get_profile_pic', { jid: chat.id });
  }, [profilePics]);

  const sendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || newMessage;
    if (!textToSend.trim() || !selectedChat) return;
    
    if (!customText) setNewMessage('');
    
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`, chatId: selectedChat.id,
      body: textToSend, timestamp: Math.floor(Date.now() / 1000), fromMe: true,
    }]);
    
    try {
      await fetch('http://localhost:5000/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedChat.id, message: textToSend }),
      });
    } catch { 
      onNotify('error', 'Erro ao enviar mensagem. Verifique a conexão.'); 
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedChatRef.current) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to', selectedChatRef.current.id);
    
    try {
      onNotify('success', `Enviando ${file.name}...`);
      await fetch('http://localhost:5000/send-file', {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      onNotify('error', 'Falha ao enviar arquivo');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('to', selectedChatRef.current?.id || '');
        formData.append('ptt', 'true');
        try {
          await fetch('http://localhost:5000/send-audio', { method: 'POST', body: formData });
        } catch { onNotify('error', 'Falha ao enviar áudio'); }
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      onNotify('error', 'Permissão de microfone negada');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleAnalyzeChat = async () => {
    if (!selectedChatRef.current) return;
    const chatId = selectedChatRef.current.id;
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:5000/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
      if (!response.ok) throw new Error('Falha na análise');
      const data = await response.json();
      setAiAnalysis(prev => ({ ...prev, [chatId]: data }));
      onNotify('success', 'Análise gerada com sucesso!');
    } catch (err) {
      onNotify('error', 'Erro ao gerar análise com o Copilot.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTag = (chatId: string, tag: ChatTag) => {
    setLocalTags(prev => {
      const cur = prev[chatId] || [];
      const has = cur.some(t => t.id === tag.id);
      const updated = has ? cur.filter(t => t.id !== tag.id) : [...cur, tag];
      chatTagsStore[chatId] = updated;
      return { ...prev, [chatId]: updated };
    });
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const has = c.tags.some(t => t.id === tag.id);
      return { ...c, tags: has ? c.tags.filter(t => t.id !== tag.id) : [...c.tags, tag] };
    }));
    if (selectedChat?.id === chatId) {
      setSelectedChat(prev => {
        if (!prev) return prev;
        const has = prev.tags.some(t => t.id === tag.id);
        return { ...prev, tags: has ? prev.tags.filter(t => t.id !== tag.id) : [...prev.tags, tag] };
      });
    }
  };

  const saveName = () => {
    if (!selectedChat || !editedName.trim()) return;
    socketRef.current?.emit('save_contact_name', { jid: selectedChat.id, name: editedName.trim() });
    setSelectedChat(prev => prev ? { ...prev, name: editedName.trim() } : prev);
    setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, name: editedName.trim() } : c));
    setEditingName(false);
    onNotify('success', 'Nome do contato atualizado!');
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/logout', { method: 'POST' });
      setShowLogoutConfirm(false);
    } catch { onNotify('error', 'Erro ao desconectar.'); }
  };

  const chatTags = (chatId: string) => localTags[chatId] || chats.find(c => c.id === chatId)?.tags || [];

  const filteredChats = chats.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (chatFilter === 'unread') return c.unread > 0;
    if (chatFilter === 'groups') return c.isGroup;
    return true;
  });

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = fromUnixTime(ts);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ontem';
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const formatMsgTime = (ts: number) => ts ? format(fromUnixTime(ts), 'HH:mm') : '';

  const Avatar = ({ chat, size = 'md' }: { chat: ChatSession; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
    const pic = profilePics[chat.id] || chat.profilePic;
    const sz = { 
      sm: 'w-9 h-9 text-xs', 
      md: 'w-10 h-10 text-sm', 
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-xl' 
    }[size];
    
    if (pic) return <img src={pic} alt={chat.name} className={`${sz} rounded-full object-cover ring-2 ring-white/5 shadow-lg`} />;
    if (chat.isGroup) return (
      <div className={`${sz} rounded-full bg-gradient-to-br from-[#1a1a24] to-[#0d0d14] ring-2 ring-white/5 shadow-lg flex items-center justify-center`}>
        <Hash className={`${size === 'xl' ? 'w-8 h-8' : 'w-4 h-4'} text-brand-gold/70`} />
      </div>
    );
    return (
      <div className={`${sz} rounded-full bg-gradient-to-br ${getGradient(chat.name)} ring-2 ring-white/5 shadow-lg flex items-center justify-center font-bold text-white tracking-wider`}>
        {chat.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const statusConfig = {
    connecting: { cls: 'text-amber-400', dot: 'bg-amber-400 animate-pulse', label: 'Conectando...', icon: Loader2 },
    qr: { cls: 'text-blue-400', dot: 'bg-blue-400 animate-pulse', label: 'Aguardando Leitura', icon: Smartphone },
    ready: { cls: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Sistema Operacional', icon: CheckCheck },
    disconnected: { cls: 'text-red-400', dot: 'bg-red-500', label: 'Offline', icon: WifiOff },
  }[wsStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/[0.08] bg-[#030305] relative">
      
      {/* ── Background Patterns ── */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-gold/[0.03] via-transparent to-transparent" />

      {/* ── Logout Confirm Modal ── */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#0f0f13] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-base mb-2">Desconectar WhatsApp?</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Você precisará escanear um novo QR Code para se conectar novamente. Tem certeza?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 text-sm text-zinc-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all font-medium">
                Cancelar
              </button>
              <button onClick={handleLogout} className="flex-1 py-2.5 text-sm text-white bg-red-600/90 hover:bg-red-500 rounded-xl transition-all font-medium shadow-lg shadow-red-900/20">
                Sim, Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Panel Modal ── */}
      {showQrPanel && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center">
          <div className="bg-[#0a0a0d] border border-white/10 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center relative max-w-md w-full mx-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/[0.05] to-transparent pointer-events-none" />
            <button onClick={() => setShowQrPanel(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all z-10">
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 bg-brand-gold/20 blur-xl rounded-full" />
              <Smartphone className="w-8 h-8 text-brand-gold relative z-10" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Conecte seu WhatsApp</h2>
            <p className="text-zinc-400 text-sm text-center mb-8 leading-relaxed max-w-[280px]">
              Abra o WhatsApp no seu celular, toque em <span className="text-zinc-200 font-medium">Aparelhos Conectados</span> e escaneie o código abaixo.
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] ring-4 ring-brand-gold/20 relative">
              {qrCodeData
                ? <img src={qrCodeData} alt="QR Code" className="w-[240px] h-[240px] rounded-lg" />
                : <div className="w-[240px] h-[240px] bg-zinc-100 animate-pulse rounded-lg flex flex-col items-center justify-center text-zinc-400 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
                    <span className="text-xs font-medium">Gerando QR Code Seguro...</span>
                  </div>
              }
            </div>
            <div className="mt-8 flex items-center gap-2 text-zinc-500 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
              Conexão criptografada de ponta a ponta
            </div>
          </div>
        </div>
      )}

      {/* ══ Col 1: Sidebar (Chat List) ══ */}
      <div className="w-[340px] flex flex-col bg-[#050508]/80 backdrop-blur-xl border-r border-white/[0.06] shrink-0 relative z-10">

        {/* Sidebar Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.04] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Mensagens
              {wsStatus === 'ready' && <span className="bg-brand-gold/10 text-brand-gold text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-brand-gold/20">Pro</span>}
            </h2>
            <div className="flex items-center gap-2">
              {wsStatus !== 'ready' && (
                <button onClick={() => setShowQrPanel(true)} title="Conectar WhatsApp"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <Smartphone className="w-4 h-4" />
                </button>
              )}
              {wsStatus === 'ready' && (
                <button onClick={() => setShowLogoutConfirm(true)} title="Sair"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button className="w-8 h-8 rounded-xl bg-brand-gold text-black hover:brightness-110 flex items-center justify-center transition-all shadow-lg shadow-brand-gold/20">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative group">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-brand-gold transition-colors" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar conversas ou contatos..."
              className="w-full bg-[#111116] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-brand-gold/40 focus:bg-[#15151a] transition-all shadow-inner"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 bg-[#111116] p-1 rounded-xl border border-white/[0.03]">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: 'Não Lidas' },
              { id: 'groups', label: 'Grupos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setChatFilter(tab.id as any)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all
                  ${chatFilter === tab.id 
                    ? 'bg-[#1e1e24] text-white shadow-sm border border-white/[0.05]' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {wsStatus === 'connecting' && (
            <div className="flex flex-col items-center justify-center h-40 gap-4 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
              <span className="text-sm font-medium">Estabelecendo conexão segura...</span>
            </div>
          )}
          {wsStatus === 'ready' && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-zinc-600">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 opacity-50" />
              </div>
              <span className="text-xs font-medium">Sincronizando suas conversas...</span>
            </div>
          )}
          {wsStatus === 'disconnected' && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center pb-20">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center relative mb-2">
                <div className="absolute inset-0 bg-red-500/5 rounded-full blur-xl" />
                <WifiOff className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-white font-semibold text-lg">Sem Conexão</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                O servidor do WhatsApp está offline. Por favor, inicie o <code className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-300">wa-server</code> para começar a enviar mensagens.
              </p>
              <button onClick={() => setShowQrPanel(true)} className="mt-2 px-5 py-2.5 bg-brand-gold text-black rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 hover:brightness-110 transition-all">
                Conectar Agora
              </button>
            </div>
          )}

          {filteredChats.map(chat => {
            const tags = chatTags(chat.id);
            const isSelected = selectedChat?.id === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={`w-full text-left px-5 py-3.5 border-b border-white/[0.03] transition-all relative group
                  ${isSelected ? 'bg-brand-gold/[0.06] border-l-[3px] !border-l-brand-gold pl-[17px]' : 'border-l-[3px] border-l-transparent hover:bg-white/[0.02]'}
                `}
              >
                <div className="flex gap-3.5 items-center">
                  <div className="relative shrink-0">
                    <Avatar chat={chat} size="lg" />
                    {chat.unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-gold text-black text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 border-2 border-[#050508]">
                        {chat.unread > 99 ? '99+' : chat.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className={`text-[13px] font-semibold truncate pr-2 ${isSelected ? 'text-brand-gold' : 'text-zinc-100'}`}>
                        {chat.name}
                      </span>
                      <span className={`text-[10px] whitespace-nowrap shrink-0 mt-0.5 ${chat.unread > 0 ? 'text-brand-gold font-bold' : 'text-zinc-500'}`}>
                        {formatTime(chat.lastTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {chat.unread === 0 && chat.lastMessage && <CheckCheck className="w-3.5 h-3.5 text-brand-gold/70 shrink-0" />}
                      <p className={`text-[12px] truncate ${chat.unread > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                        {chat.lastMessage || <span className="italic opacity-50">Inicie uma conversa</span>}
                      </p>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {tags.map(tag => (
                          <span key={tag.id} className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-md border font-medium ${tag.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Status Connection Banner */}
        <div className="px-4 py-3 border-t border-white/[0.04] bg-[#030305] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${statusConfig.cls}`}>
              <StatusIcon className={`w-4 h-4 ${wsStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">NGHUB Server</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                <span className={`text-[10px] font-medium ${statusConfig.cls}`}>{statusConfig.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Col 2: Conversation Area ══ */}
      <div className="flex-1 flex flex-col bg-[#07070a] min-w-0 relative z-0" onClick={() => setShowTagMenu(false)}>
        {/* Chat Background Pattern (Subtle) */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {selectedChat ? (
          <>
            {/* ── Chat Header ── */}
            <div className="h-[72px] border-b border-white/[0.05] bg-[#0a0a0e]/95 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 relative z-10">
              <div className="flex items-center gap-4">
                <Avatar chat={selectedChat} size="md" />
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="bg-[#15151a] border border-brand-gold/40 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 ring-brand-gold/20 w-48 transition-all"
                      />
                      <button onClick={saveName} className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-md bg-white/5 text-zinc-400 hover:bg-white/10 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => { setEditedName(selectedChat.name); setEditingName(true); }}>
                      <h3 className="text-white font-bold text-sm tracking-wide">{selectedChat.name}</h3>
                      <Pencil className="w-3 h-3 text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-all" />
                    </div>
                  )}
                  <p className="text-[11px] text-brand-gold/80 font-medium mt-0.5 flex items-center gap-1.5">
                    {selectedChat.phone || (selectedChat.isGroup ? 'Grupo' : 'Contato')}
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="text-zinc-500">Toque para ver os dados</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Header Action Buttons */}
                <button className="w-10 h-10 rounded-full hover:bg-white/[0.04] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <Video className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-white/[0.04] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <Phone className="w-4 h-4" />
                </button>
                
                <div className="w-px h-6 bg-white/[0.06] mx-1" />

                {/* Tag Button */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setShowTagMenu(!showTagMenu)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                      ${chatTags(selectedChat.id).length > 0
                        ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.05]'}`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Etiquetas</span>
                    {chatTags(selectedChat.id).length > 0 && (
                      <span className="bg-brand-gold text-black text-[10px] font-bold px-1.5 rounded-md">{chatTags(selectedChat.id).length}</span>
                    )}
                  </button>
                  {showTagMenu && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-[#111116] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-48 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
                      <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Atribuir Etiqueta</span>
                      </div>
                      <div className="p-1.5">
                        {TAGS.map(tag => {
                          const active = chatTags(selectedChat.id).some(t => t.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(selectedChat.id, tag)}
                              className={`w-full text-left px-3 py-2.5 text-[12px] font-medium rounded-lg transition-all flex items-center gap-3
                                ${active ? 'bg-white/[0.06] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${active ? tag.dot : 'bg-zinc-700'}`} />
                              {tag.label}
                              {active && <Check className="w-3.5 h-3.5 ml-auto text-brand-gold" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button className="w-10 h-10 rounded-full hover:bg-white/[0.04] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <Search className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-white/[0.04] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar relative z-10">
              {loadingMsgs ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
                  <span className="text-sm">Buscando histórico protegido...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="bg-[#111116] border border-white/[0.05] rounded-2xl p-6 max-w-sm text-center shadow-xl">
                    <ShieldCheck className="w-10 h-10 text-brand-gold/60 mx-auto mb-4" />
                    <h4 className="text-white font-bold text-sm mb-2">Mensagens Criptografadas</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Suas mensagens com <span className="text-zinc-200 font-medium">{selectedChat.name}</span> são seguras. Ninguém fora desta conversa pode ler ou ouvi-las.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <span className="text-[10px] font-medium text-brand-gold bg-brand-gold/[0.08] border border-brand-gold/20 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                      Início da Conversa
                    </span>
                  </div>
                  {messages.map((msg, i) => {
                    const showTail = i === 0 || messages[i-1].fromMe !== msg.fromMe;
                    return (
                      <div key={`${msg.id}-${i}`} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 relative shadow-md
                          ${msg.fromMe
                            ? `bg-gradient-to-br from-[#2a261a] to-[#1c1911] border border-brand-gold/20 text-white ${showTail ? 'rounded-t-2xl rounded-bl-2xl rounded-br-sm' : 'rounded-2xl'}`
                            : `bg-[#15151a] border border-white/[0.05] text-zinc-100 ${showTail ? 'rounded-t-2xl rounded-br-2xl rounded-bl-sm' : 'rounded-2xl'}`
                          }`}
                        >
                          {msg.type === 'image' && (
                            <img src={`http://localhost:5000/media/${msg.chatId}/${msg.id}`} alt="Mídia" className="rounded-lg max-w-[240px] mb-2 object-cover" />
                          )}
                          {msg.type === 'video' && (
                            <video src={`http://localhost:5000/media/${msg.chatId}/${msg.id}`} controls className="rounded-lg max-w-[240px] mb-2" />
                          )}
                          {msg.type === 'audio' && (
                            <audio src={`http://localhost:5000/media/${msg.chatId}/${msg.id}`} controls className="max-w-[240px] mb-2 h-10" />
                          )}
                          {msg.type === 'document' && (
                            <a href={`http://localhost:5000/media/${msg.chatId}/${msg.id}`} download target="_blank" rel="noreferrer" className="text-brand-gold hover:underline text-sm mb-2 flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                              <Paperclip className="w-4 h-4 shrink-0" /> <span className="truncate">{msg.fileName || 'Arquivo'}</span>
                            </a>
                          )}
                          {(msg.body || msg.caption) && (
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.caption || msg.body}</p>
                          )}
                          <div className={`flex items-center justify-end gap-1.5 mt-1 -mb-1 ${msg.fromMe ? 'text-brand-gold/70' : 'text-zinc-500'}`}>
                            <span className="text-[10px] font-medium">{formatMsgTime(msg.timestamp)}</span>
                            {msg.fromMe && <CheckCheck className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            <div className="px-5 py-4 bg-[#0a0a0e] border-t border-white/[0.05] shrink-0 relative z-10">
              {wsStatus !== 'ready' && (
                <div className="flex items-center gap-3 mb-3 px-4 bg-red-500/10 border border-red-500/20 rounded-xl py-2.5">
                  <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-200/80 flex-1 font-medium">Conexão interrompida. As mensagens não serão enviadas.</p>
                  <button onClick={() => setShowQrPanel(true)} className="text-xs text-white bg-red-500/20 hover:bg-red-500/40 px-3 py-1 rounded-lg font-bold transition-all">Reconectar</button>
                </div>
              )}
              <form onSubmit={e => sendMessage(e)} className="flex gap-3 items-end">
                <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} />
                <div className="flex gap-1 mb-1.5">
                  <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                
                {isRecording ? (
                  <div className="flex-1 bg-[#15151a] border border-red-500/20 rounded-2xl flex items-center gap-3 px-4 py-3.5 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold tracking-widest text-sm">
                      {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-500 text-xs ml-2">Gravando áudio...</span>
                  </div>
                ) : (
                  <div className="flex-1 bg-[#15151a] border border-white/[0.08] rounded-2xl focus-within:border-brand-gold/40 focus-within:ring-1 focus-within:ring-brand-gold/20 transition-all shadow-inner overflow-hidden flex items-center">
                    <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      socketRef.current?.emit('typing', { chatId: selectedChat.id });
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="w-full bg-transparent px-4 py-3.5 text-[14px] text-white placeholder-zinc-600 focus:outline-none resize-none max-h-32 custom-scrollbar"
                      style={{ minHeight: '52px' }}
                    />
                  </div>
                )}

                <div className="mb-1">
                  {newMessage.trim() && !isRecording ? (
                    <button
                      type="submit"
                      className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center text-black hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.4)] shrink-0 group"
                    >
                      <Send className="w-5 h-5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all shrink-0 animate-pulse"
                    >
                      <StopCircle className="w-6 h-6" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-12 h-12 bg-white/[0.05] border border-white/[0.08] rounded-full flex items-center justify-center text-brand-gold hover:bg-brand-gold/10 transition-all shrink-0"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 select-none bg-[#050508] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-gold/[0.03] via-[#050508] to-[#050508]" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#1a1a24] to-[#0d0d14] border border-white/5 flex items-center justify-center mb-8 shadow-2xl relative">
                <div className="absolute inset-0 bg-brand-gold/10 blur-2xl rounded-full" />
                <Smartphone className="w-10 h-10 text-brand-gold/80 relative z-10" />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#0a0a0e] flex items-center justify-center border-4 border-[#050508]">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">NGHUB Web</h2>
              <p className="text-sm text-zinc-500 max-w-md text-center leading-relaxed mb-8">
                {wsStatus === 'ready' 
                  ? 'Selecione uma conversa ao lado para começar a enviar e receber mensagens criptografadas em tempo real.' 
                  : 'Conecte seu dispositivo para enviar e receber mensagens sem precisar manter o celular online.'}
              </p>
              {wsStatus !== 'ready' && (
                <button onClick={() => setShowQrPanel(true)} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Conectar Dispositivo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ Col 3: Copilot IA (Redesenhado) ══ */}
      <div className="w-[320px] flex flex-col bg-[#050508]/90 backdrop-blur-2xl border-l border-white/[0.06] shrink-0 relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-gold/[0.08] via-brand-gold/[0.02] to-transparent pointer-events-none" />

        <div className="px-5 py-5 border-b border-white/[0.04] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-yellow-600 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <BrainCircuit className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-white tracking-wide block">Copilot IA</span>
              <span className="text-[10px] text-brand-gold font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                Análise em Tempo Real
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
          {selectedChat ? (
            <>
              {/* ── Botão Analisar ── */}
              <button 
                onClick={handleAnalyzeChat}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.2)] disabled:opacity-50 transition-all"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAnalyzing ? 'Analisando histórico...' : 'Gerar Análise com IA'}
              </button>

              {aiAnalysis[selectedChat.id] && (
                <>
                  {/* ── Análise da IA ── */}
                  <div className="bg-[#0f0f14] border border-white/[0.05] rounded-2xl p-4 shadow-lg relative overflow-hidden group mt-4">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Activity className="w-16 h-16 text-brand-gold" />
                    </div>
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <Sparkles className="w-4 h-4 text-brand-gold" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">Análise da Conversa</span>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <div>
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] text-zinc-500 font-medium">Sentimento do Cliente</span>
                          <span className={`text-[10px] font-bold ${aiAnalysis[selectedChat.id].sentimentColor}`}>{aiAnalysis[selectedChat.id].sentiment}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                        <p className="text-[12px] text-zinc-300 leading-relaxed">
                          {aiAnalysis[selectedChat.id].summary}
                        </p>
                      </div>

                      <div className="bg-brand-gold/[0.05] border border-brand-gold/10 p-3 rounded-xl">
                        <p className="text-[11px] text-brand-gold/80 font-bold uppercase mb-1">Direcionamento (Ação)</p>
                        <p className="text-[12px] text-brand-gold leading-relaxed">
                          {aiAnalysis[selectedChat.id].action}
                        </p>
                      </div>
                    </div>
                  </div>

              {/* ── Respostas Rápidas (Sugestões) ── */}
              <div className="bg-gradient-to-b from-[#181610] to-[#0f0f14] border border-brand-gold/20 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-brand-gold fill-brand-gold/20" />
                  <span className="text-[11px] font-bold text-brand-gold uppercase tracking-wider">Sugestões de Resposta</span>
                </div>
                
                <div className="space-y-2.5">
                  {(aiAnalysis[selectedChat.id]?.suggestedReplies || []).map((sugestao: string, idx: number) => (
                    <div key={idx} className="group/reply bg-[#0a0a0e] border border-white/[0.05] hover:border-brand-gold/30 rounded-xl p-3 transition-all cursor-pointer">
                      <p className="text-[12px] text-zinc-400 group-hover/reply:text-white leading-relaxed mb-3">
                        "{sugestao}"
                      </p>
                      <div className="flex gap-2 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                        <button 
                          onClick={() => sendMessage(undefined, sugestao)}
                          className="flex-1 py-1.5 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-black rounded-lg text-[10px] font-bold transition-all"
                        >
                          Enviar Direto
                        </button>
                        <button 
                          onClick={() => setNewMessage(sugestao)}
                          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </>
              )}

              {/* ── Etiquetas Inteligentes ── */}
              <div className="bg-[#0f0f14] border border-white/[0.05] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Classificação Automática</span>
                  </div>
                  <button className="text-[10px] text-brand-gold hover:underline">Editar</button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => {
                    const active = chatTags(selectedChat.id).some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(selectedChat.id, tag)}
                        className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition-all shadow-sm
                          ${active ? `${tag.color} ring-1 ring-white/10` : 'bg-[#15151a] border-white/[0.05] text-zinc-500 hover:text-white hover:border-white/20'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? tag.dot : 'bg-zinc-700'}`} />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perfil Resumido ── */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-3">
                <Avatar chat={selectedChat} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[12px] font-bold truncate">{selectedChat.name}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5">{selectedChat.phone || 'N/A'}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-gold/[0.05] via-transparent to-transparent opacity-50" />
              <div className="w-20 h-20 rounded-full bg-brand-gold/[0.05] border border-brand-gold/10 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 rounded-full border-t border-brand-gold/30 animate-spin" style={{ animationDuration: '3s' }} />
                <BrainCircuit className="w-8 h-8 text-brand-gold/60" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">Copilot em Espera</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed max-w-[200px]">
                Selecione uma conversa para ativar a análise inteligente, sugestões de resposta e insights de CRM automáticos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversas;