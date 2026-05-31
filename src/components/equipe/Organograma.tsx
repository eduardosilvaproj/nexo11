import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

type Pessoa = {
  id: string;
  nome: string;
  cargo: string | null;
  funcoes: string[];
  avatar_url: string | null;
  ativo: boolean;
};

type DeptGroup = {
  label: string;
  color: string;
  bg: string;
  members: Pessoa[];
};

const DEPT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  vendedor: { label: "Vendas", color: "#12B76A", bg: "#E6F7EE" },
  projetista: { label: "Vendas", color: "#12B76A", bg: "#E6F7EE" },
  tecnico: { label: "Técnico", color: "#534AB7", bg: "#EEEDFE" },
  medidor: { label: "Técnico", color: "#534AB7", bg: "#EEEDFE" },
  conferente: { label: "Produção", color: "#D85A30", bg: "#FAECE7" },
  montador: { label: "Montagem", color: "#993C1D", bg: "#FAECE7" },
  motorista: { label: "Montagem", color: "#993C1D", bg: "#FAECE7" },
  logistico: { label: "Montagem", color: "#993C1D", bg: "#FAECE7" },
  financeiro: { label: "Administrativo", color: "#15803D", bg: "#DCFCE7" },
  comprador: { label: "Administrativo", color: "#15803D", bg: "#DCFCE7" },
  almoxarife: { label: "Administrativo", color: "#15803D", bg: "#DCFCE7" },
  pos_venda: { label: "Administrativo", color: "#15803D", bg: "#DCFCE7" },
};

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

function classifyPessoa(p: Pessoa): string {
  const funcoes = p.funcoes || [];
  if (funcoes.includes("franqueador") || funcoes.includes("admin")) return "top";
  if (funcoes.includes("gerente")) return "gerente";
  for (const f of funcoes) {
    if (DEPT_MAP[f]) return DEPT_MAP[f].label;
  }
  return "Administrativo";
}

export function Organograma() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;

  const { data: pessoas = [], isLoading } = useQuery({
    queryKey: ["organograma_pessoas", lojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pessoas")
        .select("id, nome, cargo, funcoes, avatar_url, ativo")
        .eq("loja_id", lojaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Pessoa[];
    },
    enabled: !!lojaId,
  });

  const topLevel = pessoas.filter((p) => classifyPessoa(p) === "top");
  const gerentes = pessoas.filter((p) => classifyPessoa(p) === "gerente");
  const departments: DeptGroup[] = [];

  const deptNames = ["Vendas", "Técnico", "Produção", "Montagem", "Administrativo"];
  for (const deptName of deptNames) {
    const members = pessoas.filter((p) => classifyPessoa(p) === deptName);
    if (members.length === 0) continue;
    const config = Object.values(DEPT_MAP).find((d) => d.label === deptName);
    departments.push({
      label: deptName,
      color: config?.color ?? "#6B7A90",
      bg: config?.bg ?? "#F1F2F4",
      members,
    });
  }

  if (isLoading) {
    return <p style={{ color: "#6B7A90", fontSize: 13 }}>Carregando organograma...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users size={18} style={{ color: "#0D1117" }} />
        <h3 style={{ color: "#0D1117", fontSize: 16, fontWeight: 600 }}>Organograma</h3>
      </div>

      {/* Top Level - Franqueador/Admin */}
      {topLevel.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="flex gap-3 justify-center flex-wrap">
            {topLevel.map((p) => (
              <OrgNode key={p.id} pessoa={p} color="#0D1117" bg="#F1F2F4" />
            ))}
          </div>
          {(gerentes.length > 0 || departments.length > 0) && (
            <div className="w-px h-6 bg-gray-300" />
          )}
        </div>
      )}

      {/* Gerentes */}
      {gerentes.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="flex gap-3 justify-center flex-wrap">
            {gerentes.map((p) => (
              <OrgNode key={p.id} pessoa={p} color="#1E6FBF" bg="#E6F3FF" />
            ))}
          </div>
          {departments.length > 0 && <div className="w-px h-6 bg-gray-300" />}
        </div>
      )}

      {/* Departments */}
      {departments.length > 0 && (
        <div className="relative">
          {/* Horizontal connector line */}
          <div
            className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: `${Math.min(departments.length * 200, 800)}px`,
              height: 1,
              background: "#E8ECF2",
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-4">
            {departments.map((dept) => (
              <div key={dept.label} className="space-y-2">
                <div className="flex flex-col items-center">
                  {/* Vertical connector */}
                  <div className="w-px h-3 bg-gray-300 hidden sm:block" />
                  <div
                    className="rounded-md px-3 py-1 text-center"
                    style={{ background: dept.bg, border: `1px solid ${dept.color}30`, fontSize: 11, fontWeight: 600, color: dept.color }}
                  >
                    {dept.label}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dept.members.map((p) => (
                    <OrgNode key={p.id} pessoa={p} color={dept.color} bg={dept.bg} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pessoas.length === 0 && (
        <p style={{ color: "#6B7A90", fontSize: 13 }}>Nenhum membro ativo encontrado.</p>
      )}
    </div>
  );
}

function OrgNode({
  pessoa,
  color,
  bg,
  compact = false,
}: {
  pessoa: Pessoa;
  color: string;
  bg: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
      style={{ border: "1px solid #E8ECF2", background: "#fff" }}
    >
      {/* Avatar */}
      <div
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: compact ? 28 : 36,
          height: compact ? 28 : 36,
          background: bg,
          color,
          fontSize: compact ? 10 : 12,
          fontWeight: 600,
        }}
      >
        {pessoa.avatar_url ? (
          <img src={pessoa.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          getInitials(pessoa.nome)
        )}
      </div>
      <div className="min-w-0">
        <p
          className="truncate"
          style={{ fontSize: compact ? 11 : 13, fontWeight: 500, color: "#0D1117" }}
        >
          {pessoa.nome}
        </p>
        {pessoa.cargo && (
          <p className="truncate" style={{ fontSize: 10, color: "#6B7A90" }}>
            {pessoa.cargo}
          </p>
        )}
      </div>
    </div>
  );
}
