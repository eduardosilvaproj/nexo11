import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileCode2, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parsePromobXml, type PromobParsed } from "@/lib/promob-xml";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const formatBRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const clampDesc = (n: number) => Math.max(0, Math.min(60, Math.round(n * 10) / 10));

export function ImportXmlPromobDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { perfil, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<PromobParsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Negociação
  const [descontos, setDescontos] = useState<Record<string, number>>({});
  const [frete, setFrete] = useState(0);
  const [montagem, setMontagem] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const reset = () => {
    setFile(null);
    setParsed(null);
    setError(null);
    setParsing(false);
    setDescontos({});
    setFrete(0);
    setMontagem(0);
    setExpanded({});
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (!/\.xml$/i.test(f.name)) {
      setError("Apenas arquivos .xml são aceitos");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande (máx 10MB)");
      return;
    }
    setError(null);
    setParsing(true);
    setFile(f);
    try {
      const text = await f.text();
      const data = parsePromobXml(text);
      setParsed(data);

      const initialDesc: Record<string, number> = {};
      data.categorias.forEach((c) => {
        initialDesc[c.id] = clampDesc(c.desconto_pct);
      });
      setDescontos(initialDesc);
      setFrete(data.frete);
      setMontagem(data.montagem);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler XML");
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const calc = useMemo(() => {
    if (!parsed) return null;
    const linhas = parsed.categorias.map((c) => {
      const tabela = c.tabela || c.itens.reduce((s, x) => s + x.price * x.quantity, 0) || c.total;
      const desc = descontos[c.id] ?? 0;
      const valor = tabela * (1 - desc / 100);
      return { id: c.id, descricao: c.description, tabela, desc, valor };
    });
    const subtotal = linhas.reduce((s, l) => s + l.valor, 0);
    const valorVenda = subtotal + frete + montagem;
    const custoProduto = parsed.total_tabela;
    const margem = valorVenda > 0 ? ((valorVenda - custoProduto) / valorVenda) * 100 : 0;
    return { linhas, subtotal, valorVenda, custoProduto, margem };
  }, [parsed, descontos, frete, montagem]);

  const margemColor = (m: number) =>
    m >= 30 ? "#12B76A" : m >= 15 ? "#F59E0B" : "#E53935";

  const handleCriarContrato = async () => {
    if (!parsed || !calc) return;
    if (!perfil?.loja_id) {
      toast.error("Loja do usuário não encontrada");
      return;
    }
    setCreating(true);
    try {
      const categoriasJson = calc.linhas.map((l) => ({
        id: l.id,
        descricao: l.descricao,
        tabela: l.tabela,
        desconto_pct: l.desc,
        valor: l.valor,
      }));

      // 1) Contrato (trigger cria dre_contrato automaticamente)
      const { data: contrato, error: contErr } = await supabase
        .from("contratos")
        .insert({
          loja_id: perfil.loja_id,
          cliente_nome: parsed.cliente_nome || "Cliente Promob",
          valor_venda: calc.valorVenda,
          vendedor_id: user?.id ?? null,
        })
        .select("id")
        .single();
      if (contErr) throw contErr;

      // 2) Orçamento vinculado ao contrato
      const { error: orcErr } = await supabase.from("orcamentos_promob").insert({
        loja_id: perfil.loja_id,
        contrato_id: contrato.id,
        cliente_nome: parsed.cliente_nome || null,
        ordem_compra: parsed.ordem_compra || null,
        arquivo_nome: file?.name || null,
        total_tabela: parsed.total_tabela,
        total_pedido: parsed.total_pedido,
        total_orcamento: parsed.total_orcamento,
        categorias: categoriasJson as unknown as never,
        itens: parsed.itens as unknown as never,
        acrescimos: [
          ...parsed.acrescimos,
          { id: "frete", description: "Frete", value: frete, percentual: 0 },
          { id: "montagem", description: "Montagem", value: montagem, percentual: 0 },
        ] as unknown as never,
        valor_negociado: calc.valorVenda,
        status: "convertido",
        criado_por: user?.id ?? null,
      });
      if (orcErr) throw orcErr;

      // 3) DRE com custos previstos do XML
      const { error: dreErr } = await supabase
        .from("dre_contrato")
        .update({
          valor_venda: calc.valorVenda,
          custo_produto_previsto: parsed.total_tabela,
          custo_frete_previsto: frete,
          custo_montagem_previsto: montagem,
        })
        .eq("contrato_id", contrato.id);
      if (dreErr) throw dreErr;

      toast.success("Contrato criado com DRE preenchido ✓");
      handleClose(false);
      navigate(`/contratos/${contrato.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar contrato");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar XML Promob</DialogTitle>
          <DialogDescription>
            {parsed ? "Passo 2 — Revisar descontos e calcular valor de venda." : "Passo 1 — Faça upload do XML para gerar um orçamento."}
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors hover:border-[#1E6FBF]"
            style={{
              borderColor: dragOver ? "#1E6FBF" : "#E8ECF2",
              background: dragOver ? "#F0F7FF" : "#FAFBFC",
            }}
          >
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && !error ? (
              <>
                <FileCode2 className="h-8 w-8" style={{ color: "#1E6FBF" }} />
                <p className="mt-2 text-sm font-medium" style={{ color: "#0D1117" }}>{file.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                  {(file.size / 1024).toFixed(1)} KB · clique para trocar
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8" style={{ color: "#6B7A90" }} />
                <p className="mt-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                  Arraste o XML gerado pelo Promob
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                  Promob → Relatórios → Orçamento → Exportar XML
                </p>
              </>
            )}
          </label>
        )}

        {parsing && (
          <p className="text-center text-sm" style={{ color: "#6B7A90" }}>Lendo XML...</p>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-md p-3"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <AlertCircle className="h-4 w-4 mt-0.5" style={{ color: "#E53935" }} />
            <p className="text-sm" style={{ color: "#991B1B" }}>{error}</p>
          </div>
        )}

        {parsed && !error && calc && (
          <div className="space-y-4">
            {/* Header pós-parse */}
            <div className="flex items-start justify-between gap-3 rounded-md p-3" style={{ background: "#FAFBFC", border: "1px solid #E8ECF2" }}>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: "#6B7A90" }}>Cliente</p>
                <p className="text-sm font-semibold truncate" style={{ color: "#0D1117" }}>
                  {parsed.cliente_nome || "—"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#6B7A90" }}>
                  Ordem: <span style={{ color: "#0D1117" }}>{parsed.ordem_compra || "—"}</span>
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
                style={{ background: "#ECFDF3", border: "1px solid #B7E4C7" }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#12B76A" }} />
                <span className="text-xs font-medium" style={{ color: "#12B76A" }}>XML carregado</span>
              </div>
            </div>

            {/* Seção 1 — Resumo do fabricante */}
            <section className="rounded-md p-3" style={{ background: "#F5F7FA", border: "1px solid #E8ECF2" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7A90" }}>
                Resumo do fabricante
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <ResumoItem label="Preço de tabela" value={parsed.total_tabela} />
                <ResumoItem label="Valor do pedido" value={parsed.total_pedido} />
                <ResumoItem label="Valor orçamento" value={parsed.total_orcamento} />
              </div>
              <p className="mt-2 text-xs" style={{ color: "#B0BAC9" }}>
                Valores conforme tabela do fabricante
              </p>
            </section>

            {/* Seção 2 — Categorias */}
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7A90" }}>
                Categorias — desconto do vendedor
              </p>
              {calc.linhas.map((l) => (
                <div
                  key={l.id}
                  className="rounded-md p-3"
                  style={{ background: "#FFFFFF", border: "1px solid #E8ECF2" }}
                >
                  <p className="text-sm font-medium truncate" style={{ color: "#0D1117" }}>
                    {l.descricao || "Categoria"}
                  </p>
                  <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <p className="text-xs" style={{ color: "#6B7A90" }}>Tabela</p>
                      <p className="text-sm font-medium" style={{ color: "#0D1117" }}>
                        {formatBRL(l.tabela)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#6B7A90" }}>Desc.</span>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        max={60}
                        value={l.desc}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(60, parseFloat(e.target.value) || 0));
                          setDescontos((prev) => ({ ...prev, [l.id]: v }));
                        }}
                        className="h-8 w-20 text-right"
                      />
                      <span className="text-xs" style={{ color: "#6B7A90" }}>%</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#6B7A90" }}>Valor</p>
                      <p className="text-sm font-semibold" style={{ color: "#1E6FBF" }}>
                        {formatBRL(l.valor)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <AcrescimoInput label="Frete" value={frete} onChange={setFrete} />
                <AcrescimoInput label="Montagem" value={montagem} onChange={setMontagem} />
              </div>
            </section>

            {/* Seção 3 — Valor de venda calculado */}
            <section className="rounded-lg p-4" style={{ background: "#0D1117" }}>
              <div className="space-y-1.5 text-sm" style={{ color: "#B0BAC9" }}>
                <Row label="Subtotal categorias" value={formatBRL(calc.subtotal)} />
                <Row label="+ Frete" value={formatBRL(frete)} />
                <Row label="+ Montagem" value={formatBRL(montagem)} />
              </div>
              <div className="my-3 h-px" style={{ background: "#1F2A3A" }} />
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide" style={{ color: "#6B7A90" }}>
                  Valor de venda
                </span>
                <span style={{ color: "#FFFFFF", fontSize: 32, fontWeight: 500, lineHeight: 1 }}>
                  {formatBRL(calc.valorVenda)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p style={{ color: "#6B7A90" }}>Custo do produto (tabela)</p>
                  <p className="mt-0.5 text-sm font-medium" style={{ color: "#FFFFFF" }}>
                    {formatBRL(calc.custoProduto)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: "#6B7A90" }}>Margem prevista</p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: margemColor(calc.margem) }}>
                    {calc.margem.toFixed(1)}%
                  </p>
                </div>
              </div>
            </section>

            <Button
              onClick={handleCriarContrato}
              disabled={creating || calc.valorVenda <= 0}
              className="w-full text-white hover:opacity-90"
              style={{ background: "#12B76A" }}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando contrato...
                </>
              ) : (
                "Criar contrato com este orçamento →"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResumoItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "#6B7A90" }}>{label}</p>
      <p className="mt-0.5 text-sm font-semibold" style={{ color: "#0D1117" }}>
        {formatBRL(value)}
      </p>
    </div>
  );
}

function AcrescimoInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-md p-3" style={{ background: "#FFFFFF", border: "1px solid #E8ECF2" }}>
      <p className="text-xs" style={{ color: "#6B7A90" }}>{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs" style={{ color: "#6B7A90" }}>R$</span>
        <Input
          type="number"
          step={1}
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
          className="h-8 text-right"
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span style={{ color: "#FFFFFF" }}>{value}</span>
    </div>
  );
}
