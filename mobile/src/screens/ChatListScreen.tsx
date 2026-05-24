import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function ChatListScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [conversas, setConversas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchConversas() {
    if (!profile?.id) return;
    
    // Busca conversas que o usuário participa
    const { data, error } = await supabase
      .from('chat_conversas')
      .select(`
        *,
        chat_participantes!inner(usuario_id),
        chat_mensagens_v2(mensagem, created_at)
      `)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar conversas:', error);
    } else {
      setConversas(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchConversas();
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversas();
  };

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <View style={s.container}>
      <FlatList
        data={conversas}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={s.empty}>Nenhuma conversa iniciada.</Text>}
        renderItem={({ item }) => {
          const ultimaMsg = item.chat_mensagens_v2?.[0];
          return (
            <TouchableOpacity 
              style={s.conversaCard} 
              onPress={() => navigation.navigate('ChatDetail', { conversaId: item.id, titulo: item.titulo })}
            >
              <View style={s.avatar}><Text style={s.avatarText}>{item.titulo[0]}</Text></View>
              <View style={s.conversaInfo}>
                <View style={s.conversaHeader}>
                  <Text style={s.conversaTitulo}>{item.titulo}</Text>
                  {ultimaMsg && <Text style={s.conversaTime}>{new Date(ultimaMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                </View>
                <Text style={s.conversaLastMsg} numberOfLines={1}>
                  {ultimaMsg?.mensagem || 'Inicie a conversa...'}
                </Text>
              </View>
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
  conversaCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  conversaInfo: { flex: 1, marginLeft: 16 },
  conversaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  conversaTitulo: { color: '#fff', fontSize: 16, fontWeight: '600' },
  conversaTime: { color: '#64748b', fontSize: 12 },
  conversaLastMsg: { color: '#94a3b8', fontSize: 14 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
