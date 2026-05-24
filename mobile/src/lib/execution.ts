import { supabase } from './supabase';
import { SyncQueueService } from './syncQueue';
import * as Location from 'expo-location';

export interface CheckinParams {
  loja_id: string;
  funcionario_id?: string;
  usuario_id: string;
  contrato_id?: string;
  entidade_tipo: string;
  entidade_id: string;
  modulo: string;
  observacoes?: string;
}

export const ExecutionService = {
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const location = await Location.getCurrentPositionAsync({});
      return location.coords;
    } catch (err) {
      console.error('Error getting location:', err);
      return null;
    }
  },

  async startCheckin(params: CheckinParams) {
    const coords = await this.getCurrentLocation();
    
    const data = {
      ...params,
      status: 'iniciado',
      iniciado_em: new Date().toISOString(),
      latitude_inicio: coords?.latitude,
      longitude_inicio: coords?.longitude,
    };

    const { data: res, error } = await supabase
      .from('operacao_checkins')
      .insert(data)
      .select()
      .single();

    if (error) {
      // If error (likely offline), add to sync queue
      await SyncQueueService.enqueue({
        type: 'INSERT',
        table: 'operacao_checkins',
        data,
      });
      return { offline: true };
    }

    return { data: res };
  },

  async finishCheckin(checkinId: string, observacoes?: string) {
    const coords = await this.getCurrentLocation();
    const finalizado_em = new Date().toISOString();

    // Calculate duration if possible (offline might be tricky, but we'll try)
    const { data: checkin } = await supabase
      .from('operacao_checkins')
      .select('iniciado_em')
      .eq('id', checkinId)
      .single();

    let duracao_minutos = null;
    if (checkin?.iniciado_em) {
      const start = new Date(checkin.iniciado_em);
      const end = new Date(finalizado_em);
      duracao_minutos = Math.round((end.getTime() - start.getTime()) / 60000);
    }

    const data = {
      status: 'concluido',
      finalizado_em,
      duracao_minutos,
      latitude_fim: coords?.latitude,
      longitude_fim: coords?.longitude,
      observacoes,
    };

    const { error } = await supabase
      .from('operacao_checkins')
      .update(data)
      .eq('id', checkinId);

    if (error) {
      await SyncQueueService.enqueue({
        type: 'UPDATE',
        table: 'operacao_checkins',
        id: checkinId,
        data,
      });
      return { offline: true };
    }

    return { success: true };
  },

  async reportOccurrence(params: any) {
    const { error } = await supabase
      .from('operacao_ocorrencias')
      .insert(params);

    if (error) {
      await SyncQueueService.enqueue({
        type: 'INSERT',
        table: 'operacao_ocorrencias',
        data: params,
      });
      return { offline: true };
    }

    return { success: true };
  }
};
