import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function NotificacoesScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchNotificacoes() {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchNotificacoes();
  }, [profile?.id]);

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, lida: true } : item));
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotificacoes();
  };

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <View style={s.container}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={s.empty}>Sem notificações novas.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.card, item.lida && s.cardRead]} 
            onPress={() => markAsRead(item.id)}
            disabled={item.lida}
          >
            <View style={s.cardHeader}>
              <Text style={s.title}>{item.titulo || 'Notificação'}</Text>
              {!item.lida && <View style={s.unreadDot} />}
            </View>
            {!!item.mensagem && <Text style={s.message}>{item.mensagem}</Text>}
            <Text style={s.time}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  cardRead: { opacity: 0.6, borderLeftColor: '#475569' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { color: '#fff', fontWeight: '600', fontSize: 16 },
  message: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  time: { color: '#64748b', fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
