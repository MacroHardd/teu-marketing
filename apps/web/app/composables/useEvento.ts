const sessao = import.meta.client ? crypto.randomUUID() : null

type Nome = 'editor_aberto' | 'post_criado' | 'estilo_trocado' | 'foto_enviada' | 'post_exportado' | 'erro_motor'
  | 'perfil_atualizado' | 'ajuste_aplicado' | 'trava_disparada' | 'trava_resolvida' | 'legenda_copiada'

/** Manda um evento de telemetria. Nunca bloqueia nem quebra a tela. Props: só metadados. */
export function useEvento() {
  return (nome: Nome, props: Record<string, unknown>, postId?: string) => {
    $fetch('/api/eventos', { method: 'POST', body: { nome, props, post_id: postId, sessao_id: sessao } })
      .catch(e => console.warn('evento não enviado', nome, e))
  }
}
