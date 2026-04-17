import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LojasKpiRow } from "@/components/lojas/LojasKpiRow";
import { LojaResumoTab } from "@/components/lojas/LojaResumoTab";
import { LojaContratosTab } from "@/components/lojas/LojaContratosTab";
import { LojaEquipeTab } from "@/components/lojas/LojaEquipeTab";

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

  // equipe agora em LojaEquipeTab

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

      {tab === "contratos" && <LojaContratosTab lojaId={id} />}

      {tab === "equipe" && <LojaEquipeTab lojaId={id} />}
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
