import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LojasKpiRow } from "@/components/lojas/LojasKpiRow";
import { LojaResumoTab } from "@/components/lojas/LojaResumoTab";
import { LojaContratosTab } from "@/components/lojas/LojaContratosTab";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Tab = "resumo" | "contratos" | "equipe";

export default function LojaDetail() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("resumo");

  const { data: loja } = useQuery({
    queryKey: ["loja", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lojas")
        .select("id, nome, cidade, estado, cnpj, telefone, email")
        .eq("id", id)
        .maybeSingle();
      return data as any;
    },
  });

  // contratos agora em LojaContratosTab

  const { data: equipe = [] } = useQuery({
    queryKey: ["loja-equipe", id],
    enabled: !!id && tab === "equipe",
    queryFn: async () => {
      const [{ data: roles }, { data: usuarios }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("loja_id", id),
        supabase.from("usuarios_publico").select("id, nome").eq("loja_id", id),
      ]);
      const byId = new Map((usuarios ?? []).map((u: any) => [u.id, u.nome]));
      return (roles ?? []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        nome: byId.get(r.user_id) ?? "—",
      }));
    },
  });

  const TabBtn = ({ value, label }: { value: Tab; label: string }) => {
    const active = tab === value;
    return (
      <button
        onClick={() => setTab(value)}
        style={{
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          padding: "10px 4px",
          background: "transparent",
          border: "none",
          borderBottom: `2px solid ${active ? "#1E6FBF" : "transparent"}`,
          color: active ? "#1E6FBF" : "#6B7A90",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  const cidadeEstado = [loja?.cidade, loja?.estado].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/lojas"
        style={{ fontSize: 13, color: "#6B7A90", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <ArrowLeft size={14} /> Voltar para Lojas
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Store size={18} color="#1E6FBF" />
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "#0D1117" }}>
              {loja?.nome ?? "—"}
            </h1>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: "#D1FADF",
                color: "#05873C",
              }}
            >
              Ativa
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 2 }}>
            {cidadeEstado || "—"}
          </p>
        </div>

        <Button
          variant="outline"
          style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
        >
          Editar loja
        </Button>
      </div>

      <LojasKpiRow mes={new Date().toISOString().slice(0, 7)} lojaId={id} />

      {/* Abas */}
      <div style={{ borderBottom: "1px solid #E5E7EB", display: "flex", gap: 24 }}>
        <TabBtn value="resumo" label="Resumo" />
        <TabBtn value="contratos" label="Contratos" />
        <TabBtn value="equipe" label="Equipe" />
      </div>

      {tab === "resumo" && <LojaResumoTab lojaId={id} />}

      {tab === "contratos" && (
        <div style={{ background: "#fff", border: "0.5px solid #E8ECF2", borderRadius: 12 }}>
          {contratos.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: "#6B7A90", textAlign: "center" }}>
              Nenhum contrato.
            </div>
          ) : (
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#6B7A90", textAlign: "left" }}>
                  <th style={{ padding: "10px 16px" }}>Cliente</th>
                  <th style={{ padding: "10px 16px" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c: any) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #EEF1F5" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <Link to={`/contratos/${c.id}`} style={{ color: "#1E6FBF" }}>
                        {c.cliente_nome}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#6B7A90" }}>{c.status}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      {fmtBRL(Number(c.valor_venda ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "equipe" && (
        <div style={{ background: "#fff", border: "0.5px solid #E8ECF2", borderRadius: 12 }}>
          {equipe.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: "#6B7A90", textAlign: "center" }}>
              Nenhum membro vinculado.
            </div>
          ) : (
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#6B7A90", textAlign: "left" }}>
                  <th style={{ padding: "10px 16px" }}>Nome</th>
                  <th style={{ padding: "10px 16px" }}>Papel</th>
                </tr>
              </thead>
              <tbody>
                {equipe.map((m: any) => (
                  <tr key={`${m.user_id}-${m.role}`} style={{ borderTop: "1px solid #EEF1F5" }}>
                    <td style={{ padding: "10px 16px" }}>{m.nome}</td>
                    <td style={{ padding: "10px 16px", color: "#6B7A90" }}>{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6B7A90" }}>{label}</div>
      <div style={{ fontSize: 14, color: "#0D1117", marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}
