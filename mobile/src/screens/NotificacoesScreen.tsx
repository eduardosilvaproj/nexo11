import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function NotificacoesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#0F172A' }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i.id}
      ListEmptyComponent={<Text style={s.empty}>Sem notificações.</Text>}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.title}>{item.titulo ?? item.tipo}</Text>
          {!!item.mensagem && <Text style={s.meta}>{item.mensagem}</Text>}
        </View>
      )}
    />
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, marginBottom: 10 },
  title: { color: '#fff', fontWeight: '600' },
  meta: { color: '#94a3b8', marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
