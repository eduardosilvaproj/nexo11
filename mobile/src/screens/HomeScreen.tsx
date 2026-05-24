import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MODULOS_POR_PERFIL, Perfil } from '../constants/perfis';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { profile, loading, signOut } = useAuth();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (profile?.id && profile?.loja_id) {
      registerForPushNotificationsAsync(profile.id, profile.loja_id);
    }
  }, [profile]);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (!profile?.perfil) {
    return (
      <View style={[s.container, s.center, { padding: 20 }]}>
        <Text style={s.hi}>Olá, {profile?.nome ?? 'usuário'}</Text>
        <Text style={s.noProfile}>Seu perfil de acesso ainda não foi configurado.</Text>
        <TouchableOpacity style={s.logout} onPress={signOut}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const modulos = MODULOS_POR_PERFIL[profile.perfil] ?? [];

  const handleModulePress = (modulo: string) => {
    switch (modulo) {
      case 'notificacoes':
        navigation.navigate('Alertas');
        break;
      case 'agenda':
        navigation.navigate('Agenda');
        break;
      case 'tarefas':
        navigation.navigate('Tarefas');
        break;
      case 'chat':
        navigation.navigate('ChatList');
        break;
      case 'comunicados':
        navigation.navigate('Comunicados');
        break;
      default:
        Alert.alert('Módulo', `O módulo ${modulo} ainda está sendo implementado no app.`);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Olá, {profile.nome}</Text>
          <Text style={s.role}>Perfil: {profile.perfil}</Text>
        </View>
        <TouchableOpacity style={s.logoutMini} onPress={signOut}>
          <Text style={s.logoutTextMini}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={s.quickActions}>
        <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('ChatList')}>
          <Text style={s.actionText}>Chat Interno</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('Comunicados')}>
          <Text style={s.actionText}>Comunicados</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>Módulos Habilitados</Text>
      <View style={s.grid}>
        {modulos.filter(m => m !== 'home').map((m) => (
          <TouchableOpacity 
            key={m} 
            style={s.card}
            onPress={() => handleModulePress(m)}
          >
            <Text style={s.cardTitle}>{m.replace('_', ' ')}</Text>
            <Text style={s.cardSub}>Acessar</Text>
          </TouchableOpacity>
        ))}
        {modulos.includes('*') && (
          <Text style={s.adminText}>Você tem acesso total ao sistema.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  hi: { color: '#fff', fontSize: 24, fontWeight: '700' },
  role: { color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' },
  noProfile: { color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginTop: 12 },
  section: { color: '#64748b', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: { color: '#fff', fontWeight: '600', textTransform: 'capitalize', fontSize: 16 },
  cardSub: { color: '#3b82f6', fontSize: 12, marginTop: 8 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { 
    flex: 1, 
    backgroundColor: '#334155', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  actionText: { color: '#f1f5f9', fontWeight: '600' },
  logout: { marginTop: 32, padding: 14, alignItems: 'center', backgroundColor: '#ef4444', borderRadius: 8, width: '100%' },
  logoutText: { color: '#fff', fontWeight: '600' },
  logoutMini: { padding: 8 },
  logoutTextMini: { color: '#ef4444', fontWeight: '500' },
  adminText: { color: '#94a3b8', fontStyle: 'italic', width: '100%', marginTop: 12 }
});
