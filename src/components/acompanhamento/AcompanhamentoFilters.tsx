import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface AcompanhamentoFiltersProps {
  filters: { search: string; area: string; status: string; aprovado: string };
  onFilterChange: (filters: any) => void;
}

export default function AcompanhamentoFilters({ filters, onFilterChange }: AcompanhamentoFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar módulo..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.area} onValueChange={(v) => updateFilter('area', v)}>
        <SelectTrigger><SelectValue placeholder="Todas as áreas" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          <SelectItem value="Início">Início</SelectItem>
          <SelectItem value="Operação">Operação</SelectItem>
          <SelectItem value="Gestão">Gestão</SelectItem>
          <SelectItem value="Inteligência">Inteligência</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
          <SelectItem value="em_andamento">Em andamento</SelectItem>
          <SelectItem value="em_revisao">Em revisão</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
          <SelectItem value="pausado">Pausado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.aprovado} onValueChange={(v) => updateFilter('aprovado', v)}>
        <SelectTrigger><SelectValue placeholder="Aprovação" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Aprovação: Todos</SelectItem>
          <SelectItem value="true">Aprovados</SelectItem>
          <SelectItem value="false">Pendentes</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
