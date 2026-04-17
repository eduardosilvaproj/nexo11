import { useState } from "react";
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
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];

const COLUMNS: { id: LeadStatus; title: string; tone: string }[] = [
  { id: "novo", title: "Novo", tone: "bg-nexo-gray-light text-nexo-gray-dark" },
  { id: "atendimento", title: "Atendimento", tone: "bg-nexo-blue-bg text-nexo-blue" },
  { id: "visita", title: "Visita", tone: "bg-nexo-blue-bg text-nexo-blue-dark" },
  { id: "proposta", title: "Proposta", tone: "bg-nexo-amber-light text-nexo-amber" },
  { id: "convertido", title: "Convertido", tone: "bg-nexo-green-light text-nexo-green-dark" },
  { id: "perdido", title: "Perdido", tone: "bg-nexo-red-light text-nexo-red" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function LeadCard({ lead, onConvert }: { lead: Lead; onConvert: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <Card
      ref={setNodeRef}
      className={`group border-nexo-border bg-card p-3 transition-shadow hover:shadow-md ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-nexo-gray-mid hover:text-nexo-blue active:cursor-grabbing"
          aria-label="Arrastar lead"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{lead.nome}</p>
          {lead.contato && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {lead.contato}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDate(lead.data_entrada)}
            </span>
            {lead.origem && <Badge variant="outline" className="text-[10px]">{lead.origem}</Badge>}
          </div>
          {lead.status !== "convertido" && lead.status !== "perdido" && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 w-full justify-start text-xs text-nexo-blue hover:bg-nexo-blue-bg hover:text-nexo-blue-dark"
              onClick={() => onConvert(lead)}
            >
              <ArrowRightLeft className="mr-1 h-3 w-3" /> Converter em contrato
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Column({
  status,
  title,
  tone,
  leads,
  onConvert,
}: {
  status: LeadStatus;
  title: string;
  tone: string;
  leads: Lead[];
  onConvert: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex h-full min-w-[260px] flex-1 flex-col rounded-lg border border-nexo-border bg-nexo-bg-light/60">
      <div className="flex items-center justify-between border-b border-nexo-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
            {leads.length}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? "bg-nexo-blue-bg/60" : ""
        }`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onConvert={onConvert} />
        ))}
        {leads.length === 0 && (
          <p className="py-8 text-center text-xs text-nexo-gray-mid">Sem leads</p>
        )}
      </div>
    </div>
  );
}

type TabKey = "leads" | "contratos";

export default function Comercial() {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("leads");

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

  const grouped = COLUMNS.map((c) => ({ ...c, leads: leads.filter((l) => l.status === c.id) }));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#0D1117" }}>Leads</h1>
          <p className="mt-0.5" style={{ fontSize: 13, color: "#6B7A90" }}>
            Pipeline comercial
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#1759A0]"
          style={{ background: "#1E6FBF", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
        >
          <Plus className="h-4 w-4" /> Novo lead
        </button>
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

      {tab === "contratos" ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Em breve: visualização de contratos.
        </div>
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
                tone={col.tone}
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
      <ConvertLeadDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(o) => !o && setConvertLead(null)}
      />
    </div>
  );
}
