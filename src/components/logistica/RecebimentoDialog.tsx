import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Package, CheckCircle2, AlertCircle, X, ScanLine, Home, Warehouse, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type Destino = "deposito" | "cliente";

interface Caixa {
  id: string;
  codigo_barras: string;
  volume: number;
  status: "pendente" | "recebida" | "avariada";
  recebido_em: string | null;
  recebido_por: string | null;
  oc: string | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  oc: string | null;
  cliente_nome?: string | null;
  contratos?: { cliente_nome?: string } | null;
  total_caixas_previstas: number;
  total_caixas_recebidas: number;
  status_recebimento: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pedidoId: string | null;
  lojaId: string | null;
}

export function RecebimentoDialog({ open, onOpenChange, pedidoId, lojaId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [destino, setDestino] = useState<Destino | null>(null);
  const [bip, setBip] = useState("");
  const [ultimoBip, setUltimoBip] = useState<{ codigo: string; status: "ok" | "duplicado" | "nao_pertence" } | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [entreguePara, setEntreguePara] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotosPedido, setFotosPedido] = useState<{ id: string; storage_path: string; tipo_evento: string; descricao: string | null; url: string }[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showSairSemFinalizar, setShowSairSemFinalizar] = useState(false);
  const bipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Busca dados do pedido
  const { data: pedido } = useQuery({
    queryKey: ["recebimento-pedido", pedidoId],
    enabled: !!pedidoId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producao_terceirizada")
        .select("id, numero_pedido, oc, cliente_nome, total_caixas_previstas, total_caixas_recebidas, status_recebimento, contratos:contrato_id(cliente_nome)")
        .eq("id", pedidoId!)
        .single();
      if (error) throw error;
      return data as Pedido;
    },
  });

  // Busca caixas previstas
  const { data: caixas = [] } = useQuery({
    queryKey: ["recebimento-caixas", pedidoId],
    enabled: !!pedidoId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_previstas")
        .select("id, codigo_barras, volume, status, recebido_em, recebido_por, oc")
        .eq("producao_terceirizada_id", pedidoId!)
        .order("volume", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Caixa[];
    },
  });

  // Carrega destino ja escolhido (se voltar)
  useEffect(() => {
    if (!open || !pedido) return;
    setDestino(null);
    setBip("");
    setUltimoBip(null);
    setFinalizando(false);
    setEntreguePara("");
    setObservacao("");
    setShowSairSemFinalizar(false);
    // Se ja tem destino, restaura
    if (pedido.status_recebimento && pedido.status_recebimento !== "nao_iniciado") {
      // ja comecou, deixa null para usuario decidir se muda
    }
  }, [open, pedido?.id]);

  // Mantem foco no input de bipagem
  useEffect(() => {
    if (open && destino && !finalizando) {
      bipInputRef.current?.focus();
    }
  }, [open, destino, finalizando, ultimoBip]);

  // Carrega fotos do pedido
  useEffect(() => {
    if (!open || !pedidoId) return;
    (async () => {
      const { data } = await supabase
        .from("recebimento_fotos")
        .select("id, storage_path, tipo_evento, descricao")
        .eq("producao_terceirizada_id", pedidoId)
        .order("uploaded_em", { ascending: true });
      if (data && data.length) {
        const withUrls = await Promise.all(
          data.map(async (f) => {
            const { data: signed } = await supabase.storage
              .from("recebimentos")
              .createSignedUrl(f.storage_path, 60 * 60);
            return { ...f, url: signed?.signedUrl ?? "" };
          })
        );
        setFotosPedido(withUrls);
      } else {
        setFotosPedido([]);
      }
    })();
  }, [open, pedidoId]);

  const caixasRecebidas = useMemo(() => caixas.filter((c) => c.status === "recebida").length, [caixas]);
  const totalCaixas = caixas.length;
  const pct = totalCaixas ? Math.round((caixasRecebidas / totalCaixas) * 100) : 0;
  const completo = totalCaixas > 0 && caixasRecebidas === totalCaixas;

  // Garante que o status do pedido reflete a contagem ao abrir
  useEffect(() => {
    if (!open || !pedidoId || !pedido) return;
    if (pedido.status_recebimento === "nao_iniciado" && totalCaixas > 0 && caixasRecebidas > 0) {
      // ja tinha sido bipado antes mas status nao foi atualizado
      supabase
        .from("producao_terceirizada")
        .update({ status_recebimento: "em_recebimento" })
        .eq("id", pedidoId)
        .then(() => qc.invalidateQueries({ queryKey: ["recebimento-pedido", pedidoId] }));
    }
  }, [open, pedidoId, pedido?.status_recebimento, totalCaixas, caixasRecebidas]);

  const handleBipar = async (codigoBarras: string) => {
    const cb = codigoBarras.trim();
    if (!cb) return;

    // Busca a caixa prevista
    const { data: caixa } = await supabase
      .from("caixas_previstas")
      .select("id, status, producao_terceirizada_id")
      .eq("codigo_barras", cb)
      .maybeSingle();

    if (!caixa) {
      setUltimoBip({ codigo: cb, status: "nao_pertence" });
      toast.error(`Codigo ${cb} nao encontrado em nenhum pedido`);
      return;
    }

    if (caixa.producao_terceirizada_id !== pedidoId) {
      setUltimoBip({ codigo: cb, status: "nao_pertence" });
      toast.error(`Codigo ${cb} pertence a outro pedido`);
      return;
    }

    if (caixa.status === "recebida") {
      setUltimoBip({ codigo: cb, status: "duplicado" });
      toast.warning(`Caixa ${cb} ja foi recebida`);
      return;
    }

    // Marca como recebida
    const { data: userData } = await supabase.auth.getUser();
    const userName = userData.user?.user_metadata?.nome || userData.user?.email || "Operador";

    const { error } = await supabase
      .from("caixas_previstas")
      .update({ status: "recebida", recebido_em: new Date().toISOString(), recebido_por: userName })
      .eq("id", caixa.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Registra auditoria
    await supabase.from("recebimentos").insert({
      caixa_id: caixa.id,
      loja_id: lojaId,
      usuario_id: user?.id,
      usuario_nome: userName,
      bipado_via: bip === cb ? "input" : "camera",
    });

    setUltimoBip({ codigo: cb, status: "ok" });
    setBip("");
    qc.invalidateQueries({ queryKey: ["recebimento-caixas", pedidoId] });
    qc.invalidateQueries({ queryKey: ["recebimento-pedido", pedidoId] });
  };

  const onBipKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value;
      handleBipar(v);
    }
  };

  const handleFotoUpload = async (file: File, tipo: "pedido" | "avaria" | "montagem" | "outro" = "pedido") => {
    if (!lojaId || !pedidoId) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Foto maior que 10MB");
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${lojaId}/${pedidoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("recebimentos")
        .upload(path, file, { contentType: file.type });

      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const userName = userData.user?.user_metadata?.nome || userData.user?.email || "Operador";

      await supabase.from("recebimento_fotos").insert({
        producao_terceirizada_id: pedidoId,
        loja_id: lojaId,
        storage_path: path,
        tipo_evento: tipo,
        uploaded_by: user?.id,
        uploaded_by_nome: userName,
      });

      toast.success("Foto salva");
      // Recarrega fotos
      const { data } = await supabase
        .from("recebimento_fotos")
        .select("id, storage_path, tipo_evento, descricao")
        .eq("producao_terceirizada_id", pedidoId)
        .order("uploaded_em", { ascending: true });
      if (data) {
        const withUrls = await Promise.all(
          data.map(async (f) => {
            const { data: signed } = await supabase.storage
              .from("recebimentos")
              .createSignedUrl(f.storage_path, 60 * 60);
            return { ...f, url: signed?.signedUrl ?? "" };
          })
        );
        setFotosPedido(withUrls);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto");
    } finally { setUploadingFoto(false); }
  };

  const handleFinalizar = async () => {
    if (!pedidoId || !destino) return;
    if (destino === "cliente" && !entreguePara.trim()) {
      toast.error("Informe o nome de quem recebeu");
      return;
    }
    setFinalizando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userName = userData.user?.user_metadata?.nome || userData.user?.email || "Operador";

      const statusFinal = destino === "cliente" ? "entrega_finalizada" : "recebido_deposito";

      const { error } = await supabase
        .from("producao_terceirizada")
        .update({
          status_recebimento: statusFinal,
          destino_recebimento: destino,
          recebido_em: new Date().toISOString(),
          recebido_por: userName,
          entregue_para: destino === "cliente" ? entreguePara.trim() : null,
          // Se for entrega finalizada em casa do cliente, marca como pronto para retirada
          // (libera a logistica de entrega posterior)
          status: "pronto_retirada",
        })
        .eq("id", pedidoId);

      if (error) {
        toast.error(error.message);
        return;
      }

      // Log no contrato se houver
      if (pedido && (pedido as Pedido).id) {
        const prod = pedido as Pedido;
        const { data: p } = await supabase
          .from("producao_terceirizada")
          .select("contrato_id, numero_pedido")
          .eq("id", pedidoId)
          .single();
        if (p?.contrato_id) {
          await supabase.from("contrato_logs").insert({
            contrato_id: p.contrato_id,
            acao: "recebimento_finalizado",
            etapa: "logistica",
            titulo: destino === "cliente" ? "Mercadoria entregue ao cliente" : "Mercadoria recebida no deposito",
            descricao: `Pedido #${p.numero_pedido} · ${destino === "cliente" ? `Recebido por: ${entreguePara}` : "Aguardando agendamento de entrega"}`,
            usuario_nome: userName,
          });
        }
      }

      toast.success(destino === "cliente" ? "Entrega finalizada!" : "Recebido no deposito!");
      qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
      qc.invalidateQueries({ queryKey: ["recebimento-pedido", pedidoId] });
      onOpenChange(false);
    } finally {
      setFinalizando(false);
    }
  };

  const handleSairSemFinalizar = async () => {
    if (!pedidoId) return;
    await supabase
      .from("producao_terceirizada")
      .update({ status_recebimento: "em_recebimento" })
      .eq("id", pedidoId);
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    qc.invalidateQueries({ queryKey: ["recebimento-pedido", pedidoId] });
    onOpenChange(false);
  };

  const clienteNome = (pedido as Pedido | undefined)?.contratos?.cliente_nome
    || (pedido as Pedido | undefined)?.cliente_nome
    || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 900 }} className="gap-3 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" style={{ color: "#1E6FBF" }} />
            Recebimento - Pedido #{pedido?.numero_pedido}
          </DialogTitle>
          <DialogDescription>
            {clienteNome && `Cliente: ${clienteNome} - `}
            {pedido?.oc && `OC: ${pedido.oc} - `}
            Bipar ou escanear os codigos de barras das caixas
          </DialogDescription>
        </DialogHeader>

        {/* ETAPA 1: Escolha de destino */}
        {!destino && totalCaixas > 0 && (
          <div className="space-y-3 py-3">
            <Label className="text-sm font-semibold">Qual o destino da mercadoria?</Label>
            <RadioGroup value={destino ?? ""} onValueChange={(v) => setDestino(v as Destino)}>
              <div className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="deposito"
                  className="cursor-pointer rounded-xl p-4 flex items-center gap-3"
                  style={{
                    border: destino === "deposito" ? "2px solid #1E6FBF" : "1px solid #E8ECF2",
                    backgroundColor: destino === "deposito" ? "#F0F7FF" : "#fff",
                  }}
                >
                  <RadioGroupItem value="deposito" id="deposito" />
                  <Warehouse className="h-5 w-5" style={{ color: "#1E6FBF" }} />
                  <div>
                    <div className="text-sm font-medium">Deposito</div>
                    <div className="text-xs text-muted-foreground">Vai para nosso estoque, depois agendamos entrega</div>
                  </div>
                </Label>
                <Label
                  htmlFor="cliente"
                  className="cursor-pointer rounded-xl p-4 flex items-center gap-3"
                  style={{
                    border: destino === "cliente" ? "2px solid #1E6FBF" : "1px solid #E8ECF2",
                    backgroundColor: destino === "cliente" ? "#F0F7FF" : "#fff",
                  }}
                >
                  <RadioGroupItem value="cliente" id="cliente" />
                  <Home className="h-5 w-5" style={{ color: "#1E6FBF" }} />
                  <div>
                    <div className="text-sm font-medium">Casa do cliente</div>
                    <div className="text-xs text-muted-foreground">Entrega direta, finaliza na hora</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* ETAPA 2: Bipagem */}
        {destino && !completo && (
          <div className="space-y-4">
            {/* Header de progresso */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F7F9FC", border: "0.5px solid #E8ECF2" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">Bipando caixas</div>
                  <div className="text-xs text-muted-foreground">
                    {caixasRecebidas} de {totalCaixas} caixas recebidas ({pct}%)
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: pct === 100 ? "#05873C" : "#1E6FBF" }}>
                  {pct}%
                </div>
              </div>
              <Progress value={pct} />
            </div>

            {/* Input de bipagem + botao camera */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#6B7A90" }} />
                <Input
                  ref={bipInputRef}
                  value={bip}
                  onChange={(e) => setBip(e.target.value)}
                  onKeyDown={onBipKeyDown}
                  placeholder="Bipe o codigo de barras (13 digitos) e pressione Enter..."
                  className="pl-9 h-12 text-base font-mono"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="h-12"
                disabled={uploadingFoto}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFotoUpload(f, "avaria");
                  e.target.value = "";
                }}
              />
            </div>

            {/* Feedback do ultimo bip */}
            {ultimoBip && (
              <div
                className="flex items-center gap-2 rounded-lg p-2.5 text-sm"
                style={{
                  backgroundColor: ultimoBip.status === "ok" ? "#D1FAE5" : "#FEF3F2",
                  color: ultimoBip.status === "ok" ? "#05873C" : "#D92D20",
                }}
              >
                {ultimoBip.status === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="font-mono">{ultimoBip.codigo}</span>
                <span>
                  {ultimoBip.status === "ok" && "- Caixa recebida"}
                  {ultimoBip.status === "duplicado" && "- Caixa ja recebida (ignorada)"}
                  {ultimoBip.status === "nao_pertence" && "- Codigo nao pertence a este pedido"}
                </span>
              </div>
            )}

            {/* Grade de caixas */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">CAIXAS DO PEDIDO</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {caixas.map((c) => {
                  const ok = c.status === "recebida";
                  return (
                    <div
                      key={c.id}
                      className="rounded-md p-2 text-center text-xs"
                      style={{
                        backgroundColor: ok ? "#D1FAE5" : "#F7F9FC",
                        border: `1px solid ${ok ? "#05873C" : "#E8ECF2"}`,
                        color: ok ? "#05873C" : "#6B7A90",
                      }}
                      title={c.codigo_barras}
                    >
                      <div className="font-bold">v{c.volume}</div>
                      <div className="font-mono text-[10px] truncate">{c.codigo_barras}</div>
                      {ok && <CheckCircle2 className="h-3 w-3 mx-auto mt-1" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: Finalizacao */}
        {destino && completo && (
          <div className="space-y-4 py-2">
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ backgroundColor: "#D1FAE5", border: "0.5px solid #05873C" }}
            >
              <CheckCircle2 className="h-6 w-6" style={{ color: "#05873C" }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "#05873C" }}>
                  {totalCaixas} de {totalCaixas} caixas bipadas
                </div>
                <div className="text-xs" style={{ color: "#05873C" }}>
                  Pronto para confirmar o recebimento
                </div>
              </div>
            </div>

            {destino === "cliente" && (
              <div>
                <Label htmlFor="entreguePara" className="text-sm font-semibold">
                  Nome de quem recebeu <span style={{ color: "#D92D20" }}>*</span>
                </Label>
                <Input
                  id="entreguePara"
                  value={entreguePara}
                  onChange={(e) => setEntreguePara(e.target.value)}
                  placeholder="Ex: Joao da Silva (cliente)"
                  className="mt-1.5"
                />
              </div>
            )}

            <div>
              <Label htmlFor="observacao" className="text-sm">Observacao (opcional)</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Caixa 3 com avaria no canto, conferir com cliente..."
                rows={2}
                className="mt-1.5"
              />
            </div>

            {/* Upload de fotos */}
            <div>
              <Label className="text-sm">Fotos da mercadoria</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingFoto}
                >
                  <Camera className="h-3.5 w-3.5 mr-1" /> Tirar foto
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFotoUpload(f, "pedido");
                    e.target.value = "";
                  }}
                />
                {uploadingFoto && <span className="text-xs text-muted-foreground">Enviando...</span>}
              </div>
              {fotosPedido.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {fotosPedido.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square rounded-md overflow-hidden border"
                      style={{ borderColor: "#E8ECF2" }}
                    >
                      {f.url ? (
                        <img src={f.url} alt={f.tipo_evento} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#F7F9FC" }}>
                          <ImageIcon className="h-4 w-4" style={{ color: "#6B7A90" }} />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botoes de acao */}
        <div className="flex justify-between gap-2 pt-3 border-t">
          <div>
            {destino && !completo && (
              <Button variant="ghost" onClick={() => setShowSairSemFinalizar(true)}>
                Sair e continuar depois
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {destino && completo && (
              <Button
                onClick={handleFinalizar}
                disabled={finalizando || (destino === "cliente" && !entreguePara.trim())}
                style={{ backgroundColor: "#05873C", color: "#fff" }}
              >
                {finalizando ? "Salvando..." : destino === "cliente" ? "Finalizar entrega" : "Confirmar recebimento"}
              </Button>
            )}
            {destino && !completo && totalCaixas > 0 && (
              <Button onClick={handleSairSemFinalizar} variant="outline">
                Salvar e sair ({caixasRecebidas}/{totalCaixas})
              </Button>
            )}
          </div>
        </div>

        {/* Confirmacao de saida sem finalizar */}
        {showSairSemFinalizar && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowSairSemFinalizar(false)}
          >
            <div
              className="bg-white rounded-xl p-5 max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold">Salvar progresso?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Suas bipagens ({caixasRecebidas}/{totalCaixas}) serao salvas. Voce podera continuar depois.
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowSairSemFinalizar(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSairSemFinalizar} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
                  Salvar e sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
