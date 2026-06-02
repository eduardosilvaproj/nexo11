import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ArrowLeft,
  BookOpen,
  ShoppingCart,
  FileText,
  Wrench,
  Factory,
  Truck,
  HardHat,
  HeadphonesIcon,
  DollarSign,
  Package,
  Users,
  UserCircle,
  BarChart3,
  Compass,
} from "lucide-react";

interface Artigo {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  criado_em: string;
}

const CATEGORIAS = [
  { id: "primeiros-passos", label: "Primeiros Passos", icon: Compass },
  { id: "comercial", label: "Comercial", icon: ShoppingCart },
  { id: "contratos", label: "Contratos", icon: FileText },
  { id: "tecnico", label: "Técnico", icon: Wrench },
  { id: "producao", label: "Produção", icon: Factory },
  { id: "logistica", label: "Logística", icon: Truck },
  { id: "montagem", label: "Montagem", icon: HardHat },
  { id: "pos-venda", label: "Pós-venda", icon: HeadphonesIcon },
  { id: "comissoes", label: "Comissões", icon: DollarSign },
  { id: "compras", label: "Compras", icon: Package },
  { id: "rh", label: "RH", icon: Users },
  { id: "equipe", label: "Equipe", icon: UserCircle },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function renderMarkdown(text: string): string {
  let html = text
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2" style="color:#0D1117">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2" style="color:#0D1117">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2" style="color:#0D1117">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm" style="color:#0D1117">$1</li>')
    // Paragraphs (lines that aren't already HTML)
    .replace(/^(?!<[hl]|<li)(.+)$/gm, '<p class="text-sm mb-2" style="color:#0D1117">$1</p>');

  // Wrap consecutive li elements in ul
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');
  return html;
}

export default function Ajuda() {
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [selectedArtigo, setSelectedArtigo] = useState<Artigo | null>(null);

  const { data: artigos = [] } = useQuery({
    queryKey: ["ajuda-artigos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ajuda_artigos")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as Artigo[];
    },
  });

  const filteredArtigos = artigos.filter((a) => {
    if (selectedCategoria && a.categoria !== selectedCategoria) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.titulo.toLowerCase().includes(q) || a.conteudo.toLowerCase().includes(q);
    }
    return true;
  });

  const artigosPorCategoria = (catId: string) =>
    artigos.filter((a) => a.categoria === catId).length;

  // Article detail view
  if (selectedArtigo) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedArtigo(null)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h1 className="text-xl font-bold mb-4" style={{ color: "#0D1117" }}>
              {selectedArtigo.titulo}
            </h1>
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedArtigo.conteudo) }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Category article list
  if (selectedCategoria) {
    const catLabel = CATEGORIAS.find((c) => c.id === selectedCategoria)?.label || selectedCategoria;
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCategoria(null)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold" style={{ color: "#0D1117" }}>{catLabel}</h1>

        {filteredArtigos.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#6B7A90" }} />
              <p className="text-sm" style={{ color: "#6B7A90" }}>
                Em breve teremos conteúdo aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredArtigos.map((artigo) => (
              <Card
                key={artigo.id}
                className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedArtigo(artigo)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm" style={{ color: "#0D1117" }}>
                    {artigo.titulo}
                  </h3>
                  <p className="text-xs mt-1 truncate" style={{ color: "#6B7A90" }}>
                    {artigo.conteudo.slice(0, 120)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main grid view
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1117" }}>
            Central de Ajuda
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7A90" }}>
            Encontre respostas, tutoriais e guias de uso
          </p>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={() => {
          // Navigate to current page tour - emits custom event
          window.dispatchEvent(new CustomEvent("start-guided-tour"));
        }}>
          <Compass className="w-4 h-4" /> Iniciar Tour
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7A90" }} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar artigos..."
          className="pl-10"
        />
      </div>

      {/* Search results */}
      {search && (
        <div className="space-y-2">
          {filteredArtigos.length === 0 ? (
            <p className="text-sm" style={{ color: "#6B7A90" }}>Nenhum artigo encontrado para "{search}"</p>
          ) : (
            filteredArtigos.map((artigo) => (
              <Card
                key={artigo.id}
                className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedArtigo(artigo)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm" style={{ color: "#0D1117" }}>
                    {artigo.titulo}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "#6B7A90" }}>
                    {artigo.conteudo.slice(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Categories Grid */}
      {!search && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const count = artigosPorCategoria(cat.id);
            return (
              <Card
                key={cat.id}
                className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCategoria(cat.id)}
              >
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: "#EFF8FF" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#1E6FBF" }} />
                  </div>
                  <h3 className="text-sm font-medium" style={{ color: "#0D1117" }}>{cat.label}</h3>
                  <p className="text-xs mt-1" style={{ color: "#6B7A90" }}>
                    {count} {count === 1 ? "artigo" : "artigos"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
