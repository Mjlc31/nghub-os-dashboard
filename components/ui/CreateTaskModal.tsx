// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, ChevronDown, CheckCircle2, User, Calendar, Flag, Tag as TagIcon,
  Link2, Maximize2, Sparkles, Folder, PlayCircle, Clock,
  FileText, List, Type, Table, Paperclip, Bell
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Priority, Tag } from '../../types';
import useEscapeKey from '../../hooks/useEscapeKey';

const PRIORITIES: { value: Priority; label: string; color: string; icon: string }[] = [
  { value: 'Urgent', label: 'Urgente',  color: 'text-red-400 bg-red-500/10',    icon: 'ðŸ”´' },
  { value: 'High',   label: 'Alta',     color: 'text-orange-400 bg-orange-500/10', icon: 'ðŸŸ ' },
  { value: 'Normal', label: 'Normal',   color: 'text-blue-400 bg-blue-500/10',  icon: 'ðŸ”µ' },
  { value: 'Low',    label: 'Baixa',    color: 'text-gray-400 bg-white/5',         icon: 'âšª' },
  { value: 'None',   label: 'Nenhuma',  color: 'text-gray-600 bg-transparent',  icon: 'â€”' },
];



interface Props {
  onClose: () => void;
  initialListId?: string;
}

export const CreateTaskModal = ({ onClose, initialListId }: Props) => {
  const { taskStatuses, addTask, lists, spaces, folders, rhTeam } = useAppContext();
  useEscapeKey(onClose);

  const [activeTab, setActiveTab] = useState<'tarefa' | 'doc' | 'lembrete' | 'quadro' | 'painel'>('tarefa');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState(taskStatuses[0]?.id || 's1');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | undefined>(initialListId);
  
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);

  const currentStatus = taskStatuses.find(s => s.id === statusId);
  const currentPriority = PRIORITIES.find(p => p.value === priority);
  const currentList = lists.find(l => l.id === selectedListId);
  const currentFolder = currentList?.folderId ? folders.find(f => f.id === currentList.folderId) : null;
  const currentSpace = currentList ? spaces.find(s => s.id === currentList.spaceId) : null;

  const toggleAssignee = (avatar: string) => {
    setAssignees(prev => prev.includes(avatar) ? prev.filter(a => a !== avatar) : [...prev, avatar]);
  };

  const handleSubmit = () => {
    if (activeTab === 'tarefa') {
      if (!name.trim()) return;
      addTask({
        name: name.trim(),
        description,
        statusId,
        listId: selectedListId,
        priority,
        dueDate,
        assignees: assignees.length > 0 ? assignees : [],
        tags: [],
        relatedTaskIds: [],
        subtasks: [],
        timeSpent: 0,
        isTimerRunning: false,
      });
      onClose();
    } else {
      // Mock para as outras abas
      console.log('Criado:', activeTab, name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[800px] bg-[#1a1a1a] border border-[#2b2b2b] shadow-2xl rounded-xl flex flex-col overflow-hidden"
        style={{ minHeight: '450px' }}
      >
        {/* Abas Superiores */}
        <div className="flex items-center px-4 pt-3 gap-6 border-b border-[#2b2b2b] bg-[#141414]">
          <Tab active={activeTab === 'tarefa'} onClick={() => { setActiveTab('tarefa'); setName(''); }}>Tarefa</Tab>
          <Tab active={activeTab === 'doc'} onClick={() => { setActiveTab('doc'); setName(''); }}>Documento</Tab>
          <Tab active={activeTab === 'lembrete'} onClick={() => { setActiveTab('lembrete'); setName(''); }}>Lembrete</Tab>
          <Tab active={activeTab === 'quadro'} onClick={() => { setActiveTab('quadro'); setName(''); }}>Quadro branco</Tab>
          <Tab active={activeTab === 'painel'} onClick={() => { setActiveTab('painel'); setName(''); }}>PainÃ©is</Tab>

          <div className="flex-1" />
          <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full mb-2 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* LocalizaÃ§Ã£o da Tarefa (Apenas para Tarefa) */}
        {activeTab === 'tarefa' && (
          <div className="px-6 py-3 flex items-center gap-2 text-[11px] text-gray-400 font-medium bg-[#141414] relative border-b border-[#2b2b2b]">
            <span 
              onClick={() => setShowListMenu(!showListMenu)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors border border-transparent hover:border-white/10"
            >
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              {currentList ? (
                <>Em: {currentSpace?.name}{currentFolder ? ` / ${currentFolder.name}` : ''} / <strong className="text-white ml-0.5">{currentList.name}</strong></>
              ) : (
                'Selecionar Lista...'
              )}
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
            </span>

            {/* List Selection Dropdown */}
            {showListMenu && (
              <div className="absolute top-full left-6 mt-1 bg-[#2b2b2b] border border-[#444] rounded-lg shadow-xl z-50 w-72 max-h-64 overflow-y-auto py-1">
                <div className="px-3 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-wide">Selecione uma lista</div>
                <button
                  onClick={() => { setSelectedListId(undefined); setShowListMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors text-left ${!selectedListId ? 'text-white bg-white/5' : 'text-gray-300'}`}
                >
                  <List className="w-3.5 h-3.5 text-gray-400" />
                  Nenhuma lista (Tudo)
                  {!selectedListId && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                </button>
                {lists.map(list => {
                  const s = spaces.find(sp => sp.id === list.spaceId);
                  const f = list.folderId ? folders.find(fo => fo.id === list.folderId) : null;
                  return (
                    <button
                      key={list.id}
                      onClick={() => { setSelectedListId(list.id); setShowListMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors text-left ${selectedListId === list.id ? 'text-white bg-white/5' : 'text-gray-300'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color || '#3b82f6' }} />
                      <div className="flex flex-col">
                        <span>{list.name}</span>
                        <span className="text-[9px] text-gray-500">{s?.name}{f ? ` / ${f.name}` : ''}</span>
                      </div>
                      {selectedListId === list.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Corpo principal */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'tarefa' && (
            <>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nome da Tarefa ou digite '/' para comandos"
                className="w-full bg-transparent text-2xl font-bold text-gray-100 placeholder-[#555] outline-none mb-6"
              />

              {/* BotÃµes de Propriedades da Tarefa */}
              <div className="flex items-center gap-2 mb-6 flex-wrap relative">
                <div className="relative">
                  <button 
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-[#333] hover:border-[#555] transition-colors text-xs font-bold text-gray-300"
                  >
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: currentStatus?.color || '#555' }} />
                    {currentStatus?.name?.toUpperCase() || 'STATUS'}
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-[#2b2b2b] border border-[#444] rounded-lg shadow-xl z-50 w-48 py-1">
                      {taskStatuses.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setStatusId(s.id); setShowStatusMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left"
                        >
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-transparent hover:bg-white/5 hover:border-[#333] transition-colors text-xs font-medium text-gray-400"
                  >
                    {assignees.length === 0 ? (
                      <span className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </span>
                    ) : (
                      <div className="flex -space-x-1">
                        {rhTeam
                          .filter(u => assignees.includes(u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`))
                          .map(u => {
                            const uAvatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`;
                            return (
                              <img key={u.id} src={uAvatar} alt={u.name} title={u.name} className="w-7 h-7 rounded-full object-cover border border-[#1a1a1a]" />
                            );
                          })}
                      </div>
                    )}
                  </button>
                  {showAssigneeMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-[#2b2b2b] border border-[#444] rounded-lg shadow-xl z-50 w-48 py-1">
                      {rhTeam.map(u => {
                        const uAvatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3b82f6&color=fff`;
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleAssignee(uAvatar)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                          >
                            <img src={uAvatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                            {u.name}
                            {assignees.includes(uAvatar) && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-transparent hover:bg-white/5 hover:border-[#333] transition-colors text-xs font-medium text-gray-400 cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 border border-dashed rounded-sm" /> 
                    {dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : 'Datas'}
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                  </label>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded border border-transparent hover:bg-white/5 hover:border-[#333] transition-colors text-xs font-medium ${priority === 'None' ? 'text-gray-400' : currentPriority?.color}`}
                  >
                    <Flag className="w-3.5 h-3.5" /> 
                    {priority === 'None' ? 'Prioridade' : currentPriority?.label}
                  </button>
                  {showPriorityMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-[#2b2b2b] border border-[#444] rounded-lg shadow-xl z-50 w-36 py-1">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value}
                          onClick={() => { setPriority(p.value); setShowPriorityMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors ${p.color}`}
                        >
                          {p.icon} {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-[#333] mx-1" />

                <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-[#333]">
                  <TagIcon className="w-3.5 h-3.5" />
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-[#333]">
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Pressione '/' para comandos"
                className="flex-1 w-full bg-transparent text-[13px] text-gray-300 placeholder-[#555] outline-none resize-none"
              />

              <div className="flex items-center gap-2 mt-4">
                <button className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" /> IA
                </button>
              </div>
            </>
          )}

          {activeTab === 'doc' && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <button className="flex items-center gap-2 w-fit px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-[#333] text-[13px] font-medium text-gray-300 mb-6 transition-colors">
                <List className="w-4 h-4 text-gray-400" /> Meus documentos <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
              
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="DÃª um nome a este documento..."
                className="w-full bg-transparent text-2xl font-bold text-gray-400 placeholder-[#555] outline-none mb-8"
              />

              <div className="space-y-3 pl-2">
                <button className="flex items-center gap-3 text-[14px] text-gray-400 hover:text-gray-200 transition-colors">
                  <FileText className="w-4 h-4" /> Comece a escrever
                </button>
                <button className="flex items-center gap-3 text-[14px] text-purple-400 hover:text-purple-300 transition-colors">
                  <Sparkles className="w-4 h-4" /> Escrever com IA
                </button>
                
                <div className="pt-4 pb-2 text-[12px] font-medium text-gray-500">Add new</div>
                
                <button className="flex items-center gap-3 text-[14px] text-gray-400 hover:text-gray-200 transition-colors">
                  <Table className="w-4 h-4" /> Tabela
                </button>
                <button className="flex items-center gap-3 text-[14px] text-gray-400 hover:text-gray-200 transition-colors">
                  <Type className="w-4 h-4" /> Coluna
                </button>
                <button className="flex items-center gap-3 text-[14px] text-gray-400 hover:text-gray-200 transition-colors">
                  <List className="w-4 h-4" /> Lista da ClickUp
                </button>
              </div>
            </div>
          )}

          {activeTab === 'lembrete' && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nome do lembrete ou digite '/' para comandos"
                className="w-full bg-transparent text-[22px] text-gray-400 placeholder-[#555] outline-none mb-4"
              />

              <button className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-300 transition-colors w-fit mb-6">
                <FileText className="w-4 h-4" /> Adicionar descriÃ§Ã£o
              </button>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-[#333] hover:bg-white/5 rounded-md text-[13px] font-medium text-gray-300 transition-colors">
                  <Calendar className="w-4 h-4 text-gray-400" /> Hoje
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-[#333] hover:bg-white/5 rounded-md text-[13px] font-medium text-gray-300 transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center font-bold text-[10px]">A</div> Para mim
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-[#333] hover:bg-white/5 rounded-md text-[13px] font-medium text-gray-300 transition-colors">
                  <Bell className="w-4 h-4 text-gray-400" /> Notifique-me
                </button>
              </div>
            </div>
          )}

          {activeTab === 'quadro' && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <button className="flex items-center gap-2 w-fit px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-[#333] text-[13px] font-medium text-gray-300 mb-6 transition-colors">
                <List className="w-4 h-4 text-gray-400" /> Meus Whiteboards <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
              
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="DÃª um nome a este Whiteboard..."
                className="w-full bg-transparent text-2xl font-bold text-gray-400 placeholder-[#555] outline-none"
              />
            </div>
          )}

          {activeTab === 'painel' && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <button className="flex items-center gap-2 w-fit px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-[#333] text-[13px] font-medium text-gray-300 mb-6 transition-colors">
                <List className="w-4 h-4 text-gray-400" /> Meus painÃ©is <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
              
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="DÃª um nome a este painel..."
                className="w-full bg-transparent text-2xl font-bold text-gray-400 placeholder-[#555] outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2b2b2b] bg-[#1a1a1a]">
          {activeTab === 'tarefa' ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#222] border border-[#333] rounded text-xs text-gray-400 cursor-pointer hover:bg-[#2b2b2b] transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Em Fazer
              </div>
            </div>
          ) : activeTab === 'lembrete' ? (
            <div className="flex items-center gap-3"></div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsPrivate(!isPrivate)}>
                <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${isPrivate ? 'bg-primary' : 'bg-[#444]'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-[13px] font-medium text-gray-300">Privado</span>
              </label>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {activeTab === 'lembrete' && (
              <button className="text-gray-500 hover:text-gray-300 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            
            {activeTab === 'tarefa' ? (
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <div className="flex items-center rounded-lg overflow-hidden shadow-lg shadow-primary/20">
                  <button
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold disabled:opacity-50 transition-colors border-r border-primary/20"
                  >
                    Criar Tarefa
                  </button>
                  <button className="px-2 py-2.5 bg-primary hover:bg-primary/90 text-white transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!name.trim() && activeTab !== 'lembrete'}
                className="px-4 py-2 bg-white text-black text-[13px] font-bold rounded-lg disabled:opacity-50 transition-colors hover:bg-gray-200"
              >
                {activeTab === 'doc' ? 'Criar documento' : 
                 activeTab === 'lembrete' ? 'Criar lembrete' : 
                 activeTab === 'quadro' ? 'Criar Whiteboard' : 'Criar painel'}
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
};

const Tab = ({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`pb-3 text-[13px] font-semibold border-b-2 transition-colors relative top-[1px] ${
      active ? 'border-gray-200 text-gray-100' : 'border-transparent text-gray-500 hover:text-gray-300'
    }`}
  >
    {children}
  </button>
);

