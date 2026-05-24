import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ChatDetailScreen({ route }: any) {
  const { conversaId, titulo } = route.params;
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    // Inscrição Realtime
    const channel = supabase
      .channel(`chat_${conversaId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_mensagens_v2', 
        filter: `conversa_id=eq.${conversaId}` 
      }, (payload) => {
        // Evita duplicados locais
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      })
      .subscribe();

    // Marcar como lida ao entrar
    markAsRead();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('chat_mensagens_v2')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead() {
    if (!profile) return;
    await supabase
      .from('chat_participantes')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversa_id', conversaId)
      .eq('usuario_id', profile.id);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !profile || sending) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { error } = await supabase.from('chat_mensagens_v2').insert({
        conversa_id: conversaId,
        usuario_id: profile.id,
        loja_id: profile.loja_id,
        mensagem: text,
      });

      if (error) throw error;
      markAsRead();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setNewMessage(text); // Devolve o texto em caso de erro
    } finally {
      setSending(false);
    }
  }

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView 
        style={s.flex} 
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
              <View style={[s.msgWrapper, isMine ? s.msgMineWrapper : s.msgOtherWrapper]}>
                <View style={[s.msgContainer, isMine ? s.msgMine : s.msgOther]}>
                  <Text style={s.msgText}>{item.mensagem}</Text>
                  <Text style={s.msgTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        
        <View style={s.inputArea}>
          <TextInput
            style={s.input}
            placeholder="Mensagem..."
            placeholderTextColor="#94a3b8"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[s.sendButton, (!newMessage.trim() || sending) && s.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendButtonText}>Enviar</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  msgWrapper: { marginBottom: 8, flexDirection: 'row' },
  msgMineWrapper: { justifyContent: 'flex-end' },
  msgOtherWrapper: { justifyContent: 'flex-start' },
  msgContainer: { maxWidth: '85%', padding: 12, borderRadius: 18 },
  msgMine: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  msgOther: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  msgTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputArea: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#1e293b', 
    borderTopWidth: 1, 
    borderTopColor: '#334155', 
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 4 : 12
  },
  input: { 
    flex: 1, 
    color: '#fff', 
    backgroundColor: '#0F172A', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    maxHeight: 120,
    fontSize: 16
  },
  sendButton: { 
    marginLeft: 12, 
    width: 80,
    height: 44,
    backgroundColor: '#3b82f6', 
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: { backgroundColor: '#334155' },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
