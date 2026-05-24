import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AgendaScreen from '../screens/AgendaScreen';
import TarefasScreen from '../screens/TarefasScreen';
import NotificacoesScreen from '../screens/NotificacoesScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ComunicadosScreen from '../screens/ComunicadosScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
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
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ 
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
      }}>
        {session ? (
          <>
            <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chat Interno' }} />
            <Stack.Screen 
              name="ChatDetail" 
              component={ChatDetailScreen} 
              options={({ route }: any) => ({ title: route.params?.titulo || 'Chat' })} 
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

