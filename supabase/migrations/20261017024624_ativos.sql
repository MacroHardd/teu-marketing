-- Ativos do Cliente (M3, tratamento de imagem; ADR 0004). Cada Ativo é uma imagem enviada pelo Cliente:
-- o original fica no bucket `fotos` (<cliente_id>/ativos/<arquivo>.jpg) e o tratamento é uma receita aplicada
-- na hora (não destrutivo). Só o próprio Cliente lê e escreve: o Parceiro não vê Ativos (ADR 0002).

create table public.ativos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes on delete cascade,
  path text not null check (char_length(path) <= 300),
  -- metadado da imagem JÁ TRATADA (grade de luz e de detalhe): o Motor usa isto, nunca o pixel
  meta jsonb not null,
  -- receita do tratamento (corte, efeito, textura); '{}' = original
  receita jsonb not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, cliente_id)
);

create index ativos_cliente on public.ativos (cliente_id, criado_em desc);

create trigger ativos_atualizado_em before update on public.ativos
  for each row execute function public.toca_atualizado_em();

alter table public.ativos enable row level security;
revoke all on public.ativos from anon, authenticated;
grant select, insert, update, delete on public.ativos to authenticated;

create policy "cliente ativo lê os próprios ativos" on public.ativos for select to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo cria ativo" on public.ativos for insert to authenticated
  with check (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo edita os próprios ativos" on public.ativos for update to authenticated
  using (cliente_id = (select privado.meu_cliente_id()))
  with check (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo exclui os próprios ativos" on public.ativos for delete to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

-- o Post usa um Ativo do MESMO Cliente (chave composta); apagar o Ativo deixa o Post sem foto
alter table public.posts add column ativo_id uuid;
alter table public.posts add constraint posts_ativo_do_cliente
  foreign key (ativo_id, cliente_id) references public.ativos (id, cliente_id) on delete set null (ativo_id);
create index posts_ativo on public.posts (ativo_id) where ativo_id is not null;
