import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, error } = useAuth();

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView 
        style={s.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.content}>
          <View style={s.logoContainer}>
            <Text style={s.logoText}>NEXO</Text>
            <Text style={s.logoSub}>Operacional</Text>
          </View>

          <View style={s.form}>
            <Text style={s.label}>E-mail</Text>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={s.label}>Senha</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {!!error && (
              <View style={s.errorContainer}>
                <Text style={s.errorText}>{error.message}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[s.button, (!email || !password || loading) && s.buttonDisabled]} 
              onPress={handleLogin}
              disabled={!email || !password || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={s.footer}>© 2026 NEXO Sistemas</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoText: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  logoSub: { color: '#3b82f6', fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 4, marginTop: -8 },
  form: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  label: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#0F172A',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#1e293b', opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorContainer: { backgroundColor: '#ef444422', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#ef444444' },
  errorText: { color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '500' },
  footer: { color: '#475569', textAlign: 'center', marginTop: 48, fontSize: 12 }
});
