
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Truck, CheckCircle2, Box, Search, Clock, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  contratosComMaterialSeparado,
  contratosFaltandoEntregaAlmox,
} from "@/lib/logistica-sync";

// Fase B: para cada contrato com material 'separado', garante uma entrega
// independente na agenda com origem='almoxarifado'. Idempotente — so cria se
// ainda nao existir uma entrega dessa origem para o contrato. Agrupa por
// contrato (uma entrega por contrato, nao uma por item).
// A logica de decisao (dedup + guarda) vive em @/lib/logistica-sync (testada).
async function reconcileEntregasAlmox(expedicoes: any[]) {
  try {
    const contratosSeparados = contratosComMaterialSeparado(expedicoes);
    if (contratosSeparados.length === 0) return;

    // Quais desses ja tem entrega origem=almoxarifado?
    const { data: jaTem } = await supabase
      .from("entregas")
      .select("contrato_id")
      .eq("origem", "almoxarifado")
      .in("contrato_id", contratosSeparados);

    const faltando = contratosFaltandoEntregaAlmox(
      contratosSeparados,
      (jaTem ?? []).map((r: any) => r.contrato_id)
    );
    if (faltando.length === 0) return;

    // Endereco do contrato para preencher a entrega.
    const { data: contratosInfo } = await supabase
      .from("contratos")
      .select("id, loja_id, cliente_id, cliente_contato")
      .in("id", faltando);
    const infoById = new Map((contratosInfo ?? []).map((c: any) => [c.id, c]));

    const rows = faltando.map((cid) => {
      const info = infoById.get(cid) as any;
      const endereco = info?.cliente_contato ?? null;
      return {
        contrato_id: cid,
        data_prevista: null,
        turno: "dia_todo",
        endereco,
        rota: endereco,
        observacoes: "Gerada automaticamente da separacao de material (almoxarifado)",
        status_visual: "a_agendar",
        origem: "almoxarifado",
      };
    });

    const { error: insErr } = await supabase.from("entregas").insert(rows);
    if (insErr) {
      console.error("[Almox] erro ao criar entregas origem=almoxarifado:", insErr);
      return;
    }

    // Dispara automacao de entrega agendada para cada contrato novo.
    try {
      const { automationService } = await import("@/services/automationService");
      for (const cid of faltando) {
        const info = infoById.get(cid) as any;
        if (!info?.loja_id) continue;
        await automationService.dispararGatilho(
          "entrega_agendada",
          "contrato",
          cid,
          info.loja_id,
          { cliente_id: info.cliente_id, contrato_id: cid, origem: "almoxarifado" }
        );
      }
    } catch (err) {
      console.error("[Almox] erro ao disparar gatilho entrega_agendada (almox):", err);
    }
  } catch (err) {
    console.error("[Almox] falha inesperada no reconcile de entregas:", err);
  }
}

export function MateriaisSeparadosTab() {
  const { perfil, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: expedicoes = [], isLoading } = useQuery({
    queryKey: ["expedicoes_almoxarifado", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      // Sincroniza expedições a partir das movimentações existentes
      await (supabase.rpc as any)('sync_expedicoes_almoxarifado');

      const { data, error } = await supabase
        .from("expedicoes_almoxarifado")
        .select(`
          *,
          contratos:contrato_id ( cliente_nome ),
          estoque_itens:item_id ( descricao, codigo, unidade )
        `)
        .eq("loja_id", perfil?.loja_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fase B: garante uma entrega independente (origem=almoxarifado) na agenda
      // para cada contrato com material separado. Idempotente: so cria se ainda
      // nao existe entrega origem=almoxarifado para o contrato.
      await reconcileEntregasAlmox((data ?? []) as any[]);

      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const now = new Date().toISOString();
      const updates: any = { status, updated_at: now };

      if (status === 'carregado') {
        updates.carregado_at = now;
        updates.responsavel_carregamento_id = user?.id;
      } else if (status === 'entregue') {
        updates.entregue_at = now;
        updates.responsavel_entrega_id = user?.id;
      }

      const { error } = await supabase
        .from("expedicoes_almoxarifado")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Elo com o fluxo logistico (Fase A): registra evento + log no contrato e
      // dispara automacao quando o material e carregado/entregue. So para os
      // status que sao marcos do fluxo (carregado, entregue).
      if (status === 'carregado' || status === 'entregue') {
        const exp = expedicoes.find((e) => e.id === id);
        const contratoId = exp?.contrato_id as string | undefined;
        const lojaId = exp?.loja_id as string | undefined;
        if (contratoId) {
          const itemDesc = (exp?.estoque_itens as any)?.descricao ?? "material";
          const isEntregue = status === 'entregue';
          const titulo = isEntregue ? "Material de estoque entregue" : "Material de estoque carregado";
          const descricao = isEntregue
            ? `Expedicao de almoxarifado entregue: ${itemDesc} (qtd ${exp?.quantidade}).`
            : `Material de almoxarifado carregado para saida: ${itemDesc} (qtd ${exp?.quantidade}).`;

          const { registrarEventoContrato } = await import("@/services/contratoEventos");
          await registrarEventoContrato({
            contratoId,
            tipo: isEntregue ? "almox_material_entregue" : "almox_material_carregado",
            modulo: "almoxarifado",
            titulo,
            descricao,
            entidadeTipo: "expedicoes_almoxarifado",
            entidadeId: id,
          });

          // Dispara automacao so na entrega final. Reusa o gatilho existente
          // 'entrega_concluida' (origem no metadata) para aproveitar regras ja
          // configuradas, em vez de criar um gatilho sem nenhuma regra associada.
          if (isEntregue && lojaId) {
            try {
              const { automationService } = await import("@/services/automationService");
              await automationService.dispararGatilho(
                "entrega_concluida",
                "contrato",
                contratoId,
                lojaId,
                { contrato_id: contratoId, expedicao_id: id, origem: "almoxarifado" }
              );
            } catch (err) {
              console.error("[Almox] erro ao disparar gatilho entrega_concluida (almox):", err);
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["expedicoes_almoxarifado"] });
      qc.invalidateQueries({ queryKey: ["logistica-unificada"] });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  });

  const filtered = expedicoes.filter(exp => {
    const q = search.toLowerCase();
    const cliente = (exp.contratos as any)?.cliente_nome?.toLowerCase() || "";
    const item = (exp.estoque_itens as any)?.descricao?.toLowerCase() || "";
    return cliente.includes(q) || item.includes(q) || exp.status.includes(q);
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      separados: expedicoes.filter(e => e.status === 'separado').length,
      carregados: expedicoes.filter(e => e.status === 'carregado').length,
      entreguesHoje: expedicoes.filter(e => e.status === 'entregue' && e.entregue_at?.startsWith(today)).length,
      pendentes: expedicoes.filter(e => ['separado', 'carregado'].includes(e.status)).length
    };
  }, [expedicoes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="animate-spin mb-2" />
        Carregando materiais...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Separados" value={stats.separados} icon={Box} color="blue" />
        <StatCard label="Carregados" value={stats.carregados} icon={Truck} color="amber" />
        <StatCard label="Entregues Hoje" value={stats.entreguesHoje} icon={CheckCircle2} color="green" />
        <StatCard label="Pendentes Entrega" value={stats.pendentes} icon={Clock} color="slate" />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar por cliente, item ou status..." 
            className="pl-10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Contrato / Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Item</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Qtd</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Data Separação</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="text-slate-300" />
                      <p>Nenhum material separado para expedição.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => navigate(`/contratos/${exp.contrato_id}?tab=logistica`)}
                        className="font-medium text-blue-600 hover:underline text-left block"
                      >
                        #{exp.contrato_id.slice(0, 6)}
                      </button>
                      <span className="text-slate-500 text-xs">{(exp.contratos as any)?.cliente_nome}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{(exp.estoque_itens as any)?.descricao}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(exp.estoque_itens as any)?.codigo || 'S/C'}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {exp.quantidade} <span className="text-[10px] font-normal text-slate-400">{(exp.estoque_itens as any)?.unidade}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(exp.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {exp.status === 'separado' && (
                        <Button size="sm" variant="outline" className="h-8 text-[11px] border-amber-200 text-amber-700 hover:bg-amber-50"
                          onClick={() => updateStatus.mutate({ id: exp.id, status: 'carregado' })}
                          disabled={updateStatus.isPending}
                        >
                          <Truck size={12} className="mr-1" />
                          Carregar
                        </Button>
                      )}
                      {(exp.status === 'separado' || exp.status === 'carregado') && (
                        <Button size="sm" className="h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => updateStatus.mutate({ id: exp.id, status: 'entregue' })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 size={12} className="mr-1" />
                          Entregar
                        </Button>
                      )}
                      {exp.status !== 'entregue' && exp.status !== 'cancelado' && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => updateStatus.mutate({ id: exp.id, status: 'cancelado' })}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle size={14} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={`p-4 rounded-xl border flex items-center gap-4 bg-white shadow-sm border-slate-100`}>
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    separado: { label: "Separado", className: "bg-blue-50 text-blue-700 border-blue-100" },
    carregado: { label: "Carregado", className: "bg-amber-50 text-amber-700 border-amber-100" },
    entregue: { label: "Entregue", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    cancelado: { label: "Cancelado", className: "bg-slate-50 text-slate-700 border-slate-100" },
  };

  const config = configs[status] || configs.separado;

  return (
    <Badge variant="outline" className={`font-medium text-[10px] h-5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
