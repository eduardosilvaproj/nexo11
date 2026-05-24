import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Perfil } from '../constants/perfis';
import { Alert } from 'react-native';

type Profile = {
  id: string;
  nome: string | null;
  perfil: Perfil | null;
  loja_id: string | null;
};

type AuthError = {
  message: string;
  type: 'invalid_credentials' | 'network_error' | 'no_profile' | 'unknown';
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('Auth event:', event);
      setSession(s);
      
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          setError(null);
        }
      }
      
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // Recuperação inicial de sessão
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error: sessionError }) => {
      if (sessionError) {
        console.error('Error getting initial session:', sessionError);
      }
      
      setSession(initialSession);
      if (initialSession?.user) {
        await loadProfile(initialSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      // Busca dados básicos do usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nome, loja_id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      // Busca o papel do usuário (role)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) throw roleError;

      if (!userData) {
        setError({ message: 'Seu perfil de acesso ainda não foi configurado.', type: 'no_profile' });
        setProfile(null);
        return;
      }

      setProfile({
        id: userData.id,
        nome: userData.nome,
        loja_id: userData.loja_id,
        perfil: (roleData?.role as Perfil) || null,
      });
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      setError({ message: 'Erro ao carregar perfil de acesso.', type: 'unknown' });
      setProfile(null);
    }
  }

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        let type: AuthError['type'] = 'unknown';
        let message = 'Ocorreu um erro ao entrar.';

        if (signInError.message.includes('Invalid login credentials')) {
          type = 'invalid_credentials';
          message = 'Credenciais inválidas.';
        } else if (signInError.message.includes('network')) {
          type = 'network_error';
          message = 'Não foi possível conectar. Verifique sua internet.';
        }

        const authErr: AuthError = { message, type };
        setError(authErr);
        return { error: authErr };
      }

      if (data.user) {
        await loadProfile(data.user.id);
      }

      return {};
    } catch (err) {
      const authErr: AuthError = { message: 'Erro inesperado.', type: 'unknown' };
      setError(authErr);
      return { error: authErr };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }

  async function refreshProfile() {
    if (session?.user) {
      setLoading(true);
      await loadProfile(session.user.id);
      setLoading(false);
    }
  }

  return (
    <AuthCtx.Provider
      value={{ 
        session, 
        user: session?.user ?? null, 
        profile, 
        loading, 
        error,
        signIn, 
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);


