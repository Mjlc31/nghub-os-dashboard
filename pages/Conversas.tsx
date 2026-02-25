import React, { useState, useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import {
  MessageSquare, Send, Users, Search, Smartphone,
  MoreVertical, Wand2, PhoneCall, Video, Check, CheckCheck, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface MessagingProps {
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

interface MessageData {
  id: string;
  from: string;
  to: string;
  author: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
}

interface ChatSession {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: number;
  unread: number;
  phone: string;
}

const Conversas: React.FC<MessagingProps> = ({ onNotify }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'qr' | 'authenticated' | 'disconnected'>('connecting');
  const [qrCodeData, setQrCodeData] = useState<string>('');

  // Chat Data
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket Connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000'); // Conecta no Microserviço WA-Server Node.js
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔗 Conectado ao Servidor WhatsApp Base');
    });

    newSocket.on('qr', (qr) => {
      setConnectionStatus('qr');
      setQrCodeData(qr);
    });

    newSocket.on('ready', () => {
      setConnectionStatus('authenticated');
      onNotify('success', 'WhatsApp Sincronizado com Sucesso!');
      loadMockChats(); // To be replaced with real Supabase / client chats fetching
    });

    newSocket.on('authenticated', () => {
      setConnectionStatus('authenticated');
    });

    newSocket.on('disconnected', () => {
      setConnectionStatus('disconnected');
      onNotify('error', 'Sessão do WhatsApp desconectada.');
    });

    newSocket.on('message', (msg: MessageData) => {
      // Receives real-time messages
      setMessages((prev) => [...prev, msg]);

      // Update chat list last message
      setChats(prevChats => {
        const chatExists = prevChats.some(c => c.phone === (msg.fromMe ? msg.to : msg.from));
        if (!chatExists) return prevChats;

        return prevChats.map(c => {
          if (c.phone === (msg.fromMe ? msg.to : msg.from)) {
            return { ...c, lastMessage: msg.body, lastTime: msg.timestamp, unread: msg.fromMe ? 0 : c.unread + 1 };
          }
          return c;
        });
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMockChats = () => {
    // Scaffold UI waiting for Supabase CRM table sync later
    setChats([
      { id: '1', name: 'Johan Putter', phone: '5511999999991@c.us', lastMessage: 'Como funciona essa integração?', lastTime: Date.now() / 1000, unread: 2 },
      { id: '2', name: 'Carla Brandão', phone: '5511999999992@c.us', lastMessage: 'Obrigado. Gostei do material.', lastTime: (Date.now() / 1000) - 3600, unread: 0 },
      { id: '3', name: 'Daniel Macedo', phone: '5511999999993@c.us', lastMessage: 'Podemos fechar negócio?', lastTime: (Date.now() / 1000) - 86400, unread: 0 },
    ]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const res = await fetch('http://localhost:5000/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedChat.phone, message: newMessage })
      });
      const data = await res.json();

      if (data.success) {
        setNewMessage('');
        // The socket will receive the 'message_create' event naturally backing it to UI
      }
    } catch (err) {
      console.error(err);
      onNotify('error', 'Erro ao enviar mensagem');
    }
  };

  // UI rendering based on Connection Status
  if (connectionStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] animate-pulse">
        <Loader2 className="w-12 h-12 text-brand-gold animate-spin mb-4" />
        <h2 className="text-xl text-white font-serif">Conectando ao WhatsApp Engine...</h2>
        <p className="text-zinc-500 text-sm mt-2">Acordando o microserviço e recuperando a sessão.</p>
      </div>
    );
  }

  if (connectionStatus === 'qr' || connectionStatus === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)]">
        <div className="bg-[#0f0f13] border border-white/10 p-10 rounded-2xl shadow-2xl flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 blur-[80px] rounded-full pointer-events-none"></div>

          <Smartphone className="w-12 h-12 text-zinc-400 mb-6" />
          <h2 className="text-2xl font-serif text-white font-bold mb-2">WhatsApp Desconectado</h2>
          <p className="text-zinc-400 text-center text-sm max-w-sm mb-8">
            Abra o WhatsApp no seu celular, vá em "Aparelhos Conectados" e aponte a câmera para parear o NGHUB OS.
          </p>

          <div className="bg-white p-4 rounded-xl shadow-inner shadow-brand-gold/20 glow-effect border border-brand-gold/30">
            {qrCodeData ? (
              <QRCodeSVG value={qrCodeData} size={256} bgColor="#ffffff" fgColor="#000000" />
            ) : (
              <div className="w-[256px] h-[256px] bg-zinc-100 animate-pulse flex items-center justify-center">Gerando...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#050507] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">

      {/* 1. Left Column: Chats List */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#08080a]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-gold" /> Chats
          </h2>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full bg-[#121216] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 flex gap-3 relative
                ${selectedChat?.id === chat.id ? 'bg-brand-gold/5 border-l-2 border-l-brand-gold' : 'border-l-2 border-l-transparent'}
              `}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center font-bold text-zinc-400 shrink-0">
                {chat.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-semibold text-white truncate pr-2">{chat.name}</h4>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                    {format(new Date(chat.lastTime * 1000), 'HH:mm')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate pr-6">{chat.lastMessage}</p>
                {chat.unread > 0 && (
                  <span className="absolute right-4 bottom-4 bg-brand-gold text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Middle Column: Active Chat Context */}
      <div className="flex-1 flex flex-col bg-[#0a0a0c] relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-white/5 bg-[#08080a]/80 backdrop-blur flex items-center px-6 justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 font-bold">
                  {selectedChat.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{selectedChat.name}</h3>
                  <span className="text-xs text-brand-gold">Em Negociação</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <Video className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                <PhoneCall className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
                <MoreVertical className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-chat-pattern">
              <div className="text-center my-4">
                <span className="bg-zinc-900/50 border border-white/5 text-zinc-500 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Hoje</span>
              </div>

              {/* Default mockup message */}
              <div className="flex justify-start">
                <div className="max-w-[70%] bg-[#1a1a20] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2 relative">
                  <p className="text-sm text-zinc-200">Olá! Vi a masterclass e queria entender como conectar o software ao meu negócio.</p>
                  <span className="text-[10px] text-zinc-500 mt-1 block text-right">08:00</span>
                </div>
              </div>

              {/* Live Socket Messages Feed */}
              {messages.filter(m => m.from === selectedChat.phone || m.to === selectedChat.phone).map((msg, i) => (
                <div key={i} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 relative
                     ${msg.fromMe
                      ? 'bg-gradient-to-br from-[#2a2315] to-[#1e190f] border border-brand-gold/30 rounded-tr-sm'
                      : 'bg-[#1a1a20] border border-white/5 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg.body}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-zinc-500">
                        {format(new Date(msg.timestamp * 1000), 'HH:mm')}
                      </span>
                      {msg.fromMe && <CheckCheck className="w-3 h-3 text-brand-gold" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className="p-4 bg-[#08080a] border-t border-white/5">
              <form onSubmit={sendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-[#121216] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-gradient-to-br from-brand-gold to-[#a18131] rounded-xl flex items-center justify-center text-black shadow-lg hover:shadow-brand-gold/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecione um chat para iniciar a conversa.</p>
          </div>
        )}
      </div>

      {/* 3. Right Column: AI Copilot Assistant */}
      <div className="w-80 border-l border-white/5 bg-[#08080a] flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-40 bg-brand-gold/5 blur-[50px] pointer-events-none"></div>

        <div className="p-5 border-b border-white/5 relative z-10 flex items-center gap-3">
          <Wand2 className="w-5 h-5 text-brand-gold" />
          <h2 className="text-md font-serif font-bold text-white">AI Copilot</h2>
        </div>

        {selectedChat ? (
          <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar relative z-10">

            {/* Auto Action Suggestion */}
            <div className="bg-gradient-to-b from-[#18150f] to-[#12100b] border border-brand-gold/20 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                  <Users className="w-3 h-3" />
                </div>
                <h4 className="text-xs font-bold text-brand-gold uppercase tracking-wider">Ação Recomendada</h4>
              </div>
              <p className="text-sm text-zinc-300 mb-3">O lead demonstrou claro interesse de compra. Mover para Qualificado?</p>
              <button className="w-full py-2 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 rounded-lg text-brand-gold text-xs font-bold transition-colors">
                Atualizar Estágio CRM
              </button>
            </div>

            {/* Smart Reply Suggestion */}
            <div className="bg-[#121216] border border-white/5 rounded-xl p-4">
              <h4 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-widest">Resposta Sugerida</h4>
              <div className="bg-[#1a1a20] p-3 rounded-lg border border-white/5 mb-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Fantástico, {selectedChat.name.split(' ')[0]}! O nosso sistema conecta nativamente no seu negócio. Qual o melhor horário amanhã para uma rápida demo em vídeo?
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white transition-colors">
                  Descartar
                </button>
                <button
                  onClick={() => setNewMessage(`Fantástico, ${selectedChat.name.split(' ')[0]}! O nosso sistema conecta nativamente no seu negócio. Qual o melhor horário amanhã para uma rápida demo em vídeo?`)}
                  className="flex-1 py-2 bg-white text-black font-bold rounded-lg text-xs transition-colors hover:bg-zinc-200"
                >
                  Usar Texto
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Wand2 className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">O copiloto analisará a conversa em tempo real e sugerirá ações automáticas.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Conversas;