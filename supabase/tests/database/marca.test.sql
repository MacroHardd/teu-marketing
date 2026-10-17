-- Perfil de Marca: só o próprio Cliente ativo lê e escreve; Parceiro e outros Clientes, nada (ADR 0002).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'parceiro-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev', 'authenticated', 'authenticated');
insert into public.parceiros (id, nome, email_responsavel, usuario_id, assentos) values
  ('10000000-0000-0000-0000-00000000000a', 'Parceiro A', 'parceiro-a@pgtap.dev', '00000000-0000-0000-0000-00000000000a', 5);
insert into public.clientes (id, parceiro_id, usuario_id, email) values
  ('20000000-0000-0000-0000-0000000000ca', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'cliente-a@pgtap.dev'),
  ('20000000-0000-0000-0000-0000000000cb', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000cb', 'cliente-b@pgtap.dev');
insert into public.perfis_marca (cliente_id, nome) values ('20000000-0000-0000-0000-0000000000cb', 'Marca B');

select is((select relrowsecurity from pg_class where oid = 'public.perfis_marca'::regclass), true, 'perfis_marca tem RLS');
select ok((select 'image/png' = any(allowed_mime_types) from storage.buckets where id = 'fotos'), 'bucket aceita PNG (logo)');

-- ------------------------------------------------------------------ Cliente A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select lives_ok($$insert into public.perfis_marca (cliente_id, nome, arroba, cor) values ('20000000-0000-0000-0000-0000000000ca', 'Studio A', '@studioa', '#1f8a70')$$,
  'Cliente cria o próprio Perfil');
select is((select count(*) from public.perfis_marca), 1::bigint, 'Cliente lê só o próprio Perfil');
select throws_ok($$insert into public.perfis_marca (cliente_id, nome) values ('20000000-0000-0000-0000-0000000000cb', 'x')$$,
  '42501', null, 'Cliente não cria Perfil de outro Cliente');
select is_empty($$update public.perfis_marca set nome = 'x' where cliente_id = '20000000-0000-0000-0000-0000000000cb' returning 1$$, 'Cliente não edita Perfil de outro');
select throws_ok($$update public.perfis_marca set cor = 'vermelho' where cliente_id = '20000000-0000-0000-0000-0000000000ca'$$,
  '23514', null, 'cor só em #rrggbb (nada de cor livre fora da paleta)');

-- ------------------------------------------------------------------ Parceiro A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from public.perfis_marca), 0::bigint, 'Parceiro não lê Perfil de Marca, nem dos próprios Clientes');

-- ------------------------------------------------------------------ Cliente desativado
reset role;
update public.clientes set ativo = false where id = '20000000-0000-0000-0000-0000000000ca';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select is((select count(*) from public.perfis_marca), 0::bigint, 'Cliente desativado não lê mais o Perfil');

reset role;
set local role anon;
select throws_ok($$select count(*) from public.perfis_marca$$, '42501', null, 'anônimo sem acesso');

select * from finish();
rollback;
