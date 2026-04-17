import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogisticaTabProps {
  contratoId: string;
}

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
    <div className="mb-4 flex items-center justify-between">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5">
    <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
    <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{value || "—"}</span>
  </div>
);

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export function ContratoLogisticaTab({ contratoId }: LogisticaTabProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    transportadora: "",
    data_prevista: "",
    rota: "",
    custo_frete: "",
  });

  const { data: entrega } = useQuery({
    queryKey: ["entrega", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function loadFoto() {
      if (!entrega?.foto_confirmacao_path) {
        setFotoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("entregas-fotos")
        .createSignedUrl(entrega.foto_confirmacao_path, 300);
      if (!cancelled) setFotoUrl(data?.signedUrl ?? null);
    }
    loadFoto();
    return () => {
      cancelled = true;
    };
  }, [entrega?.foto_confirmacao_path]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        contrato_id: contratoId,
        transportadora: form.transportadora || null,
        data_prevista: form.data_prevista || null,
        rota: form.rota || null,
        custo_frete: Number(form.custo_frete) || 0,
      };
      if (entrega) {
        const { error } = await supabase.from("entregas").update(payload).eq("id", entrega.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entregas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Entrega salva");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["entrega", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!entrega) throw new Error("Cadastre a entrega primeiro");
      const path = `${contratoId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("entregas-fotos")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("entregas")
        .update({
          status: "confirmada",
          foto_confirmacao_path: path,
          data_confirmacao: new Date().toISOString(),
          confirmado_por: u.user?.id ?? null,
        })
        .eq("id", entrega.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega confirmada");
      qc.invalidateQueries({ queryKey: ["entrega", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Estado vazio
  if (!entrega && !editing) {
    return (
      <Card title="Entrega">
        <div className="flex flex-col items-center gap-3 py-8">
          <span style={{ fontSize: 13, color: "#6B7A90" }}>
            Nenhuma entrega cadastrada para este contrato.
          </span>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
          >
            Cadastrar entrega
          </button>
        </div>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card title={entrega ? "Editar entrega" : "Cadastrar entrega"}>
        <div className="flex flex-col gap-3">
          {[
            { k: "transportadora", label: "Transportadora", type: "text" },
            { k: "data_prevista", label: "Data prevista", type: "date" },
            { k: "rota", label: "Rota / descrição", type: "text" },
            { k: "custo_frete", label: "Custo do frete (R$)", type: "number" },
          ].map((f) => (
            <label key={f.k} className="flex flex-col gap-1">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>{f.label}</span>
              <input
                type={f.type}
                value={(form as Record<string, string>)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="rounded-lg px-3 outline-none focus:ring-2 focus:ring-[#1E6FBF]/30"
                style={{ height: 36, border: "1px solid #E8ECF2", fontSize: 13 }}
              />
            </label>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2"
              style={{ fontSize: 13, color: "#6B7A90", border: "1px solid #E8ECF2" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-lg px-4 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (!entrega) return null;
  const isConfirmada = entrega.status === "confirmada";

  return (
    <Card
      title="Entrega"
      right={
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
          style={{
            backgroundColor: isConfirmada ? "#D1FAE5" : "#FEF3C7",
            color: isConfirmada ? "#05873C" : "#E8A020",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {isConfirmada && <Check className="h-3 w-3" />}
          {isConfirmada ? "Confirmada" : "Pendente"}
        </span>
      }
    >
      <Field label="Transportadora" value={entrega.transportadora} />
      <Field label="Data prevista" value={formatDate(entrega.data_prevista)} />
      <Field label="Rota" value={entrega.rota} />
      <Field label="Custo do frete" value={formatBRL(Number(entrega.custo_frete))} />
      <Field
        label="Status"
        value={
          <span style={{ color: isConfirmada ? "#05873C" : "#E8A020" }}>
            {isConfirmada ? "Confirmada" : "Pendente"}
          </span>
        }
      />
      {isConfirmada && entrega.data_confirmacao && (
        <Field label="Confirmada em" value={formatDate(entrega.data_confirmacao)} />
      )}

      {fotoUrl && (
        <div className="mt-4">
          <span style={{ fontSize: 12, color: "#6B7A90" }}>Foto de confirmação</span>
          <img
            src={fotoUrl}
            alt="Confirmação"
            className="mt-2 max-h-64 rounded-lg"
            style={{ border: "0.5px solid #E8ECF2" }}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setForm({
              transportadora: entrega.transportadora ?? "",
              data_prevista: entrega.data_prevista ?? "",
              rota: entrega.rota ?? "",
              custo_frete: String(entrega.custo_frete ?? ""),
            });
            setEditing(true);
          }}
          className="rounded-lg px-3 py-2"
          style={{ fontSize: 13, color: "#1E6FBF", border: "1px solid #E8ECF2" }}
        >
          Editar
        </button>
        {!isConfirmada && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) confirmarMutation.mutate(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={confirmarMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: "#12B76A", fontSize: 13 }}
            >
              <Camera className="h-4 w-4" />
              {confirmarMutation.isPending ? "Enviando..." : "Confirmar entrega"}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
