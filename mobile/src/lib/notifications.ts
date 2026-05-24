import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { supabase } from './supabase';

// Configuração de como as notificações aparecem quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string, lojaId: string) {
  let token;

  // No simulador Android/iOS o Expo Push Token não funciona
  if (Platform.OS === 'web') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de push negada!');
    return;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id' // Deve vir do app.json extra.eas.projectId
    })).data;
    
    if (token) {
      // Upsert para garantir que o token está sempre atualizado
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          usuario_id: userId,
          loja_id: lojaId,
          token: token,
          platform: Platform.OS,
          ativo: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'usuario_id, token'
        });

      if (error) console.error('Erro ao salvar token de push:', error);
    }
  } catch (e) {
    console.error('Erro ao obter token de push:', e);
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'NEXO Operacional',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  return token;
}

export async function unregisterPushTokenAsync(userId: string) {
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (token) {
      await supabase
        .from('device_tokens')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('usuario_id', userId)
        .eq('token', token);
    }
  } catch (e) {
    console.error('Erro ao desativar token de push:', e);
  }
}

// Handler para deep linking a partir de notificações
export function setupNotificationListeners(navigationRef: any) {
  // Quando o usuário toca na notificação (app em background ou fechado)
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notificação tocada:', data);

    if (data?.link) {
      // Exemplo: nexo://chat/123 -> data.link = 'chat', data.conversaId = '123'
      if (data.modulo === 'chat' && data.conversaId) {
        navigationRef.navigate('ChatDetail', { 
          conversaId: data.conversaId, 
          titulo: data.titulo || 'Chat' 
        });
      } else if (data.modulo === 'comunicados') {
        navigationRef.navigate('Comunicados');
      } else if (data.modulo === 'agenda') {
        navigationRef.navigate('Agenda');
      }
    }
  });

  return () => subscription.remove();
}

