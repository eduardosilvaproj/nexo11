import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Loader2,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ImportCSVDialogProps {
  type: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ValidationResult {
  row: number;
  data: any;
  errors: string[];
  status: 'valid' | 'invalid' | 'duplicate';
}

export function ImportCSVDialog({ type, open, onOpenChange, onSuccess }: ImportCSVDialogProps) {
  const { perfil } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ValidationResult[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [results, setResults] = useState({ success: 0, errors: 0, duplicates: 0 });

  const reset = () => {
    setFile(null);
    setPreview([]);
    setStep('upload');
    setResults({ success: 0, errors: 0, duplicates: 0 });
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(';').map(h => h.trim());
    return lines.slice(1).map((line, index) => {
      const values = line.split(';').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || "";
      });
      return { row: index + 1, data: obj };
    });
  };

  const validateRows = async (rows: { row: number, data: any }[]) => {
    setValidating(true);
    const results: ValidationResult[] = [];

    for (const item of rows) {
      const errors: string[] = [];
      let status: 'valid' | 'invalid' | 'duplicate' = 'valid';

      // Validações básicas por tipo
      if (type === 'clientes') {
        if (!item.data.nome) errors.push("Nome é obrigatório");
        if (!item.data.cpf_cnpj) errors.push("Documento é obrigatório");
        
        // Checar duplicidade na loja
        if (item.data.cpf_cnpj) {
          const { data: existing } = await supabase
            .from('clientes')
            .select('id')
            .eq('loja_id', perfil?.loja_id)
            .eq('cpf_cnpj', item.data.cpf_cnpj)
            .maybeSingle();
          if (existing) status = 'duplicate';
        }
      } else if (type === 'fornecedores') {
        if (!item.data.nome) errors.push("Nome é obrigatório");
        if (item.data.cnpj) {
          const { data: existing } = await supabase
            .from('fornecedores')
            .select('id')
            .eq('loja_id', perfil?.loja_id)
            .eq('cnpj', item.data.cnpj)
            .maybeSingle();
          if (existing) status = 'duplicate';
        }
      } else if (type === 'estoque') {
        if (!item.data.nome) errors.push("Nome é obrigatório");
        if (!item.data.codigo) errors.push("Código é obrigatório");
        if (isNaN(Number(item.data.quantidade_inicial))) errors.push("Quantidade deve ser um número");
      } else if (type === 'contratos') {
        if (!item.data.numero) errors.push("Número é obrigatório");
        if (!item.data.cliente_nome) errors.push("Nome do cliente é obrigatório");
      }

      if (errors.length > 0) status = 'invalid';
      
      results.push({ ...item, errors, status });
    }

    setPreview(results);
    setValidating(false);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Por favor, selecione um arquivo CSV.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("Arquivo CSV vazio ou inválido.");
        return;
      }
      validateRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const runImport = async () => {
    setImporting(true);
    let success = 0;
    let errors = 0;
    let duplicates = 0;

    const validRows = preview.filter(p => p.status !== 'invalid');

    for (const item of validRows) {
      try {
        if (item.status === 'duplicate') {
          duplicates++;
          continue;
        }

        let error;
        if (type === 'clientes') {
          const { error: err } = await supabase
            .from('clientes')
            .insert({
              nome: item.data.nome,
              telefone: item.data.telefone,
              email: item.data.email,
              cpf_cnpj: item.data.cpf_cnpj,
              cidade: item.data.cidade,
              endereco: item.data.endereco,
              observacoes: item.data.observacoes,
              loja_id: perfil?.loja_id
            });
          error = err;
        } else if (type === 'fornecedores') {
          const { error: err } = await supabase
            .from('fornecedores')
            .insert({
              nome: item.data.nome,
              cnpj: item.data.cnpj,
              telefone: item.data.telefone,
              email: item.data.email,
              categoria: item.data.categoria,
              observacoes: item.data.observacoes,
              loja_id: perfil?.loja_id
            });
          error = err;
        } else if (type === 'estoque') {
          const { data: newItem, error: err } = await supabase
            .from('estoque_itens')
            .insert({
              codigo: item.data.codigo,
              descricao: item.data.nome,
              categoria: item.data.categoria,
              unidade: item.data.unidade,
              quantidade_total: Number(item.data.quantidade_inicial) || 0,
              estoque_minimo: Number(item.data.estoque_minimo) || 0,
              custo_medio_unitario: Number(item.data.custo_unitario) || 0,
              loja_id: perfil?.loja_id
            })
            .select()
            .single();
          
          error = err;

          if (!error && newItem && Number(item.data.quantidade_inicial) > 0) {
            // Gerar movimentação inicial
            await supabase.from('estoque_movimentacoes').insert({
              item_id: newItem.id,
              tipo: 'entrada',
              quantidade: Number(item.data.quantidade_inicial),
              motivo: 'Importação Inicial',
              loja_id: perfil?.loja_id
            });
          }
        } else if (type === 'contratos') {
          // Busca ou cria cliente
          let clienteId;
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('loja_id', perfil?.loja_id)
            .or(`cpf_cnpj.eq.${item.data.cliente_documento},nome.eq.${item.data.cliente_nome}`)
            .maybeSingle();
          
          if (cliente) {
            clienteId = cliente.id;
          } else {
            const { data: newC } = await supabase
              .from('clientes')
              .insert({
                nome: item.data.cliente_nome,
                cpf_cnpj: item.data.cliente_documento,
                loja_id: perfil?.loja_id
              })
              .select()
              .single();
            clienteId = newC?.id;
          }

          if (clienteId) {
            const { data: newContrato, error: err } = await supabase
              .from('contratos')
              .insert({
                numero: item.data.numero,
                cliente_id: clienteId,
                valor_venda: Number(item.data.valor_venda) || 0,
                status: item.data.status || 'em_andamento',
                data_venda: item.data.data_venda || new Date().toISOString(),
                previsao_entrega: item.data.previsao_entrega,
                observacoes: item.data.observacoes,
                loja_id: perfil?.loja_id
              })
              .select()
              .single();
            error = err;

            if (!error && newContrato) {
              // Registro na timeline
              await supabase.from('contrato_eventos').insert({
                contrato_id: newContrato.id,
                tipo: 'sistema',
                titulo: 'Contrato Importado',
                descricao: 'Importação realizada na configuração inicial do sistema.',
                responsavel_id: perfil?.id,
                loja_id: perfil?.loja_id
              });
            }
          } else {
            error = { message: "Não foi possível vincular cliente" };
          }
        } else if (type === 'financeiro') {
          const isReceber = item.data.tipo === 'receber';
          const table = isReceber ? 'financeiro_contas_receber' : 'financeiro_contas_pagar';
          
          let contratoId;
          if (item.data.contrato_numero) {
            const { data: ct } = await supabase
              .from('contratos')
              .select('id')
              .eq('loja_id', perfil?.loja_id)
              .eq('numero', item.data.contrato_numero)
              .maybeSingle();
            contratoId = ct?.id;
          }

          const commonData = {
            descricao: item.data.descricao,
            valor: Number(item.data.valor) || 0,
            vencimento: item.data.vencimento,
            status: item.data.status || 'pendente',
            forma_pagamento: item.data.forma_pagamento,
            observacoes: item.data.observacoes,
            loja_id: perfil?.loja_id,
            contrato_id: contratoId
          };

          if (isReceber) {
            const { error: err } = await supabase
              .from('financeiro_contas_receber')
              .insert({
                ...commonData,
                nome_cliente: item.data.cliente_fornecedor_nome
              });
            error = err;
          } else {
            const { error: err } = await supabase
              .from('financeiro_contas_pagar')
              .insert({
                ...commonData,
                nome_fornecedor: item.data.cliente_fornecedor_nome,
                categoria: item.data.categoria
              });
            error = err;
          }
        }

        if (error) {
          console.error(error);
          errors++;
        } else {
          success++;
        }
      } catch (e) {
        console.error(e);
        errors++;
      }
    }

    setResults({ success, errors, duplicates });
    setStep('result');
    setImporting(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl capitalize">
            <Upload className="h-5 w-5 text-blue-600" />
            Importar {type}
          </DialogTitle>
          <DialogDescription>
            Siga as etapas para importar seus dados de {type} com segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'upload' && (
            <div className="p-12 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <FileText className="h-10 w-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Selecione seu arquivo CSV</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Certifique-se que o arquivo está no formato correto utilizando o modelo disponível.
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={validating}
                />
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={validating}>
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    "Escolher Arquivo"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-y flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">{preview.length} linhas</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium">{preview.filter(p => p.status === 'valid').length} válidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium">{preview.filter(p => p.status === 'duplicate').length} duplicados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium">{preview.filter(p => p.status === 'invalid').length} erros</span>
                  </div>
                </div>
                {validating && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>

              <ScrollArea className="flex-1 p-0">
                <Table>
                  <TableHeader className="bg-white sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Dados</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center text-xs text-muted-foreground">{item.row}</TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {Object.entries(item.data).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-semibold text-slate-500 capitalize">{key.replace('_', ' ')}:</span>
                                <span className="truncate max-w-[200px]">{value as string}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status === 'valid' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-normal">Válido</Badge>}
                          {item.status === 'duplicate' && <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-normal">Duplicado</Badge>}
                          {item.status === 'invalid' && <Badge className="bg-red-50 text-red-700 border-red-100 font-normal">Erro</Badge>}
                        </TableCell>
                        <TableCell>
                          {item.errors.length > 0 ? (
                            <ul className="text-[10px] text-red-600 list-disc list-inside">
                              {item.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          ) : item.status === 'duplicate' ? (
                            <span className="text-[10px] text-amber-600 flex items-center gap-1">
                              <Info className="h-3 w-3" /> Já existe no sistema
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Pronto para importar
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="p-6 border-t bg-slate-50/50 flex items-center justify-between">
                <Button variant="ghost" onClick={reset}>Trocar arquivo</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700" 
                    disabled={importing || preview.filter(p => p.status !== 'invalid').length === 0}
                    onClick={runImport}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirmar Importação ({preview.filter(p => p.status !== 'invalid').length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="p-12 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Importação Finalizada!</h3>
                <p className="text-slate-500">Confira o resumo do processamento de dados.</p>
              </div>

              <div className="grid grid-cols-3 gap-6 w-full max-w-lg">
                <div className="bg-slate-50 border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{results.success}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Sucesso</div>
                </div>
                <div className="bg-slate-50 border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{results.duplicates}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Ignorados</div>
                </div>
                <div className="bg-slate-50 border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Com Erro</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>Nova Importação</Button>
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
