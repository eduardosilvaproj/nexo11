import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Plus, Trash2, Search, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Meta {
  descricao: string;
  meta_valor: string;
  resultado: string;
}

interface Categorias {
  produtividade: number;
  qualidade_trabalho: number;
  pontualidade: number;
  trabalho_equipe: number;
  iniciativa: number;
}

const CATEGORIAS_LABELS: Record<keyof Categorias, string> = {
  produtividade: "Produtividade",
  qualidade_trabalho: "Qualidade do trabalho",
  pontualidade: "Pontualidade",
  trabalho_equipe: "Trabalho em equipe",
  iniciativa: "Iniciativa",
};

export function RHAvaliacaoDesempenho() {
  const { loja_id } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // Form state
  const [pessoaId, setPessoaId] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [categorias, setCategorias] = useState<Categorias>({
    produtividade: 0,
    qualidade_trabalho: 0,
    pontualidade: 0,
    trabalho_equipe: 0,
    iniciativa: 0,
  });
  const [metas, setMetas] = useState<Meta[]>([]);
  const [feedback, setFeedback] = useState("");

  const { data: funcionarios } = useQuery({
    queryKey: ["rh-avaliacoes-pessoas", loja_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ["rh-avaliacoes", loja_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rh_avaliacoes")
        .select("*, pessoas(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const notaGeral = calcNotaGeral();
      const { error } = await (supabase as any)
        .from("rh_avaliacoes")
        .insert({
          loja_id,
          pessoa_id: pessoaId,
          periodo_inicio: periodoInicio || null,
          periodo_fim: periodoFim || null,
          categorias,
          metas,
          feedback,
          nota_geral: notaGeral,
          status: "rascunho",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["rh-avaliacoes"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Erro ao criar avaliação"),
  });

  const enviarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("rh_avaliacoes")
        .update({ status: "enviada" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada");
      queryClient.invalidateQueries({ queryKey: ["rh-avaliacoes"] });
    },
    onError: () => toast.error("Erro ao enviar avaliação"),
  });

  const reconhecerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("rh_avaliacoes")
        .update({ status: "reconhecida", reconhecida_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação reconhecida");
      queryClient.invalidateQueries({ queryKey: ["rh-avaliacoes"] });
    },
    onError: () => toast.error("Erro ao reconhecer avaliação"),
  });

  function calcNotaGeral(): number {
    const values = Object.values(categorias).filter((v) => v > 0);
    if (values.length === 0) return 0;
    return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  }

  function resetForm() {
    setPessoaId("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setCategorias({ produtividade: 0, qualidade_trabalho: 0, pontualidade: 0, trabalho_equipe: 0, iniciativa: 0 });
    setMetas([]);
    setFeedback("");
  }

  function addMeta() {
    setMetas([...metas, { descricao: "", meta_valor: "", resultado: "" }]);
  }

  function removeMeta(index: number) {
    setMetas(metas.filter((_, i) => i !== index));
  }

  function updateMeta(index: number, field: keyof Meta, value: string) {
    const updated = [...metas];
    updated[index] = { ...updated[index], [field]: value };
    setMetas(updated);
  }

  const filtered = avaliacoes?.filter((a: any) => {
    const matchSearch = a.pessoas?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      rascunho: { label: "Rascunho", className: "bg-slate-100 text-slate-700" },
      enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700" },
      reconhecida: { label: "Reconhecida", className: "bg-green-100 text-green-700" },
    };
    const s = map[status] || { label: status, className: "bg-slate-100 text-slate-700" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
  };

  const getNotaColor = (nota: number) => {
    if (nota >= 4) return "bg-green-100 text-green-800";
    if (nota >= 3) return "bg-yellow-100 text-yellow-800";
    if (nota >= 2) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por funcionário..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="reconhecida">Reconhecida</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Avaliação
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-8" style={{ color: "#6B7A90", fontSize: 13 }}>Carregando...</p>
      ) : filtered?.length === 0 ? (
        <p className="text-center py-8" style={{ color: "#6B7A90", fontSize: 13 }}>Nenhuma avaliação encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((av: any) => (
            <div
              key={av.id}
              className="rounded-xl p-4 space-y-3"
              style={{ border: "0.5px solid #E8ECF2", background: "#fff" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium" style={{ color: "#0D1117", fontSize: 13 }}>
                  {av.pessoas?.nome || "—"}
                </h3>
                {getStatusBadge(av.status)}
              </div>
              <div className="text-xs" style={{ color: "#6B7A90" }}>
                {av.periodo_inicio && av.periodo_fim
                  ? `${format(new Date(av.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })} - ${format(new Date(av.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}`
                  : "Período não definido"}
              </div>
              {av.nota_geral != null && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${getNotaColor(av.nota_geral)}`}
                  >
                    {av.nota_geral.toFixed(1)}
                  </span>
                  <span style={{ color: "#6B7A90", fontSize: 11 }}>nota geral</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {av.status === "rascunho" && (
                  <Button size="sm" variant="outline" onClick={() => enviarMutation.mutate(av.id)}>
                    Enviar
                  </Button>
                )}
                {av.status === "enviada" && (
                  <Button size="sm" variant="outline" onClick={() => reconhecerMutation.mutate(av.id)}>
                    <ClipboardCheck className="w-3 h-3 mr-1" />
                    Reconhecer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação de Desempenho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1" style={{ fontSize: 11, color: "#6B7A90" }}>Funcionário</label>
              <Select value={pessoaId} onValueChange={setPessoaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1" style={{ fontSize: 11, color: "#6B7A90" }}>Período início</label>
                <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: 11, color: "#6B7A90" }}>Período fim</label>
                <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium" style={{ fontSize: 13, color: "#0D1117" }}>Categorias de Avaliação</label>
              <div className="space-y-3">
                {(Object.keys(CATEGORIAS_LABELS) as (keyof Categorias)[]).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: "#0D1117" }}>{CATEGORIAS_LABELS[key]}</span>
                    <StarRating
                      value={categorias[key]}
                      onChange={(v) => setCategorias({ ...categorias, [key]: v })}
                    />
                  </div>
                ))}
              </div>
              {calcNotaGeral() > 0 && (
                <div className="mt-2 text-right">
                  <span style={{ fontSize: 11, color: "#6B7A90" }}>Nota geral: </span>
                  <span className="font-semibold" style={{ fontSize: 13 }}>{calcNotaGeral()}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium" style={{ fontSize: 13, color: "#0D1117" }}>Metas</label>
                <Button type="button" variant="outline" size="sm" onClick={addMeta}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {metas.map((meta, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 mb-2 items-center">
                  <Input
                    placeholder="Descrição"
                    value={meta.descricao}
                    onChange={(e) => updateMeta(i, "descricao", e.target.value)}
                  />
                  <Input
                    placeholder="Meta"
                    value={meta.meta_valor}
                    onChange={(e) => updateMeta(i, "meta_valor", e.target.value)}
                  />
                  <Input
                    placeholder="Resultado"
                    value={meta.resultado}
                    onChange={(e) => updateMeta(i, "resultado", e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMeta(i)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <label className="block mb-1" style={{ fontSize: 11, color: "#6B7A90" }}>Feedback do gestor</label>
              <Textarea
                placeholder="Escreva o feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!pessoaId || createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
