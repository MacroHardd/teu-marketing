-- Fotos dos Clientes no Storage: só o dono lê e escreve (ADR 0002). Rodar: pnpm exec supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'parceiro-a@teste.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ca', 'cliente-a@teste.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000cb', 'cliente-b@teste.dev', 'authenticated', 'authenticated');
insert into public.parceiros (id, nome, email_responsavel, usuario_id, assentos) values
  ('10000000-0000-0000-0000-00000000000a', 'Parceiro A', 'parceiro-a@teste.dev', '00000000-0000-0000-0000-00000000000a', 5);
insert into public.clientes (id, parceiro_id, usuario_id, email) values
  ('20000000-0000-0000-0000-0000000000ca', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000ca', 'cliente-a@teste.dev'),
  ('20000000-0000-0000-0000-0000000000cb', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000cb', 'cliente-b@teste.dev');
insert into storage.objects (bucket_id, name, owner_id) values
  ('fotos', '20000000-0000-0000-0000-0000000000ca/p1/a.jpg', '00000000-0000-0000-0000-0000000000ca'),
  ('fotos', '20000000-0000-0000-0000-0000000000cb/p2/b.jpg', '00000000-0000-0000-0000-0000000000cb');

select is((select public from storage.buckets where id = 'fotos'), false, 'bucket de fotos é privado');

-- ------------------------------------------------------------------ Cliente A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select is((select count(*) from storage.objects where bucket_id = 'fotos'), 1::bigint, 'Cliente lê só as próprias fotos');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('fotos', '20000000-0000-0000-0000-0000000000ca/p1/c.jpg', '00000000-0000-0000-0000-0000000000ca')$$,
  'Cliente envia foto na própria pasta');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('fotos', '20000000-0000-0000-0000-0000000000cb/p2/x.jpg')$$,
  '42501', null, 'Cliente não envia foto na pasta de outro Cliente');
-- (delete direto na tabela é barrado pelo próprio Storage; a política de delete vale pela API)
select is_empty($$update storage.objects set metadata = '{}' where name like '20000000-0000-0000-0000-0000000000cb/%' returning name$$, 'Cliente não altera foto de outro Cliente');

-- ------------------------------------------------------------------ Parceiro A (dono dos dois Clientes)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from storage.objects where bucket_id = 'fotos'), 0::bigint, 'Parceiro não lê fotos, nem dos próprios Clientes');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('fotos', '20000000-0000-0000-0000-0000000000ca/p1/y.jpg')$$,
  '42501', null, 'Parceiro não envia foto');

-- ------------------------------------------------------------------ Cliente desativado perde o acesso
reset role;
update public.clientes set ativo = false where id = '20000000-0000-0000-0000-0000000000ca';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select is((select count(*) from storage.objects where bucket_id = 'fotos'), 0::bigint, 'Cliente desativado não lê mais as fotos');

-- ------------------------------------------------------------------ anônimo
reset role;
set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'fotos'), 0::bigint, 'anônimo não lê fotos');

select * from finish();
rollback;
