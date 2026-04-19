create table if not exists public.orcamentos_promob (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references public.lojas(id) on delete cascade,
  contrato_id     uuid references public.contratos(id) on delete set null,
  cliente_nome    text,
  ordem_compra    text,
  arquivo_nome    text,
  total_tabela    numeric(12,2),
  total_pedido    numeric(12,2),
  total_orcamento numeric(12,2),
  categorias      jsonb default '[]'::jsonb,
  itens           jsonb default '[]'::jsonb,
  acrescimos      jsonb default '[]'::jsonb,
  valor_negociado numeric(12,2),
  desconto_global numeric(5,2) default 0,
  status          text not null default 'rascunho',
  criado_por      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_orcamentos_promob_loja on public.orcamentos_promob(loja_id);
create index if not exists idx_orcamentos_promob_contrato on public.orcamentos_promob(contrato_id);

alter table public.orcamentos_promob enable row level security;

create policy "Orcamentos promob visiveis por loja/papel"
on public.orcamentos_promob for select
to authenticated
using (
  has_role(auth.uid(), 'franqueador'::app_role)
  or (
    loja_id = current_loja_id()
    and (
      has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'gerente'::app_role)
      or has_role(auth.uid(), 'vendedor'::app_role)
    )
  )
);

create policy "Orcamentos promob insert por papeis"
on public.orcamentos_promob for insert
to authenticated
with check (
  loja_id = current_loja_id()
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'gerente'::app_role)
    or has_role(auth.uid(), 'vendedor'::app_role)
  )
);

create policy "Orcamentos promob update por papeis"
on public.orcamentos_promob for update
to authenticated
using (
  loja_id = current_loja_id()
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'gerente'::app_role)
    or has_role(auth.uid(), 'vendedor'::app_role)
  )
)
with check (
  loja_id = current_loja_id()
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'gerente'::app_role)
    or has_role(auth.uid(), 'vendedor'::app_role)
  )
);

create policy "Orcamentos promob delete por gerente/admin"
on public.orcamentos_promob for delete
to authenticated
using (
  loja_id = current_loja_id()
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'gerente'::app_role)
  )
);

create trigger trg_orcamentos_promob_updated_at
before update on public.orcamentos_promob
for each row execute function public.set_updated_at();