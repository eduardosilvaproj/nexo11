import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type Item = { id: string; titulo: string; tipo: string; data: string; status: string };

export default function AgendaScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, [profile?.id]);

  async function load() {
    if (!profile?.id) return;
    
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    const fim = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]; // Próximos 15 dias

    const result: Item[] = [];
    
    try {
      // Busca Montagens
      const { data: mont } = await supabase
        .from('agendamentos_montagem')
        .select('id, data, status')
        .gte('data', hoje)
        .lte('data', fim)
        .order('data', { ascending: true });

      mont?.forEach((m: any) =>
        result.push({ 
          id: m.id, 
          titulo: `Montagem Agendada`, 
          tipo: 'montagem', 
          data: m.data,
          status: m.status 
        })
      );

      // Busca Entregas
      const { data: ent } = await supabase
        .from('entregas')
        .select('id, data_prevista, status')
        .gte('data_prevista', hoje)
        .lte('data_prevista', fim)
        .order('data_prevista', { ascending: true });

      ent?.forEach((e: any) =>
        result.push({ 
          id: e.id, 
          titulo: `Entrega Prevista`, 
          tipo: 'entrega', 
          data: e.data_prevista,
          status: e.status 
        })
      );
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    }

    result.sort((a, b) => a.data.localeCompare(b.data));
    setItems(result);
    setLoading(false);
    setRefreshing(false);
  }

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.tipo}-${i.id}`}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={s.empty}>Nenhum agendamento para os próximos dias.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.tipo === 'montagem' ? '#8b5cf6' : '#3b82f6' }]}>
            <View style={s.cardHeader}>
              <Text style={s.title}>{item.titulo}</Text>
              <View style={[s.statusBadge, { backgroundColor: '#1e293b' }]}>
                <Text style={s.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={s.meta}>Data: {new Date(item.data).toLocaleDateString('pt-BR')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#fff', fontWeight: '600', fontSize: 16 },
  meta: { color: '#94a3b8', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#cbd5e1', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
