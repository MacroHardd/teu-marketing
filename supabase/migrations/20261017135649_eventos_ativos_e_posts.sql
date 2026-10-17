-- Os eventos dos Ativos (Fase D) não estavam na lista permitida: o insert falhava calado.
-- Lista = todos os nomes de PROPS em apps/web/server/utils/eventos.ts + os planejados de docs/medicao/tecnico.md.
alter table public.eventos drop constraint eventos_nome_check;
alter table public.eventos add constraint eventos_nome_check check (nome in (
  'convite_enviado', 'convite_aceito', 'convite_expirado', 'perfil_atualizado', 'editor_aberto',
  'editor_inativo', 'post_criado', 'estilo_sugerido', 'estilo_trocado', 'variacao_trocada',
  'ajuste_aplicado', 'trava_disparada', 'trava_resolvida', 'foto_enviada', 'post_exportado',
  'legenda_copiada', 'post_duplicado', 'post_excluido', 'cliente_desativado', 'erro_motor',
  'ativo_enviado', 'tratamento_aplicado', 'ativo_excluido'
));
