import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MODULOS_POR_PERFIL } from '../constants/perfis';

export default function HomeScreen() {
  const { profile, signOut } = useAuth();
  const modulos = profile?.perfil ? MODULOS_POR_PERFIL[profile.perfil] ?? [] : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.hi}>Olá, {profile?.nome ?? 'usuário'}</Text>
      <Text style={s.role}>Perfil: {profile?.perfil ?? '—'}</Text>

      <Text style={s.section}>Seus módulos</Text>
      <View style={s.grid}>
        {modulos.map((m) => (
          <View key={m} style={s.card}>
            <Text style={s.cardTitle}>{m}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.logout} onPress={signOut}>
        <Text style={s.logoutText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  hi: { color: '#fff', fontSize: 22, fontWeight: '700' },
  role: { color: '#94a3b8', marginTop: 4, marginBottom: 24 },
  section: { color: '#cbd5e1', fontSize: 14, marginBottom: 12, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    minWidth: '47%',
    flexGrow: 1,
  },
  cardTitle: { color: '#fff', fontWeight: '600', textTransform: 'capitalize' },
  logout: { marginTop: 32, padding: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '600' },
});
