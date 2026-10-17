-- Cliente direto e Assinatura (ADR 0005): Parceiro da casa, ativação, renovação, migração e isolamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- ------------------------------------------------------------------ cenário
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000005a0', 'pa@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a1', 'novo@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a2', 'ex@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a3', 'ativo-a@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a4', 'dir2@pgtap.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000005a5', 'dir3@pgtap.dev', 'authenticated', 'authenticated');

insert into public.parceiros (id, nome, email_responsavel, usuario_id, assentos) values
  ('10000000-0000-0000-0000-0000000005a0', 'Parceiro A', 'pa@pgtap.dev', '00000000-0000-0000-0000-0000000005a0', 2);

insert into public.clientes (id, parceiro_id, usuario_id, email, ativo, desativado_em) values
  ('20000000-0000-0000-0000-0000000005a2', '10000000-0000-0000-0000-0000000005a0', '00000000-0000-0000-0000-0000000005a2', 'ex@pgtap.dev', false, now()),
  ('20000000-0000-0000-0000-0000000005a3', '10000000-0000-0000-0000-0000000005a0', '00000000-0000-0000-0000-0000000005a3', 'ativo-a@pgtap.dev', true, null);
insert into public.posts (cliente_id, texto) values ('20000000-0000-0000-0000-0000000005a2', 'post antigo do ex');

insert into public.assinaturas (id, email, plano, asaas_assinatura_id) values
  ('40000000-0000-0000-0000-0000000005a1', 'novo@pgtap.dev', 'mensal', 'sub_novo'),
  ('40000000-0000-0000-0000-0000000005a2', 'ex@pgtap.dev', 'anual', 'sub_ex'),
  ('40000000-0000-0000-0000-0000000005a3', 'ativo-a@pgtap.dev', 'mensal', 'sub_ativo'),
  ('40000000-0000-0000-0000-0000000005a4', 'dir2@pgtap.dev', 'mensal', 'sub_dir2'),
  ('40000000-0000-0000-0000-0000000005a5', 'dir3@pgtap.dev', 'mensal', 'sub_dir3');

insert into public.convites (parceiro_id, email, token_hash, status) values
  ('10000000-0000-0000-0000-0000000005a0', 'dir2@pgtap.dev', 'tok-dir2', 'enviado'),
  ('10000000-0000-0000-0000-0000000005a0', 'dir3@pgtap.dev', 'tok-dir3', 'enviado');

-- ------------------------------------------------------------------ Parceiro da casa
select is((select count(*) from public.parceiros where direto), 1::bigint, 'existe um único Parceiro da casa');
select throws_ok($$insert into public.parceiros (nome, email_responsavel, assentos, direto) values ('Outra casa', 'casa2@pgtap.dev', 0, true)$$,
  '23505', null, 'não dá para criar um segundo Parceiro da casa');
select is((select usuario_id from public.parceiros where direto), null, 'ninguém é dono do painel do Parceiro da casa');

-- ------------------------------------------------------------------ pagamento confirmado (servidor)
set local role service_role;

select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a1', now() + interval '30 days') ->> 'primeira',
  'true', '1º pagamento: cria o Cliente direto');
select ok((select c.ativo and p.direto from public.clientes c join public.parceiros p on p.id = c.parceiro_id where c.email = 'novo@pgtap.dev'),
  'Cliente direto fica ativo no Parceiro da casa');
select is((select status::text from public.assinaturas where id = '40000000-0000-0000-0000-0000000005a1'), 'ativa', 'Assinatura fica ativa');

select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a1', now() + interval '60 days') ->> 'primeira',
  'false', 'renovação não é 1º pagamento');
select is((select count(*) from public.clientes where email = 'novo@pgtap.dev'), 1::bigint, 'renovação não duplica o Cliente');
select ok((select pago_ate > now() + interval '59 days' from public.assinaturas where id = '40000000-0000-0000-0000-0000000005a1'), 'renovação estende pago_ate');
select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a1', now() + interval '30 days') ->> 'resultado',
  'ok', 'webhook repetido/antigo é aceito');
select ok((select pago_ate > now() + interval '59 days' from public.assinaturas where id = '40000000-0000-0000-0000-0000000005a1'), 'webhook antigo não encurta pago_ate');

select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000005a2', now() + interval '365 days') ->> 'migrou',
  'true', 'ex-Cliente de Parceiro que assina migra');
select ok((select ativo and parceiro_id = (select id from public.parceiros where direto) from public.clientes where id = '20000000-0000-0000-0000-0000000005a2'),
  'é o mesmo Cliente, agora direto e ativo');

select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a3', '00000000-0000-0000-0000-0000000005a3', now() + interval '30 days') ->> 'resultado',
  'outro_parceiro', 'Cliente ativo de Parceiro não vira direto');
select is((select parceiro_id from public.clientes where id = '20000000-0000-0000-0000-0000000005a3'), '10000000-0000-0000-0000-0000000005a0'::uuid,
  'e continua no Parceiro');

select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a4', '00000000-0000-0000-0000-0000000005a4', now() + interval '30 days') ->> 'resultado', 'ok', 'dir2 assina');
select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a5', '00000000-0000-0000-0000-0000000005a5', now() + interval '30 days') ->> 'resultado', 'ok', 'dir3 assina');

-- ------------------------------------------------------------------ Convite de Parceiro para Cliente direto: migra
select is(public.aceitar_convite('tok-dir2', '00000000-0000-0000-0000-0000000005a4') -> 'cancelar_asaas', '["sub_dir2"]'::jsonb,
  'Cliente direto aceita Convite: migra e manda cancelar a Assinatura no Asaas');
select is((select parceiro_id from public.clientes where email = 'dir2@pgtap.dev' and ativo), '10000000-0000-0000-0000-0000000005a0'::uuid, 'agora é Cliente do Parceiro');
select is((select status::text from public.assinaturas where id = '40000000-0000-0000-0000-0000000005a4'), 'encerrada', 'Assinatura dele encerra');
select is(public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a4', '00000000-0000-0000-0000-0000000005a4', now() + interval '60 days') ->> 'resultado',
  'outro_parceiro', 'pagamento atrasado da Assinatura antiga não tira do Parceiro');
select is(public.aceitar_convite('tok-dir3', '00000000-0000-0000-0000-0000000005a5') ->> 'resultado', 'sem_assento', 'sem Assento o Cliente direto não migra');
select ok((select parceiro_id = (select id from public.parceiros where direto) from public.clientes where email = 'dir3@pgtap.dev'), 'e continua direto');

-- ------------------------------------------------------------------ isolamento
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a0","role":"authenticated"}', true);
select is((select count(*) from public.assinaturas), 0::bigint, 'Parceiro não lê Assinaturas');
select is((select count(*) from public.clientes where email = 'ex@pgtap.dev'), 0::bigint, 'Parceiro não vê mais o ex-Cliente que virou direto');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a2","role":"authenticated"}', true);
select results_eq('select email::text from public.assinaturas', $$values ('ex@pgtap.dev')$$, 'Cliente direto lê só a própria Assinatura');
select is((select count(*) from public.posts), 1::bigint, 'ex-Cliente que assinou mantém os Posts');
select is(public.meu_acesso() -> 'cliente' ->> 'direto', 'true', 'meu_acesso diz que é direto');
select throws_ok($$update public.assinaturas set pago_ate = now() + interval '10 years'$$, '42501', null, 'Cliente não estende a própria Assinatura');
select throws_ok($$select public.pagamento_confirmado('40000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000005a2', now())$$,
  '42501', null, 'só o servidor confirma pagamento');

-- ------------------------------------------------------------------ vencimento (cron diário)
reset role;
update public.assinaturas set pago_ate = now() - interval '4 days' where id in ('40000000-0000-0000-0000-0000000005a1', '40000000-0000-0000-0000-0000000005a4');
update public.assinaturas set pago_ate = now() - interval '2 days' where id = '40000000-0000-0000-0000-0000000005a5';
set local role service_role;
select public.encerrar_assinaturas_vencidas();
reset role;
select results_eq($$select email::text, ativo from public.clientes where email in ('novo@pgtap.dev', 'dir2@pgtap.dev', 'dir3@pgtap.dev') order by email$$,
  $$values ('dir2@pgtap.dev', true), ('dir3@pgtap.dev', true), ('novo@pgtap.dev', false)$$,
  'vencida há mais de 3 dias desliga só o Cliente direto; dentro da carência e o migrado ficam');

select * from finish();
rollback;
