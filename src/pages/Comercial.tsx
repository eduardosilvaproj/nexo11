import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus, Phone, Calendar, ArrowRightLeft, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadFormDialog } from "@/components/comercial/LeadFormDialog";
import { ConvertLeadDialog } from "@/components/comercial/ConvertLeadDialog";
import { ContratosTable } from "@/components/comercial/ContratosTable";
import { ContratoFormDialog } from "@/components/comercial/ContratoFormDialog";
import { ImportXmlPromobDialog } from "@/components/comercial/ImportXmlPromobDialog";
import { FileCode2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];

const COLUMNS: { id: LeadStatus; title: string }[] = [
  { id: "novo", title: "Novo" },
  { id: "atendimento", title: "Atendimento" },
  { id: "visita", title: "Visita" },
  { id: "proposta", title: "Proposta" },
  { id: "convertido", title: "Convertido" },
  { id: "perdido", title: "Perdido" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function LeadCard({ lead, onConvert }: { lead: Lead; onConvert: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  const isConvertido = lead.status === "convertido";
  const isPerdido = lead.status === "perdido";

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: "0.5px solid #E8ECF2",
    borderRadius: 8,
    padding: 12,
    opacity: isPerdido ? 0.6 : 1,
    borderLeft: isConvertido
      ? "3px solid #12B76A"
      : isPerdido
        ? "3px solid #E53935"
        : "0.5px solid #E8ECF2",
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab transition-shadow hover:shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
      style={cardStyle}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }} className="truncate">
        {lead.nome}
      </p>
      {lead.contato && (
        <p className="mt-0.5 truncate" style={{ fontSize: 12, color: "#6B7A90" }}>
          {lead.contato}
        </p>
      )}

      {lead.origem && (
        <div className="mt-2">
          <span
            style={{
              fontSize: 11,
              background: "#E6F3FF",
              color: "#1E6FBF",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {lead.origem}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#E8ECF2",
              color: "#6B7A90",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {lead.vendedor_id ? "•" : "?"}
          </span>
          <span style={{ fontSize: 11, color: "#6B7A90" }}>
            {lead.vendedor_id ? "Vendedor" : "Sem responsável"}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#B0BAC9" }}>{formatDate(lead.data_entrada)}</span>
      </div>

      {!isConvertido && !isPerdido && (
        <button
          onClick={() => onConvert(lead)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md py-1 transition-colors hover:bg-[#E6F3FF]"
          style={{ fontSize: 11, color: "#1E6FBF", fontWeight: 500 }}
        >
          <ArrowRightLeft className="h-3 w-3" /> Converter em contrato
        </button>
      )}
    </div>
  );
}

function Column({
  status,
  title,
  leads,
  onConvert,
}: {
  status: LeadStatus;
  title: string;
  leads: Lead[];
  onConvert: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className="flex h-full flex-col"
      style={{ width: 200, minWidth: 200, background: "#F5F7FA", borderRadius: 8 }}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span
          style={{
            fontSize: 12,
            color: "#6B7A90",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        <span
          className="inline-flex items-center justify-center"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6B7A90",
            background: "#E8ECF2",
            borderRadius: 999,
            padding: "1px 8px",
            minWidth: 22,
          }}
        >
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 px-2 pb-2 transition-colors ${
          isOver ? "bg-[#E6F3FF]/40" : ""
        }`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onConvert={onConvert} />
        ))}
        {leads.length === 0 && (
          <p className="py-8 text-center" style={{ fontSize: 11, color: "#B0BAC9" }}>
            Sem leads
          </p>
        )}
      </div>
    </div>
  );
}

type TabKey = "leads" | "contratos";

export default function Comercial() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [contratoFormOpen, setContratoFormOpen] = useState(false);
  const [importXmlOpen, setImportXmlOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("leads");
  const [filterStatus, setFilterStatus] = useState<"all" | LeadStatus>("all");
  const [filterVendedor, setFilterVendedor] = useState<string>("all");
  const [search, setSearch] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status, data_ultimo_contato: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["leads", perfil?.loja_id] });
      const prev = queryClient.getQueryData<Lead[]>(["leads", perfil?.loja_id]);
      queryClient.setQueryData<Lead[]>(["leads", perfil?.loja_id], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, status } : l)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["leads", perfil?.loja_id], ctx.prev);
      toast({ title: "Não foi possível mover o lead", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", perfil?.loja_id] });
    },
  });

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    const id = String(e.active.id);
    if (!overId) return;
    const next = String(overId) as LeadStatus;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === next) return;
    updateStatus.mutate({ id, status: next });
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const filteredLeads = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterVendedor !== "all" && l.vendedor_id !== filterVendedor) return false;
    if (search.trim() && !l.nome.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const vendedoresUnicos = Array.from(
    new Set(leads.map((l) => l.vendedor_id).filter(Boolean) as string[]),
  );

  const grouped = COLUMNS.map((c) => ({
    ...c,
    leads: filteredLeads.filter((l) => l.status === c.id),
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#0D1117" }}>
            {tab === "contratos" ? "Contratos" : "Leads"}
          </h1>
          <p className="mt-0.5" style={{ fontSize: 13, color: "#6B7A90" }}>
            {tab === "contratos" ? "Todos os contratos da loja" : "Pipeline comercial"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Importar XML Promob removido daqui por solicitação do usuário. Agora está no Perfil do Cliente -> Orçamentos */}
          <button
            onClick={() => (tab === "contratos" ? navigate("/contratos/novo") : setFormOpen(true))}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#1759A0]"
            style={{ background: "#1E6FBF", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
          >
            <Plus className="h-4 w-4" /> {tab === "contratos" ? "Novo contrato" : "Novo lead"}
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-6 border-b border-[#E8ECF2]">
        {([
          { key: "leads", label: "Leads" },
          { key: "contratos", label: "Contratos" },
        ] as { key: TabKey; label: string }[]).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="-mb-px pb-2 pt-1 transition-colors"
              style={{
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? "#1E6FBF" : "#6B7A90",
                borderBottom: active ? "2px solid #1E6FBF" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      {tab === "leads" && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | LeadStatus)}
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid #E8ECF2",
              padding: "0 10px",
              fontSize: 13,
              color: "#0D1117",
              background: "#FFFFFF",
              outline: "none",
            }}
          >
            <option value="all">Todas as etapas</option>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={filterVendedor}
            onChange={(e) => setFilterVendedor(e.target.value)}
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid #E8ECF2",
              padding: "0 10px",
              fontSize: 13,
              color: "#0D1117",
              background: "#FFFFFF",
              outline: "none",
            }}
          >
            <option value="all">Todos os vendedores</option>
            {vendedoresUnicos.map((v) => (
              <option key={v} value={v}>{v.slice(0, 8)}</option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            maxLength={80}
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid #E8ECF2",
              padding: "0 10px",
              fontSize: 13,
              color: "#0D1117",
              background: "#FFFFFF",
              outline: "none",
              minWidth: 220,
              flex: 1,
            }}
          />
        </div>
      )}

      {tab === "contratos" ? (
        <ContratosTable onCreate={() => setContratoFormOpen(true)} />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando leads...
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
            {grouped.map((col) => (
              <Column
                key={col.id}
                status={col.id}
                title={col.title}
                
                leads={col.leads}
                onConvert={setConvertLead}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <Card className="w-[260px] cursor-grabbing border-nexo-blue bg-card p-3 shadow-lg">
                <p className="text-sm font-semibold">{activeLead.nome}</p>
                {activeLead.contato && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{activeLead.contato}</p>
                )}
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ContratoFormDialog open={contratoFormOpen} onOpenChange={setContratoFormOpen} />
      <ImportXmlPromobDialog open={importXmlOpen} onOpenChange={setImportXmlOpen} />
      <ConvertLeadDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(o) => !o && setConvertLead(null)}
      />
    </div>
  );
}
