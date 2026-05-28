import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight, Upload, Plus, Trash2, ArrowRight, FileText, Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type AmbienteResumo = { cor_mdf?: string; puxador?: string; observacao?: string };
type Eletrodomestico = { nome: string; marca?: string; modelo?: string; largura?: string; altura?: string; profundidade?: string };
type ItemExtra = { descricao: string; marca?: string; modelo?: string; cor?: string; quantidade?: string };
type LedConfig = { tipo?: "sim" | "nao"; custo?: "loja" | "cliente" };

type ChecklistJson = {
  comprovante_financeiro_url?: string;
  imagens_projeto?: string[];
  promob_chave?: string;
  promob_arquivo_url?: string;
  ambientes?: Record<string, AmbienteResumo>;
  eletrodomesticos?: Eletrodomestico[];
  eletrodomesticos_arquivo_url?: string;
  planta_hidraulica_url?: string;
  itens_extras?: ItemExtra[];
  led?: LedConfig;
};

type EnderecoJson = {
  cep?: string; rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string;
};

interface Props {
  contratoId: string;
  contrato: any;
  ambientes: any[];
  loja: any;
  onAvancar?: () => void;
}

const Block: React.FC<{
  title: string; doneCount: number; totalCount: number; defaultOpen?: boolean; children: React.ReactNode;
}> = ({ title, doneCount, totalCount, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const allDone = doneCount === totalCount && totalCount > 0;
  return (
    <div className="rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7F9FC]"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{title}</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: allDone ? "#ECFDF3" : "#F7F9FC",
            color: allDone ? "#05873C" : "#6B7A90",
            fontWeight: 500,
          }}
        >
          {doneCount}/{totalCount}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 flex flex-col gap-2">{children}</div>}
    </div>
  );
};

const Item: React.FC<{ done: boolean; label: string; action?: React.ReactNode }> = ({ done, label, action }) => (
  <div className="flex items-center justify-between py-2 gap-3" style={{ borderTop: "0.5px solid #F2F5F9" }}>
    <div className="flex items-center gap-2 min-w-0">
      {done ? <CheckCircle2 size={16} color="#05873C" /> : <Circle size={16} color="#C0C8D6" />}
      <span style={{ fontSize: 13, color: done ? "#0D1117" : "#6B7A90" }}>{label}</span>
    </div>
    {action}
  </div>
);

const ActionBtn: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: "primary" | "ghost" }> = ({
  onClick, children, variant = "ghost",
}) => (
  <button
    onClick={onClick}
    className="text-xs px-2.5 py-1 rounded-md transition-colors"
    style={{
      backgroundColor: variant === "primary" ? "#1E6FBF" : "#F7F9FC",
      color: variant === "primary" ? "#FFFFFF" : "#1E6FBF",
      border: "0.5px solid " + (variant === "primary" ? "#1E6FBF" : "#E8ECF2"),
      fontWeight: 500,
    }}
  >
    {children}
  </button>
);

export function ChecklistComercialCard({ contratoId, contrato, ambientes, loja, onAvancar }: Props) {
  const qc = useQueryClient();

  // Fetch checklist-specific fields directly from contratos (the parent view doesn't expose them)
  const { data: contratoChecklist } = useQuery({
    queryKey: ["contrato_checklist", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("checklist_comercial,endereco_entrega,eletrodomesticos_status,planta_hidraulica_status,itens_extras_status")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const checklist: ChecklistJson = (contratoChecklist?.checklist_comercial as any) || {};
  const endereco: EnderecoJson = (contratoChecklist?.endereco_entrega as any) || {};
  const eletrodomesticos_status: string | undefined = contratoChecklist?.eletrodomesticos_status ?? contrato.eletrodomesticos_status;
  const planta_hidraulica_status: string | undefined = contratoChecklist?.planta_hidraulica_status ?? contrato.planta_hidraulica_status;
  const itens_extras_status: string | undefined = contratoChecklist?.itens_extras_status ?? contrato.itens_extras_status;

  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [ambientesOpen, setAmbientesOpen] = useState(false);
  const [eletroOpen, setEletroOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);

  // Garante que sempre temos a lista mais atualizada de ambientes do contrato
  const { data: ambientesFresh } = useQuery({
    queryKey: ["checklist-ambientes", contratoId],
    queryFn: async () => {
      const { data } = await supabase.from("contrato_ambientes").select("id,nome").eq("contrato_id", contratoId).order("created_at");
      return data || [];
    },
  });
  const ambientesList = (ambientesFresh && ambientesFresh.length > 0) ? ambientesFresh : ambientes;

  const { data: cliente } = useQuery({
    queryKey: ["cliente-checklist", contrato.cliente_id],
    queryFn: async () => {
      if (!contrato.cliente_id) return null;
      const { data } = await supabase.from("clientes").select("nome,cpf_cnpj,telefone,email").eq("id", contrato.cliente_id).maybeSingle();
      return data;
    },
    enabled: !!contrato.cliente_id,
  });

  const { data: parcelas } = useQuery({
    queryKey: ["parcelas-check", contratoId],
    queryFn: async () => {
      const { data } = await supabase.from("financeiro_contas_receber").select("id,status").eq("contrato_id", contratoId).neq("status", "cancelado");
      return data || [];
    },
  });

  const { data: dre } = useQuery({
    queryKey: ["dre-check", contratoId],
    queryFn: async () => {
      const { data } = await supabase.from("dre_contrato").select("custo_frete_previsto").eq("contrato_id", contratoId).maybeSingle();
      return data;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["contrato_checklist", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
  };

  const saveChecklist = async (patch: Partial<ChecklistJson>) => {
    const merged = { ...checklist, ...patch };
    const { error } = await supabase.from("contratos").update({ checklist_comercial: merged } as any).eq("id", contratoId);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  };

  const saveField = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  };

  const uploadFile = async (file: File, prefix: string) => {
    const path = `${contratoId}/${prefix}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("contrato-comercial").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return path;
  };

  // ===== validations =====
  const cliCompleto = !!cliente?.nome && !!cliente?.cpf_cnpj && !!cliente?.telefone && !!cliente?.email;
  const endCompleto = !!endereco.cep && !!endereco.rua && !!endereco.numero && !!endereco.bairro && !!endereco.cidade && !!endereco.estado;
  const pagamentoOk = !!contrato.condicao_pagamento_id && (parcelas?.length ?? 0) > 0;
  const comprovanteOk = !!checklist.comprovante_financeiro_url;
  const assinadoOk = !!contrato.assinado;
  const imagensOk = (checklist.imagens_projeto?.length ?? 0) > 0;
  const promobOk = !!checklist.promob_chave || !!checklist.promob_arquivo_url;
  const ambientesOk = ambientesList.length > 0 && ambientesList.every((a: any) => {
    const r = checklist.ambientes?.[a.id];
    return !!r?.cor_mdf?.trim() && !!r?.puxador?.trim();
  });
  const eletroOk = eletrodomesticos_status && eletrodomesticos_status !== "pendente" &&
    (eletrodomesticos_status !== "informado" || (checklist.eletrodomesticos?.length ?? 0) > 0 || !!checklist.eletrodomesticos_arquivo_url);
  const plantaOk = planta_hidraulica_status && planta_hidraulica_status !== "pendente" &&
    (planta_hidraulica_status !== "anexada" || !!checklist.planta_hidraulica_url);
  const extrasOk = itens_extras_status && itens_extras_status !== "pendente" &&
    (itens_extras_status !== "listados" || (checklist.itens_extras?.length ?? 0) > 0);
  const ledOk = checklist.led?.tipo === "nao" || (checklist.led?.tipo === "sim" && !!checklist.led?.custo);

  const mesmaCidade = !!loja?.cidade && !!endereco.cidade && loja.cidade.trim().toLowerCase() === endereco.cidade.trim().toLowerCase();
  const viagemOk = mesmaCidade || Number(dre?.custo_frete_previsto ?? 0) > 0;

  const items = useMemo(() => [
    { key: "pagamento", label: "Forma de pagamento configurada", done: pagamentoOk },
    { key: "comprovante", label: "Comprovante financeiro anexado", done: !!comprovanteOk },
    { key: "assinado", label: "Contrato assinado pelo cliente", done: assinadoOk },
    { key: "cliente", label: "Dados do cliente completos", done: cliCompleto },
    { key: "endereco", label: "Endereço de entrega cadastrado", done: endCompleto },
    { key: "imagens", label: "Imagens do projeto anexadas", done: imagensOk },
    { key: "promob", label: "Chave/arquivo Promob enviado", done: promobOk },
    { key: "ambientes", label: "Resumo de cada ambiente preenchido", done: ambientesOk },
    { key: "led", label: "LED definido", done: ledOk },
    { key: "eletro", label: "Eletrodomésticos definidos", done: !!eletroOk },
    { key: "planta", label: "Planta hidráulica definida", done: !!plantaOk },
    { key: "extras", label: "Itens extras definidos", done: !!extrasOk },
    { key: "viagem", label: "Custo de viagem", done: viagemOk },
  ], [pagamentoOk, comprovanteOk, assinadoOk, cliCompleto, endCompleto, imagensOk, promobOk, ambientesOk, ledOk, eletroOk, plantaOk, extrasOk, viagemOk]);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  async function handleAvancar() {
    const pendentes = items.filter((i) => !i.done).map((i) => i.label);
    if (pendentes.length > 0) {
      toast.error("Itens pendentes na etapa Comercial", { description: pendentes.join(" • ") });
      return;
    }
    const { error } = await supabase.rpc("avancar_contrato", { p_contrato_id: contratoId });
    if (error) { toast.error(error.message); return; }
    toast.success("Contrato avançado para Medição");
    qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
    onAvancar?.();
  }

  async function onComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const p = await uploadFile(f, "comprovante"); if (p) { await saveChecklist({ comprovante_financeiro_url: p }); toast.success("Comprovante enviado"); }
    e.target.value = "";
  }
  async function onImagens(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    const paths: string[] = [];
    for (const f of files) { const p = await uploadFile(f, "img-projeto"); if (p) paths.push(p); }
    await saveChecklist({ imagens_projeto: [...(checklist.imagens_projeto || []), ...paths] });
    toast.success(`${paths.length} imagem(ns) enviada(s)`);
    e.target.value = "";
  }
  async function onPromobFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const p = await uploadFile(f, "promob"); if (p) { await saveChecklist({ promob_arquivo_url: p }); toast.success("Arquivo Promob enviado"); }
    e.target.value = "";
  }
  async function onPlantaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const p = await uploadFile(f, "planta"); if (p) { await saveChecklist({ planta_hidraulica_url: p }); await saveField({ planta_hidraulica_status: "anexada" }); toast.success("Planta enviada"); }
    e.target.value = "";
  }

  return (
    <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117", margin: 0 }}>Checklist Comercial</h3>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>{done} de {total} itens completos</span>
      </div>

      <div className="w-full h-1.5 rounded-full mb-4" style={{ backgroundColor: "#F2F5F9" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#05873C" : "#1E6FBF" }} />
      </div>

      <div className="flex flex-col gap-3">
        <Block title="Financeiro" doneCount={[pagamentoOk, comprovanteOk, assinadoOk].filter(Boolean).length} totalCount={3}>
          <Item done={pagamentoOk} label="Forma de pagamento configurada e aprovada" />
          <Item done={!!comprovanteOk} label="Comprovante financeiro anexado" action={
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={onComprovante} accept="image/*,application/pdf" />
              <span className="text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1" style={{ backgroundColor: "#F7F9FC", color: "#1E6FBF", border: "0.5px solid #E8ECF2", fontWeight: 500 }}>
                <Upload size={12} /> {comprovanteOk ? "Substituir" : "Enviar"}
              </span>
            </label>
          } />
          <Item done={assinadoOk} label="Contrato assinado pelo cliente" />
        </Block>

        <Block title="Dados do Cliente" doneCount={[cliCompleto, endCompleto].filter(Boolean).length} totalCount={2}>
          <Item done={cliCompleto} label="Cliente: nome, CPF/CNPJ, telefone, email" />
          <Item done={endCompleto} label="Endereço de entrega completo" action={
            <ActionBtn onClick={() => setEnderecoOpen(true)}>{endCompleto ? "Editar" : "Preencher"}</ActionBtn>
          } />
        </Block>

        <Block title="Projeto" doneCount={[imagensOk, promobOk, ambientesOk].filter(Boolean).length} totalCount={3}>
          <Item done={imagensOk} label={`Imagens do projeto (${checklist.imagens_projeto?.length ?? 0})`} action={
            <label className="cursor-pointer">
              <input type="file" multiple className="hidden" onChange={onImagens} accept="image/*" />
              <span className="text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1" style={{ backgroundColor: "#F7F9FC", color: "#1E6FBF", border: "0.5px solid #E8ECF2", fontWeight: 500 }}>
                <ImageIcon size={12} /> Adicionar
              </span>
            </label>
          } />
          <Item done={promobOk} label="Chave ou arquivo Promob" action={
            <div className="flex items-center gap-2">
              <input
                placeholder="Chave Promob"
                defaultValue={checklist.promob_chave || ""}
                onBlur={(e) => e.target.value !== (checklist.promob_chave || "") && saveChecklist({ promob_chave: e.target.value })}
                className="text-xs px-2 py-1 rounded-md w-32" style={{ border: "0.5px solid #E8ECF2" }}
              />
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={onPromobFile} />
                <span className="text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1" style={{ backgroundColor: "#F7F9FC", color: "#1E6FBF", border: "0.5px solid #E8ECF2", fontWeight: 500 }}>
                  <FileText size={12} /> {checklist.promob_arquivo_url ? "Trocar" : "Arquivo"}
                </span>
              </label>
            </div>
          } />
          <Item done={ambientesOk} label={`Resumo dos ambientes (${ambientesList.length})`} action={
            <ActionBtn onClick={() => setAmbientesOpen(true)}>{ambientesOk ? "Editar" : "Preencher"}</ActionBtn>
          } />
        </Block>

        <Block title="Itens Complementares" doneCount={[ledOk, eletroOk, plantaOk, extrasOk].filter(Boolean).length} totalCount={4}>
          {/* LED */}
          <Item done={ledOk} label="LED" action={
            <div className="flex items-center gap-1">
              <select
                value={checklist.led?.tipo || ""}
                onChange={(e) => saveChecklist({ led: { ...(checklist.led || {}), tipo: e.target.value as any } })}
                className="text-xs px-2 py-1 rounded-md"
                style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#FFFFFF" }}
              >
                <option value="">Selecionar…</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              {checklist.led?.tipo === "sim" && (
                <select
                  value={checklist.led?.custo || ""}
                  onChange={(e) => saveChecklist({ led: { ...(checklist.led || {}), custo: e.target.value as any } })}
                  className="text-xs px-2 py-1 rounded-md"
                  style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#FFFFFF" }}
                >
                  <option value="">Custo…</option>
                  <option value="loja">Custo da loja</option>
                  <option value="cliente">Custo do cliente</option>
                </select>
              )}
            </div>
          } />

          <Item done={!!eletroOk} label={`Eletrodomésticos · ${labelStatus(contrato.eletrodomesticos_status)}`} action={
            <div className="flex items-center gap-1">
              <SelectStatus
                value={contrato.eletrodomesticos_status}
                onChange={(v) => saveField({ eletrodomesticos_status: v })}
                options={[
                  { value: "informado", label: "Informados" },
                  { value: "nao_tera", label: "Não terá" },
                  { value: "nao_informou", label: "Cliente não informou" },
                ]}
              />
              {contrato.eletrodomesticos_status === "informado" && (
                <ActionBtn onClick={() => setEletroOpen(true)}>
                  Lista ({checklist.eletrodomesticos?.length ?? 0}{checklist.eletrodomesticos_arquivo_url ? " + arquivo" : ""})
                </ActionBtn>
              )}
            </div>
          } />
          <Item done={!!plantaOk} label={`Planta hidráulica · ${labelStatus(contrato.planta_hidraulica_status)}`} action={
            <div className="flex items-center gap-1">
              <SelectStatus
                value={contrato.planta_hidraulica_status}
                onChange={(v) => saveField({ planta_hidraulica_status: v })}
                options={[
                  { value: "anexada", label: "Anexada" },
                  { value: "solicitada", label: "Solicitada ao cliente" },
                ]}
              />
              {contrato.planta_hidraulica_status !== "solicitada" && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={onPlantaFile} accept="image/*,application/pdf" />
                  <span className="text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1" style={{ backgroundColor: "#F7F9FC", color: "#1E6FBF", border: "0.5px solid #E8ECF2", fontWeight: 500 }}>
                    <Upload size={12} /> {checklist.planta_hidraulica_url ? "Trocar" : "Anexar"}
                  </span>
                </label>
              )}
            </div>
          } />
          <Item done={!!extrasOk} label={`Itens extras (fora do Promob) · ${labelStatus(contrato.itens_extras_status)}`} action={
            <div className="flex items-center gap-1">
              <SelectStatus
                value={contrato.itens_extras_status}
                onChange={(v) => saveField({ itens_extras_status: v })}
                options={[
                  { value: "listados", label: "Listados" },
                  { value: "nao_ha", label: "Não há" },
                ]}
              />
              {contrato.itens_extras_status === "listados" && (
                <ActionBtn onClick={() => setExtrasOpen(true)}>Lista ({checklist.itens_extras?.length ?? 0})</ActionBtn>
              )}
            </div>
          } />
        </Block>

        <Block title="Logística (automático)" doneCount={viagemOk ? 1 : 0} totalCount={1} defaultOpen={false}>
          <Item done={viagemOk} label={mesmaCidade ? "Entrega na mesma cidade da loja" : "Custo de viagem calculado"} />
        </Block>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <button
          onClick={handleAvancar}
          disabled={done < total}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: done === total ? "#05873C" : "#94A1B6", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
        >
          Avançar para Medição <ArrowRight size={14} />
        </button>
      </div>

      <EnderecoDialog open={enderecoOpen} onOpenChange={setEnderecoOpen} initial={endereco}
        onSave={async (v: EnderecoJson) => { await saveField({ endereco_entrega: v }); setEnderecoOpen(false); }} />
      <AmbientesDialog open={ambientesOpen} onOpenChange={setAmbientesOpen} ambientes={ambientesList}
        initial={checklist.ambientes || {}}
        onSave={async (v: Record<string, AmbienteResumo>) => { await saveChecklist({ ambientes: v }); setAmbientesOpen(false); toast.success("Resumo dos ambientes salvo"); }} />
      <EletroDialog
        open={eletroOpen}
        onOpenChange={setEletroOpen}
        initialList={checklist.eletrodomesticos || []}
        initialArquivo={checklist.eletrodomesticos_arquivo_url}
        upload={(f) => uploadFile(f, "eletro-lista")}
        onSave={async (list, arquivo) => {
          await saveChecklist({ eletrodomesticos: list, eletrodomesticos_arquivo_url: arquivo });
          setEletroOpen(false);
          toast.success("Eletrodomésticos salvos");
        }}
      />
      <ExtrasDialog open={extrasOpen} onOpenChange={setExtrasOpen} initial={checklist.itens_extras || []}
        onSave={async (v: ItemExtra[]) => { await saveChecklist({ itens_extras: v }); setExtrasOpen(false); toast.success("Itens extras salvos"); }} />
    </div>
  );
}

function labelStatus(s?: string) {
  switch (s) {
    case "informado": return "informados";
    case "nao_tera": return "não terá";
    case "nao_informou": return "cliente não informou";
    case "anexada": return "anexada";
    case "solicitada": return "solicitada ao cliente";
    case "listados": return "listados";
    case "nao_ha": return "não há";
    default: return "pendente";
  }
}

function SelectStatus({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value || "pendente"}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded-md"
      style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#FFFFFF" }}
    >
      <option value="pendente">Selecionar…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ---------- Dialogs ----------

function EnderecoDialog({ open, onOpenChange, initial, onSave }: any) {
  const [v, setV] = useState<EnderecoJson>(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Endereço de entrega</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1"><Label>CEP</Label><Input value={v.cep || ""} onChange={(e) => setV({ ...v, cep: e.target.value })} /></div>
          <div className="space-y-1 col-span-1"><Label>Cidade</Label><Input value={v.cidade || ""} onChange={(e) => setV({ ...v, cidade: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Rua</Label><Input value={v.rua || ""} onChange={(e) => setV({ ...v, rua: e.target.value })} /></div>
          <div className="space-y-1"><Label>Número</Label><Input value={v.numero || ""} onChange={(e) => setV({ ...v, numero: e.target.value })} /></div>
          <div className="space-y-1"><Label>Bairro</Label><Input value={v.bairro || ""} onChange={(e) => setV({ ...v, bairro: e.target.value })} /></div>
          <div className="space-y-1"><Label>Estado (UF)</Label><Input maxLength={2} value={v.estado || ""} onChange={(e) => setV({ ...v, estado: e.target.value.toUpperCase() })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(v)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CORES_MDF_COMUNS = [
  "Branco TX", "Preto TX", "Cinza Cristal", "Carvalho Bahamas", "Carvalho Mezzo",
  "Itapuã", "Nogal Sevilha", "Off-White", "Areia", "Marfim", "Outro…",
];

function AmbientesDialog({ open, onOpenChange, ambientes, initial, onSave }: any) {
  const [v, setV] = useState<Record<string, AmbienteResumo>>(initial);
  const upd = (id: string, field: keyof AmbienteResumo, val: string) => setV({ ...v, [id]: { ...v[id], [field]: val } });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Resumo dos ambientes</DialogTitle></DialogHeader>
        <p className="text-xs text-[#6B7A90] -mt-2">Preencha cor do MDF e puxador para cada ambiente. Observações são opcionais.</p>
        <div className="space-y-4 py-2">
          {ambientes.map((a: any, idx: number) => {
            const cur = v[a.id] || {};
            const corCustom = cur.cor_mdf && !CORES_MDF_COMUNS.slice(0, -1).includes(cur.cor_mdf);
            return (
              <div key={a.id} className="rounded-lg p-3" style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#FAFBFC" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-[#0D1117]">{idx + 1}. {a.nome || "Ambiente"}</div>
                  {cur.cor_mdf && cur.puxador && <CheckCircle2 size={16} color="#05873C" />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cor do MDF *</Label>
                    <select
                      value={corCustom ? "Outro…" : (cur.cor_mdf || "")}
                      onChange={(e) => upd(a.id, "cor_mdf", e.target.value === "Outro…" ? "" : e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">Selecionar…</option>
                      {CORES_MDF_COMUNS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {(corCustom || cur.cor_mdf === "") && (
                      <Input placeholder="Digite a cor" value={corCustom ? cur.cor_mdf : ""} onChange={(e) => upd(a.id, "cor_mdf", e.target.value)} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Puxador *</Label>
                    <Input placeholder="Ex: Perfil alumínio preto" value={cur.puxador || ""} onChange={(e) => upd(a.id, "puxador", e.target.value)} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Observação</Label>
                    <Textarea rows={2} placeholder="Detalhes adicionais do ambiente" value={cur.observacao || ""} onChange={(e) => upd(a.id, "observacao", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
          {!ambientes.length && <p className="text-sm text-[#6B7A90]">Cadastre os ambientes do contrato primeiro.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(v)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EletroDialog({ open, onOpenChange, initialList, initialArquivo, upload, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initialList: Eletrodomestico[]; initialArquivo?: string;
  upload: (f: File) => Promise<string | null>;
  onSave: (list: Eletrodomestico[], arquivo?: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"manual" | "arquivo">(initialArquivo ? "arquivo" : "manual");
  const [list, setList] = useState<Eletrodomestico[]>(initialList.length ? initialList : [{ nome: "", marca: "", modelo: "", largura: "", altura: "", profundidade: "" }]);
  const [arquivo, setArquivo] = useState<string | undefined>(initialArquivo);
  const [uploading, setUploading] = useState(false);
  const upd = (i: number, f: keyof Eletrodomestico, v: string) => setList(list.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const p = await upload(f);
    setUploading(false);
    if (p) { setArquivo(p); toast.success("Arquivo enviado"); }
    e.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Eletrodomésticos</DialogTitle></DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <button onClick={() => setMode("manual")} className="text-xs px-3 py-1.5 rounded-md"
            style={{ backgroundColor: mode === "manual" ? "#1E6FBF" : "#F7F9FC", color: mode === "manual" ? "#fff" : "#1E6FBF", border: "0.5px solid #E8ECF2" }}>
            Preencher manualmente
          </button>
          <button onClick={() => setMode("arquivo")} className="text-xs px-3 py-1.5 rounded-md"
            style={{ backgroundColor: mode === "arquivo" ? "#1E6FBF" : "#F7F9FC", color: mode === "arquivo" ? "#fff" : "#1E6FBF", border: "0.5px solid #E8ECF2" }}>
            Anexar arquivo do cliente
          </button>
        </div>

        {mode === "manual" ? (
          <div className="space-y-2 py-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wide text-[#6B7A90] px-1">
              <div className="col-span-3">Eletrodoméstico</div>
              <div className="col-span-2">Marca</div>
              <div className="col-span-2">Modelo</div>
              <div className="col-span-1 text-center">L (cm)</div>
              <div className="col-span-1 text-center">A (cm)</div>
              <div className="col-span-1 text-center">P (cm)</div>
              <div className="col-span-2"></div>
            </div>
            {list.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-3" placeholder="Ex: Forno" value={it.nome} onChange={(e) => upd(i, "nome", e.target.value)} />
                <Input className="col-span-2" placeholder="Brastemp" value={it.marca || ""} onChange={(e) => upd(i, "marca", e.target.value)} />
                <Input className="col-span-2" placeholder="BOH84" value={it.modelo || ""} onChange={(e) => upd(i, "modelo", e.target.value)} />
                <Input className="col-span-1" value={it.largura || ""} onChange={(e) => upd(i, "largura", e.target.value)} />
                <Input className="col-span-1" value={it.altura || ""} onChange={(e) => upd(i, "altura", e.target.value)} />
                <Input className="col-span-1" value={it.profundidade || ""} onChange={(e) => upd(i, "profundidade", e.target.value)} />
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => setList(list.filter((_, idx) => idx !== i))} className="p-2 text-[#E53935] hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setList([...list, { nome: "", marca: "", modelo: "", largura: "", altura: "", profundidade: "" }])}>
              <Plus size={12} className="mr-1" /> Adicionar eletrodoméstico
            </Button>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center gap-3">
            <div className="w-full rounded-lg border-2 border-dashed p-6 text-center" style={{ borderColor: "#E8ECF2" }}>
              {arquivo ? (
                <div className="space-y-2">
                  <FileText size={32} className="mx-auto text-[#1E6FBF]" />
                  <p className="text-sm text-[#0D1117]">Arquivo anexado</p>
                  <p className="text-xs text-[#6B7A90] truncate">{arquivo.split("/").pop()}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={32} className="mx-auto text-[#6B7A90]" />
                  <p className="text-sm text-[#6B7A90]">Anexe a lista/planilha enviada pelo cliente</p>
                </div>
              )}
              <label className="cursor-pointer inline-block mt-3">
                <input type="file" className="hidden" onChange={onPick} accept=".pdf,.xls,.xlsx,.csv,image/*" />
                <span className="text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1" style={{ backgroundColor: "#1E6FBF", color: "#fff", fontWeight: 500 }}>
                  <Upload size={12} /> {uploading ? "Enviando..." : (arquivo ? "Substituir arquivo" : "Selecionar arquivo")}
                </span>
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(
            mode === "manual" ? list.filter((x) => x.nome.trim()) : [],
            mode === "arquivo" ? arquivo : undefined,
          )}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtrasDialog({ open, onOpenChange, initial, onSave }: any) {
  const [list, setList] = useState<ItemExtra[]>(initial.length ? initial : [{ descricao: "", marca: "", modelo: "", cor: "", quantidade: "1" }]);
  const upd = (i: number, f: keyof ItemExtra, v: string) => setList(list.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Itens extras (fora do Promob)</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wide text-[#6B7A90] px-1">
            <div className="col-span-4">Descrição</div>
            <div className="col-span-2">Marca</div>
            <div className="col-span-2">Modelo</div>
            <div className="col-span-2">Cor</div>
            <div className="col-span-1 text-center">Qtd</div>
            <div className="col-span-1"></div>
          </div>
          {list.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-4" placeholder="Ex: Prateleira de vidro" value={it.descricao} onChange={(e) => upd(i, "descricao", e.target.value)} />
              <Input className="col-span-2" value={it.marca || ""} onChange={(e) => upd(i, "marca", e.target.value)} />
              <Input className="col-span-2" value={it.modelo || ""} onChange={(e) => upd(i, "modelo", e.target.value)} />
              <Input className="col-span-2" value={it.cor || ""} onChange={(e) => upd(i, "cor", e.target.value)} />
              <Input className="col-span-1" value={it.quantidade || ""} onChange={(e) => upd(i, "quantidade", e.target.value)} />
              <div className="col-span-1 flex justify-end">
                <button onClick={() => setList(list.filter((_, idx) => idx !== i))} className="p-2 text-[#E53935] hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setList([...list, { descricao: "", marca: "", modelo: "", cor: "", quantidade: "1" }])}>
            <Plus size={12} className="mr-1" /> Adicionar item
          </Button>
          <p className="text-xs text-[#6B7A90] pt-2">Esses itens serão conferidos pelo setor de Compras na etapa seguinte.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(list.filter((x) => x.descricao.trim()))}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
