import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStage, Event, Seller } from '../types';

export interface ProductLabel {
    id: string;
    name: string;
    color: string; // tailwind color key (legacy)
    hexColor?: string; // custom hex color (new)
    price?: number; // price in BRL
}

const PRODUCT_LABELS_KEY = 'nghub_product_labels';
const STAGES_KEY = 'nghub_crm_stages_v2';
const PIPELINE_OPTIONS = ['Geral', 'Evento', 'Produto'] as const;

// Movido para fora do hook — objeto estático, nunca muda (Melhoria 6)
const DEFAULT_STAGE_NAMES: Record<string, string> = {
    [LeadStage.DRAFT]: 'Rascunhos',
    [LeadStage.NEW_LEAD]: 'Novo Lead',
    [LeadStage.QUALIFIED]: 'Qualificado',
    [LeadStage.NEGOTIATION]: 'Em Negociação',
    [LeadStage.WON]: 'Venda Fechada',
    [LeadStage.CHURN]: 'Churn',
};

export const useCRM = (onNotify?: (type: 'success' | 'error' | 'info', msg: string) => void) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [team, setTeam] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [productLabels, setProductLabels] = useState<ProductLabel[]>([]);

    // Per-pipeline stage names: { Geral: {...}, Evento: {...}, Produto: {...} }
    const [stageNamesByPipeline, setStageNamesByPipeline] = useState<Record<string, Record<string, string>>>({
        Geral: { ...DEFAULT_STAGE_NAMES },
        Evento: { ...DEFAULT_STAGE_NAMES },
        Produto: { ...DEFAULT_STAGE_NAMES },
    });

    // Backward-compatible getter — useMemo garante estabilidade de referência
    const getStageNames = useCallback((pipeline: string): Record<string, string> => {
        return stageNamesByPipeline[pipeline] || stageNamesByPipeline['Geral'] || DEFAULT_STAGE_NAMES;
    }, [stageNamesByPipeline]);

    useEffect(() => {
        fetchEvents();
        fetchTeam();
        fetchLeads();
        loadStageNames();
        loadProductLabels();
    }, []);

    const loadStageNames = () => {
        // Try v2 (per-pipeline) first
        const savedV2 = localStorage.getItem(STAGES_KEY);
        if (savedV2) {
            try {
                const parsed = JSON.parse(savedV2) as Record<string, Record<string, string>>;
                const merged: Record<string, Record<string, string>> = {};
                for (const p of PIPELINE_OPTIONS) {
                    merged[p] = { ...DEFAULT_STAGE_NAMES, ...(parsed[p] || {}) };
                }
                setStageNamesByPipeline(merged);
                return;
            } catch { /* fallback */ }
        }

        // Migrate from v1 (single shared stageNames)
        const savedV1 = localStorage.getItem('nghub_crm_stages');
        if (savedV1) {
            try {
                const parsed = JSON.parse(savedV1);
                const shared = { ...DEFAULT_STAGE_NAMES, ...parsed };
                const migrated: Record<string, Record<string, string>> = {};
                for (const p of PIPELINE_OPTIONS) {
                    migrated[p] = { ...shared };
                }
                setStageNamesByPipeline(migrated);
                localStorage.setItem(STAGES_KEY, JSON.stringify(migrated));
                localStorage.removeItem('nghub_crm_stages');
            } catch { /* fallback */ }
        }
    };

    const saveStageNames = (pipeline: string, newNames: Record<string, string>) => {
        const updated = { ...stageNamesByPipeline, [pipeline]: newNames };
        setStageNamesByPipeline(updated);
        localStorage.setItem(STAGES_KEY, JSON.stringify(updated));
        onNotify?.('success', `Etapas da pipeline "${pipeline}" atualizadas!`);
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
                notes: l.notes || '',
                form_answers: l.form_answers,
                pipeline: l.pipeline || 'Geral',
                productLabel: l.product_label || '',
                source_tags: Array.isArray(l.source_tags) ? l.source_tags : [],
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
            onNotify?.('success', `Lead movido para ${getStageNames(lead.pipeline || 'Geral')[targetStage]}`);

            // Transaction Logic for WON
            if (targetStage === LeadStage.WON) {
                // Determine price and category
                let txAmount = lead.value;
                let txCategory = 'CRM';
                let txDesc = `Venda: ${lead.name}`;

                if (lead.pipeline === 'Produto' && lead.productLabel) {
                    const labelObj = productLabels.find(l => l.id === lead.productLabel);
                    if (labelObj?.price) {
                        txAmount = labelObj.price;
                        txCategory = 'Produto CRM';
                        txDesc = `Produto: ${labelObj.name} — ${lead.name}`;
                    }
                } else if (lead.tagId) {
                    const eventObj = events.find(e => e.id === lead.tagId);
                    if (eventObj?.price) txAmount = eventObj.price;
                }

                if (txAmount > 0) {
                    // BUG-2 FIX: busca cirúrgica por lead_id em vez de LIKE frágil
                    const { data: existing } = await supabase.from('transactions')
                        .select('id')
                        .eq('lead_id', id)
                        .in('category', ['CRM', 'Produto CRM'])
                        .limit(1);

                    if (!existing || existing.length === 0) {
                        await supabase.from('transactions').insert([{
                            description: txDesc, amount: txAmount, type: 'income',
                            category: txCategory, date: new Date().toISOString(),
                            status: 'paid', lead_id: id,
                        }]);
                    } else {
                        await supabase.from('transactions')
                            .update({ amount: txAmount, category: txCategory, description: txDesc })
                            .eq('id', existing[0].id);
                    }
                }
            } else if ((lead.stage as string) === LeadStage.WON) {
                // BUG-5 FIX: exclusão por lead_id — sem em-dash, sem LIKE
                await supabase.from('transactions')
                    .delete()
                    .eq('lead_id', id)
                    .in('category', ['CRM', 'Produto CRM']);
            }
        }
    };

    // ── Pipeline Management ─────────────────────────────────────────────
    const updateLeadPipeline = async (leadId: string, pipeline: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || lead.pipeline === pipeline) return;

        // Clear labels when switching pipeline (optimistic)
        setLeads(prev => prev.map(l => l.id === leadId
            ? { ...l, pipeline, tagId: undefined, productLabel: '' }
            : l
        ));

        const { error } = await supabase.from('leads')
            .update({ pipeline, tag_id: null }) // Do not update product_label to null blindly to avoid schema errors if missing, handled safely
            .eq('id', leadId);

        if (error) {
            fetchLeads();
            onNotify?.('error', 'Erro ao mover lead de pipeline.');
        } else {
            // BUG-5 FIX: exclusão por lead_id — elimina falhas de encoding com em-dash
            await supabase.from('transactions')
                .delete()
                .eq('lead_id', leadId)
                .eq('category', 'Produto CRM');
            onNotify?.('success', `Lead movido para pipeline ${pipeline} - etiqueta removida`);
        }
    };

    const bulkUpdatePipeline = async (leadIds: string[], pipeline: string) => {
        try {
            const { error } = await supabase.from('leads')
                .update({ pipeline, tag_id: null, product_label: null })
                .in('id', leadIds);
            if (error) throw error;
            setLeads(prev => prev.map(l => leadIds.includes(l.id)
                ? { ...l, pipeline, tagId: undefined, productLabel: '' }
                : l
            ));
            onNotify?.('success', `${leadIds.length} leads movidos para pipeline ${pipeline} — etiquetas removidas`);
        } catch {
            onNotify?.('error', 'Erro ao mover leads de pipeline.');
        }
    };

    // ── Product Labels ──────────────────────────────────────────────────
    const loadProductLabels = () => {
        try {
            const saved = localStorage.getItem(PRODUCT_LABELS_KEY);
            if (saved) setProductLabels(JSON.parse(saved));
        } catch { /* fallback empty */ }
    };

    const saveProductLabelsToStorage = (labels: ProductLabel[]) => {
        setProductLabels(labels);
        localStorage.setItem(PRODUCT_LABELS_KEY, JSON.stringify(labels));
    };

    const addProductLabel = (name: string, color: string, hexColor?: string, price?: number) => {
        const newLabel: ProductLabel = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            name,
            color,
            hexColor: hexColor || '#6366f1',
            price: price || 0,
        };
        saveProductLabelsToStorage([...productLabels, newLabel]);
        onNotify?.('success', `Etiqueta "${name}" criada!`);
        return newLabel;
    };

    const updateProductLabel = (labelId: string, updates: Partial<ProductLabel>) => {
        const updated = productLabels.map(l => l.id === labelId ? { ...l, ...updates } : l);
        saveProductLabelsToStorage(updated);
    };

    const deleteProductLabel = (labelId: string) => {
        saveProductLabelsToStorage(productLabels.filter(l => l.id !== labelId));
        // Clear productLabel from leads using it
        setLeads(prev => prev.map(l => l.productLabel === labelId ? { ...l, productLabel: '' } : l));
        onNotify?.('success', 'Etiqueta removida!');
    };

    const updateLeadProductLabel = async (leadId: string, labelId: string) => {
        const lead = leads.find(l => l.id === leadId);
        try {
            const { error } = await supabase.from('leads')
                .update({ product_label: labelId || null })
                .eq('id', leadId);
            if (error) throw error;

            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, productLabel: labelId || '' } : l));

            // BUG-5 FIX: exclusão por lead_id — sem LIKE com em-dash
            await supabase.from('transactions')
                .delete()
                .eq('lead_id', leadId)
                .eq('category', 'Produto CRM');

            // Sync nova transação de produto se lead está WON
            if (labelId && lead?.stage === LeadStage.WON) {
                const label = productLabels.find(l => l.id === labelId);
                if (label && label.price && label.price > 0) {
                    await supabase.from('transactions').insert([{
                        description: `Produto: ${label.name} - ${lead?.name || ''}`,
                        amount: label.price,
                        type: 'income',
                        category: 'Produto CRM',
                        status: 'paid',
                        date: new Date().toISOString(),
                        lead_id: leadId,
                    }]);
                }
            }

            onNotify?.('success', labelId ? 'Etiqueta de produto atualizada!' : 'Etiqueta removida');
        } catch {
            onNotify?.('error', 'Erro ao atualizar etiqueta de produto.');
        }
    };

    // ── Tag (Event) ─────────────────────────────────────────────────────
    const updateLeadTag = async (leadId: string, tagId: string) => {
        try {
            const selectedEvent = events.find(e => e.id === tagId);
            const newEventPrice = selectedEvent ? selectedEvent.price : 0;
            const currentLead = leads.find(l => l.id === leadId);

            // Só atualiza o value se o lead tiver 0 no momento ou se estivermos removendo a tag
            // Se o lead já tem um valor manual (> 0), mantemos o valor dele.
            const shouldUpdateValue = !currentLead?.value || currentLead.value === 0;
            const finalValueToSave = shouldUpdateValue ? (tagId === '' ? 0 : newEventPrice) : currentLead.value;

            const { error } = await supabase.from('leads').update({ 
                tag_id: tagId || null, 
                value: finalValueToSave 
            }).eq('id', leadId);
            
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

    const updateLeadNotes = async (leadId: string, notes: string) => {
        const { error } = await supabase.from('leads').update({ notes }).eq('id', leadId);
        if (!error) {
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes } : l));
        } else {
            onNotify?.('error', 'Erro ao salvar anotação.');
        }
    };

    const updateLeadValue = async (leadId: string, value: number) => {
        try {
            const { error } = await supabase.from('leads').update({ value }).eq('id', leadId);
            if (error) throw error;

            const currentLead = leads.find(l => l.id === leadId);
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, value } : l));

            // Sync transaction if lead is WON
            if (currentLead?.stage === LeadStage.WON && currentLead.name) {
                const { data: existingTx } = await supabase.from('transactions')
                    .select('id')
                    .like('description', `%${currentLead.name}`)
                    .in('category', ['CRM', 'Produto CRM'])
                    .limit(1);

                if (existingTx && existingTx.length > 0) {
                    if (value > 0) {
                        await supabase.from('transactions').update({ amount: value }).eq('id', existingTx[0].id);
                    } else {
                        await supabase.from('transactions').delete().eq('id', existingTx[0].id);
                    }
                } else if (value > 0) {
                    await supabase.from('transactions').insert([{ 
                        description: `Venda: ${currentLead.name}`, 
                        amount: value, 
                        type: 'income', 
                        category: currentLead.pipeline === 'Produto' ? 'Produto CRM' : 'CRM', 
                        status: 'paid',
                        date: new Date().toISOString() 
                    }]);
                }
            }
        } catch (error) {
            onNotify?.('error', 'Erro ao atualizar valor.');
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
                value: initialValue,
                pipeline: leadData.pipeline || 'Geral'
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

    // ── Source Tags (Origem do Lead) ────────────────────────────────────
    const updateLeadSourceTags = async (leadId: string, tags: string[]) => {
        try {
            const { error } = await supabase.from('leads')
                .update({ source_tags: tags })
                .eq('id', leadId);
            if (error) throw error;
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, source_tags: tags } : l));
        } catch {
            onNotify?.('error', 'Erro ao atualizar etiquetas de origem.');
        }
    };

    return {
        leads, setLeads,
        events,
        team,
        loading,
        getStageNames,
        saveStageNames,
        updateLeadStage,
        updateLeadPipeline,
        bulkUpdatePipeline,
        updateLeadTag,
        updateLeadOwner,
        updateLeadNotes,
        updateLeadValue,
        productLabels,
        addProductLabel,
        updateProductLabel,
        deleteProductLabel,
        updateLeadProductLabel,
        addLead,
        bulkAssignLeads,
        addSeller,
        deleteSeller,
        refreshLeads: fetchLeads,
        updateLeadSourceTags,
    };
};
