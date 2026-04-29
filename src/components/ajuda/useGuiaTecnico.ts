import { useState, useCallback } from 'react';
import { guiaCategorias } from './guiaContent';

export const useGuiaTecnico = () => {
  const [busca, setBusca] = useState('');
  
  const filtrarConteudo = useCallback((termo: string) => {
    if (!termo) return guiaCategorias;
    
    return guiaCategorias.map(cat => ({
      ...cat,
      topicos: cat.topicos.filter(t => 
        t.pergunta.toLowerCase().includes(termo.toLowerCase()) || 
        t.resposta.toLowerCase().includes(termo.toLowerCase())
      )
    })).filter(cat => cat.topicos.length > 0);
  }, []);

  const resultados = filtrarConteudo(busca);

  return {
    busca,
    setBusca,
    resultados
  };
};
