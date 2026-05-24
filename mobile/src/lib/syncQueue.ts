import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface SyncAction {
  id: string;
  table: string;
  payload: any;
  type: 'INSERT' | 'UPDATE' | 'UPSERT';
  createdAt: number;
}

const SYNC_QUEUE_KEY = '@Nexo:SyncQueue';

export const SyncQueueService = {
  async getQueue(): Promise<SyncAction[]> {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addToQueue(action: Omit<SyncAction, 'id' | 'createdAt'>) {
    const queue = await this.getQueue();
    const newAction: SyncAction = {
      ...action,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now(),
    };
    queue.push(newAction);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return newAction;
  },

  async processQueue() {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`Processando fila de sincronização: ${queue.length} itens`);
    const remaining: SyncAction[] = [];

    for (const action of queue) {
      try {
        let error;
        if (action.type === 'INSERT') {
          ({ error } = await supabase.from(action.table).insert(action.payload));
        } else if (action.type === 'UPDATE') {
          // Assume ID is in payload for filtering or handled by caller
          ({ error } = await supabase.from(action.table).update(action.payload).eq('id', action.payload.id));
        } else if (action.type === 'UPSERT') {
          ({ error } = await supabase.from(action.table).upsert(action.payload));
        }

        if (error) throw error;
      } catch (err) {
        console.error(`Erro ao sincronizar ação ${action.id}:`, err);
        remaining.push(action);
      }
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  }
};
