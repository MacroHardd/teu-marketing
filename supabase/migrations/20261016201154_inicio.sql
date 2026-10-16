-- Teu Marketing: tenancy (ADR 0002). RLS é a fronteira entre Parceiros e entre Clientes.
-- O Parceiro lê só os próprios Convites e Clientes (Uso). Nunca lê Posts nem fotos.
-- Escritas sensíveis (criar Convite, aceitar, desativar, eventos) só pelo servidor (service_role).

create extension if not exists citext with schema extensions;

-- Funções auxiliares das políticas. Ficam fora do schema exposto pela API.
create schema if not exists privado;
grant usage on schema privado to authenticated, service_role;

-- ------------------------------------------------------------------ Parceiro
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  email_responsavel extensions.citext not null unique,
  usuario_id uuid unique references auth.users on delete set null,
  assentos int not null check (assentos >= 0),
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------------ Cliente (ocupa um Assento enquanto ativo)
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros on delete restrict,
  usuario_id uuid not null references auth.users on delete cascade,
  email extensions.citext not null,
  ativo boolean not null default true,
  aceito_em timestamptz not null default now(),
  desativado_em timestamptz,
  ultimo_acesso_em timestamptz
);
-- o mesmo email não pode estar ativo em dois Parceiros
create unique index clientes_email_ativo on public.clientes (email) where ativo;
create unique index clientes_usuario_ativo on public.clientes (usuario_id) where ativo;
create index clientes_parceiro on public.clientes (parceiro_id);

-- ------------------------------------------------------------------ Convite
create type public.convite_status as enum ('agendado', 'enviado', 'aceito', 'expirado', 'cancelado');

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros on delete cascade,
  email extensions.citext not null,
  -- só o hash do token fica no banco; o token vai no link do email
  token_hash text not null unique,
  status public.convite_status not null default 'agendado',
  origem text not null default 'manual' check (origem in ('manual', 'planilha')),
  lote_id uuid,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  expira_em timestamptz not null default now() + interval '7 days',
  aceito_em timestamptz,
  cliente_id uuid references public.clientes on delete set null
);
-- um Convite em aberto por email em cada Parceiro (o reenvio troca o token do mesmo Convite)
create unique index convites_em_aberto on public.convites (parceiro_id, email) where status in ('agendado', 'enviado');
create index convites_parceiro on public.convites (parceiro_id);

-- ------------------------------------------------------------------ Post (conteúdo do Cliente: o Parceiro nunca lê)
create type public.post_status as enum ('rascunho', 'exportado');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes on delete cascade,
  texto text not null default '',
  estilo text,
  variacao text,
  ajustes jsonb not null default '{}',
  legenda text not null default '',
  status public.post_status not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  exportado_em timestamptz
);
create index posts_cliente on public.posts (cliente_id, atualizado_em desc);

-- ------------------------------------------------------------------ eventos (telemetria: nunca conteúdo do Cliente)
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  ocorrido_em timestamptz not null default now(),
  parceiro_id uuid not null references public.parceiros on delete cascade,
  cliente_id uuid references public.clientes on delete cascade,
  post_id uuid,
  sessao_id uuid,
  nome text not null check (nome in (
    'convite_enviado', 'convite_aceito', 'convite_expirado', 'perfil_atualizado', 'editor_aberto',
    'editor_inativo', 'post_criado', 'estilo_sugerido', 'estilo_trocado', 'variacao_trocada',
    'ajuste_aplicado', 'trava_disparada', 'trava_resolvida', 'foto_enviada', 'post_exportado',
    'legenda_copiada', 'post_duplicado', 'post_excluido', 'cliente_desativado', 'erro_motor'
  )),
  props jsonb not null default '{}',
  versao_app text
);
create index eventos_parceiro_nome on public.eventos (parceiro_id, nome, ocorrido_em);

-- ------------------------------------------------------------------ quem é quem (usadas nas políticas)
create function privado.meu_parceiro_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.parceiros where usuario_id = (select auth.uid())
$$;

create function privado.meu_cliente_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.clientes where usuario_id = (select auth.uid()) and ativo
$$;

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated, service_role;

-- ------------------------------------------------------------------ RLS
alter table public.parceiros enable row level security;
alter table public.clientes enable row level security;
alter table public.convites enable row level security;
alter table public.posts enable row level security;
alter table public.eventos enable row level security;

revoke all on public.parceiros, public.clientes, public.convites, public.posts, public.eventos from anon, authenticated;
grant select on public.parceiros, public.clientes, public.convites to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
-- eventos: sem grant para anon/authenticated. Só o servidor grava e só o Admin lê.

create policy "parceiro lê o próprio cadastro" on public.parceiros for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "cliente lê a si mesmo; parceiro lê os próprios clientes" on public.clientes for select to authenticated
  using (usuario_id = (select auth.uid()) or parceiro_id = (select privado.meu_parceiro_id()));

create policy "parceiro lê os próprios convites" on public.convites for select to authenticated
  using (parceiro_id = (select privado.meu_parceiro_id()));

create policy "cliente ativo lê os próprios posts" on public.posts for select to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo cria post" on public.posts for insert to authenticated
  with check (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo edita os próprios posts" on public.posts for update to authenticated
  using (cliente_id = (select privado.meu_cliente_id()))
  with check (cliente_id = (select privado.meu_cliente_id()));

create policy "cliente ativo exclui os próprios posts" on public.posts for delete to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

create function public.toca_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger posts_atualizado_em before update on public.posts
  for each row execute function public.toca_atualizado_em();

-- ------------------------------------------------------------------ acesso: o que o usuário logado é
create function public.meu_acesso() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'parceiro', (select jsonb_build_object('id', p.id, 'nome', p.nome) from public.parceiros p
                 where p.usuario_id = (select auth.uid())),
    'cliente', (select jsonb_build_object('id', c.id, 'ativo', c.ativo) from public.clientes c
                where c.usuario_id = (select auth.uid()) order by c.ativo desc, c.aceito_em desc limit 1)
  )
$$;
revoke execute on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated;

-- ------------------------------------------------------------------ aceite do Convite (só o servidor chama)
-- Regras: Convite válido e no prazo; email não ativo em outro Parceiro; Assento livre.
create function public.aceitar_convite(p_token_hash text, p_usuario_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  cv public.convites;
  pa public.parceiros;
  cl public.clientes;
  usados int;
begin
  select * into cv from public.convites where token_hash = p_token_hash for update;
  if not found or cv.status = 'cancelado' then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if cv.status = 'aceito' then
    select * into cl from public.clientes where id = cv.cliente_id;
    if found and cl.usuario_id = p_usuario_id and cl.ativo then
      return jsonb_build_object('resultado', 'ok', 'cliente_id', cl.id, 'email', cv.email);
    end if;
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if cv.status = 'expirado' or cv.expira_em < now() then
    update public.convites set status = 'expirado' where id = cv.id;
    return jsonb_build_object('resultado', 'expirado');
  end if;

  if exists (select 1 from public.clientes where email = cv.email and ativo and parceiro_id <> cv.parceiro_id) then
    return jsonb_build_object('resultado', 'outro_parceiro');
  end if;

  -- já é Cliente ativo deste Parceiro (ex.: Convite reenviado): só fecha o Convite
  select * into cl from public.clientes where email = cv.email and ativo and parceiro_id = cv.parceiro_id;
  if not found then
    select * into pa from public.parceiros where id = cv.parceiro_id for update;
    select count(*) into usados from public.clientes where parceiro_id = pa.id and ativo;
    if usados >= pa.assentos then
      return jsonb_build_object('resultado', 'sem_assento');
    end if;
    insert into public.clientes (parceiro_id, usuario_id, email)
      values (cv.parceiro_id, p_usuario_id, cv.email) returning * into cl;
  end if;

  update public.convites set status = 'aceito', aceito_em = now(), cliente_id = cl.id where id = cv.id;
  insert into public.eventos (parceiro_id, cliente_id, nome, props)
    values (cv.parceiro_id, cl.id, 'convite_aceito', jsonb_build_object(
      'horas_desde_envio', round(extract(epoch from now() - coalesce(cv.enviado_em, cv.criado_em)) / 3600.0, 1)));
  return jsonb_build_object('resultado', 'ok', 'cliente_id', cl.id, 'email', cv.email);
end $$;
revoke execute on function public.aceitar_convite(text, uuid) from public, anon, authenticated;
grant execute on function public.aceitar_convite(text, uuid) to service_role;
