-- Função para sincronizar expedições a partir de movimentações existentes
CREATE OR REPLACE FUNCTION public.sync_expedicoes_almoxarifado()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.expedicoes_almoxarifado (
        loja_id,
        contrato_id,
        requisicao_id,
        movimentacao_id,
        item_id,
        quantidade,
        status
    )
    SELECT 
        m.loja_id,
        m.contrato_id,
        m.requisicao_id, -- Assume que a coluna requisicao_id existe em estoque_movimentacoes ou tenta inferir
        m.id,
        m.item_id,
        m.quantidade,
        'separado'
    FROM public.estoque_movimentacoes m
    WHERE m.subtipo = 'separacao_requisicao'
      AND m.tipo = 'saida'
      AND NOT EXISTS (
          SELECT 1 FROM public.expedicoes_almoxarifado e 
          WHERE e.movimentacao_id = m.id
      );
END;
$$;
