import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Send, Search, Smartphone,
  MoreVertical, Wand2, CheckCheck, Loader2,
  Tag, X, WifiOff, Users, Hash, LogOut,
  ChevronRight, Pencil, Check
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
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [localTags, setLocalTags] = useState<Record<string, ChatTag[]>>({});
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});

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
      onNotify('success', 'WhatsApp conectado!');
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
      // Fetch profile pics for visible chats
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
    // Fetch profile pic if missing
    const pic = profilePics[chat.id];
    if (!pic && !chat.profilePic) socketRef.current?.emit('get_profile_pic', { jid: chat.id });
  }, [profilePics]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const text = newMessage;
    setNewMessage('');
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`, chatId: selectedChat.id,
      body: text, timestamp: Math.floor(Date.now() / 1000), fromMe: true,
    }]);
    try {
      await fetch('http://localhost:5000/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedChat.id, message: text }),
      });
    } catch { onNotify('error', 'Erro ao enviar mensagem.'); }
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
    onNotify('success', 'Nome salvo!');
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/logout', { method: 'POST' });
      setShowLogoutConfirm(false);
    } catch { onNotify('error', 'Erro ao sair.'); }
  };

  const chatTags = (chatId: string) => localTags[chatId] || chats.find(c => c.id === chatId)?.tags || [];

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = fromUnixTime(ts);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ontem';
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const formatMsgTime = (ts: number) => ts ? format(fromUnixTime(ts), 'HH:mm') : '';

  const Avatar = ({ chat, size = 'md' }: { chat: ChatSession; size?: 'sm' | 'md' | 'lg' }) => {
    const pic = profilePics[chat.id] || chat.profilePic;
    const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size];
    if (pic) return <img src={pic} alt={chat.name} className={`${sz} rounded-full object-cover ring-1 ring-white/10`} />;
    if (chat.isGroup) return (
      <div className={`${sz} rounded-full bg-gradient-to-br from-blue-700 to-indigo-800 ring-1 ring-white/10 flex items-center justify-center`}>
        <Hash className="w-4 h-4 text-white/70" />
      </div>
    );
    return (
      <div className={`${sz} rounded-full bg-gradient-to-br ${getGradient(chat.name)} ring-1 ring-white/10 flex items-center justify-center font-semibold text-white`}>
        {chat.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const statusConfig = {
    connecting: { cls: 'text-amber-400', dot: 'bg-amber-400 animate-pulse', label: 'Conectando' },
    qr: { cls: 'text-blue-400', dot: 'bg-blue-400 animate-pulse', label: 'QR Scan' },
    ready: { cls: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Online' },
    disconnected: { cls: 'text-red-400', dot: 'bg-red-500', label: 'Offline' },
  }[wsStatus];

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl border border-[#1a1a1f] bg-[#050507] relative">

      {/* ── Logout Confirm ── */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center">
          <div className="bg-[#111115] border border-white/10 rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">Sair do WhatsApp?</h3>
            <p className="text-zinc-500 text-xs mb-5 leading-relaxed">Sua sessão será encerrada e um novo QR Code será gerado para reconexão.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2 text-xs text-zinc-400 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors font-medium">
                Cancelar
              </button>
              <button onClick={handleLogout} className="flex-1 py-2 text-xs text-white bg-red-600/80 hover:bg-red-600 rounded-xl transition-colors font-medium">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Panel ── */}
      {showQrPanel && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center">
          <div className="bg-[#0d0d10] border border-white/8 p-8 rounded-2xl shadow-2xl flex flex-col items-center relative max-w-sm w-full mx-4">
            <button onClick={() => setShowQrPanel(false)} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-5">
              <Smartphone className="w-6 h-6 text-brand-gold" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Conectar WhatsApp</h2>
            <p className="text-zinc-500 text-xs text-center mb-6 leading-relaxed">
              Abra o WhatsApp → toque nos 3 pontos → <span className="text-zinc-300 font-medium">Aparelhos Conectados</span> → Conectar
            </p>
            <div className="bg-white p-3 rounded-2xl shadow-xl ring-2 ring-brand-gold/30">
              {qrCodeData
                ? <img src={qrCodeData} alt="QR Code" className="w-[220px] h-[220px] rounded" />
                : <div className="w-[220px] h-[220px] bg-zinc-100 animate-pulse rounded flex items-center justify-center text-zinc-400 text-xs">Gerando...</div>
              }
            </div>
            <p className="text-zinc-700 text-[10px] mt-4">QR expira em ~60s · Atualiza automaticamente</p>
          </div>
        </div>
      )}

      {/* ══ Col 1: Sidebar ══ */}
      <div className="w-[300px] flex flex-col bg-[#07070a] border-r border-white/[0.05] shrink-0">

        {/* Sidebar Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-wide">Conversas</span>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${statusConfig.cls}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                <span className="text-[10px] font-medium">{statusConfig.label}</span>
              </div>
              {wsStatus !== 'ready' && (
                <button onClick={() => setShowQrPanel(true)} title="Conectar WhatsApp"
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                  <Smartphone className="w-3 h-3" />
                </button>
              )}
              {wsStatus === 'ready' && (
                <button onClick={() => setShowLogoutConfirm(true)} title="Sair do WhatsApp"
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:border-brand-gold/30 transition-colors"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {wsStatus === 'connecting' && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-700">
              <Loader2 className="w-4 h-4 animate-spin text-brand-gold/40" />
              <span className="text-xs">Conectando...</span>
            </div>
          )}
          {wsStatus === 'ready' && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-1 text-zinc-700">
              <MessageSquare className="w-5 h-5 opacity-30" />
              <span className="text-xs">Sincronizando conversas...</span>
            </div>
          )}
          {wsStatus === 'disconnected' && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-700 px-4 text-center">
              <WifiOff className="w-5 h-5 opacity-40" />
              <span className="text-xs leading-relaxed">Servidor offline.<br />Inicie o wa-server.</span>
            </div>
          )}

          {filteredChats.map(chat => {
            const tags = chatTags(chat.id);
            const isSelected = selectedChat?.id === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all relative group
                  ${isSelected ? 'bg-brand-gold/[0.05] border-l-2 !border-l-brand-gold pl-[14px]' : 'border-l-2 border-l-transparent'}
                `}
              >
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 mt-0.5">
                    <Avatar chat={chat} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-white truncate pr-2">{chat.name}</span>
                      <span className="text-[9px] text-zinc-600 whitespace-nowrap shrink-0">{formatTime(chat.lastTime)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">{chat.lastMessage || 'Sem mensagens'}</p>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {tags.map(tag => (
                          <span key={tag.id} className={`flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full border font-medium ${tag.color}`}>
                            <span className={`w-1 h-1 rounded-full ${tag.dot}`} />
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {chat.unread > 0 && (
                    <div className="shrink-0 mt-1">
                      <span className="bg-brand-gold text-black text-[8px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                        {chat.unread > 99 ? '99+' : chat.unread}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Col 2: Conversation ══ */}
      <div className="flex-1 flex flex-col bg-[#06060a] min-w-0" onClick={() => setShowTagMenu(false)}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="h-[60px] border-b border-white/[0.05] bg-[#07070a]/90 backdrop-blur-xl flex items-center px-5 justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Avatar chat={selectedChat} size="sm" />
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-brand-gold/40 w-40"
                      />
                      <button onClick={saveName} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingName(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-white font-medium text-xs">{selectedChat.name}</h3>
                      <button onClick={() => { setEditedName(selectedChat.name); setEditingName(true); }}
                        className="text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[9px] text-zinc-600 mt-0.5">{selectedChat.phone || (selectedChat.isGroup ? 'Grupo' : '')}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Tag Button */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setShowTagMenu(!showTagMenu)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all
                      ${chatTags(selectedChat.id).length > 0
                        ? 'bg-brand-gold/10 border-brand-gold/25 text-brand-gold'
                        : 'bg-white/[0.04] border-white/[0.06] text-zinc-500 hover:text-white'}`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>Etiqueta</span>
                    {chatTags(selectedChat.id).length > 0 && (
                      <span className="bg-brand-gold text-black text-[8px] font-bold px-1 rounded-full">{chatTags(selectedChat.id).length}</span>
                    )}
                  </button>
                  {showTagMenu && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#111115] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-40" onClick={e => e.stopPropagation()}>
                      {TAGS.map(tag => {
                        const active = chatTags(selectedChat.id).some(t => t.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(selectedChat.id, tag)}
                            className={`w-full text-left px-3 py-2.5 text-[11px] transition-colors flex items-center gap-2.5
                              ${active ? 'bg-white/5 text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? tag.dot : 'bg-zinc-700'}`} />
                            {tag.label}
                            {active && <Check className="w-3 h-3 ml-auto text-brand-gold" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => { setEditedName(selectedChat.name); setEditingName(true); }}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5 custom-scrollbar">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full gap-2 text-zinc-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Carregando mensagens...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-zinc-800">Nenhuma mensagem carregada</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <span className="text-[9px] text-zinc-700 bg-white/[0.03] border border-white/[0.05] px-3 py-1 rounded-full">
                      {messages.length} mensagens
                    </span>
                  </div>
                  {messages.map((msg, i) => (
                    <div key={`${msg.id}-${i}`} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[68%] rounded-2xl px-3.5 py-2
                        ${msg.fromMe
                          ? 'bg-[#1e1b10] border border-brand-gold/[0.15] rounded-tr-sm'
                          : 'bg-[#141418] border border-white/[0.06] rounded-tl-sm'
                        }`}
                      >
                        <p className="text-[12px] text-zinc-100 leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[9px] text-zinc-600">{formatMsgTime(msg.timestamp)}</span>
                          {msg.fromMe && <CheckCheck className="w-2.5 h-2.5 text-brand-gold/60" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-[#07070a] border-t border-white/[0.05] shrink-0">
              {wsStatus !== 'ready' && (
                <div className="flex items-center gap-2 mb-2.5 px-1 bg-amber-500/5 border border-amber-500/10 rounded-lg py-1.5">
                  <WifiOff className="w-3 h-3 text-amber-500/70 shrink-0 ml-1" />
                  <p className="text-[10px] text-amber-500/70 flex-1">WhatsApp não conectado</p>
                  <button onClick={() => setShowQrPanel(true)} className="text-[10px] text-brand-gold font-medium mr-1">Conectar →</button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex gap-2 items-center">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Mensagem..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-zinc-700 focus:outline-none focus:border-brand-gold/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center text-black hover:brightness-110 disabled:opacity-30 transition-all shadow-lg shadow-brand-gold/20 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 select-none">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm font-medium text-zinc-700">Nenhuma conversa selecionada</p>
            <p className="text-[11px] text-zinc-800 mt-1">
              {wsStatus === 'ready' ? 'Escolha um chat à esquerda' : 'Conecte o WhatsApp para começar'}
            </p>
          </div>
        )}
      </div>

      {/* ══ Col 3: Copilot ══ */}
      <div className="w-[260px] flex flex-col bg-[#07070a] border-l border-white/[0.05] shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-brand-gold/[0.04] to-transparent pointer-events-none" />

        <div className="px-4 py-4 border-b border-white/[0.05] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-brand-gold" />
            <span className="text-xs font-semibold text-white">Copilot IA</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-zinc-600 font-medium">LIVE</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar relative z-10">
          {selectedChat ? (
            <>
              {/* Contact Card */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest mb-2.5">Contato</p>
                <div className="flex items-center gap-2.5">
                  <Avatar chat={selectedChat} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[11px] font-semibold truncate">{selectedChat.name}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5">{selectedChat.phone || 'Grupo'}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />
                </div>
              </div>

              {/* Action Card */}
              <div className="bg-gradient-to-b from-[#15120a] to-[#0f0d07] border border-brand-gold/[0.15] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3 h-3 text-brand-gold" />
                  <span className="text-[9px] font-bold text-brand-gold uppercase tracking-wider">Ação Sugerida</span>
                </div>
                <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed">Considere mover este lead para "Qualificado" com base na conversa.</p>
                <button className="w-full py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 rounded-lg text-brand-gold text-[9px] font-bold transition-colors">
                  Atualizar CRM
                </button>
              </div>

              {/* Smart Reply */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest mb-2">Resposta Sugerida</p>
                <div className="bg-black/30 rounded-lg p-2.5 mb-2.5 border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Olá {selectedChat.name.split(' ')[0]}! Tenho algo especial pra você. Tem 5 min esta semana?
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button className="flex-1 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg text-[9px] text-zinc-500 transition-colors">Ignorar</button>
                  <button
                    onClick={() => setNewMessage(`Olá ${selectedChat.name.split(' ')[0]}! Tenho algo especial pra você. Tem 5 min esta semana?`)}
                    className="flex-1 py-1.5 bg-white text-black font-semibold rounded-lg text-[9px] transition-colors hover:bg-zinc-100"
                  >
                    Usar
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Tag className="w-3 h-3 text-zinc-600" />
                  <p className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest">Etiquetas</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(tag => {
                    const active = chatTags(selectedChat.id).some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(selectedChat.id, tag)}
                        className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border font-medium transition-all
                          ${active ? tag.color : 'bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-white hover:border-white/10'}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${active ? tag.dot : 'bg-zinc-700'}`} />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <Wand2 className="w-6 h-6 text-zinc-800 mb-3" />
              <p className="text-[10px] text-zinc-700 leading-relaxed">Selecione uma conversa para ativar o Copilot.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversas;