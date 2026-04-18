import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Paperclip, AlertTriangle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TecnicoTabProps {
  contratoId: string;
}

const Card = ({
  title,
  right,
  children,
  badge,
  bg = "white",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  bg?: string;
}) => (
  <div
    className="rounded-xl transition-colors"
    style={{ border: "0.5px solid #E8ECF2", padding: 20, backgroundColor: bg }}
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
        {badge}
      </div>
      {right}
    </div>
    {children}
  </div>
);

function StatusBadge({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function ContratoTecnicoTab({ contratoId }: TecnicoTabProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");

  // Contrato (campos das travas / sub_etapa / responsáveis)
  const { data: contrato } = useQuery({
    queryKey: ["contrato-tecnico", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id, loja_id, sub_etapa_tecnico, trava_medicao_ok, trava_tecnico_ok, medicao_responsavel_id, conferencia_responsavel_id"
        )
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["checklist", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists_tecnicos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-min"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id, nome");
      return data ?? [];
    },
  });
  const userMap = new Map(usuarios.map((u) => [u.id, u.nome]));

  // Medidores da loja do contrato
  const { data: medidores = [] } = useQuery({
    queryKey: ["medidores", contrato?.loja_id],
    enabled: !!contrato?.loja_id,
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "medidor")
        .eq("loja_id", contrato!.loja_id);
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: us } = await supabase
        .from("usuarios")
        .select("id, nome")
        .in("id", ids);
      return us ?? [];
    },
  });

  // Itens de medição
  const itensMedicao = itens.filter((i) => i.sub_etapa === "medicao");
  const itensConferencia = itens.filter((i) => i.sub_etapa !== "medicao");

  const medOk = itensMedicao.filter((i) => i.concluido).length;
  const medTotal = itensMedicao.length;
  const algumMedConcluido = medOk > 0;

  const total = itens.length;
  const concluidos = itens.filter((i) => i.concluido).length;
  const pendentes = total - concluidos;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const toggleMutation = useMutation({
    mutationFn: async (item: {
      id: string;
      concluido: boolean;
      sub_etapa: string;
    }) => {
      const { error } = await supabase
        .from("checklists_tecnicos")
        .update({
          concluido: !item.concluido,
          data: !item.concluido ? new Date().toISOString() : null,
        })
        .eq("id", item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      if (item.sub_etapa === "medicao" && !item.concluido) {
        const restantes = itensMedicao.filter(
          (i) => i.id !== item.id && !i.concluido,
        ).length;
        if (restantes === 0 && itensMedicao.length > 0) {
          toast.success("Medição fina concluída! Conferência técnica liberada ✓");
        }
      }
      qc.invalidateQueries({ queryKey: ["checklist", contratoId] });
      qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atribuirMedidor = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("contratos")
        .update({ medicao_responsavel_id: userId })
        .eq("id", contratoId);
      if (error) throw error;

      const nome = medidores.find((m) => m.id === userId)?.nome ?? "—";
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("contrato_logs").insert({
        contrato_id: contratoId,
        acao: "medidor_atribuido",
        titulo: "Medidor atribuído",
        descricao: nome,
        autor_id: auth.user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Medidor atribuído");
      qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Status do card de medição
  let medStatus: { label: string; bg: string; fg: string };
  if (contrato?.trava_medicao_ok) {
    medStatus = { label: "Concluída ✓", bg: "#D1FAE5", fg: "#05873C" };
  } else if (contrato?.sub_etapa_tecnico === "medicao" && algumMedConcluido) {
    medStatus = { label: "Em andamento", bg: "#E6F3FF", fg: "#1E6FBF" };
  } else {
    medStatus = { label: "Aguardando", bg: "#E8ECF2", fg: "#6B7A90" };
  }

  // Arquivos
  const { data: arquivos = [], refetch: refetchArquivos } = useQuery({
    queryKey: ["arquivos", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("contrato-arquivos")
        .list(contratoId, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `${contratoId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("contrato-arquivos")
      .upload(path, file);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Arquivo enviado");
    refetchArquivos();
  };

  const handleDownload = async (name: string) => {
    const { data, error } = await supabase.storage
      .from("contrato-arquivos")
      .createSignedUrl(`${contratoId}/${name}`, 60);
    if (error || !data) {
      toast.error("Não foi possível baixar");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex flex-col gap-4">
      <style>{`@keyframes checkPop { 0% { transform: scale(1.2); } 100% { transform: scale(1); } }`}</style>
      {/* CARD 1 — Medição fina */}
      <Card
        title="Medição fina"
        badge={<StatusBadge {...medStatus} />}
        bg={contrato?.trava_medicao_ok ? "#F0FDF9" : "white"}
        right={
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Responsável</span>
            <div style={{ minWidth: 220 }}>
              <Select
                value={contrato?.medicao_responsavel_id ?? undefined}
                onValueChange={(v) => atribuirMedidor.mutate(v)}
                disabled={!canEdit || !!contrato?.trava_medicao_ok}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Atribuir medidor →" />
                </SelectTrigger>
                <SelectContent>
                  {medidores.length === 0 && (
                    <div
                      className="px-3 py-2"
                      style={{ fontSize: 12, color: "#6B7A90" }}
                    >
                      Nenhum medidor cadastrado
                    </div>
                  )}
                  {medidores.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        {/* Progresso medição */}
        <div className="mb-2 flex items-center justify-between">
          <span style={{ fontSize: 13, color: "#6B7A90" }}>
            {medOk} de {medTotal} itens concluídos
          </span>
        </div>
        <div
          className="mb-4 w-full overflow-hidden"
          style={{ backgroundColor: "#E8ECF2", height: 6, borderRadius: 3 }}
        >
          <div
            style={{
              width: `${medTotal > 0 ? Math.round((medOk / medTotal) * 100) : 0}%`,
              backgroundColor:
                medTotal > 0 && medOk === medTotal ? "#12B76A" : "#1E6FBF",
              height: "100%",
              borderRadius: 3,
              transition: "width 400ms ease-out, background-color 300ms ease-out",
            }}
          />
        </div>

        <ul className="flex flex-col">
          {itensMedicao.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum item de medição cadastrado.
            </li>
          )}
          {itensMedicao.map((item) => {
            const medCompleto = !!contrato?.trava_medicao_ok;
            const itemEditavel = canEdit && !medCompleto;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 px-2 py-2 -mx-2 rounded transition-colors hover:bg-[#F5F7FA]"
                style={{ borderTop: "0.5px solid #E8ECF2" }}
              >
                <button
                  onClick={() =>
                    itemEditavel &&
                    toggleMutation.mutate({
                      id: item.id,
                      concluido: item.concluido,
                      sub_etapa: item.sub_etapa,
                    })
                  }
                  disabled={!itemEditavel}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: item.concluido ? "#12B76A" : "transparent",
                    border: item.concluido
                      ? "1px solid #12B76A"
                      : "1.5px solid #B0BAC9",
                    opacity: itemEditavel ? 1 : 0.7,
                  }}
                  aria-label="Toggle item"
                >
                  {item.concluido && (
                    <Check
                      className="h-3 w-3 text-white"
                      style={{
                        animation: "checkPop 150ms ease-out",
                      }}
                    />
                  )}
                </button>
                <span
                  className="flex-1"
                  style={{
                    fontSize: 13,
                    color: item.concluido ? "#6B7A90" : "#0D1117",
                    textDecoration: item.concluido ? "line-through" : "none",
                  }}
                >
                  {item.item}
                </span>
                <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 110 }}>
                  {item.responsavel ? userMap.get(item.responsavel) ?? "—" : "—"}
                </span>
                <span style={{ fontSize: 11, color: "#B0BAC9", minWidth: 80, textAlign: "right" }}>
                  {item.concluido && item.data
                    ? new Date(item.data).toLocaleDateString("pt-BR")
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Checklist conferência (mantido) */}
      <Card
        title="Checklist técnico (conferência)"
        right={
          <div className="flex items-center gap-2">
            {!canEdit && (
              <span
                className="inline-flex items-center gap-1 rounded px-2 py-0.5"
                style={{ fontSize: 11, backgroundColor: "#F5F7FA", color: "#6B7A90" }}
                title="Somente leitura — apenas técnico, gerente ou admin podem editar"
              >
                <Lock className="h-3 w-3" /> Somente leitura
              </span>
            )}
            <span style={{ fontSize: 12, color: "#6B7A90" }}>
              {concluidos} de {total} itens concluídos
            </span>
          </div>
        }
      >
        {pendentes > 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "#FEF3C7", color: "#E8A020", fontSize: 12 }}
          >
            <AlertTriangle className="h-4 w-4" />
            Checklist incompleto — {pendentes}{" "}
            {pendentes === 1 ? "item pendente" : "itens pendentes"}. Conclua para
            liberar produção.
          </div>
        )}

        <div
          className="mb-4 h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "#E8ECF2" }}
        >
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: "#1E6FBF" }}
          />
        </div>

        <ul className="flex flex-col">
          {itensConferencia.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum item de checklist cadastrado.
            </li>
          )}
          {itensConferencia.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: "0.5px solid #E8ECF2" }}
            >
              <button
                onClick={() =>
                  canEdit &&
                  toggleMutation.mutate({ id: item.id, concluido: item.concluido, sub_etapa: item.sub_etapa })
                }
                disabled={!canEdit}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-not-allowed"
                style={{
                  backgroundColor: item.concluido ? "#12B76A" : "transparent",
                  border: item.concluido
                    ? "1px solid #12B76A"
                    : "1.5px solid #B0BAC9",
                  opacity: canEdit ? 1 : 0.7,
                }}
                aria-label="Toggle item"
              >
                {item.concluido && <Check className="h-3 w-3 text-white" />}
              </button>
              <span
                className="flex-1"
                style={{
                  fontSize: 13,
                  color: item.concluido ? "#6B7A90" : "#0D1117",
                  textDecoration: item.concluido ? "line-through" : "none",
                }}
              >
                {item.item}
              </span>
              <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 110 }}>
                {item.responsavel ? userMap.get(item.responsavel) ?? "—" : "—"}
              </span>
              <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 90 }}>
                {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Arquivos do projeto">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
          >
            <Paperclip className="h-4 w-4" />
            {uploading ? "Enviando..." : "Anexar projeto Promob"}
          </button>
        )}

        <ul className="mt-4 flex flex-col">
          {arquivos.length === 0 && (
            <li style={{ fontSize: 13, color: "#6B7A90" }}>
              Nenhum arquivo enviado ainda.
            </li>
          )}
          {arquivos.map((arq) => (
            <li
              key={arq.id ?? arq.name}
              className="flex items-center justify-between py-2"
              style={{ borderTop: "0.5px solid #E8ECF2" }}
            >
              <div className="flex flex-col">
                <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                  {arq.name.replace(/^\d+-/, "")}
                </span>
                <span style={{ fontSize: 11, color: "#6B7A90" }}>
                  {arq.created_at
                    ? new Date(arq.created_at).toLocaleDateString("pt-BR")
                    : ""}
                </span>
              </div>
              <button
                onClick={() => handleDownload(arq.name)}
                className="rounded p-2 hover:bg-muted"
                aria-label="Baixar"
              >
                <Download className="h-4 w-4" style={{ color: "#1E6FBF" }} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
