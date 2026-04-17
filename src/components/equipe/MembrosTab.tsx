import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type Membro = {
  id: string;
  nome: string;
  email: string | null;
  role: AppRole;
};

const ROLE_COLORS: Record<AppRole, { bg: string; fg: string; avatar: string; label: string }> = {
  admin:       { bg: "#E6F3FF", fg: "#1E6FBF", avatar: "#1E6FBF", label: "Admin" },
  gerente:     { bg: "#E6F3FF", fg: "#1E6FBF", avatar: "#1E6FBF", label: "Gerente" },
  vendedor:    { bg: "#E6F7EE", fg: "#0E8A52", avatar: "#12B76A", label: "Vendedor" },
  tecnico:     { bg: "#EEEDFE", fg: "#534AB7", avatar: "#534AB7", label: "Técnico" },
  montador:    { bg: "#FAECE7", fg: "#993C1D", avatar: "#D85A30", label: "Montador" },
  franqueador: { bg: "#F1F2F4", fg: "#0D1117", avatar: "#0D1117", label: "Franqueador" },
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
    .select("id, nome, email")
    .order("nome");
  if (uErr) throw uErr;
  if (!usuarios?.length) return [];

  const ids = usuarios.map((u) => u.id);
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ids);
  if (rErr) throw rErr;

  const roleByUser = new Map<string, AppRole>();
  roles?.forEach((r) => {
    if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
  });

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: roleByUser.get(u.id) ?? "vendedor",
  }));
}

function MembroCard({ membro }: { membro: Membro }) {
  const role = ROLE_COLORS[membro.role];
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex shrink-0 items-center justify-center rounded-full text-white"
          style={{
            width: 44,
            height: 44,
            backgroundColor: role.avatar,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {getInitials(membro.nome)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className="truncate"
              style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}
            >
              {membro.nome}
            </p>
          </div>
          <span
            className="mt-1 inline-flex items-center rounded-full px-2 py-0.5"
            style={{
              backgroundColor: role.bg,
              color: role.fg,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {role.label}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="truncate" style={{ fontSize: 12, color: "#6B7A90" }}>
          {membro.email ?? "—"}
        </p>
        <p style={{ fontSize: 12, color: "#B0BAC9" }}>Sem registro</p>
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

export function MembrosTab() {
  const { data: membros, isLoading } = useQuery({
    queryKey: ["equipe-membros"],
    queryFn: fetchMembros,
  });

  if (isLoading) {
    return (
      <p style={{ fontSize: 13, color: "#6B7A90" }}>Carregando membros…</p>
    );
  }

  if (!membros?.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl bg-white py-16"
        style={{ border: "0.5px dashed #E8ECF2" }}
      >
        <p style={{ fontSize: 14, color: "#6B7A90" }}>
          Nenhum membro cadastrado
        </p>
        <button
          onClick={() => toast.info("Em breve: cadastro de novo membro")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <UserPlus className="h-4 w-4" /> Adicionar primeiro membro
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {membros.map((m) => (
        <MembroCard key={m.id} membro={m} />
      ))}
    </div>
  );
}
