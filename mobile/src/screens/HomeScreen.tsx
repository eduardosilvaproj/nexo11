import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  SafeAreaView 
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MODULOS_POR_PERFIL } from '../constants/perfis';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { useNavigation } from '@react-navigation/native';
import { SyncQueueService } from '../lib/syncQueue';
import Constants from 'expo-constants';

export default function HomeScreen() {
  const { profile, loading, signOut, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.id && profile?.loja_id) {
      registerForPushNotificationsAsync(profile.id, profile.loja_id);
      // Processa fila de sincronização ao abrir o app/home
      SyncQueueService.processQueue();
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await SyncQueueService.processQueue();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (!profile?.perfil) {
    return (
      <View style={[s.container, s.center, { padding: 32 }]}>
        <Text style={s.hi}>Olá, {profile?.nome || 'Usuário'}</Text>
        <Text style={s.noProfile}>Seu perfil de acesso ainda não foi configurado pela administração.</Text>
        <TouchableOpacity style={s.logout} onPress={signOut}>
          <Text style={s.logoutText}>Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const modulos = MODULOS_POR_PERFIL[profile.perfil] || [];

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
      case 'rh':
        navigation.navigate('RH');
        break;
      default:
        Alert.alert('Módulo em Desenvolvimento', `O módulo "${modulo.replace('_', ' ')}" está em fase de implantação.`);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.hi}>Olá, {profile.nome?.split(' ')[0]}</Text>
            <Text style={s.role}>{profile.perfil}</Text>
          </View>
          <TouchableOpacity style={s.logoutMini} onPress={signOut}>
            <Text style={s.logoutTextMini}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={s.quickActions}>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('ChatList')}>
            <Text style={s.actionIcon}>💬</Text>
            <Text style={s.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('Comunicados')}>
            <Text style={s.actionIcon}>📢</Text>
            <Text style={s.actionText}>Comunicados</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>Menu Principal</Text>
        <View style={s.grid}>
          {modulos.filter(m => m !== 'home').map((m) => (
            <TouchableOpacity 
              key={m} 
              style={s.card}
              onPress={() => handleModulePress(m)}
            >
              <Text style={s.cardTitle}>{m.replace('_', ' ')}</Text>
              <Text style={s.cardSub}>Ver detalhes</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={s.feedbackCard} 
          onPress={() => navigation.navigate('Feedback')}
        >
          <Text style={s.feedbackText}>💡 Enviar Feedback do Piloto</Text>
        </TouchableOpacity>

        <View style={s.footerInfo}>
          <Text style={s.footerText}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  hi: { color: '#fff', fontSize: 28, fontWeight: '800' },
  role: { color: '#3b82f6', marginTop: 4, textTransform: 'uppercase', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  noProfile: { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 16, lineHeight: 24 },
  section: { color: '#64748b', fontSize: 12, marginBottom: 16, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 20,
    width: '47.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: { color: '#fff', fontWeight: '700', textTransform: 'capitalize', fontSize: 16 },
  cardSub: { color: '#3b82f6', fontSize: 12, marginTop: 8, fontWeight: '500' },
  quickActions: { flexDirection: 'row', gap: 14, marginBottom: 32 },
  actionCard: { 
    flex: 1, 
    backgroundColor: '#334155', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  actionIcon: { fontSize: 18 },
  actionText: { color: '#f1f5f9', fontWeight: '700', fontSize: 15 },
  logout: { marginTop: 40, padding: 16, alignItems: 'center', backgroundColor: '#ef4444', borderRadius: 12, width: '100%' },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  logoutMini: { padding: 8 },
  logoutTextMini: { color: '#ef4444', fontWeight: '600' },
  feedbackCard: { marginTop: 32, padding: 20, backgroundColor: '#3b82f622', borderRadius: 16, borderWidth: 1, borderColor: '#3b82f644', alignItems: 'center' },
  feedbackText: { color: '#3b82f6', fontWeight: '700', fontSize: 15 },
  footerInfo: { marginTop: 40, alignItems: 'center' },
  footerText: { color: '#334155', fontSize: 12, fontWeight: '600' }
});
