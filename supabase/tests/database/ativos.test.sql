-- Ativos: só o próprio Cliente ativo lê e escreve; Parceiro e outros Clientes, nada (ADR 0002).
-- Post só usa Ativo do mesmo Cliente; apagar o Ativo deixa o Post sem foto.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'parceiro-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev', 'authenticated', 'authenticated');
insert into public.parceiros (id, nome, email_responsavel, usuario_id, assentos) values
  ('10000000-0000-0000-0000-00000000000a', 'Parceiro A', 'parceiro-a@pgtap.dev', '00000000-0000-0000-0000-00000000000a', 5);
insert into public.clientes (id, parceiro_id, usuario_id, email) values
  ('20000000-0000-0000-0000-0000000000ca', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev'),
  ('20000000-0000-0000-0000-0000000000cb', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev');
insert into public.ativos (id, cliente_id, path, meta) values
  ('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000cb', '20000000-0000-0000-0000-0000000000cb/ativos/b.jpg', '{}');
insert into public.posts (id, cliente_id, texto) values
  ('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000ca', 'post A');

select is((select relrowsecurity from pg_class where oid = 'public.ativos'::regclass), true, 'ativos tem RLS');

-- ------------------------------------------------------------------ Cliente A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select lives_ok($$insert into public.ativos (id, cliente_id, path, meta, receita) values ('30000000-0000-0000-0000-0000000000a1',
  '20000000-0000-0000-0000-0000000000ca', '20000000-0000-0000-0000-0000000000ca/ativos/a.jpg', '{}', '{"efeito":"duotom"}')$$, 'Cliente cria o próprio Ativo');
select is((select count(*) from public.ativos), 1::bigint, 'Cliente lê só os próprios Ativos');
select throws_ok($$insert into public.ativos (cliente_id, path, meta) values ('20000000-0000-0000-0000-0000000000cb', 'x', '{}')$$,
  '42501', null, 'Cliente não cria Ativo de outro Cliente');
select is_empty($$update public.ativos set receita = '{}' where id = '30000000-0000-0000-0000-0000000000b1' returning 1$$, 'Cliente não edita Ativo de outro');
select is_empty($$delete from public.ativos where id = '30000000-0000-0000-0000-0000000000b1' returning 1$$, 'Cliente não apaga Ativo de outro');
select lives_ok($$update public.posts set ativo_id = '30000000-0000-0000-0000-0000000000a1' where id = '40000000-0000-0000-0000-0000000000a1'$$,
  'Post usa Ativo do mesmo Cliente');
select throws_ok($$update public.posts set ativo_id = '30000000-0000-0000-0000-0000000000b1' where id = '40000000-0000-0000-0000-0000000000a1'$$,
  '23503', null, 'Post não usa Ativo de outro Cliente');
select lives_ok($$delete from public.ativos where id = '30000000-0000-0000-0000-0000000000a1'$$, 'Cliente apaga o próprio Ativo');
select is((select ativo_id from public.posts where id = '40000000-0000-0000-0000-0000000000a1'), null, 'apagar o Ativo deixa o Post sem foto (não apaga o Post)');

-- ------------------------------------------------------------------ Parceiro A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from public.ativos), 0::bigint, 'Parceiro não lê Ativos, nem dos próprios Clientes');

reset role;
set local role anon;
select throws_ok($$select count(*) from public.ativos$$, '42501', null, 'anônimo sem acesso');

select * from finish();
rollback;
