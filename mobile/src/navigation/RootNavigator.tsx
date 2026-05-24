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

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Tarefas" component={TarefasScreen} />
      <Tab.Screen name="Alertas" component={NotificacoesScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center' }}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="App" component={Tabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
