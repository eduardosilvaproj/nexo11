import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AcompanhamentoHeader from '@/components/acompanhamento/AcompanhamentoHeader';
import AcompanhamentoResumoCards from '@/components/acompanhamento/AcompanhamentoResumoCards';
import AcompanhamentoFilters from '@/components/acompanhamento/AcompanhamentoFilters';
import AcompanhamentoModuloCard from '@/components/acompanhamento/AcompanhamentoModuloCard';
import AcompanhamentoModuloDrawer from '@/components/acompanhamento/AcompanhamentoModuloDrawer';

const AcompanhamentoCriacao = () => {
  const [selectedModulo, setSelectedModulo] = React.useState<any>(null);
  const [filters, setFilters] = React.useState({ search: '', area: 'all', status: 'all', aprovado: 'all' });

  const { data: modulos, refetch, isLoading } = useQuery({
    queryKey: ['acompanhamento_modulos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('acompanhamento_modulos').select('*').order('ordem');
      if (error) throw error;
      return data;
    }
  });

  const filteredModulos = modulos?.filter(m => {
    return (
      (filters.search === '' || m.nome.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.area === 'all' || m.area === filters.area) &&
      (filters.status === 'all' || m.status === filters.status) &&
      (filters.aprovado === 'all' || (filters.aprovado === 'true' ? m.aprovado : !m.aprovado))
    );
  });

  return (
    <div className="space-y-7">
      <AcompanhamentoHeader onReload={refetch} />
      <AcompanhamentoResumoCards modulos={modulos || []} />
      <AcompanhamentoFilters filters={filters} onFilterChange={setFilters} />

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
          Carregando módulos...
        </div>
      ) : filteredModulos?.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm">
          Nenhum módulo encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredModulos?.map(modulo => (
            <AcompanhamentoModuloCard key={modulo.id} modulo={modulo} onEdit={() => setSelectedModulo(modulo)} />
          ))}
        </div>
      )}

      <AcompanhamentoModuloDrawer 
        modulo={selectedModulo} 
        isOpen={!!selectedModulo} 
        onClose={() => setSelectedModulo(null)} 
        onSave={() => { setSelectedModulo(null); refetch(); }}
      />
    </div>
  );
};

export default AcompanhamentoCriacao;
