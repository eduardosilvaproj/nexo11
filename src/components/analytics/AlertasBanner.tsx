import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alerta = { key: string; texto: string; link: string; linkLabel?: string };

const DAY = 86_400_000;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
const numero = (id: string) => "#" + id.slice(0, 4);
const STAGE_LABEL: Record<string, string> = {
  comercial: "Comercial",
  tecnico: "Técnico",
  producao: "Produção",
  logistica: "Logística",
  montagem: "Montagem",
  pos_venda: "Pós-venda",
};

async function fetchAlertas(): Promise<Alerta[]> {
  const alertas: Alerta[] = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mesLabel = now.toLocaleDateString("pt-BR", { month: "long" });
  const mesCap = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  // 1. Contratos parados >7d sem avançar
  const { data: contratos } = await supabase
    .from("contratos")
    .select("id, cliente_nome, status, updated_at")
    .neq("status", "finalizado");
  contratos?.forEach((c) => {
    const d = daysSince(c.updated_at);
    if (d > 7) {
      alertas.push({
        key: `parado-${c.id}`,
        texto: `Contrato ${numero(c.id)} (${c.cliente_nome}) parado há ${d} dias na etapa ${STAGE_LABEL[c.status] ?? c.status}`,
        link: `/contratos/${c.id}`,
      });
    }
  });

  // 2. Margem <15% em contratos finalizados
  const { data: dreFinal } = await supabase
    .from("vw_contratos_dre")
    .select("id, margem_realizada, status")
    .eq("status", "finalizado")
    .lt("margem_realizada", 15);
  dreFinal?.forEach((c) => {
    if (!c.id) return;
    alertas.push({
      key: `margem-${c.id}`,
      texto: `Contrato ${numero(c.id)} fechou com margem de ${Number(c.margem_realizada ?? 0).toFixed(1)}%`,
      link: `/contratos/${c.id}`,
      linkLabel: "Ver DRE",
    });
  });

  // 3. Loja abaixo do ponto de equilíbrio
  const ano = now.getFullYear();
  const mesNum = now.getMonth() + 1;
  const { data: pe } = await supabase
    .from("vw_ponto_equilibrio")
    .select("faturamento_realizado, pe_calculado, ano, mes_num")
    .eq("ano", ano)
    .eq("mes_num", mesNum)
    .maybeSingle();
  if (pe?.pe_calculado && pe.pe_calculado > 0) {
    const fat = Number(pe.faturamento_realizado ?? 0);
    const peVal = Number(pe.pe_calculado);
    if (fat < peVal) {
      const pct = Math.round(((peVal - fat) / peVal) * 100);
      alertas.push({
        key: "pe",
        texto: `Faturamento atual ${pct}% abaixo do PE de ${mesCap}`,
        link: "/financeiro",
        linkLabel: "Ver Financeiro",
      });
    }
  }

  // 4. Chamados pós-venda abertos >5d
  const { data: chamados } = await supabase
    .from("chamados_pos_venda")
    .select("id, data_abertura, status, contrato_id")
    .neq("status", "resolvido");
  chamados?.forEach((c) => {
    const d = daysSince(c.data_abertura);
    if (d > 5) {
      alertas.push({
        key: `chamado-${c.id}`,
        texto: `Chamado ${numero(c.id)} sem resolução há ${d} dias`,
        link: `/contratos/${c.contrato_id}`,
      });
    }
  });

  // 5. Checklist técnico com item pendente >3d
  const { data: checks } = await supabase
    .from("checklists_tecnicos")
    .select("contrato_id, concluido, updated_at")
    .eq("concluido", false);
  const oldestByContrato = new Map<string, number>();
  checks?.forEach((c) => {
    const d = daysSince(c.updated_at);
    if (d > 3) {
      const cur = oldestByContrato.get(c.contrato_id) ?? 0;
      if (d > cur) oldestByContrato.set(c.contrato_id, d);
    }
  });
  oldestByContrato.forEach((d, cid) => {
    alertas.push({
      key: `check-${cid}`,
      texto: `Contrato ${numero(cid)} com checklist parado há ${d} dias`,
      link: `/contratos/${cid}`,
    });
  });

  return alertas;
}

export function AlertasBanner() {
  const { data: alertas } = useQuery({
    queryKey: ["analytics-alertas"],
    queryFn: fetchAlertas,
    refetchOnWindowFocus: false,
  });

  if (!alertas || alertas.length === 0) return null;

  return (
    <div
      className="overflow-x-auto"
      style={{
        backgroundColor: "#FEF3C7",
        borderBottom: "1px solid #E8A020",
        padding: "10px 16px",
      }}
    >
      <div className="flex items-center gap-3 whitespace-nowrap" style={{ fontSize: 13, color: "#7A4A0E" }}>
        {alertas.map((a, i) => (
          <div key={a.key} className="flex items-center gap-3">
            {i > 0 && <span style={{ color: "#E8A020" }}>|</span>}
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} style={{ color: "#A05A0E" }} />
              {a.texto}
              <Link
                to={a.link}
                className="ml-1"
                style={{ color: "#1E6FBF", fontWeight: 500 }}
              >
                {a.linkLabel ?? "Ver"} →
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
