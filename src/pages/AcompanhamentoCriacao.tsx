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
  const [filters, setFilters] = React.useState({ search: '', area: '', status: '', aprovado: '' });

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
      (filters.area === '' || m.area === filters.area) &&
      (filters.status === '' || m.status === filters.status) &&
      (filters.aprovado === '' || (filters.aprovado === 'true' ? m.aprovado : !m.aprovado))
    );
  });

  return (
    <div className="p-6 space-y-6">
      <AcompanhamentoHeader onReload={refetch} />
      <AcompanhamentoResumoCards modulos={modulos || []} />
      <AcompanhamentoFilters filters={filters} onFilterChange={setFilters} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModulos?.map(modulo => (
          <AcompanhamentoModuloCard key={modulo.id} modulo={modulo} onEdit={() => setSelectedModulo(modulo)} />
        ))}
      </div>

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
