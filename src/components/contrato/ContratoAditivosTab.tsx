import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileEdit, Trash2, TrendingUp, TrendingDown, Calendar, Layers, Upload, FileCode } from "lucide-react";
import { parsePromobXml, type PromobParsed, type PromobCategoria } from "@/lib/promob-xml";

interface Props {
  contratoId: string;
  lojaId: string;
  valorAtual: number;
}

interface Aditivo {
  id: string;
  tipo: string;
  descricao: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  data_vigencia: string | null;
  motivo: string | null;
  created_by: string;
  created_at: string;
  xml_itens?: PromobXmlResumo[] | null;
}

interface PromobXmlResumo {
  categoria: string;
  tabela: number;
  pedido: number;
  budget: number;
  itens: number;
}

const TIPOS = [
  { value: "valor", label: "Alteração de Valor", icon: TrendingUp },
  { value: "desconto", label: "Desconto", icon: TrendingDown },
  { value: "prazo", label: "Alteração de Prazo", icon: Calendar },
  { value: "escopo", label: "Alteração de Escopo", icon: Layers },
];

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ContratoAditivosTab({ contratoId, lojaId, valorAtual }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tipo: "valor",
    descricao: "",
    valor_novo: "",
    data_vigencia: "",
    motivo: "",
  });
  const [xmlItens, setXmlItens] = useState<PromobXmlResumo[]>([]);
  const [xmlFileName, setXmlFileName] = useState("");
  const [xmlTotalVenda, setXmlTotalVenda] = useState(0);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const { data: aditivos = [], isLoading } = useQuery({
    queryKey: ["contrato_aditivos", contratoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contrato_aditivos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Aditivo[];
    },
  });

  function handleXmlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      toast.error("Selecione um arquivo XML do Promob");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parsePromobXml(text);

        if (parsed.categorias.length === 0 && parsed.itens.length === 0) {
          toast.error("Nenhum item encontrado no XML. Verifique se é um XML do Promob válido.");
          return;
        }

        const totalVenda = parsed.total_orcamento || parsed.total_pedido;
        const resumo: PromobXmlResumo[] = parsed.categorias.map(c => ({
          categoria: c.description,
          tabela: c.tabela,
          pedido: c.pedido,
          budget: c.budget,
          itens: c.itens.length,
        }));

        setXmlItens(resumo);
        setXmlFileName(file.name);
        setXmlTotalVenda(totalVenda);
        setForm(f => ({
          ...f,
          valor_novo: totalVenda.toFixed(2).replace(".", ","),
          descricao: f.descricao || `Aditivo via XML Promob - ${parsed.categorias.length} ambiente(s)`,
        }));
        toast.success(`${parsed.categorias.length} ambiente(s) · ${parsed.itens.length} itens — Total: R$ ${totalVenda.toFixed(2).replace(".", ",")}`);
      } catch (err: any) {
        toast.error("Erro ao processar XML: " + (err.message || "Arquivo inválido"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleCriar() {
    if (!form.descricao.trim()) {
      toast.error("Informe a descrição do aditivo");
      return;
    }

    const valorNovo = form.tipo === "valor" || form.tipo === "desconto"
      ? Number(form.valor_novo.replace(/[^\d.,]/g, "").replace(",", ".")) || null
      : null;

    const { error } = await (supabase as any).from("contrato_aditivos").insert({
      contrato_id: contratoId,
      loja_id: lojaId,
      tipo: form.tipo,
      descricao: form.descricao,
      valor_anterior: (form.tipo === "valor" || form.tipo === "desconto") ? valorAtual : null,
      valor_novo: valorNovo,
      data_vigencia: form.data_vigencia || null,
      motivo: form.motivo || null,
      xml_itens: xmlItens.length > 0 ? xmlItens : null,
      created_by: user?.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // Se é alteração de valor, atualizar o contrato
    if ((form.tipo === "valor" || form.tipo === "desconto") && valorNovo) {
      await supabase.from("contratos").update({ valor_venda: valorNovo } as any).eq("id", contratoId);
      await (supabase as any).from("dre_contrato").update({ valor_venda: valorNovo }).eq("contrato_id", contratoId);
    }

    toast.success("Aditivo registrado");
    setShowForm(false);
    setForm({ tipo: "valor", descricao: "", valor_novo: "", data_vigencia: "", motivo: "" });
    setXmlItens([]);
    setXmlFileName("");
    setXmlTotalVenda(0);
    qc.invalidateQueries({ queryKey: ["contrato_aditivos", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  }

  async function handleExcluir(id: string) {
    if (!window.confirm("Excluir este aditivo?")) return;
    const { error } = await (supabase as any).from("contrato_aditivos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Aditivo excluído");
      qc.invalidateQueries({ queryKey: ["contrato_aditivos", contratoId] });
    }
  }

  function fmtData(s: string) {
    return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const tipoIcon = (tipo: string) => {
    const t = TIPOS.find(t => t.value === tipo);
    return t ? <t.icon className="h-4 w-4" /> : null;
  };

  const tipoColor = (tipo: string) => {
    switch (tipo) {
      case "valor": return "text-blue-600 bg-blue-50";
      case "desconto": return "text-orange-600 bg-orange-50";
      case "prazo": return "text-purple-600 bg-purple-50";
      case "escopo": return "text-emerald-600 bg-emerald-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-slate-400">Carregando aditivos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Aditivos Contratuais</h3>
          <p className="text-xs text-slate-500">Registre alterações de valor, prazo ou escopo</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1 bg-[#1E6FBF] hover:bg-[#1E6FBF]/90">
          <Plus className="h-3.5 w-3.5" /> Novo Aditivo
        </Button>
      </div>

      {/* Valor atual */}
      <div className="rounded-lg bg-slate-50 border p-3 flex items-center justify-between">
        <span className="text-sm text-slate-600">Valor atual do contrato</span>
        <span className="text-lg font-bold text-slate-900">{formatBRL(valorAtual)}</span>
      </div>

      {/* Lista de aditivos */}
      {aditivos.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed rounded-lg">
          <FileEdit className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum aditivo registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aditivos.map(a => (
            <div key={a.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor(a.tipo)}`}>
                    {tipoIcon(a.tipo)}
                    {TIPOS.find(t => t.value === a.tipo)?.label || a.tipo}
                  </span>
                  <span className="text-[10px] text-slate-400">{fmtData(a.created_at)}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleExcluir(a.id)}>
                  <Trash2 className="h-3 w-3 text-slate-400" />
                </Button>
              </div>
              <p className="text-sm text-slate-700">{a.descricao}</p>
              {(a.valor_anterior != null || a.valor_novo != null) && (
                <div className="flex items-center gap-2 text-xs">
                  {a.valor_anterior != null && (
                    <span className="text-slate-400 line-through">{formatBRL(a.valor_anterior)}</span>
                  )}
                  {a.valor_novo != null && (
                    <span className="font-semibold text-slate-700">→ {formatBRL(a.valor_novo)}</span>
                  )}
                </div>
              )}
              {a.motivo && (
                <p className="text-xs text-slate-500 italic">Motivo: {a.motivo}</p>
              )}
              {a.xml_itens && Array.isArray(a.xml_itens) && a.xml_itens.length > 0 && (
                <details className="text-[10px]">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                    <FileCode className="h-3 w-3 inline mr-1" />
                    {a.xml_itens.length} ambiente(s) do Promob
                  </summary>
                  <div className="mt-1 max-h-24 overflow-y-auto rounded border">
                    <table className="w-full">
                      <tbody>
                        {(a.xml_itens as PromobXmlResumo[]).map((item, i) => (
                          <tr key={i} className="border-t first:border-0">
                            <td className="px-1.5 py-0.5 text-slate-600 truncate max-w-[160px]">{item.categoria}</td>
                            <td className="px-1.5 py-0.5 text-right text-slate-500">{item.itens} itens</td>
                            <td className="px-1.5 py-0.5 text-right text-slate-700">{formatBRL(item.budget || item.pedido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog novo aditivo */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Novo Aditivo Contratual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Textarea
                placeholder="Descreva a alteração..."
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
              />
            </div>
            {(form.tipo === "valor" || form.tipo === "desconto") && (
              <div>
                <Label className="text-xs">Novo valor (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={form.valor_novo}
                  onChange={e => setForm(f => ({ ...f, valor_novo: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Valor atual: {formatBRL(valorAtual)}</p>

                {/* Upload XML Promob */}
                <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <FileCode className="h-3.5 w-3.5" /> Importar XML do Promob
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => xmlInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3" /> Selecionar XML
                    </Button>
                    <input
                      ref={xmlInputRef}
                      type="file"
                      accept=".xml"
                      className="hidden"
                      onChange={handleXmlUpload}
                    />
                  </div>
                  {xmlFileName && (
                    <p className="text-[10px] text-emerald-600">✓ {xmlFileName} — {xmlItens.length} ambiente(s)</p>
                  )}
                  {xmlItens.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded border text-[10px]">
                      <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left px-1.5 py-0.5 font-medium text-slate-500">Ambiente</th>
                            <th className="text-right px-1.5 py-0.5 font-medium text-slate-500">Itens</th>
                            <th className="text-right px-1.5 py-0.5 font-medium text-slate-500">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {xmlItens.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-1.5 py-0.5 text-slate-700 truncate max-w-[180px]">{item.categoria}</td>
                              <td className="px-1.5 py-0.5 text-right text-slate-600">{item.itens}</td>
                              <td className="px-1.5 py-0.5 text-right text-slate-700 font-medium">
                                {formatBRL(item.budget || item.pedido)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t font-semibold">
                          <tr>
                            <td className="px-1.5 py-0.5" colSpan={2}>Total (valor de venda)</td>
                            <td className="px-1.5 py-0.5 text-right">
                              {formatBRL(xmlTotalVenda)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">O valor de venda do XML Promob será usado como novo valor do contrato</p>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Data de vigência</Label>
              <Input type="date" value={form.data_vigencia} onChange={e => setForm(f => ({ ...f, data_vigencia: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Input
                placeholder="Motivo da alteração"
                value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCriar} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90">Registrar Aditivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
