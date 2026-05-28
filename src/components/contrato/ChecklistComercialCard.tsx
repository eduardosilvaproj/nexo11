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

type ChecklistJson = {
  comprovante_financeiro_url?: string;
  imagens_projeto?: string[];
  promob_chave?: string;
  promob_arquivo_url?: string;
  ambientes?: Record<string, { cor_mdf?: string; puxador?: string; ferragem?: string; itens_extras?: string }>;
  eletrodomesticos?: Array<{ nome: string; modelo: string; largura: string; altura: string; profundidade: string }>;
  planta_hidraulica_url?: string;
  itens_extras?: Array<{ descricao: string; quantidade: string; observacao: string }>;
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
  <div className="flex items-center justify-between py-2" style={{ borderTop: "0.5px solid #F2F5F9" }}>
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
  const checklist: ChecklistJson = contrato.checklist_comercial || {};
  const endereco: EnderecoJson = contrato.endereco_entrega || {};

  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [ambientesOpen, setAmbientesOpen] = useState(false);
  const [eletroOpen, setEletroOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);

  // cliente data
  const { data: cliente } = useQuery({
    queryKey: ["cliente-checklist", contrato.cliente_id],
    queryFn: async () => {
      if (!contrato.cliente_id) return null;
      const { data } = await supabase.from("clientes").select("nome,cpf_cnpj,telefone,email").eq("id", contrato.cliente_id).maybeSingle();
      return data;
    },
    enabled: !!contrato.cliente_id,
  });

  // parcelas
  const { data: parcelas } = useQuery({
    queryKey: ["parcelas-check", contratoId],
    queryFn: async () => {
      const { data } = await supabase.from("financeiro_contas_receber").select("id,status").eq("contrato_id", contratoId).neq("status", "cancelado");
      return data || [];
    },
  });

  // dre (frete)
  const { data: dre } = useQuery({
    queryKey: ["dre-check", contratoId],
    queryFn: async () => {
      const { data } = await supabase.from("dre_contrato").select("custo_frete_previsto").eq("contrato_id", contratoId).maybeSingle();
      return data;
    },
  });

  const saveChecklist = async (patch: Partial<ChecklistJson>) => {
    const merged = { ...checklist, ...patch };
    const { error } = await supabase.from("contratos").update({ checklist_comercial: merged } as any).eq("id", contratoId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
  };

  const saveField = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("contratos").update(patch as any).eq("id", contratoId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
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
  const ambientesOk = ambientes.length > 0 && ambientes.every((a) => {
    const r = checklist.ambientes?.[a.id];
    return !!r?.cor_mdf && !!r?.puxador && !!r?.ferragem;
  });
  const eletroOk = contrato.eletrodomesticos_status && contrato.eletrodomesticos_status !== "pendente" &&
    (contrato.eletrodomesticos_status !== "informado" || (checklist.eletrodomesticos?.length ?? 0) > 0);
  const plantaOk = contrato.planta_hidraulica_status && contrato.planta_hidraulica_status !== "pendente" &&
    (contrato.planta_hidraulica_status !== "anexada" || !!checklist.planta_hidraulica_url);
  const extrasOk = contrato.itens_extras_status && contrato.itens_extras_status !== "pendente" &&
    (contrato.itens_extras_status !== "listados" || (checklist.itens_extras?.length ?? 0) > 0);

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
    { key: "eletro", label: "Eletrodomésticos definidos", done: !!eletroOk },
    { key: "planta", label: "Planta hidráulica definida", done: !!plantaOk },
    { key: "extras", label: "Itens extras definidos", done: !!extrasOk },
    { key: "viagem", label: "Custo de viagem", done: viagemOk },
  ], [pagamentoOk, comprovanteOk, assinadoOk, cliCompleto, endCompleto, imagensOk, promobOk, ambientesOk, eletroOk, plantaOk, extrasOk, viagemOk]);

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

  // ===== uploads handlers =====
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

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-4" style={{ backgroundColor: "#F2F5F9" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#05873C" : "#1E6FBF" }} />
      </div>

      <div className="flex flex-col gap-3">
        {/* BLOCO 1 */}
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

        {/* BLOCO 2 */}
        <Block title="Dados do Cliente" doneCount={[cliCompleto, endCompleto].filter(Boolean).length} totalCount={2}>
          <Item done={cliCompleto} label="Cliente: nome, CPF/CNPJ, telefone, email" />
          <Item done={endCompleto} label="Endereço de entrega completo" action={
            <ActionBtn onClick={() => setEnderecoOpen(true)}>{endCompleto ? "Editar" : "Preencher"}</ActionBtn>
          } />
        </Block>

        {/* BLOCO 3 */}
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
          <Item done={ambientesOk} label={`Resumo dos ambientes (${ambientes.length})`} action={
            <ActionBtn onClick={() => setAmbientesOpen(true)}>Preencher</ActionBtn>
          } />
        </Block>

        {/* BLOCO 4 */}
        <Block title="Itens Complementares" doneCount={[eletroOk, plantaOk, extrasOk].filter(Boolean).length} totalCount={3}>
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
                <ActionBtn onClick={() => setEletroOpen(true)}>Lista ({checklist.eletrodomesticos?.length ?? 0})</ActionBtn>
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

        {/* BLOCO 5 */}
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
        onSave={async (v) => { await saveField({ endereco_entrega: v }); setEnderecoOpen(false); }} />
      <AmbientesDialog open={ambientesOpen} onOpenChange={setAmbientesOpen} ambientes={ambientes}
        initial={checklist.ambientes || {}}
        onSave={async (v) => { await saveChecklist({ ambientes: v }); setAmbientesOpen(false); }} />
      <EletroDialog open={eletroOpen} onOpenChange={setEletroOpen} initial={checklist.eletrodomesticos || []}
        onSave={async (v) => { await saveChecklist({ eletrodomesticos: v }); setEletroOpen(false); }} />
      <ExtrasDialog open={extrasOpen} onOpenChange={setExtrasOpen} initial={checklist.itens_extras || []}
        onSave={async (v) => { await saveChecklist({ itens_extras: v }); setExtrasOpen(false); }} />
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

function AmbientesDialog({ open, onOpenChange, ambientes, initial, onSave }: any) {
  const [v, setV] = useState<Record<string, any>>(initial);
  const upd = (id: string, field: string, val: string) => setV({ ...v, [id]: { ...v[id], [field]: val } });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Resumo dos ambientes</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {ambientes.map((a: any) => (
            <div key={a.id} className="rounded-lg p-3" style={{ border: "0.5px solid #E8ECF2" }}>
              <div className="text-sm font-medium mb-2 text-[#0D1117]">{a.nome || "Ambiente"}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cor do MDF</Label><Input value={v[a.id]?.cor_mdf || ""} onChange={(e) => upd(a.id, "cor_mdf", e.target.value)} /></div>
                <div className="space-y-1"><Label>Puxador</Label><Input value={v[a.id]?.puxador || ""} onChange={(e) => upd(a.id, "puxador", e.target.value)} /></div>
                <div className="space-y-1"><Label>Ferragem</Label><Input value={v[a.id]?.ferragem || ""} onChange={(e) => upd(a.id, "ferragem", e.target.value)} /></div>
                <div className="space-y-1"><Label>Itens extras</Label><Input value={v[a.id]?.itens_extras || ""} onChange={(e) => upd(a.id, "itens_extras", e.target.value)} /></div>
              </div>
            </div>
          ))}
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

function EletroDialog({ open, onOpenChange, initial, onSave }: any) {
  const [list, setList] = useState<any[]>(initial.length ? initial : [{ nome: "", modelo: "", largura: "", altura: "", profundidade: "" }]);
  const upd = (i: number, f: string, v: string) => setList(list.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Eletrodomésticos</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          {list.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3 space-y-1"><Label className="text-xs">Nome</Label><Input value={it.nome} onChange={(e) => upd(i, "nome", e.target.value)} /></div>
              <div className="col-span-3 space-y-1"><Label className="text-xs">Modelo</Label><Input value={it.modelo} onChange={(e) => upd(i, "modelo", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">L (cm)</Label><Input value={it.largura} onChange={(e) => upd(i, "largura", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">A (cm)</Label><Input value={it.altura} onChange={(e) => upd(i, "altura", e.target.value)} /></div>
              <div className="col-span-1 space-y-1"><Label className="text-xs">P</Label><Input value={it.profundidade} onChange={(e) => upd(i, "profundidade", e.target.value)} /></div>
              <button onClick={() => setList(list.filter((_, idx) => idx !== i))} className="col-span-1 p-2 text-[#E53935]"><Trash2 size={14} /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setList([...list, { nome: "", modelo: "", largura: "", altura: "", profundidade: "" }])}>
            <Plus size={12} className="mr-1" /> Adicionar
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(list.filter((x) => x.nome.trim()))}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtrasDialog({ open, onOpenChange, initial, onSave }: any) {
  const [list, setList] = useState<any[]>(initial.length ? initial : [{ descricao: "", quantidade: "1", observacao: "" }]);
  const upd = (i: number, f: string, v: string) => setList(list.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Itens extras (fora do Promob)</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          {list.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6 space-y-1"><Label className="text-xs">Descrição</Label><Input value={it.descricao} onChange={(e) => upd(i, "descricao", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">Qtd</Label><Input value={it.quantidade} onChange={(e) => upd(i, "quantidade", e.target.value)} /></div>
              <div className="col-span-3 space-y-1"><Label className="text-xs">Obs</Label><Input value={it.observacao} onChange={(e) => upd(i, "observacao", e.target.value)} /></div>
              <button onClick={() => setList(list.filter((_, idx) => idx !== i))} className="col-span-1 p-2 text-[#E53935]"><Trash2 size={14} /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setList([...list, { descricao: "", quantidade: "1", observacao: "" }])}>
            <Plus size={12} className="mr-1" /> Adicionar
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
