import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  ArrowRight, 
  Upload, 
  Download, 
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Users,
  UserPlus,
  Settings,
  Briefcase,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  Warehouse
} from "lucide-react";
import { toast } from "sonner";
import { ImportCSVDialog } from "@/components/implantacao/ImportCSVDialog";
import { generateCSVTemplate } from "@/utils/csvTemplates";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'concluido' | 'pendente';
  actionLabel: string;
  actionPath: string;
  icon: any;
  tableName?: string;
}

export default function ConfiguracaoInicial() {
  const { perfil } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importType, setImportType] = useState<string | null>(null);

  const fetchChecklistStatus = async () => {
    if (!perfil?.loja_id) return;
    setLoading(true);
    
    try {
      // 1. Loja cadastrada (sempre true pois perfil tem loja_id)
      const isLojaOk = !!perfil.loja_id;

      // 2. Equipe cadastrada
      const { count: equipeCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isEquipeOk = (equipeCount || 0) > 0;

      // 3. Clientes
      const { count: clientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isClientesOk = (clientesCount || 0) > 0;

      // 4. Fornecedores
      const { count: fornecedoresCount } = await supabase
        .from('fornecedores')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isFornecedoresOk = (fornecedoresCount || 0) > 0;

      // 5. Estoque
      const { count: estoqueCount } = await supabase
        .from('estoque_itens')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isEstoqueOk = (estoqueCount || 0) > 0;

      // 6. Contratos
      const { count: contratosCount } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isContratosOk = (contratosCount || 0) > 0;

      // 7. Financeiro (Contas a Receber ou Pagar)
      const { count: receberCount } = await supabase
        .from('financeiro_contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const { count: pagarCount } = await supabase
        .from('financeiro_contas_pagar')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', perfil.loja_id);
      const isFinanceiroOk = (receberCount || 0) > 0 || (pagarCount || 0) > 0;

      // 8. Comissões (Se existe alguma configurada ou contrato com comissão)
      // Para simplificar, consideramos ok se houver contratos (que geralmente geram comissões)
      const isComissoesOk = isContratosOk;

      const items: ChecklistItem[] = [
        {
          id: 'loja',
          title: 'Loja cadastrada',
          description: 'Sua unidade está ativa e vinculada ao seu perfil.',
          status: isLojaOk ? 'concluido' : 'pendente',
          actionLabel: 'Ver Loja',
          actionPath: `/lojas/${perfil.loja_id}`,
          icon: Settings
        },
        {
          id: 'equipe',
          title: 'Equipe cadastrada',
          description: 'Usuários e consultores vinculados à unidade.',
          status: isEquipeOk ? 'concluido' : 'pendente',
          actionLabel: 'Gerenciar Equipe',
          actionPath: '/equipe',
          icon: Users
        },
        {
          id: 'clientes',
          title: 'Clientes cadastrados',
          description: 'Base de clientes para novos orçamentos e contratos.',
          status: isClientesOk ? 'concluido' : 'pendente',
          actionLabel: 'Importar Clientes',
          actionPath: '#import-clientes',
          icon: UserPlus,
          tableName: 'clientes'
        },
        {
          id: 'fornecedores',
          title: 'Fornecedores cadastrados',
          description: 'Parceiros para compras e suprimentos.',
          status: isFornecedoresOk ? 'concluido' : 'pendente',
          actionLabel: 'Importar Fornecedores',
          actionPath: '#import-fornecedores',
          icon: Warehouse,
          tableName: 'fornecedores'
        },
        {
          id: 'estoque',
          title: 'Estoque inicial',
          description: 'Itens, acessórios e materiais em estoque.',
          status: isEstoqueOk ? 'concluido' : 'pendente',
          actionLabel: 'Importar Estoque',
          actionPath: '#import-estoque',
          icon: Package,
          tableName: 'estoque_itens'
        },
        {
          id: 'contratos',
          title: 'Contratos ativos',
          description: 'Obras em andamento migradas para o NEXO.',
          status: isContratosOk ? 'concluido' : 'pendente',
          actionLabel: 'Importar Contratos',
          actionPath: '#import-contratos',
          icon: Briefcase,
          tableName: 'contratos'
        },
        {
          id: 'financeiro',
          title: 'Financeiro inicial',
          description: 'Contas a pagar e receber da unidade.',
          status: isFinanceiroOk ? 'concluido' : 'pendente',
          actionLabel: 'Importar Financeiro',
          actionPath: '#import-financeiro',
          icon: DollarSign
        },
        {
          id: 'comissoes',
          title: 'Comissões configuradas',
          description: 'Regras e lançamentos de comissão por venda.',
          status: isComissoesOk ? 'concluido' : 'pendente',
          actionLabel: 'Ir para Comissões',
          actionPath: '/comissoes',
          icon: Percent
        }
      ];

      setChecklist(items);
    } catch (error) {
      console.error('Erro ao carregar checklist:', error);
      toast.error('Erro ao validar status da implantação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklistStatus();
  }, [perfil?.loja_id]);

  const progress = checklist.length > 0 
    ? (checklist.filter(i => i.status === 'concluido').length / checklist.length) * 100 
    : 0;

  const handleAction = (item: ChecklistItem) => {
    if (item.actionPath.startsWith('#import-')) {
      const type = item.actionPath.replace('#import-', '');
      setImportType(type);
    } else {
      window.location.href = item.actionPath;
    }
  };

  const handleDownloadTemplate = (type: string) => {
    const csvContent = generateCSVTemplate(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `modelo_importacao_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuração Inicial</h1>
          <p className="text-slate-500 mt-1">Guia de implantação para unidades piloto do NEXO.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchChecklistStatus} 
          disabled={loading}
          className="bg-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Status
        </Button>
      </div>

      <Card className="border-none shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <CardContent className="pt-6 pb-8 px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Progresso da Implantação</span>
                <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-700/50" />
              <p className="text-sm text-slate-400">
                {progress === 100 
                  ? "Parabéns! A implantação foi concluída com sucesso." 
                  : `Faltam ${checklist.filter(i => i.status === 'pendente').length} etapas para concluir a configuração.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <div className="text-2xl font-bold">{checklist.filter(i => i.status === 'concluido').length}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Concluídos</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <div className="text-2xl font-bold text-blue-400">{checklist.filter(i => i.status === 'pendente').length}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pendentes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            Checklist de Atividades
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse h-32" />
              ))
            ) : (
              checklist.map((item) => (
                <Card key={item.id} className={`group hover:shadow-md transition-all duration-300 border-l-4 ${item.status === 'concluido' ? 'border-l-emerald-500' : 'border-l-blue-400'}`}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${item.status === 'concluido' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {item.status === 'concluido' ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">Concluído</Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/30">Pendente</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-3">{item.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between group-hover:bg-slate-50 text-xs h-8 px-2"
                      onClick={() => handleAction(item)}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Importação Rápida
              </CardTitle>
              <CardDescription className="text-xs">Baixe os modelos e importe seus dados reais via CSV.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Clientes', type: 'clientes' },
                  { label: 'Fornecedores', type: 'fornecedores' },
                  { label: 'Estoque', type: 'estoque' },
                  { label: 'Contratos', type: 'contratos' },
                  { label: 'Financeiro', type: 'financeiro' }
                ].map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <span className="text-sm font-medium">{item.label}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" title="Baixar Modelo" onClick={() => handleDownloadTemplate(item.type)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" title="Importar CSV" onClick={() => setImportType(item.type)}>
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Atenção:</strong> As importações são validadas antes de serem gravadas. Duplicidades serão identificadas para sua revisão.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {importType && (
        <ImportCSVDialog 
          type={importType} 
          open={!!importType} 
          onOpenChange={(open) => !open && setImportType(null)}
          onSuccess={() => {
            fetchChecklistStatus();
            setImportType(null);
          }}
        />
      )}
    </div>
  );
}
