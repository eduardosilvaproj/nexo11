import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ChatDetailScreen({ route }: any) {
  const { conversaId, titulo } = route.params;
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversa_${conversaId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_mensagens_v2', 
        filter: `conversa_id=eq.${conversaId}` 
      }, (payload) => {
        setMessages(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  async function fetchMessages() {
    const { data } = await supabase
      .from('chat_mensagens_v2')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    setMessages(data || []);
    setLoading(false);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !profile) return;

    const msg = {
      conversa_id: conversaId,
      usuario_id: profile.id,
      loja_id: profile.loja_id,
      mensagem: newMessage.trim(),
    };

    setNewMessage('');
    const { error } = await supabase.from('chat_mensagens_v2').insert(msg);
    if (error) console.error('Erro ao enviar mensagem:', error);
  }

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isMine = item.usuario_id === profile?.id;
          return (
            <View style={[s.msgContainer, isMine ? s.msgMine : s.msgOther]}>
              <Text style={s.msgText}>{item.mensagem}</Text>
              <Text style={s.msgTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          );
        }}
      />
      
      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#94a3b8"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity style={s.sendButton} onPress={sendMessage}>
          <Text style={s.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  msgContainer: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  msgMine: { alignSelf: 'flex-end', backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 16 },
  msgTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', alignItems: 'flex-end' },
  input: { flex: 1, color: '#fff', backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
  sendButton: { marginLeft: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 20 },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
