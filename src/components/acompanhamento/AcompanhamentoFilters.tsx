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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar módulo..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-9 focus:bg-white"
          />
        </div>

        <Select value={filters.area} onValueChange={(v) => updateFilter('area', v)}>
          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            <SelectItem value="Início">Início</SelectItem>
            <SelectItem value="Operação">Operação</SelectItem>
            <SelectItem value="Gestão">Gestão</SelectItem>
            <SelectItem value="Inteligência">Inteligência</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
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
          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white">
            <SelectValue placeholder="Aprovação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Aprovação: Todos</SelectItem>
            <SelectItem value="true">Aprovados</SelectItem>
            <SelectItem value="false">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
