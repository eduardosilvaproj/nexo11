import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Constants from 'expo-constants';

const TIPOS = ['bug', 'duvida', 'sugestao', 'melhoria'];
const IMPACTOS = ['baixo', 'medio', 'alto', 'critico'];

export default function FeedbackScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [modulo, setModulo] = useState('');
  const [tipo, setTipo] = useState('sugestao');
  const [impacto, setImpacto] = useState('medio');
  const [descricao, setDescricao] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!modulo || !descricao) {
      Alert.alert('Erro', 'Por favor, preencha o módulo e a descrição.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('mobile_feedback').insert({
        loja_id: profile?.loja_id,
        usuario_id: profile?.id,
        perfil: profile?.perfil,
        plataforma: Platform.OS,
        versao_app: Constants.expoConfig?.version || '1.0.0',
        modulo,
        tipo,
        impacto,
        descricao,
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Feedback enviado. Obrigado por ajudar a melhorar o NEXO.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
      Alert.alert('Erro', 'Não foi possível enviar o feedback no momento.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.label}>Módulo / Tela</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Agenda, Chat, Login..."
          placeholderTextColor="#64748b"
          value={modulo}
          onChangeText={setModulo}
        />

        <Text style={s.label}>Tipo de Feedback</Text>
        <View style={s.optionsRow}>
          {TIPOS.map(t => (
            <TouchableOpacity 
              key={t} 
              style={[s.option, tipo === t && s.optionSelected]} 
              onPress={() => setTipo(t)}
            >
              <Text style={[s.optionText, tipo === t && s.optionTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Impacto</Text>
        <View style={s.optionsRow}>
          {IMPACTOS.map(i => (
            <TouchableOpacity 
              key={i} 
              style={[s.option, impacto === i && s.optionSelected]} 
              onPress={() => setImpacto(i)}
            >
              <Text style={[s.optionText, impacto === i && s.optionTextSelected]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Descrição Detalhada</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Descreva o que aconteceu ou sua sugestão..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={6}
          value={descricao}
          onChangeText={setDescricao}
        />

        <TouchableOpacity 
          style={[s.button, sending && s.buttonDisabled]} 
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Enviar Feedback</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  label: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  option: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#334155' },
  optionSelected: { backgroundColor: '#3b82f6' },
  optionText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  optionTextSelected: { color: '#fff' },
  button: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
