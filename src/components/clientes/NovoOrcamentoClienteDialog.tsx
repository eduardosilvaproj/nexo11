import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileCode2, AlertCircle, CheckCircle2 } from "lucide-react";
import { parsePromobXml, type PromobParsed } from "@/lib/promob-xml";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clienteId: string;
  clienteNome: string;
  lojaId: string;
  onSaved?: () => void;
}

const formatBRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const clampDesc = (n: number) => Math.max(0, Math.min(60, Math.round(n * 10) / 10));

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do orçamento").max(120),
  vendedor_id: z.string().uuid("Selecione um vendedor"),
});

export function NovoOrcamentoClienteDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  lojaId,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<PromobParsed | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descontos, setDescontos] = useState<Record<string, number>>({});
  const [freteLoja, setFreteLoja] = useState(0);
  const [montagemLoja, setMontagemLoja] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVendedorId(user?.id ?? "");
    supabase
      .from("usuarios_publico")
      .select("id,nome")
      .eq("loja_id", lojaId)
      .order("nome")
      .then(({ data }) => {
        setVendedores(((data ?? []) as Array<{ id: string | null; nome: string | null }>)
          .filter((u) => u.id && u.nome)
          .map((u) => ({ id: u.id as string, nome: u.nome as string })));
      });
  }, [open, lojaId, user?.id]);

  const reset = () => {
    setNome("");
    setVendedorId("");
    setFile(null);
    setParsed(null);
    setError(null);
    setDescontos({});
    setFreteLoja(0);
    setMontagemLoja(0);
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
      const initial: Record<string, number> = {};
      data.categorias.forEach((c) => (initial[c.id] = clampDesc(c.desconto_pct)));
      setDescontos(initial);
      setFreteLoja(data.frete);
      setMontagemLoja(data.montagem);
      // Default: preencher nome com ordem_compra do XML, se ainda vazio
      if (!nome.trim() && data.ordem_compra) {
        setNome(data.ordem_compra);
      }
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
      const custoLinha = c.pedido || tabela; // ORDER por categoria (custo real)
      const desc = descontos[c.id] ?? 0;
      const negociado = tabela * (1 - desc / 100);
      const margemReal = negociado > 0 ? ((negociado - custoLinha) / negociado) * 100 : 0;
      return { id: c.id, descricao: c.description, tabela, desc, negociado, margem: margemReal };
    });
    const subtotal = linhas.reduce((s, l) => s + l.negociado, 0);
    const valorVenda = subtotal + freteLoja + montagemLoja;
    const custoProduto = parsed.total_pedido || parsed.total_tabela; // ORDER = custo real
    const margemPrev = valorVenda > 0 ? ((valorVenda - custoProduto) / valorVenda) * 100 : 0;
    return { linhas, subtotal, valorVenda, custoProduto, margemPrev };
  }, [parsed, descontos, freteLoja, montagemLoja]);

  const margemColor = (m: number) =>
    m >= 30 ? "text-emerald-600" : m >= 15 ? "text-amber-600" : "text-destructive";

  const save = async (status: "rascunho" | "enviado") => {
    const v = schema.safeParse({ nome, vendedor_id: vendedorId });
    if (!v.success) {
      toast.error(v.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    if (!parsed || !calc) {
      toast.error("Carregue um XML válido");
      return;
    }
    setSaving(true);
    try {
      const categoriasJson = calc.linhas.map((l) => ({
        id: l.id,
        descricao: l.descricao,
        tabela: l.tabela,
        desconto_pct: l.desc,
        valor: l.negociado,
        margem: l.margem,
      }));

      const { error: insErr } = await supabase.from("orcamentos").insert({
        cliente_id: clienteId,
        loja_id: lojaId,
        vendedor_id: vendedorId,
        nome: nome.trim(),
        arquivo_nome: file?.name ?? null,
        ordem_compra: parsed.ordem_compra || null,
        total_tabela: parsed.total_tabela,
        total_pedido: parsed.total_pedido,
        valor_negociado: calc.valorVenda,
        frete_fabrica: parsed.frete,
        montagem_fabrica: parsed.montagem,
        frete_loja: freteLoja,
        montagem_loja: montagemLoja,
        categorias: categoriasJson as unknown as never,
        itens: parsed.itens as unknown as never,
        acrescimos: parsed.acrescimos as unknown as never,
        status,
      });
      if (insErr) throw insErr;

      toast.success("Orçamento salvo");
      handleClose(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar orçamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo orçamento — {clienteNome}</DialogTitle>
          <DialogDescription>
            {parsed ? "Passo 2 — Revise descontos e calcule o valor de venda." : "Passo 1 — Identifique e carregue o XML do Promob."}
          </DialogDescription>
        </DialogHeader>

        {/* PASSO 1 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="orc-nome">Nome do orçamento *</Label>
            <Input
              id="orc-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Cozinha + Suite"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orc-vendedor">Vendedor *</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger id="orc-vendedor">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {parsed && file ? (
            <>
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 dark:bg-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">XML carregado ✓</span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                <FileCode2 className="h-4 w-4 text-primary" />
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">clique para trocar</p>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Arraste o XML do Promob</p>
              <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
            </>
          )}
        </label>

        {parsing && <p className="text-center text-sm text-muted-foreground">Lendo XML...</p>}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* PASSO 2 */}
        {parsed && calc && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Ordem Promob: </span>
                <span className="font-medium">{parsed.ordem_compra || "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Cliente no XML: </span>
                <span className="font-medium">{parsed.cliente_nome || "—"}</span>
                {parsed.cliente_nome &&
                  parsed.cliente_nome.trim().toLowerCase() !== clienteNome.trim().toLowerCase() && (
                    <span className="ml-2 text-xs text-amber-600">⚠ diferente do cliente atual</span>
                  )}
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Categoria</th>
                    <th className="px-3 py-2 text-right font-medium">Tabela</th>
                    <th className="px-3 py-2 text-right font-medium">Desc %</th>
                    <th className="px-3 py-2 text-right font-medium">Negociado</th>
                    <th className="px-3 py-2 text-right font-medium">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.linhas.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2">{l.descricao || "Categoria"}</td>
                      <td className="px-3 py-2 text-right">{formatBRL(l.tabela)}</td>
                      <td className="px-3 py-2 text-right">
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
                          className="ml-auto h-8 w-20 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{formatBRL(l.negociado)}</td>
                      <td className={`px-3 py-2 text-right ${margemColor(l.margem)}`}>
                        {l.margem.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 text-sm font-medium">
                  <tr className="border-t">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">
                      {formatBRL(calc.linhas.reduce((s, l) => s + l.tabela, 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-right">{formatBRL(calc.subtotal)}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frete loja</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={freteLoja}
                  onChange={(e) => setFreteLoja(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Montagem loja</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={montagemLoja}
                  onChange={(e) => setMontagemLoja(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: "#0D1117" }}>
              <div className="space-y-1.5 text-sm text-slate-400">
                <Row label="Subtotal categorias" value={formatBRL(calc.subtotal)} />
                <Row label="+ Frete" value={formatBRL(freteLoja)} />
                <Row label="+ Montagem" value={formatBRL(montagemLoja)} />
              </div>
              <div className="my-3 h-px bg-slate-800" />
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">Valor de venda</span>
                <span className="text-white" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1 }}>
                  {formatBRL(calc.valorVenda)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">Custo fabricante (ORDER)</p>
                  <p className="text-slate-200">{formatBRL(calc.custoProduto)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Margem prevista</p>
                  <p
                    className={
                      calc.margemPrev >= 30
                        ? "text-emerald-400"
                        : calc.margemPrev >= 15
                        ? "text-amber-400"
                        : "text-red-400"
                    }
                  >
                    {calc.margemPrev.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => save("rascunho")} disabled={saving || !parsed}>
            Salvar rascunho
          </Button>
          <Button
            onClick={() => save("enviado")}
            disabled={saving || !parsed}
            style={{ backgroundColor: "#1E6FBF" }}
            className="text-white hover:opacity-90"
          >
            Salvar e marcar como enviado →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
