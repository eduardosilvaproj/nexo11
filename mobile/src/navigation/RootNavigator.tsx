import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AgendaScreen from '../screens/AgendaScreen';
import TarefasScreen from '../screens/TarefasScreen';
import NotificacoesScreen from '../screens/NotificacoesScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ComunicadosScreen from '../screens/ComunicadosScreen';
import { setupNotificationListeners } from '../lib/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#0F172A',
    card: '#0F172A',
    text: '#fff',
    primary: '#3b82f6',
    border: '#1e293b',
  },
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1e293b', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Tarefas" component={TarefasScreen} />
      <Tab.Screen name="Alertas" component={NotificacoesScreen} options={{ tabBarLabel: 'Notificações' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading, error, signOut, profile } = useAuth();
  
  useEffect(() => {
    if (navigationRef.isReady()) {
      return setupNotificationListeners(navigationRef);
    }
  }, [navigationRef.isReady()]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  // Tela de Erro (Perfil não configurado, etc.)
  if (session && !profile && error?.type === 'no_profile') {
    return (
      <View style={s.center}>
        <Text style={s.errorTitle}>Acesso Restrito</Text>
        <Text style={s.errorText}>{error.message}</Text>
        <TouchableOpacity style={s.button} onPress={signOut}>
          <Text style={s.buttonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme} ref={navigationRef}>
      <Stack.Navigator screenOptions={{ 
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}>
        {session && profile ? (
          <>
            <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Mensagens' }} />
            <Stack.Screen 
              name="ChatDetail" 
              component={ChatDetailScreen} 
              options={({ route }: any) => ({ 
                title: route.params?.titulo || 'Chat',
              })} 
            />
            <Stack.Screen name="Comunicados" component={ComunicadosScreen} options={{ title: 'Comunicados' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  errorText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});


