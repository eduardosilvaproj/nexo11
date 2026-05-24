import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync(userId: string, lojaId: string) {
  let token;

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
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    if (token) {
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
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export async function unregisterPushTokenAsync(userId: string) {
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) {
      await supabase
        .from('device_tokens')
        .update({ ativo: false })
        .eq('usuario_id', userId)
        .eq('token', token);
    }
  } catch (e) {
    console.error('Erro ao desativar token de push:', e);
  }
}
