import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function RHScreen() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [funcionario, setFuncionario] = useState<any>(null);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load current employee data
      const { data: funcData } = await supabase
        .from('rh_funcionarios')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      setFuncionario(funcData);

      if (funcData) {
        // Load requests
        const { data: reqs } = await supabase
          .from('rh_solicitacoes')
          .select('*')
          .eq('funcionario_id', funcData.id)
          .order('created_at', { ascending: false });
        
        setSolicitacoes(reqs || []);

        // Load documents
        const { data: docs } = await supabase
          .from('rh_documentos')
          .select('*')
          .eq('funcionario_id', funcData.id)
          .eq('visivel_funcionario', true)
          .order('created_at', { ascending: false });
        
        setDocumentos(docs || []);
      }
    } catch (err) {
      console.error('Error loading RH data:', err);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada': return '#22c55e';
      case 'recusada': return '#ef4444';
      case 'enviada': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (!funcionario) {
    return (
      <View style={s.center}>
        <Ionicons name="people-outline" size={48} color="#64748b" />
        <Text style={s.noDataText}>Perfil de funcionário não encontrado no RH.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Meus Dados</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <Text style={s.label}>Cargo:</Text>
            <Text style={s.value}>{funcionario.cargo || 'Não informado'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.label}>Admissão:</Text>
            <Text style={s.value}>{funcionario.data_admissao || '-'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.label}>Status:</Text>
            <Text style={[s.value, { color: getStatusColor(funcionario.status) }]}>
              {funcionario.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <View style={s.headerRow}>
          <Text style={s.sectionTitle}>Minhas Solicitações</Text>
          <TouchableOpacity style={s.addButton}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>
        {solicitacoes.length === 0 ? (
          <Text style={s.emptyText}>Nenhuma solicitação enviada.</Text>
        ) : (
          solicitacoes.map((item) => (
            <View key={item.id} style={s.card}>
              <View style={s.requestHeader}>
                <Text style={s.requestType}>{item.tipo.toUpperCase()}</Text>
                <View style={[s.badge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={s.badgeText}>{item.status}</Text>
                </View>
              </View>
              {item.data_inicio && (
                <Text style={s.requestDate}>
                  {item.data_inicio} {item.data_fim ? `até ${item.data_fim}` : ''}
                </Text>
              )}
              {item.motivo && <Text style={s.requestReason}>{item.motivo}</Text>}
            </View>
          ))
        )}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Documentos Liberados</Text>
        {documentos.length === 0 ? (
          <Text style={s.emptyText}>Nenhum documento disponível.</Text>
        ) : (
          documentos.map((item) => (
            <TouchableOpacity key={item.id} style={s.documentCard}>
              <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
              <View style={s.documentInfo}>
                <Text style={s.documentTitle}>{item.titulo}</Text>
                <Text style={s.documentType}>{item.tipo}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 32 },
  noDataText: { color: '#94a3b8', textAlign: 'center', marginTop: 16, fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#94a3b8', fontSize: 14 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#64748b', textAlign: 'center', py: 20 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requestType: { color: '#fff', fontWeight: '700', fontSize: 14 },
  requestDate: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  requestReason: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  documentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8 },
  documentInfo: { flex: 1, marginLeft: 12 },
  documentTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  documentType: { color: '#64748b', fontSize: 12 },
});
