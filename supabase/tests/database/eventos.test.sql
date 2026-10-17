-- Todo evento de apps/web/server/utils/eventos.ts (PROPS) precisa caber na constraint eventos_nome_check.
-- Evento novo no TS = nome novo aqui + migration da constraint.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into public.parceiros (id, nome, email_responsavel, assentos)
values ('10000000-0000-0000-0000-0000000000e0', 'Parceiro Eventos', 'eventos@pgtap.dev', 1);

select lives_ok(format($$insert into public.eventos (parceiro_id, nome) values ('10000000-0000-0000-0000-0000000000e0', %L)$$, n), 'evento aceito: ' || n)
from unnest(array[
  'convite_enviado', 'convite_aceito', 'editor_aberto', 'post_criado', 'post_exportado', 'estilo_trocado',
  'foto_enviada', 'perfil_atualizado', 'ajuste_aplicado', 'trava_disparada', 'trava_resolvida', 'variacao_trocada',
  'legenda_copiada', 'ativo_enviado', 'tratamento_aplicado', 'ativo_excluido', 'post_duplicado', 'post_excluido',
  'assinatura_iniciada', 'assinatura_ativada', 'assinatura_cancelada', 'assinatura_encerrada'
]) as n;

select throws_ok($$insert into public.eventos (parceiro_id, nome) values ('10000000-0000-0000-0000-0000000000e0', 'inventado')$$, '23514', null, 'nome fora da lista é recusado');

select * from finish();
rollback;
