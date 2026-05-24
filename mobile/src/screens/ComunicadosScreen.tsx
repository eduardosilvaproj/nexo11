import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ComunicadosScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchComunicados() {
    if (!profile?.loja_id) return;
    
    // Busca comunicados da loja ou globais
    const { data } = await supabase
      .from('comunicados')
      .select('*, comunicado_leituras(usuario_id)')
      .eq('ativo', true)
      .order('publicado_em', { ascending: false });
    
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchComunicados();
  }, [profile?.loja_id]);

  async function markAsRead(id: string) {
    if (!profile) return;
    const { error } = await supabase
      .from('comunicado_leituras')
      .upsert({ comunicado_id: id, usuario_id: profile.id });
    
    if (!error) {
      fetchComunicados(); // Recarrega para atualizar estado de lido
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchComunicados();
  };

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <View style={s.container}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={s.empty}>Nenhum comunicado no momento.</Text>}
        renderItem={({ item }) => {
          const lido = item.comunicado_leituras?.some((l: any) => l.usuario_id === profile?.id);
          return (
            <TouchableOpacity 
              style={[s.card, !lido && s.cardUnread]} 
              onPress={() => markAsRead(item.id)}
            >
              <View style={s.badgeArea}>
                <View style={[s.priority, { backgroundColor: item.prioridade === 'alta' ? '#ef4444' : '#3b82f6' }]}>
                  <Text style={s.priorityText}>{item.prioridade}</Text>
                </View>
                {!lido && <Text style={s.newLabel}>NOVO</Text>}
              </View>
              <Text style={s.title}>{item.titulo}</Text>
              <Text style={s.message}>{item.mensagem}</Text>
              <Text style={s.time}>{new Date(item.publicado_em).toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  badgeArea: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priority: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  newLabel: { color: '#ef4444', fontWeight: '800', fontSize: 10 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  time: { color: '#64748b', fontSize: 11 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
