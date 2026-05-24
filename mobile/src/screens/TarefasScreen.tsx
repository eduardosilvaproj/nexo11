import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ExecutionService } from '../lib/execution';
import { Ionicons } from '@expo/vector-icons';

export default function TarefasScreen() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCheckins, setActiveCheckins] = useState<Record<string, any>>({});
  const [isOccurrenceModalVisible, setIsOccurrenceModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [occurrenceForm, setOccurrenceForm] = useState({ tipo: 'outro', prioridade: 'media', descricao: '' });

  async function fetchCheckins() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('operacao_checkins')
      .select('*')
      .eq('usuario_id', profile.id)
      .eq('status', 'iniciado');
    
    const mapping: Record<string, any> = {};
    data?.forEach(c => {
      mapping[c.entidade_id] = c;
    });
    setActiveCheckins(mapping);
  }

  async function handleStart(task: any) {
    if (activeCheckins[task.id]) return;

    const res = await ExecutionService.startCheckin({
      loja_id: task.loja_id || profile?.loja_id,
      usuario_id: profile?.id!,
      entidade_tipo: 'logistica_tarefas',
      entidade_id: task.id,
      modulo: 'logistica',
      contrato_id: task.contrato_id,
    });

    if (res.offline) {
      Alert.alert('Offline', 'Check-in registrado localmente e será sincronizado em breve.');
    }
    fetchCheckins();
  }

  async function handleFinish(task: any) {
    const checkin = activeCheckins[task.id];
    if (!checkin) return;

    Alert.confirm ? Alert.alert('Finalizar', 'Deseja finalizar esta tarefa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', onPress: async () => {
          await ExecutionService.finishCheckin(checkin.id);
          fetchCheckins();
          fetchTasks();
        }}
    ]) : await (async () => {
        // Fallback for environment without Confirm
        await ExecutionService.finishCheckin(checkin.id);
        fetchCheckins();
        fetchTasks();
    })();
  }

  async function submitOccurrence() {
    if (!occurrenceForm.descricao) {
      Alert.alert('Erro', 'Informe uma descrição para a ocorrência.');
      return;
    }

    await ExecutionService.reportOccurrence({
      loja_id: selectedTask.loja_id || profile?.loja_id,
      usuario_id: profile?.id!,
      entidade_tipo: 'logistica_tarefas',
      entidade_id: selectedTask.id,
      modulo: 'logistica',
      contrato_id: selectedTask.contrato_id,
      checkin_id: activeCheckins[selectedTask.id]?.id,
      ...occurrenceForm,
    });

    setIsOccurrenceModalVisible(false);
    setOccurrenceForm({ tipo: 'outro', prioridade: 'media', descricao: '' });
    Alert.alert('Sucesso', 'Ocorrência registrada com sucesso.');
  }

  async function fetchTasks() {
    if (!profile?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('logistica_tarefas')
      .select('*')
      .or(`responsavel_id.eq.${profile.id},responsavel_nome.ilike.%${profile.nome}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Erro ao buscar tarefas:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchTasks();
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={<Text style={s.empty}>Nenhuma tarefa operacional pendente.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.taskCard}>
            <View style={s.taskHeader}>
              <Text style={s.taskTitle}>{item.tipo || 'Tarefa'}</Text>
              <View style={[s.statusBadge, { backgroundColor: item.status === 'concluida' ? '#059669' : '#d97706' }]}>
                <Text style={s.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={s.taskDesc}>{item.cliente_nome || 'Sem cliente'}</Text>
            <Text style={s.taskAddr}>{item.endereco || 'Sem endereço'}</Text>
            <View style={s.taskFooter}>
              <Text style={s.taskTime}>{item.data_prevista ? new Date(item.data_prevista).toLocaleDateString('pt-BR') : '-'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  taskCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { color: '#fff', fontWeight: '700', fontSize: 16, textTransform: 'capitalize' },
  taskDesc: { color: '#cbd5e1', fontSize: 15, marginBottom: 4 },
  taskAddr: { color: '#94a3b8', fontSize: 13, marginBottom: 12 },
  taskFooter: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
  taskTime: { color: '#64748b', fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
});
