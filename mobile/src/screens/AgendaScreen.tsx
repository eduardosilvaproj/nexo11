import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type Item = { id: string; titulo: string; tipo: string; data: string };

export default function AgendaScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [profile?.user_id]);

  async function load() {
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const fim = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    // Lê tabelas reais; RLS já filtra por loja/usuário
    const result: Item[] = [];
    try {
      const { data: mont } = await supabase
        .from('montagens')
        .select('id, data_agendada, contrato_id')
        .gte('data_agendada', hoje)
        .lte('data_agendada', fim);
      mont?.forEach((m: any) =>
        result.push({ id: m.id, titulo: `Montagem`, tipo: 'montagem', data: m.data_agendada })
      );
    } catch {}
    try {
      const { data: ent } = await supabase
        .from('entregas')
        .select('id, data_prevista')
        .gte('data_prevista', hoje)
        .lte('data_prevista', fim);
      ent?.forEach((e: any) =>
        result.push({ id: e.id, titulo: `Entrega`, tipo: 'entrega', data: e.data_prevista })
      );
    } catch {}
    result.sort((a, b) => a.data.localeCompare(b.data));
    setItems(result);
    setLoading(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.tipo}-${i.id}`}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Sem itens na agenda.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.title}>{item.titulo}</Text>
            <Text style={s.meta}>{item.data}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  card: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, marginBottom: 10 },
  title: { color: '#fff', fontWeight: '600' },
  meta: { color: '#94a3b8', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
