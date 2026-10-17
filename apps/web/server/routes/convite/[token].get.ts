/**
 * Link do email do Convite. Aceita o Convite (Assento, prazo, outro Parceiro: regras no banco,
 * função aceitar_convite) e entra direto, sem segundo email: gera o link mágico no servidor
 * e manda o browser para /confirmar, que troca o token pela sessão.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') ?? ''
  const db = servico(event)
  const hash = hashToken(token)

  const { data: cv } = await db.from('convites').select('email, status, expira_em').eq('token_hash', hash).maybeSingle()
  if (!cv || cv.status === 'cancelado') return sendRedirect(event, '/acesso/convite-invalido')
  if (cv.status === 'expirado' || (cv.status !== 'aceito' && new Date(cv.expira_em) < new Date())) {
    return sendRedirect(event, '/acesso/convite-expirado')
  }

  // usuário do Auth: cria se ainda não existe (o signup público é desligado)
  const criado = await db.auth.admin.createUser({ email: cv.email, email_confirm: true })
  if (criado.error && criado.error.code !== 'email_exists') {
    throw createError({ statusCode: 500, statusMessage: criado.error.message })
  }
  const link = await db.auth.admin.generateLink({ type: 'magiclink', email: cv.email })
  if (link.error || !link.data.user) throw createError({ statusCode: 500, statusMessage: link.error?.message })

  const { data: r, error } = await db.rpc('aceitar_convite', { p_token_hash: hash, p_usuario_id: link.data.user.id })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const { resultado, cancelar_asaas: cancelar = [] } = r as { resultado: string, cancelar_asaas?: string[] }
  if (resultado !== 'ok') {
    if (criado.data.user) await db.auth.admin.deleteUser(criado.data.user.id)
    const motivo = { sem_assento: 'sem-assento', outro_parceiro: 'outro-parceiro', expirado: 'convite-expirado' }[resultado] ?? 'convite-invalido'
    return sendRedirect(event, `/acesso/${motivo}`)
  }
  // Cliente direto que migrou para o Parceiro: para de cobrar (se falhar, cancelar à mão no painel do Asaas)
  for (const id of cancelar) await cancelaNoAsaas(id).catch(e => console.error('cancelar Assinatura migrada', id, e))
  const q = new URLSearchParams({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  return sendRedirect(event, `/confirmar?${q}`)
})
