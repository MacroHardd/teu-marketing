-- Cliente direto e Assinatura (ADR 0005). Quem assina sozinho vira Cliente do "Parceiro da casa"
-- (parceiros.direto). Nada do fluxo do Parceiro muda: a Assinatura só liga e desliga clientes.ativo.
-- Escritas só pelo servidor (service_role): webhook do Asaas, cron diário e cancelamento.

-- ------------------------------------------------------------------ Parceiro da casa
alter table public.parceiros add column direto boolean not null default false;
create unique index parceiros_um_direto on public.parceiros (direto) where direto;

-- sem usuario_id: ninguém abre o painel dele. Assentos não se aplicam (a Assinatura é o limite).
insert into public.parceiros (nome, email_responsavel, assentos, direto)
values ('Teu Marketing', 'direto@teumarketing.com.br', 0, true);

create function privado.parceiro_direto_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.parceiros where direto
$$;
revoke execute on function privado.parceiro_direto_id() from public, anon;
grant execute on function privado.parceiro_direto_id() to authenticated, service_role;

-- ------------------------------------------------------------------ Assinatura
create type public.assinatura_plano as enum ('mensal', 'anual');
-- pendente: esperando o 1º pagamento · ativa · atrasada: pagamento vencido, acesso até pago_ate + 3 dias
-- cancelada: não renova, acesso até pago_ate + 3 dias · encerrada: sem acesso
create type public.assinatura_status as enum ('pendente', 'ativa', 'atrasada', 'cancelada', 'encerrada');

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  plano public.assinatura_plano not null,
  status public.assinatura_status not null default 'pendente',
  cliente_id uuid references public.clientes on delete set null,
  asaas_cliente_id text,
  asaas_assinatura_id text unique,
  pago_ate timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  cancelada_em timestamptz,
  encerrada_em timestamptz
);
-- uma Assinatura cobrando por email
create unique index assinaturas_cobrando on public.assinaturas (email) where status in ('ativa', 'atrasada');
create index assinaturas_cliente on public.assinaturas (cliente_id);

create trigger assinaturas_atualizado_em before update on public.assinaturas
  for each row execute function public.toca_atualizado_em();

alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;

create policy "cliente ativo lê as próprias assinaturas" on public.assinaturas for select to authenticated
  using (cliente_id = (select privado.meu_cliente_id()));

-- webhooks já processados (idempotência: o Asaas entrega "pelo menos uma vez")
create table public.pagamento_eventos (
  id text primary key,
  tipo text not null,
  recebido_em timestamptz not null default now()
);
alter table public.pagamento_eventos enable row level security;
revoke all on public.pagamento_eventos from anon, authenticated;

-- ------------------------------------------------------------------ eventos novos
alter table public.eventos drop constraint eventos_nome_check;
alter table public.eventos add constraint eventos_nome_check check (nome in (
  'convite_enviado', 'convite_aceito', 'convite_expirado', 'perfil_atualizado', 'editor_aberto',
  'editor_inativo', 'post_criado', 'estilo_sugerido', 'estilo_trocado', 'variacao_trocada',
  'ajuste_aplicado', 'trava_disparada', 'trava_resolvida', 'foto_enviada', 'post_exportado',
  'legenda_copiada', 'post_duplicado', 'post_excluido', 'cliente_desativado', 'erro_motor',
  'ativo_enviado', 'tratamento_aplicado', 'ativo_excluido',
  'assinatura_iniciada', 'assinatura_ativada', 'assinatura_cancelada', 'assinatura_encerrada'
));

-- ------------------------------------------------------------------ meu_acesso: diz se o Cliente é direto
create or replace function public.meu_acesso() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'parceiro', (select jsonb_build_object('id', p.id, 'nome', p.nome) from public.parceiros p
                 where p.usuario_id = (select auth.uid())),
    'cliente', (select jsonb_build_object('id', c.id, 'ativo', c.ativo, 'direto', c.parceiro_id = (select privado.parceiro_direto_id()))
                from public.clientes c
                where c.usuario_id = (select auth.uid()) order by c.ativo desc, c.aceito_em desc limit 1)
  )
$$;

-- ------------------------------------------------------------------ pagamento confirmado (só o servidor chama)
-- 1º pagamento: cria o Cliente direto, ou traz para o Parceiro da casa o Cliente que o usuário já teve
-- (ex-Cliente de Parceiro, desativado), com Posts e Ativos. Renovação: estende pago_ate e reativa se preciso.
-- Cliente ativo de um Parceiro de verdade nunca é tirado dele.
create function public.pagamento_confirmado(p_assinatura uuid, p_usuario_id uuid, p_pago_ate timestamptz) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  a public.assinaturas;
  cl public.clientes;
  casa uuid := (select id from public.parceiros where direto);
  primeira boolean;
  migrou boolean := false;
begin
  select * into a from public.assinaturas where id = p_assinatura for update;
  if not found then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if exists (select 1 from public.clientes where email = a.email and ativo and parceiro_id <> casa) then
    return jsonb_build_object('resultado', 'outro_parceiro');
  end if;
  -- encerrada por migração para um Parceiro: não volta
  if a.status = 'encerrada' and a.cliente_id is not null
     and exists (select 1 from public.clientes where id = a.cliente_id and parceiro_id <> casa) then
    return jsonb_build_object('resultado', 'outro_parceiro');
  end if;

  primeira := a.status = 'pendente';

  select * into cl from public.clientes
    where id = a.cliente_id or usuario_id = p_usuario_id
    order by (id = a.cliente_id) desc nulls last, ativo desc, aceito_em desc limit 1;
  if found then
    migrou := cl.parceiro_id <> casa;
    update public.clientes set parceiro_id = casa, ativo = true, desativado_em = null
      where id = cl.id returning * into cl;
  else
    insert into public.clientes (parceiro_id, usuario_id, email)
      values (casa, p_usuario_id, a.email) returning * into cl;
  end if;

  update public.assinaturas
    set status = 'ativa', cliente_id = cl.id, encerrada_em = null,
        pago_ate = greatest(coalesce(pago_ate, p_pago_ate), p_pago_ate)
    where id = a.id;
  -- outra Assinatura antiga do mesmo Cliente (ex.: cancelada e assinou de novo) fecha
  update public.assinaturas set status = 'encerrada', encerrada_em = now()
    where cliente_id = cl.id and id <> a.id and status <> 'encerrada';

  if primeira then
    insert into public.eventos (parceiro_id, cliente_id, nome, props)
      values (casa, cl.id, 'assinatura_ativada', jsonb_build_object('plano', a.plano, 'migrou', migrou));
  end if;
  return jsonb_build_object('resultado', 'ok', 'cliente_id', cl.id, 'primeira', primeira, 'migrou', migrou);
end $$;

-- ------------------------------------------------------------------ encerrar (reembolso, chargeback, vencida)
create function public.encerrar_assinatura(p_assinatura uuid, p_motivo text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  a public.assinaturas;
  casa uuid := (select id from public.parceiros where direto);
begin
  if p_motivo not in ('vencida', 'reembolso') then
    raise exception 'motivo inválido: %', p_motivo;
  end if;
  update public.assinaturas set status = 'encerrada', encerrada_em = now()
    where id = p_assinatura and status <> 'encerrada' returning * into a;
  if not found then
    return;
  end if;
  -- só desliga se o Cliente ainda é direto (se migrou para um Parceiro, o acesso é do Parceiro)
  update public.clientes set ativo = false, desativado_em = now()
    where id = a.cliente_id and parceiro_id = casa and ativo;
  insert into public.eventos (parceiro_id, cliente_id, nome, props)
    values (casa, a.cliente_id, 'assinatura_encerrada', jsonb_build_object('plano', a.plano, 'motivo', p_motivo));
end $$;

-- cron diário: acesso vale até pago_ate + 3 dias
create function public.encerrar_assinaturas_vencidas() returns int
language plpgsql security invoker set search_path = '' as $$
declare
  a record;
  n int := 0;
begin
  for a in select id from public.assinaturas
           where status in ('ativa', 'atrasada', 'cancelada') and pago_ate + interval '3 days' < now() loop
    perform public.encerrar_assinatura(a.id, 'vencida');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------------------ aceite do Convite: Cliente direto migra
-- Igual ao anterior, mais um caso: email ativo no Parceiro da casa passa para este Parceiro (precisa de
-- Assento), com Posts e Ativos; a Assinatura fecha e o servidor cancela no Asaas (`cancelar_asaas`).
create or replace function public.aceitar_convite(p_token_hash text, p_usuario_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  cv public.convites;
  pa public.parceiros;
  cl public.clientes;
  usados int;
  casa uuid := (select id from public.parceiros where direto);
  cancelar text[] := '{}';
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

  if exists (select 1 from public.clientes where email = cv.email and ativo and parceiro_id <> cv.parceiro_id
             and parceiro_id is distinct from casa) then
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
    select * into cl from public.clientes where email = cv.email and ativo and parceiro_id = casa;
    if found then
      update public.clientes set parceiro_id = cv.parceiro_id where id = cl.id returning * into cl;
      with fechadas as (
        update public.assinaturas set status = 'encerrada', encerrada_em = now()
          where cliente_id = cl.id and status <> 'encerrada' returning asaas_assinatura_id, plano
      ), ev as (
        insert into public.eventos (parceiro_id, cliente_id, nome, props)
          select casa, cl.id, 'assinatura_encerrada', jsonb_build_object('plano', plano, 'motivo', 'parceiro') from fechadas
      )
      select coalesce(array_agg(asaas_assinatura_id) filter (where asaas_assinatura_id is not null), '{}') into cancelar from fechadas;
    else
      insert into public.clientes (parceiro_id, usuario_id, email)
        values (cv.parceiro_id, p_usuario_id, cv.email) returning * into cl;
    end if;
  end if;

  update public.convites set status = 'aceito', aceito_em = now(), cliente_id = cl.id where id = cv.id;
  insert into public.eventos (parceiro_id, cliente_id, nome, props)
    values (cv.parceiro_id, cl.id, 'convite_aceito', jsonb_build_object(
      'horas_desde_envio', round(extract(epoch from now() - coalesce(cv.enviado_em, cv.criado_em)) / 3600.0, 1)));
  return jsonb_build_object('resultado', 'ok', 'cliente_id', cl.id, 'email', cv.email, 'cancelar_asaas', to_jsonb(cancelar));
end $$;

revoke execute on function public.pagamento_confirmado(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.encerrar_assinatura(uuid, text) from public, anon, authenticated;
revoke execute on function public.encerrar_assinaturas_vencidas() from public, anon, authenticated;
revoke execute on function public.aceitar_convite(text, uuid) from public, anon, authenticated;
grant execute on function public.pagamento_confirmado(uuid, uuid, timestamptz) to service_role;
grant execute on function public.encerrar_assinatura(uuid, text) to service_role;
grant execute on function public.encerrar_assinaturas_vencidas() to service_role;
grant execute on function public.aceitar_convite(text, uuid) to service_role;
