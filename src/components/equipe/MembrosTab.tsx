import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { EditarComissaoDialog } from "./EditarComissaoDialog";

type FuncaoUsuario = "vendedor" | "projetista" | "tecnico" | "conferente" | "montador" | "motorista" | "gerente" | "financeiro" | "admin" | "franqueador" | "medidor";

type Membro = {
  id: string;
  nome: string;
  email: string | null;
  funcoes: FuncaoUsuario[];
  papel_nome: string | null;
  comissao_percentual: number | null;
};

const ROLE_COLORS: Record<string, { bg: string; fg: string; avatar: string; label: string }> = {
  admin:       { bg: "#E6F3FF", fg: "#1E6FBF", avatar: "#1E6FBF", label: "Admin" },
  gerente:     { bg: "#E6F3FF", fg: "#1E6FBF", avatar: "#1E6FBF", label: "Gerente" },
  vendedor:    { bg: "#E6F7EE", fg: "#0E8A52", avatar: "#12B76A", label: "Vendedor" },
  tecnico:     { bg: "#EEEDFE", fg: "#534AB7", avatar: "#534AB7", label: "Técnico" },
  medidor:     { bg: "#EEEDFE", fg: "#534AB7", avatar: "#534AB7", label: "Medidor" },
  montador:    { bg: "#FAECE7", fg: "#993C1D", avatar: "#D85A30", label: "Montador" },
  franqueador: { bg: "#F1F2F4", fg: "#0D1117", avatar: "#0D1117", label: "Franqueador" },
  conferente:  { bg: "#EEEDFE", fg: "#534AB7", avatar: "#534AB7", label: "Conferente" },
  motorista:   { bg: "#FFF4E5", fg: "#B45309", avatar: "#B45309", label: "Motorista" },
  projetista:  { bg: "#F3E8FF", fg: "#7E22CE", avatar: "#7E22CE", label: "Projetista" },
  financeiro:  { bg: "#DCFCE7", fg: "#15803D", avatar: "#15803D", label: "Financeiro" },
};

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

async function fetchMembros(): Promise<Membro[]> {
  const { data: usuarios, error: uErr } = await supabase
    .from("usuarios")
    .select("id, nome, email, papel_comissao_id, comissao_percentual, funcoes")
    .order("nome");
  if (uErr) throw uErr;
  if (!usuarios?.length) return [];

  const papelIds = Array.from(
    new Set(usuarios.map((u) => u.papel_comissao_id).filter(Boolean) as string[])
  );

  const { data: papeis, error: pErr } = await (papelIds.length
    ? supabase.from("papeis_comissao").select("id, nome").in("id", papelIds)
    : Promise.resolve({ data: [] as { id: string; nome: string }[], error: null }));
  
  if (pErr) throw pErr;

  const papelById = new Map<string, string>(
    (papeis ?? []).map((p) => [p.id, p.nome])
  );

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    funcoes: (u.funcoes as FuncaoUsuario[]) || ["vendedor"],
    papel_nome: u.papel_comissao_id ? papelById.get(u.papel_comissao_id) ?? null : null,
    comissao_percentual: u.comissao_percentual != null ? Number(u.comissao_percentual) : null,
  }));
}

function MembroCard({
  membro,
  podeEditar,
  onEditar,
}: {
  membro: Membro;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  const principalRole = membro.funcoes[0] || "vendedor";
  const role = ROLE_COLORS[principalRole] || ROLE_COLORS.vendedor;
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
      <div className="flex items-start gap-3">
        <div
          className="flex shrink-0 items-center justify-center rounded-full text-white"
          style={{ width: 44, height: 44, backgroundColor: role.avatar, fontSize: 14, fontWeight: 600 }}
        >
          {getInitials(membro.nome)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
              {membro.nome}
            </p>
            {podeEditar && (
              <button
                onClick={onEditar}
                className="shrink-0 rounded p-1 hover:bg-[#F5F7FA]"
                title="Editar comissão"
              >
                <Pencil className="h-3.5 w-3.5" style={{ color: "#6B7A90" }} />
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {membro.funcoes.map(f => {
              const config = ROLE_COLORS[f] || ROLE_COLORS.vendedor;
              return (
                <span
                  key={f}
                  className="inline-flex items-center rounded-full px-2 py-0.5"
                  style={{ backgroundColor: config.bg, color: config.fg, fontSize: 10, fontWeight: 500 }}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="truncate" style={{ fontSize: 12, color: "#6B7A90" }}>
          {membro.email ?? "—"}
        </p>
        <p style={{ fontSize: 12, color: membro.papel_nome ? "#0D1117" : "#B0BAC9" }}>
          {membro.papel_nome
            ? `${membro.papel_nome} · ${(membro.comissao_percentual ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
            : "Sem comissão configurada"}
        </p>
      </div>

      <div
        className="mt-3 flex items-center justify-between pt-3"
        style={{ borderTop: "0.5px solid #E8ECF2" }}
      >
        <span style={{ fontSize: 12, color: "#6B7A90" }}>0h este mês</span>
        <button
          onClick={() => toast.info("Em breve: visualizar ponto do membro")}
          style={{ fontSize: 12, color: "#1E6FBF" }}
        >
          Ver ponto
        </button>
      </div>
    </div>
  );
}

export function MembrosTab({ onAddMember }: { onAddMember?: () => void } = {}) {
  const { hasRole } = useAuth();
  const podeEditar = hasRole("admin") || hasRole("gerente") || hasRole("franqueador");
  const [editAlvo, setEditAlvo] = useState<Membro | null>(null);

  const { data: membros, isLoading } = useQuery({
    queryKey: ["equipe-membros"],
    queryFn: fetchMembros,
  });

  if (isLoading) {
    return <p style={{ fontSize: 13, color: "#6B7A90" }}>Carregando membros…</p>;
  }

  if (!membros?.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl bg-white py-16"
        style={{ border: "0.5px dashed #E8ECF2" }}
      >
        <p style={{ fontSize: 14, color: "#6B7A90" }}>Nenhum membro cadastrado</p>
        <button
          onClick={() =>
            onAddMember ? onAddMember() : toast.info("Em breve: cadastro de novo membro")
          }
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <UserPlus className="h-4 w-4" /> Adicionar primeiro membro
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {membros.map((m) => (
          <MembroCard
            key={m.id}
            membro={m}
            podeEditar={podeEditar}
            onEditar={() => setEditAlvo(m)}
          />
        ))}
      </div>
      <EditarComissaoDialog
        open={!!editAlvo}
        onOpenChange={(o) => { if (!o) setEditAlvo(null); }}
        userId={editAlvo?.id ?? null}
        nome={editAlvo?.nome ?? ""}
      />
    </>
  );
}
