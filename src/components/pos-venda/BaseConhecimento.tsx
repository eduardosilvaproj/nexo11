import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Categoria = "assistencia" | "reclamacao" | "garantia" | "solicitacao" | "geral";

const CATEGORIA_LABEL: Record<Categoria, string> = {
  assistencia: "Assistência",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
  geral: "Geral",
};

const CATEGORIA_BADGE: Record<Categoria, { bg: string; fg: string }> = {
  assistencia: { bg: "#E6F3FF", fg: "#1E6FBF" },
  reclamacao: { bg: "#FDECEA", fg: "#E53935" },
  garantia: { bg: "#EEEDFE", fg: "#534AB7" },
  solicitacao: { bg: "#E8ECF2", fg: "#6B7A90" },
  geral: { bg: "#D1FAE5", fg: "#05873C" },
};

interface Artigo {
  id: string;
  titulo: string;
  categoria: Categoria;
  descricao: string | null;
  solucao: string;
  tags: string[] | null;
  created_at: string;
}

interface BaseConhecimentoProps {
  filtroCategoria?: Categoria;
}

export default function BaseConhecimento({ filtroCategoria }: BaseConhecimentoProps) {
  const { perfil } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("geral");
  const [descricao, setDescricao] = useState("");
  const [solucao, setSolucao] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: artigos = [], isLoading } = useQuery({
    queryKey: ["posvenda-base-conhecimento", perfil?.loja_id],
    queryFn: async () => {
      const query = (supabase as any)
        .from("posvenda_base_conhecimento")
        .select("id, titulo, categoria, descricao, solucao, tags, created_at")
        .order("created_at", { ascending: false });
      if (perfil?.loja_id) {
        query.eq("loja_id", perfil.loja_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Artigo[];
    },
    enabled: !!perfil,
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      if (!titulo.trim() || !solucao.trim()) {
        throw new Error("Título e solução são obrigatórios");
      }
      const payload = {
        loja_id: perfil?.loja_id,
        titulo: titulo.trim(),
        categoria,
        descricao: descricao.trim() || null,
        solucao: solucao.trim(),
        tags: [],
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };
      const { error } = await (supabase as any)
        .from("posvenda_base_conhecimento")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artigo adicionado à base de conhecimento");
      qc.invalidateQueries({ queryKey: ["posvenda-base-conhecimento"] });
      setOpen(false);
      setTitulo("");
      setCategoria("geral");
      setDescricao("");
      setSolucao("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar artigo");
    },
  });

  const filtered = artigos.filter((a) => {
    const matchSearch =
      !search ||
      a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (a.descricao ?? "").toLowerCase().includes(search.toLowerCase()) ||
      a.solucao.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = !filtroCategoria || a.categoria === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #05873C" }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} color="#0D1117" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
            Base de Conhecimento
          </span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5" style={{ fontSize: 12 }}>
              <Plus size={13} />
              Novo artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontSize: 15, color: "#0D1117" }}>
                Novo Artigo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label style={{ fontSize: 11, color: "#6B7A90" }}>Título</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título do artigo"
                  style={{ fontSize: 13, marginTop: 4 }}
                />
              </div>
              <div>
                <Label style={{ fontSize: 11, color: "#6B7A90" }}>Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
                  <SelectTrigger style={{ fontSize: 13, marginTop: 4 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k} style={{ fontSize: 13 }}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ fontSize: 11, color: "#6B7A90" }}>Descrição do problema</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o problema recorrente..."
                  rows={2}
                  style={{ fontSize: 13, marginTop: 4 }}
                />
              </div>
              <div>
                <Label style={{ fontSize: 11, color: "#6B7A90" }}>Solução</Label>
                <Textarea
                  value={solucao}
                  onChange={(e) => setSolucao(e.target.value)}
                  placeholder="Descreva a solução passo a passo..."
                  rows={4}
                  style={{ fontSize: 13, marginTop: 4 }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                onClick={() => criarMutation.mutate()}
                disabled={criarMutation.isPending}
                style={{ fontSize: 12 }}
              >
                {criarMutation.isPending ? "Salvando..." : "Salvar artigo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="#6B7A90" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar soluções..."
            className="pl-9"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="px-5 pb-5">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 pb-5">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            {search ? "Nenhum artigo encontrado." : "Nenhum artigo cadastrado."}
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "#E8ECF2" }}>
          {filtered.map((artigo) => {
            const badge = CATEGORIA_BADGE[artigo.categoria] ?? CATEGORIA_BADGE.geral;
            const isExpanded = expandedId === artigo.id;

            return (
              <div
                key={artigo.id}
                className="px-5 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : artigo.id)}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                    {artigo.titulo}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 flex items-center gap-1"
                    style={{ fontSize: 10, backgroundColor: badge.bg, color: badge.fg }}
                  >
                    <Tag size={9} />
                    {CATEGORIA_LABEL[artigo.categoria]}
                  </span>
                </div>
                {artigo.descricao && (
                  <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }} className="truncate">
                    {artigo.descricao}
                  </p>
                )}
                {isExpanded && (
                  <div
                    className="mt-3 p-3 rounded-lg"
                    style={{ backgroundColor: "#F8FAFC", border: "0.5px solid #E8ECF2" }}
                  >
                    <p style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", marginBottom: 4 }}>
                      Solução
                    </p>
                    <p style={{ fontSize: 13, color: "#0D1117", whiteSpace: "pre-wrap" }}>
                      {artigo.solucao}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
