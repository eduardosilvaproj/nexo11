import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const sb = supabase as unknown as { from: (t: string) => any };

interface CotacaoItem {
  descricao: string;
  quantidade: number;
  unidade?: string;
}

interface CotacaoFornecedor {
  fornecedor_id: string;
  fornecedor_nome: string;
  precos: { preco_unitario: number }[];
  prazo_entrega: string;
  observacoes: string;
}

interface CotacaoFornecedoresProps {
  requisicaoId: string;
  itens: CotacaoItem[];
}

export function CotacaoFornecedores({ requisicaoId, itens }: CotacaoFornecedoresProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cotacoes, setCotacoes] = useState<CotacaoFornecedor[]>([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-ativos"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("fornecedores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cotacoesExistentes = [] } = useQuery({
    queryKey: ["cotacoes-requisicao", requisicaoId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("compras_cotacoes")
        .select("*, fornecedores:fornecedor_id(nome)")
        .eq("requisicao_id", requisicaoId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addFornecedor = () => {
    if (!selectedFornecedor) return;
    if (cotacoes.find((c) => c.fornecedor_id === selectedFornecedor)) {
      toast.error("Fornecedor já adicionado");
      return;
    }
    const f = fornecedores.find((f: any) => f.id === selectedFornecedor);
    if (!f) return;
    setCotacoes((prev) => [
      ...prev,
      {
        fornecedor_id: f.id,
        fornecedor_nome: f.nome,
        precos: itens.map(() => ({ preco_unitario: 0 })),
        prazo_entrega: "",
        observacoes: "",
      },
    ]);
    setSelectedFornecedor("");
  };

  const removeFornecedor = (idx: number) => {
    setCotacoes((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePreco = (cotIdx: number, itemIdx: number, valor: number) => {
    setCotacoes((prev) =>
      prev.map((c, ci) =>
        ci === cotIdx
          ? { ...c, precos: c.precos.map((p, pi) => (pi === itemIdx ? { preco_unitario: valor } : p)) }
          : c
      )
    );
  };

  const updateField = (cotIdx: number, field: "prazo_entrega" | "observacoes", value: string) => {
    setCotacoes((prev) => prev.map((c, ci) => (ci === cotIdx ? { ...c, [field]: value } : c)));
  };

  const getBestPriceIdx = (itemIdx: number): number => {
    let best = -1;
    let min = Infinity;
    cotacoes.forEach((c, ci) => {
      const p = c.precos[itemIdx]?.preco_unitario ?? 0;
      if (p > 0 && p < min) {
        min = p;
        best = ci;
      }
    });
    return best;
  };

  const getTotal = (cotIdx: number): number => {
    return cotacoes[cotIdx].precos.reduce(
      (sum, p, i) => sum + p.preco_unitario * (itens[i]?.quantidade ?? 0),
      0
    );
  };

  const salvarCotacoes = async () => {
    if (cotacoes.length === 0) return toast.error("Adicione ao menos um fornecedor");
    setSaving(true);
    try {
      const { data: req } = await sb
        .from("requisicoes_compra")
        .select("loja_id")
        .eq("id", requisicaoId)
        .single();

      const inserts = cotacoes.map((c) => ({
        requisicao_id: requisicaoId,
        loja_id: req?.loja_id,
        fornecedor_id: c.fornecedor_id,
        itens: c.precos.map((p, i) => ({
          descricao: itens[i]?.descricao,
          quantidade: itens[i]?.quantidade,
          unidade: itens[i]?.unidade,
          preco_unitario: p.preco_unitario,
        })),
        prazo_entrega: c.prazo_entrega || null,
        valor_total: getTotal(cotacoes.indexOf(c)),
        observacoes: c.observacoes || null,
        created_by: user?.id,
        status: "pendente",
      }));

      const { error } = await sb.from("compras_cotacoes").insert(inserts);
      if (error) throw error;

      await sb
        .from("requisicoes_compra")
        .update({ status: "em_cotacao" })
        .eq("id", requisicaoId);

      toast.success("Cotações salvas com sucesso");
      qc.invalidateQueries({ queryKey: ["cotacoes-requisicao", requisicaoId] });
      qc.invalidateQueries({ queryKey: ["compras-requisicoes"] });
      setCotacoes([]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cotações");
    } finally {
      setSaving(false);
    }
  };

  const aprovarCotacao = async (cotacaoId: string) => {
    const { error } = await sb
      .from("compras_cotacoes")
      .update({ status: "aprovada" })
      .eq("id", cotacaoId);
    if (error) return toast.error(error.message);

    // Reject others
    await sb
      .from("compras_cotacoes")
      .update({ status: "rejeitada" })
      .eq("requisicao_id", requisicaoId)
      .neq("id", cotacaoId);

    await sb
      .from("requisicoes_compra")
      .update({ status: "aprovada" })
      .eq("id", requisicaoId);

    toast.success("Cotação aprovada");
    qc.invalidateQueries({ queryKey: ["cotacoes-requisicao", requisicaoId] });
    qc.invalidateQueries({ queryKey: ["compras-requisicoes"] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users size={18} style={{ color: "#1E6FBF" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>Cotação de Fornecedores</span>
      </div>

      {/* Existing quotations */}
      {cotacoesExistentes.length > 0 && (
        <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7A90", textTransform: "uppercase" }}>
            Cotações registradas
          </span>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: "#F7F9FC" }}>
                <tr>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Fornecedor</th>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Valor Total</th>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Prazo</th>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Status</th>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotacoesExistentes.map((cot: any) => (
                  <tr key={cot.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                    <td className="px-3 py-2" style={{ fontSize: 13 }}>{cot.fornecedores?.nome ?? "—"}</td>
                    <td className="px-3 py-2" style={{ fontSize: 13 }}>
                      R$ {Number(cot.valor_total || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2" style={{ fontSize: 13 }}>{cot.prazo_entrega || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={cot.status === "aprovada" ? "success" : cot.status === "rejeitada" ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {cot.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {cot.status === "pendente" && (
                        <Button size="sm" variant="outline" onClick={() => aprovarCotacao(cot.id)}>
                          <CheckCircle2 size={12} className="mr-1" />
                          Aprovar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New quotation form */}
      <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7A90", textTransform: "uppercase" }}>
          Nova cotação
        </span>

        <div className="mt-3 flex items-center gap-2">
          <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecionar fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addFornecedor}>
            <Plus size={14} className="mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Comparison table */}
        {cotacoes.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: "#F7F9FC" }}>
                <tr>
                  <th className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>Item</th>
                  {cotacoes.map((c, ci) => (
                    <th key={ci} className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90" }}>
                      <div className="flex items-center gap-1">
                        {c.fornecedor_nome}
                        <button onClick={() => removeFornecedor(ci)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, ii) => {
                  const bestIdx = getBestPriceIdx(ii);
                  return (
                    <tr key={ii} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                      <td className="px-3 py-2" style={{ fontSize: 12 }}>
                        {item.descricao}
                        <span style={{ fontSize: 10, color: "#6B7A90", marginLeft: 4 }}>
                          x{item.quantidade} {item.unidade ?? ""}
                        </span>
                      </td>
                      {cotacoes.map((_, ci) => (
                        <td key={ci} className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-24 h-7 text-xs"
                            style={bestIdx === ci ? { backgroundColor: "#ECFDF5", borderColor: "#05873C" } : {}}
                            value={cotacoes[ci].precos[ii]?.preco_unitario || ""}
                            onChange={(e) => updatePreco(ci, ii, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {/* Prazo row */}
                <tr style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500 }}>Prazo entrega</td>
                  {cotacoes.map((c, ci) => (
                    <td key={ci} className="px-3 py-2">
                      <Input
                        placeholder="Ex: 5 dias"
                        className="w-24 h-7 text-xs"
                        value={c.prazo_entrega}
                        onChange={(e) => updateField(ci, "prazo_entrega", e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
                {/* Total row */}
                <tr style={{ borderTop: "1px solid #E8ECF2", backgroundColor: "#F7F9FC" }}>
                  <td className="px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: "#0D1117" }}>Total</td>
                  {cotacoes.map((_, ci) => (
                    <td key={ci} className="px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: "#0D1117" }}>
                      R$ {getTotal(ci).toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Observacoes */}
            <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `1fr repeat(${cotacoes.length}, 1fr)` }}>
              <span style={{ fontSize: 11, color: "#6B7A90" }}>Obs:</span>
              {cotacoes.map((c, ci) => (
                <Textarea
                  key={ci}
                  rows={2}
                  placeholder="Observações"
                  className="text-xs"
                  value={c.observacoes}
                  onChange={(e) => updateField(ci, "observacoes", e.target.value)}
                />
              ))}
            </div>
          </div>
        )}

        {cotacoes.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button onClick={salvarCotacoes} disabled={saving}>
              <CheckCircle2 size={14} className="mr-1.5" />
              {saving ? "Salvando..." : "Salvar cotações"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
