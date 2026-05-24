import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AlmoxarifadoStats } from "@/components/almoxarifado/AlmoxarifadoStats";
import { AlmoxarifadoTable } from "@/components/almoxarifado/AlmoxarifadoTable";
import { ItemFormDialog } from "@/components/almoxarifado/ItemFormDialog";
import { toast } from "sonner";
import { canPerform } from "@/lib/permissions";

export default function Almoxarifado() {
  const { perfil, roles, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["estoque_itens", perfil?.loja_id, search, filter],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      let query = supabase
        .from("estoque_itens")
        .select("*")
        .eq("loja_id", perfil?.loja_id)
        .order("descricao");

      if (search) {
        query = query.or(`descricao.ilike.%${search}%,codigo.ilike.%${search}%,categoria.ilike.%${search}%`);
      }

      if (filter === "inativos") {
        query = query.eq("ativo", false);
      } else {
        query = query.eq("ativo", true);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Erro ao carregar estoque");
        throw error;
      }

      let filteredData = data || [];

      if (filter === "baixo_estoque") {
        filteredData = filteredData.filter(item => (item.quantidade_total || 0) <= (item.estoque_minimo || 0));
      } else if (filter === "sem_estoque") {
        filteredData = filteredData.filter(item => (item.quantidade_total || 0) <= 0);
      }

      return filteredData;
    },
  });

  if (authLoading) return <div className="p-8 text-center">Carregando permissões...</div>;

  if (!perfil?.loja_id) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Loja não identificada</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Não foi possível identificar a loja vinculada ao seu usuário. 
          Entre em contato com o administrador para configurar seu acesso.
        </p>
      </div>
    );
  }

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleNewItem = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-blue-600" />
            NEXO Almoxarifado
          </h1>
          <p className="text-slate-500">Controle de itens, saldos e movimentações de estoque.</p>
        </div>
        {canPerform(roles, "almoxarifado.manage") && (
          <Button onClick={handleNewItem} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={18} className="mr-2" />
            Novo Item
          </Button>
        )}
      </div>

      <AlmoxarifadoStats items={items} />

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar por descrição, código ou categoria..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-slate-400" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ativos</SelectItem>
              <SelectItem value="baixo_estoque">Baixo estoque</SelectItem>
              <SelectItem value="sem_estoque">Sem estoque</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AlmoxarifadoTable 
        items={items} 
        isLoading={isLoading} 
        onEdit={handleEditItem}
        onRefresh={refetch}
      />

      <ItemFormDialog 
        open={isItemDialogOpen} 
        onOpenChange={setIsItemDialogOpen}
        item={selectedItem}
        onSuccess={refetch}
        lojaId={perfil.loja_id}
      />
    </div>
  );
}
