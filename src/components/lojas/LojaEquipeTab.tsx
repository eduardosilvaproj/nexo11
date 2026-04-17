import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: "Admin", bg: "#FCEFD2", color: "#B45309" },
  gerente: { label: "Gerente", bg: "#E6F3FF", color: "#1E6FBF" },
  vendedor: { label: "Vendedor", bg: "#EEEDFB", color: "#7F77DD" },
  tecnico: { label: "Técnico", bg: "#E0F4EC", color: "#1D9E75" },
  montador: { label: "Montador", bg: "#FBE9E1", color: "#D85A30" },
  franqueador: { label: "Franqueador", bg: "#D7F0DF", color: "#05873C" },
};

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function LojaEquipeTab({ lojaId }: { lojaId: string }) {
  const { data: membros = [], isLoading } = useQuery({
    queryKey: ["loja-equipe-detalhe", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);

      const [rolesRes, usuariosRes, pontoRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("loja_id", lojaId),
        supabase.from("usuarios_publico").select("id, nome").eq("loja_id", lojaId),
        supabase
          .from("registros_ponto")
          .select("usuario_id, tipo, registrado_em")
          .eq("loja_id", lojaId)
          .gte("registrado_em", hojeInicio.toISOString())
          .order("registrado_em", { ascending: true }),
      ]);

      const userMap = new Map((usuariosRes.data ?? []).map((u: any) => [u.id, u.nome]));
      const pontoMap = new Map<string, { ultimo: string; tipo: string }>();
      (pontoRes.data ?? []).forEach((r: any) => {
        pontoMap.set(r.usuario_id, { ultimo: r.registrado_em, tipo: r.tipo });
      });

      // agrupa por user_id (papéis múltiplos)
      const byUser = new Map<string, { user_id: string; nome: string; roles: string[] }>();
      (rolesRes.data ?? []).forEach((r: any) => {
        const cur = byUser.get(r.user_id);
        if (cur) cur.roles.push(r.role);
        else
          byUser.set(r.user_id, {
            user_id: r.user_id,
            nome: userMap.get(r.user_id) ?? "—",
            roles: [r.role],
          });
      });

      return Array.from(byUser.values()).map((m) => {
        const p = pontoMap.get(m.user_id);
        return {
          ...m,
          ponto_status: p ? (p.tipo === "entrada" ? "Trabalhando" : "Saída registrada") : "Sem registro",
          ponto_cor: p ? (p.tipo === "entrada" ? "#12B76A" : "#6B7A90") : "#B0BAC9",
          ponto_hora: p ? new Date(p.ultimo).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null,
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center" style={{ fontSize: 13, color: "#6B7A90" }}>
        Carregando equipe...
      </div>
    );
  }

  if (membros.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16"
        style={{ background: "#FFFFFF", border: "0.5px solid #E8ECF2", borderRadius: 12 }}
      >
        <div
          className="mb-4 flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: 999, background: "#F5F7FA", color: "#6B7A90" }}
        >
          <Users className="h-7 w-7" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>Nenhum membro vinculado</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", border: "0.5px solid #E8ECF2", borderRadius: 12 }}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {membros.map((m, i) => (
          <li
            key={m.user_id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: i === 0 ? "none" : "0.5px solid #E8ECF2" }}
          >
            {/* Avatar */}
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "#E6F3FF",
                color: "#1E6FBF",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {initials(m.nome) || "?"}
            </div>

            {/* Nome + papéis */}
            <div className="flex flex-1 flex-col">
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{m.nome}</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.roles.map((r) => {
                  const meta = ROLE_LABELS[r] ?? { label: r, bg: "#F5F7FA", color: "#6B7A90" };
                  return (
                    <span
                      key={r}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: meta.bg,
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Ponto hoje */}
            <div className="flex flex-col items-end">
              <span style={{ fontSize: 12, fontWeight: 500, color: m.ponto_cor }}>● {m.ponto_status}</span>
              {m.ponto_hora && (
                <span style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>desde {m.ponto_hora}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
