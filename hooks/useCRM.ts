import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStage, Event, Seller } from '../types';

export const useCRM = (onNotify?: (type: 'success' | 'error' | 'info', msg: string) => void) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [team, setTeam] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);

    // Default stage names if not loaded from cache
    const defaultStageNames = {
        [LeadStage.DRAFT]: 'Rascunhos',
        [LeadStage.NEW_LEAD]: 'Novo Lead',
        [LeadStage.QUALIFIED]: 'Qualificado',
        [LeadStage.NEGOTIATION]: 'Em Negociação',
        [LeadStage.WON]: 'Venda Fechada',
        [LeadStage.CHURN]: 'Churn'
    };

    const [stageNames, setStageNames] = useState<Record<string, string>>(defaultStageNames);

    useEffect(() => {
        fetchEvents();
        fetchTeam();
        fetchLeads();
        loadStageNames();
    }, []);

    const loadStageNames = () => {
        const savedStages = localStorage.getItem('nghub_crm_stages');
        if (savedStages) {
            try {
                const parsed = JSON.parse(savedStages);
                const merged = { ...defaultStageNames, ...parsed };
                if (!parsed[LeadStage.DRAFT]) merged[LeadStage.DRAFT] = defaultStageNames[LeadStage.DRAFT];
                setStageNames(merged);
            } catch (e) {
                // Fallback to default
            }
        }
    };

    const saveStageNames = (newNames: Record<string, string>) => {
        setStageNames(newNames);
        localStorage.setItem('nghub_crm_stages', JSON.stringify(newNames));
        onNotify?.('success', 'Nomes das etapas atualizados!');
    };

    const fetchTeam = useCallback(async () => {
        const { data } = await supabase.from('sellers').select('id, name, phone');
        if (data) setTeam(data as Seller[]);
    }, []);

    const fetchEvents = useCallback(async () => {
        const { data } = await supabase.from('events').select('id, title, price').order('date', { ascending: false });
        if (data) setEvents(data as any);
    }, []);

    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('leads').select('*, owner:sellers(name, phone)').order('created_at', { ascending: false });
            if (error) throw error;

            const mappedLeads: Lead[] = (data || []).map((l: any) => ({
                id: l.id,
                name: l.name,
                email: l.email,
                phone: l.phone,
                company: l.company,
                sector: l.sector,
                stage: l.stage as LeadStage,
                value: Number(l.value),
                lastContact: l.last_contact,
                tagId: l.tag_id,
                ownerId: l.owner_id,
                owner: l.owner ? { id: l.owner_id, name: l.owner.name, phone: l.owner.phone } : undefined,
                createdAt: l.created_at,
            }));

            setLeads(mappedLeads);
        } catch (error) {
            onNotify?.('error', 'Erro ao carregar leads.');
        } finally {
            setLoading(false);
        }
    }, [onNotify]);

    // Actions
    const updateLeadStage = async (id: string, targetStage: LeadStage) => {
        const lead = leads.find(l => l.id === id);
        if (!lead || lead.stage === targetStage) return;

        // Optimistic UI update
        setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: targetStage } : l));

        const { error } = await supabase.from('leads').update({ stage: targetStage }).eq('id', id);
        if (error) {
            fetchLeads(); // Revert on failure
            onNotify?.('error', 'Erro ao atualizar etapa.');
        } else {
            onNotify?.('success', `Lead movido para ${stageNames[targetStage]}`);

            // Transaction Logic for WON
            if (targetStage === LeadStage.WON) {
                const eventPrice = lead.tagId ? (events.find(e => e.id === lead.tagId)?.price || lead.value) : lead.value;
                if (eventPrice > 0) {
                    await supabase.from('transactions').insert([{ description: `Venda: ${lead.name}`, amount: eventPrice, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
                }
            } else if ((lead.stage as string) === LeadStage.WON) {
                await supabase.from('transactions').delete().eq('description', `Venda: ${lead.name}`).eq('category', 'CRM');
            }
        }
    };

    const updateLeadTag = async (leadId: string, tagId: string) => {
        try {
            const selectedEvent = events.find(e => e.id === tagId);
            const newEventPrice = selectedEvent ? selectedEvent.price : 0;
            const currentLead = leads.find(l => l.id === leadId);

            const finalValueToSave = tagId === '' ? 0 : (newEventPrice > 0 ? newEventPrice : (currentLead?.value || 0));

            const { error } = await supabase.from('leads').update({ tag_id: tagId || null, value: finalValueToSave }).eq('id', leadId);
            if (error) throw error;

            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tagId: tagId || undefined, value: finalValueToSave } : l));

            // Synchronize transaction if lead is WON
            if (currentLead?.stage === LeadStage.WON && currentLead.name) {
                const { data: existingTx } = await supabase.from('transactions').select('id').eq('description', `Venda: ${currentLead.name}`).eq('category', 'CRM').limit(1);

                if (existingTx && existingTx.length > 0) {
                    if (finalValueToSave > 0) {
                        await supabase.from('transactions').update({ amount: finalValueToSave }).eq('id', existingTx[0].id);
                    } else {
                        await supabase.from('transactions').delete().eq('id', existingTx[0].id);
                    }
                } else if (finalValueToSave > 0) {
                    await supabase.from('transactions').insert([{ description: `Venda: ${currentLead.name}`, amount: finalValueToSave, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
                }
            }
            onNotify?.('success', 'Etiqueta atualizada!');
        } catch (error) {
            onNotify?.('error', 'Erro ao atualizar etiqueta.');
        }
    };

    const updateLeadOwner = async (leadId: string, ownerId: string) => {
        try {
            const { error } = await supabase.from('leads').update({ owner_id: ownerId || null }).eq('id', leadId);
            if (error) throw error;

            const newOwnerInfo = ownerId ? team.find(m => m.id === ownerId) : undefined;
            setLeads(prev => prev.map(l => l.id === leadId ? {
                ...l,
                ownerId: ownerId || undefined,
                owner: newOwnerInfo ? { id: newOwnerInfo.id, name: newOwnerInfo.name, phone: newOwnerInfo.phone } : undefined
            } : l));
            onNotify?.('success', 'Responsável atualizado!');
        } catch (error) {
            onNotify?.('error', 'Erro ao atualizar responsável.');
        }
    };

    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'lastContact'>) => {
        try {
            const selectedEvent = leadData.tagId ? events.find(e => e.id === leadData.tagId) : null;
            const initialValue = selectedEvent?.price && selectedEvent.price > 0
                ? selectedEvent.price
                : (Number(leadData.value) || 0);

            const { data, error } = await supabase.from('leads').insert([{
                name: leadData.name,
                company: leadData.company,
                sector: leadData.sector,
                email: leadData.email,
                phone: leadData.phone,
                tag_id: leadData.tagId || null,
                owner_id: leadData.ownerId || null,
                stage: leadData.stage,
                value: initialValue
            }]).select();

            if (error) throw error;
            onNotify?.('success', 'Lead adicionado!');
            await fetchLeads(); // Reload to get fully joined data
            return data[0];
        } catch (err) {
            onNotify?.('error', 'Erro ao salvar lead.');
            throw err;
        }
    };

    const bulkAssignLeads = async (leadIds: string[], ownerId: string) => {
        try {
            const { error } = await supabase.from('leads').update({ owner_id: ownerId }).in('id', leadIds);
            if (error) throw error;

            const newOwnerInfo = team.find(m => m.id === ownerId);
            setLeads(prev => prev.map(l => leadIds.includes(l.id) ? {
                ...l,
                ownerId: ownerId,
                owner: newOwnerInfo ? { id: newOwnerInfo.id, name: newOwnerInfo.name, phone: newOwnerInfo.phone } : undefined
            } : l));

            onNotify?.('success', `${leadIds.length} leads atribuídos!`);
            return newOwnerInfo;
        } catch (err) {
            onNotify?.('error', 'Erro ao atribuir leads em lote.');
            throw err;
        }
    };

    const addSeller = async (name: string, phone: string) => {
        try {
            const { error } = await supabase.from('sellers').insert([{ name, phone }]);
            if (error) throw error;
            onNotify?.('success', 'Vendedor cadastrado com sucesso!');
            await fetchTeam();
        } catch (error) {
            onNotify?.('error', 'Erro ao cadastrar vendedor.');
            throw error;
        }
    };

    const deleteSeller = async (id: string) => {
        try {
            const { error } = await supabase.from('sellers').delete().eq('id', id);
            if (error) throw error;
            onNotify?.('success', 'Vendedor removido!');
            await fetchTeam();
            await fetchLeads();
        } catch (error) {
            onNotify?.('error', 'Erro ao remover vendedor.');
            throw error;
        }
    };

    return {
        leads, setLeads,
        events,
        team,
        loading,
        stageNames,
        saveStageNames,
        updateLeadStage,
        updateLeadTag,
        updateLeadOwner,
        addLead,
        bulkAssignLeads,
        addSeller,
        deleteSeller,
        refreshLeads: fetchLeads
    };
};
