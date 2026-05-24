import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function MinhaEscalaScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [statusAtual, setStatusAtual] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: funcData } = await supabase
        .from('rh_funcionarios')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (funcData) {
        // Load scales
        const { data: escData } = await supabase
          .from('rh_escalas')
          .select('*')
          .eq('funcionario_id', funcData.id)
          .eq('ativo', true);
        
        setEscalas(escData || []);

        // Load current availability
        const now = new Date();
        const start = new Date(now.setHours(0,0,0,0)).toISOString();
        const end = new Date(now.setHours(23,59,59,999)).toISOString();
        
        const { data: disp } = await supabase.rpc('calcular_disponibilidade_funcionario', {
          p_funcionario_id: funcData.id,
          p_data_inicio: start,
          p_data_fim: end
        });
        
        setStatusAtual(disp);
      }
    } catch (err) {
      console.error('Error loading scale:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <View style={s.statusCard}>
        <Text style={s.statusTitle}>Status de Hoje</Text>
        <View style={s.statusRow}>
          <Ionicons 
            name={statusAtual?.status === 'disponivel' ? 'checkmark-circle' : 'alert-circle'} 
            size={24} 
            color={statusAtual?.status === 'disponivel' ? '#22c55e' : '#f59e0b'} 
          />
          <Text style={s.statusText}>{statusAtual?.status?.replace('_', ' ').toUpperCase() || 'DESCONHECIDO'}</Text>
        </View>
        {statusAtual?.motivo && <Text style={s.statusMotivo}>{statusAtual.motivo}</Text>}
      </View>

      <Text style={s.sectionTitle}>Escala Semanal</Text>
      {DIAS_SEMANA.map((dia, index) => {
        const escala = escalas.find(e => e.dia_semana === index);
        return (
          <View key={index} style={[s.card, !escala && s.offDay]}>
            <View style={s.cardHeader}>
              <Text style={s.dayName}>{dia}</Text>
              {!escala && <Text style={s.offLabel}>FOLGA</Text>}
            </View>
            {escala && (
              <View style={s.timesRow}>
                <View style={s.timeItem}>
                  <Text style={s.timeLabel}>Início</Text>
                  <Text style={s.timeValue}>{escala.hora_inicio.slice(0, 5)}</Text>
                </View>
                <View style={s.timeItem}>
                  <Text style={s.timeLabel}>Fim</Text>
                  <Text style={s.timeValue}>{escala.hora_fim.slice(0, 5)}</Text>
                </View>
                {escala.intervalo_inicio && (
                  <View style={s.timeItem}>
                    <Text style={s.timeLabel}>Intervalo</Text>
                    <Text style={s.timeValue}>{escala.intervalo_inicio.slice(0, 5)} - {escala.intervalo_fim.slice(0, 5)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  statusCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  statusTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statusMotivo: { color: '#64748b', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  offDay: { opacity: 0.6, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  offLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  timesRow: { flexDirection: 'row', gap: 24 },
  timeItem: { gap: 2 },
  timeLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase' },
  timeValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
