-- Isolamento entre tenants (ADR 0002). Rodar: pnpm exec supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- ------------------------------------------------------------------ cenário: Parceiros A e B, um Cliente em cada
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'parceiro-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'parceiro-b@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'novo@pgtap.dev', 'authenticated', 'authenticated');

insert into public.parceiros (id, nome, email_responsavel, usuario_id, assentos) values
  ('10000000-0000-0000-0000-00000000000a', 'Parceiro A', 'parceiro-a@pgtap.dev', '00000000-0000-0000-0000-00000000000a', 1),
  ('10000000-0000-0000-0000-00000000000b', 'Parceiro B', 'parceiro-b@pgtap.dev', '00000000-0000-0000-0000-00000000000b', 5);

insert into public.clientes (id, parceiro_id, usuario_id, email) values
  ('20000000-0000-0000-0000-0000000000ca', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev'),
  ('20000000-0000-0000-0000-0000000000cb', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev');

insert into public.posts (id, cliente_id, texto) values
  ('30000000-0000-0000-0000-0000000000ca', '20000000-0000-0000-0000-0000000000ca', 'segredo do cliente A'),
  ('30000000-0000-0000-0000-0000000000cb', '20000000-0000-0000-0000-0000000000cb', 'segredo do cliente B');

insert into public.convites (parceiro_id, email, token_hash, status) values
  ('10000000-0000-0000-0000-00000000000a', 'x@pgtap.dev', 'tok-a', 'enviado'),
  ('10000000-0000-0000-0000-00000000000b', 'y@pgtap.dev', 'tok-b', 'enviado'),
  ('10000000-0000-0000-0000-00000000000b', 'novo@pgtap.dev', 'tok-novo', 'enviado'),
  ('10000000-0000-0000-0000-00000000000b', 'cliente-a@pgtap.dev', 'tok-outro', 'enviado'),
  ('10000000-0000-0000-0000-00000000000a', 'novo@pgtap.dev', 'tok-sem-assento', 'enviado');
insert into public.convites (parceiro_id, email, token_hash, status, expira_em) values
  ('10000000-0000-0000-0000-00000000000b', 'velho@pgtap.dev', 'tok-velho', 'enviado', now() - interval '1 day');

insert into public.eventos (parceiro_id, nome) values ('10000000-0000-0000-0000-00000000000a', 'convite_enviado');

-- ------------------------------------------------------------------ Parceiro A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*) from public.posts), 0::bigint, 'Parceiro não lê Posts, nem dos próprios Clientes');
select is((select count(*) from public.clientes), 1::bigint, 'Parceiro lê só os próprios Clientes');
select is((select count(*) from public.convites), 2::bigint, 'Parceiro lê só os próprios Convites');
select is((select nome from public.parceiros), 'Parceiro A', 'Parceiro lê só o próprio cadastro');
select throws_ok('select * from public.eventos', '42501', null, 'Parceiro não lê eventos');
select throws_ok($$insert into public.convites (parceiro_id, email, token_hash) values ('10000000-0000-0000-0000-00000000000a', 'z@pgtap.dev', 'h')$$,
  '42501', null, 'Parceiro não cria Convite direto no banco');
select throws_ok($$update public.parceiros set assentos = 999$$, '42501', null, 'Parceiro não muda os próprios Assentos');
select is_empty($$update public.posts set texto = 'invadido' returning id$$, 'Parceiro não altera Posts');
select throws_ok($$select public.aceitar_convite('tok-a', '00000000-0000-0000-0000-00000000000a')$$, '42501', null, 'só o servidor aceita Convite');

-- ------------------------------------------------------------------ Cliente A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);

select results_eq('select texto from public.posts', $$values ('segredo do cliente A')$$, 'Cliente lê só os próprios Posts');
select is((select count(*) from public.clientes), 1::bigint, 'Cliente lê só a si mesmo');
select is((select count(*) from public.convites), 0::bigint, 'Cliente não lê Convites');
select is((select count(*) from public.parceiros), 0::bigint, 'Cliente não lê cadastro de Parceiro');
select is_empty($$update public.posts set texto = 'invadido' where id = '30000000-0000-0000-0000-0000000000cb' returning id$$, 'Cliente não altera Post de outro');
select throws_ok($$insert into public.posts (cliente_id, texto) values ('20000000-0000-0000-0000-0000000000cb', 'x')$$,
  '42501', null, 'Cliente não cria Post em nome de outro');
select lives_ok($$insert into public.posts (cliente_id, texto) values ('20000000-0000-0000-0000-0000000000ca', 'novo')$$, 'Cliente cria o próprio Post');
select throws_ok($$update public.posts set cliente_id = '20000000-0000-0000-0000-0000000000cb' where id = '30000000-0000-0000-0000-0000000000ca'$$,
  '42501', null, 'Cliente não transfere Post para outro');
select is((public.meu_acesso() -> 'cliente' ->> 'id'), '20000000-0000-0000-0000-0000000000ca', 'meu_acesso identifica o Cliente');

-- ------------------------------------------------------------------ anônimo
reset role;
set local role anon;
select throws_ok('select * from public.posts', '42501', null, 'anônimo não lê Posts');
select throws_ok('select * from public.clientes', '42501', null, 'anônimo não lê Clientes');

-- ------------------------------------------------------------------ aceite do Convite (servidor)
reset role;
set local role service_role;
select is(public.aceitar_convite('tok-velho', '00000000-0000-0000-0000-0000000000c2') ->> 'resultado', 'expirado', 'Convite vencido não entra');
select is(public.aceitar_convite('tok-outro', '00000000-0000-0000-0000-0000000000ca') ->> 'resultado', 'outro_parceiro', 'email ativo em outro Parceiro não entra');
select is(public.aceitar_convite('tok-sem-assento', '00000000-0000-0000-0000-0000000000c2') ->> 'resultado', 'sem_assento', 'sem Assento livre não entra');
select is(public.aceitar_convite('tok-novo', '00000000-0000-0000-0000-0000000000c2') ->> 'resultado', 'ok', 'Convite válido vira Cliente');

select * from finish();
rollback;
