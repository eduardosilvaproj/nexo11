import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TarefasScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Minhas Tarefas</Text>
      <Text style={s.hint}>
        Em breve: lista de pendências por perfil (medições, separações, entregas, montagens, chamados).
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  hint: { color: '#94a3b8' },
});
