// @ts-nocheck
import React, { useState, useMemo } from 'react';
import ListView from './ListView';
import BoardView from './BoardView';
import TaskDashboard from './TaskDashboard';
import { useAppContext } from '../context/AppContext';
import { CreateTaskModal } from './ui/CreateTaskModal';
import { Client } from '../types';
import Modal from './ui/Modal';

// Componentes legados â€” stubs para compatibilidade
const Sidebar = (_props: any) => null;
const TopBar = (_props: any) => null;
const Overview = () => null;
const ClientList = (_props: any) => null;
const CalendarView = () => null;
const ClientBoardView = (_props: any) => null;
const SettingsModal = (_props: any) => null;
const DNAClientes = () => null;
const ClientDetailModal = (_props: any) => null;

type ViewType = 'overview' | 'task-dashboard' | 'tasks' | 'clients' | 'client-database' | 'client-board' | 'board' | 'calendar' | 'dna-clientes';

const ClickUpInterface = () => {
  const { tasks, setTasks, addTask, taskStatuses, clients, addClient, clientStatuses, updateClient, lists } = useAppContext();
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [selectedLocation, setSelectedLocation] = useState<{ type: 'space' | 'folder' | 'list', id: string } | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'status' | 'assignee'>('status');
  const [showClosed, setShowClosed] = useState(true);

  // Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Client Modal State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientStatus, setNewClientStatus] = useState('cs1');
  const [newClientFaturamento, setNewClientFaturamento] = useState('');
  const [newClientSegmento, setNewClientSegmento] = useState('');
  const [newClientRepositorio, setNewClientRepositorio] = useState('');
  const [newClientReuniao, setNewClientReuniao] = useState('');

  const handleAddItem = () => {
    if (currentView === 'clients' || currentView === 'client-board' || currentView === 'client-database') {
      setShowAddClientModal(true);
      setNewClientName('');
      if (clientStatuses.length > 0) setNewClientStatus(clientStatuses[0].id);
      setNewClientFaturamento('');
      setNewClientSegmento('');
      setNewClientRepositorio('');
      setNewClientReuniao('');
    } else {
      setShowAddModal(true);
    }
  };

  const handleCreateClient = () => {
    if (!newClientName.trim()) return;
    addClient({
      name: newClientName,
      status: newClientStatus,
      assignees: ['https://i.pravatar.cc/150?img=11'],
      faturamento: newClientFaturamento || '-',
      segmento: newClientSegmento || '-',
      repositorio: newClientRepositorio || '-',
      ultimaReuniao: newClientReuniao || '-'
    });
    setShowAddClientModal(false);
    setNewClientName('');
  };

  // Filter tasks based on search + priority + location
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedLocation) {
      if (selectedLocation.type === 'list') {
        result = result.filter(t => t.listId === selectedLocation.id);
      } else if (selectedLocation.type === 'folder') {
        const folderLists = lists?.filter(l => l.folderId === selectedLocation.id) || [];
        const listIds = folderLists.map(l => l.id);
        result = result.filter(t => t.listId && listIds.includes(t.listId));
      } else if (selectedLocation.type === 'space') {
        const spaceLists = lists?.filter(l => l.spaceId === selectedLocation.id) || [];
        const listIds = spaceLists.map(l => l.id);
        result = result.filter(t => t.listId && listIds.includes(t.listId));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    if (filterPriority) {
      result = result.filter(t => t.priority === filterPriority);
    }
    return result;
  }, [tasks, searchQuery, filterPriority, selectedLocation, lists]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    let result = clients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    // Priority filter doesn't apply to clients, but you could add other filters here
    return result;
  }, [clients, searchQuery]);

  return (
    <div className="flex h-full w-full font-sans overflow-hidden selection:bg-primary/30" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onOpenClientDetails={setSelectedClientDetails}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-[#141414]">
        <TopBar
          currentView={currentView}
          onOpenSettings={() => setShowSettings(true)}
          onViewChange={setCurrentView}
          onAddItem={handleAddItem}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterPriority={filterPriority}
          onFilterChange={setFilterPriority}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          showClosed={showClosed}
          onToggleClosed={() => setShowClosed(v => !v)}
        />
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {currentView === 'overview' && <div className="flex-1 overflow-auto custom-scrollbar"><Overview /></div>}
          {currentView === 'task-dashboard' && <div className="flex-1 overflow-auto custom-scrollbar"><TaskDashboard /></div>}
          {currentView === 'tasks' && (
            <ListView
              filteredTasks={filteredTasks}
              searchQuery={searchQuery}
              filterPriority={filterPriority}
              groupBy={groupBy}
              showClosed={showClosed}
              selectedLocation={selectedLocation}
            />
          )}
          {(currentView === 'clients' || currentView === 'client-database') && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <ClientList 
                filteredClients={filteredClients} 
                searchQuery={searchQuery}
                onOpenAddModal={handleAddItem}
              />
            </div>
          )}
          {currentView === 'client-board' && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <ClientBoardView
                filteredClients={filteredClients}
                searchQuery={searchQuery}
                onOpenAddModal={handleAddItem}
              />
            </div>
          )}
          {currentView === 'board' && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <BoardView
                filteredTasks={filteredTasks}
                searchQuery={searchQuery}
                filterPriority={filterPriority}
                groupBy={groupBy}
              />
            </div>
          )}
          {currentView === 'calendar' && <div className="flex-1 overflow-auto custom-scrollbar"><CalendarView /></div>}
          {currentView === 'dna-clientes' && <div className="flex-1 overflow-auto custom-scrollbar"><DNAClientes /></div>}
        </div>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {selectedClientDetails && (
        <ClientDetailModal
          isOpen={true}
          client={selectedClientDetails}
          onClose={() => setSelectedClientDetails(null)}
          onUpdate={(id: string, updates: Partial<Client>) => {
            updateClient(id, updates);
            setSelectedClientDetails(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {/* Nova Tarefa â€” modal completo */}
      {showAddModal && <CreateTaskModal onClose={() => setShowAddModal(false)} initialListId={selectedLocation?.type === 'list' ? selectedLocation.id : undefined} />}

      {/* Add Client Modal */}
      <Modal isOpen={showAddClientModal} onClose={() => setShowAddClientModal(false)} title="Novo Cliente">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Nome do Cliente</label>
            <input
              type="text"
              autoFocus
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateClient(); }}
              placeholder="Ex: Acme Corp..."
              className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600 transition-colors"
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Status</label>
            <select
              value={newClientStatus}
              onChange={(e) => setNewClientStatus(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 appearance-none cursor-pointer"
            >
              {clientStatuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Faturamento</label>
              <input
                type="text"
                value={newClientFaturamento}
                onChange={(e) => setNewClientFaturamento(e.target.value)}
                placeholder="Ex: R$ 50.000"
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Segmento</label>
              <input
                type="text"
                value={newClientSegmento}
                onChange={(e) => setNewClientSegmento(e.target.value)}
                placeholder="Ex: Tecnologia"
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">RepositÃ³rio</label>
              <input
                type="text"
                value={newClientRepositorio}
                onChange={(e) => setNewClientRepositorio(e.target.value)}
                placeholder="Ex: Google Drive"
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Ãšltima ReuniÃ£o</label>
              <input
                type="text"
                value={newClientReuniao}
                onChange={(e) => setNewClientReuniao(e.target.value)}
                placeholder="Ex: 10/11/2026"
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAddClientModal(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateClient}
              disabled={!newClientName.trim()}
              className="px-6 py-2 text-sm font-medium bg-primary hover:bg-primary disabled:bg-primary/40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Criar Cliente
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ClickUpInterface;

