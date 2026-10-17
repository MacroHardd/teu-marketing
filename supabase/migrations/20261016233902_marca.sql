-- Perfil de Marca do Cliente (M3). Todos os campos são opcionais. Só o próprio Cliente lê e escreve:
-- o Parceiro não vê o Perfil (é conteúdo do Cliente, como os Posts; ADR 0002).

create table public.perfis_marca (
  cliente_id uuid primary key references public.clientes on delete cascade,
  nome text not null default '' check (char_length(nome) <= 60),
  arroba text not null default '' check (char_length(arroba) <= 31),
  cor text check (cor ~ '^#[0-9a-f]{6}$'),
  contato text not null default '' check (char_length(contato) <= 60),
  hashtags text not null default '' check (char_length(hashtags) <= 500),
  -- logo no bucket `fotos`, em <cliente_id>/marca/<arquivo>.png; logo_meta = {largura, altura}
  logo_path text,
  logo_meta jsonb,
  atualizado_em timestamptz not null default now()
);

create trigger perfis_marca_atualizado_em before update on public.perfis_marca
  for each row execute function public.toca_atualizado_em();

alter table public.perfis_marca enable row level security;
revoke all on public.perfis_marca from anon, authenticated;
grant select, insert, update on public.perfis_marca to authenticated;

create policy "cliente ativo lê o próprio perfil" on public.perfis_marca for select to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo cria o próprio perfil" on public.perfis_marca for insert to authenticated
  with check (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo edita o próprio perfil" on public.perfis_marca for update to authenticated
  using (cliente_id = (select privado.meu_cliente_id()))
  with check (cliente_id = (select privado.meu_cliente_id()));

-- logo precisa de transparência: o bucket passa a aceitar PNG (as políticas por pasta do Cliente já valem)
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png'] where id = 'fotos';
