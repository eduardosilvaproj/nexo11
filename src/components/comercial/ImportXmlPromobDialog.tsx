import { useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileCode2, AlertCircle, CheckCircle2, Loader2, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parsePromobXml, type PromobParsed } from "@/lib/promob-xml";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Ambiente {
  id: string;
  nome: string;
  parsed: PromobParsed;
  desconto: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clienteId?: string;
  clienteNome?: string;
}

const formatBRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ImportXmlPromobDialog({ open, onOpenChange, clienteId, clienteNome }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { perfil, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmbientes([]);
    setError(null);
    setParsing(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setParsing(true);
    setError(null);
    
    try {
      for (const f of Array.from(files)) {
        if (!/\.xml$/i.test(f.name)) {
          toast.error(`Arquivo "${f.name}" não é .xml`);
          continue;
        }
        
        const text = await f.text();
        const data = parsePromobXml(text);
        
        const novoAmbiente: Ambiente = {
          id: Math.random().toString(36).substring(7),
          nome: data.ordem_compra || f.name.replace(".xml", ""),
          parsed: data,
          desconto: 0,
        };

        setAmbientes((prev) => [...prev, novoAmbiente]);
        toast.success(`Ambiente "${novoAmbiente.nome}" adicionado`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler XML");
    } finally {
      setParsing(false);
    }
  };

  const removeAmbiente = (id: string) => {
    setAmbientes((prev) => prev.filter((a) => a.id !== id));
  };

  const updateDesconto = (id: string, desconto: number) => {
    setAmbientes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, desconto } : a))
    );
  };

  const totals = useMemo(() => {
    const list = ambientes.map((a) => {
      const valorBase = a.parsed.total_pedido || a.parsed.total_orcamento || 0;
      const valorFinal = valorBase * (1 - a.desconto / 100);
      return { ...a, valorBase, valorFinal };
    });
    const totalGeral = list.reduce((sum, item) => sum + item.valorFinal, 0);
    return { list, totalGeral };
  }, [ambientes]);

  const handleProsseguir = async () => {
    const finalClienteId = id || clienteId;
    if (ambientes.length === 0 || !perfil?.loja_id || !finalClienteId) {
      toast.error("Adicione ao menos um ambiente para prosseguir");
      return;
    }
    
    setCreating(true);
    try {
      // Agregar dados de todos os ambientes
      const todasCategorias: any[] = [];
      const todosItens: any[] = [];
      let totalTabela = 0;
      let totalPedido = 0;
      let totalFrete = 0;
      let totalMontagem = 0;

      ambientes.forEach((a) => {
        const descAmbiente = a.desconto;
        
        // Categorias do ambiente com desconto aplicado
        const cats = a.parsed.categorias.map((c) => ({
          id: c.id,
          descricao: `[${a.nome}] ${c.description}`,
          tabela: c.budget,
          desconto_pct: descAmbiente,
          valor: c.budget * (1 - descAmbiente / 100),
          ambiente: a.nome,
        }));
        todasCategorias.push(...cats);

        // Itens do ambiente
        const items = a.parsed.itens.map((it) => ({
          ...it,
          ambiente: a.nome,
        }));
        todosItens.push(...items);

        totalTabela += a.parsed.total_tabela;
        totalPedido += a.parsed.total_pedido;
        totalFrete += a.parsed.frete;
        totalMontagem += a.parsed.montagem;
      });

      const { data: orcamento, error: orcErr } = await supabase
        .from("orcamentos")
        .insert({
          loja_id: perfil.loja_id,
          cliente_id: finalClienteId,
          vendedor_id: user?.id ?? null,
          nome: ambientes.length === 1 ? ambientes[0].nome : `Orçamento Multiambientes (${ambientes.length})`,
          total_tabela: totalTabela,
          total_pedido: totalPedido,
          valor_negociado: totals.totalGeral + totalFrete + totalMontagem,
          desconto_global: 0, // Descontos agora são por ambiente
          frete_loja: totalFrete,
          montagem_loja: totalMontagem,
          categorias: todasCategorias as any,
          itens: todosItens as any,
          status: "rascunho",
        })
        .select("id")
        .single();
        
      if (orcErr) throw orcErr;

      toast.success("Orçamento criado com sucesso!");
      handleClose(false);
      navigate(`/orcamentos/${orcamento.id}/negociacao`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar orçamento");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">PASSO 2 — Orçamento XML (múltiplos ambientes)</DialogTitle>
          <DialogDescription>
            Importe um ou mais arquivos XML do Promob. Cada arquivo representa um ambiente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            accept=".xml"
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-2 py-8 flex flex-col gap-2 hover:bg-slate-50 hover:border-primary/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Plus className="h-6 w-6 text-primary" />
            )}
            <span className="font-semibold text-primary">
              {parsing ? "Lendo XML..." : "+ Adicionar ambiente (XML)"}
            </span>
          </Button>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-3">
            {totals.list.map((amb) => (
              <div 
                key={amb.id}
                className="bg-white border rounded-lg p-4 shadow-sm hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-1 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="font-bold text-slate-800">{amb.nome}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAmbiente(amb.id)}
                    className="text-slate-400 hover:text-destructive hover:bg-destructive/5 h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Remover</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">Valor de venda</p>
                    <p className="text-lg font-semibold text-slate-900">{formatBRL(amb.valorBase)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">Desconto (%)</p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={amb.desconto}
                          onChange={(e) => updateDesconto(amb.id, parseFloat(e.target.value) || 0)}
                          className="h-9 pr-7 font-bold text-primary"
                        />
                        <span className="absolute right-2 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <div className="text-slate-400">→</div>
                      <div className="flex-1 font-bold text-emerald-600 bg-emerald-50 h-9 flex items-center px-3 rounded-md border border-emerald-100">
                        {formatBRL(amb.valorFinal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 font-medium">Total geral dos ambientes:</span>
            <span className="text-2xl font-bold text-slate-900">{formatBRL(totals.totalGeral)}</span>
          </div>
          
          <Button
            onClick={handleProsseguir}
            disabled={creating || ambientes.length === 0}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando Orçamento...
              </>
            ) : (
              "Próximo →"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
