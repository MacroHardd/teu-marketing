interface Email {
  para: string
  assunto: string
  html: string
  texto: string
}

/**
 * Produção: API do Resend. Dev sem chave do Resend: Mailpit do Supabase local
 * (http://127.0.0.1:54324), junto com os emails de link mágico.
 */
export async function enviaEmail(e: Email): Promise<void> {
  const cfg = useRuntimeConfig()
  if (cfg.resendApiKey) {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendApiKey}` },
      body: { from: cfg.emailRemetente, to: [e.para], subject: e.assunto, html: e.html, text: e.texto }
    })
    return
  }
  if (cfg.mailpitUrl) {
    const de = /<([^>]+)>/.exec(cfg.emailRemetente)?.[1] ?? cfg.emailRemetente
    await $fetch(`${cfg.mailpitUrl}/api/v1/send`, {
      method: 'POST',
      body: { From: { Email: de, Name: 'Teu Marketing' }, To: [{ Email: e.para }], Subject: e.assunto, HTML: e.html, Text: e.texto }
    })
    return
  }
  throw createError({ statusCode: 500, statusMessage: 'Envio de email não configurado (NUXT_RESEND_API_KEY)' })
}

export function emailConvite(nomeParceiro: string, link: string) {
  const assunto = `${nomeParceiro} liberou seu acesso ao Teu Marketing`
  const texto = `${nomeParceiro} liberou seu acesso ao Teu Marketing: posts de Instagram prontos em minutos.\n\nEntrar: ${link}\n\nO link vale 7 dias.`
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#171512">
<p style="font-size:18px"><strong>${escapa(nomeParceiro)}</strong> liberou seu acesso ao Teu Marketing.</p>
<p>Crie posts de Instagram prontos em minutos, sem precisar saber design.</p>
<p style="margin:32px 0"><a href="${link}" style="background:#00a155;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Entrar no Teu Marketing</a></p>
<p style="color:#7a736a;font-size:13px">O link vale 7 dias. Se não esperava este email, pode ignorar.</p></div>`
  return { assunto, texto, html }
}

export function emailAcessoLiberado(link: string, entrar: string) {
  const assunto = 'Seu acesso ao Teu Marketing está liberado'
  const texto = `Pagamento confirmado. Seu acesso ao Teu Marketing está liberado: posts de Instagram prontos em minutos.\n\nEntrar: ${link}\n\nO link vale 1 hora. Depois disso, entre por ${entrar} com este email.`
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#171512">
<p style="font-size:18px">Pagamento confirmado. <strong>Seu acesso ao Teu Marketing está liberado.</strong></p>
<p>Crie posts de Instagram prontos em minutos, sem precisar saber design.</p>
<p style="margin:32px 0"><a href="${link}" style="background:#00a155;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Entrar no Teu Marketing</a></p>
<p style="color:#7a736a;font-size:13px">O link vale 1 hora. Depois disso, entre por <a href="${entrar}">${entrar}</a> com este email.</p></div>`
  return { assunto, texto, html }
}

const escapa = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
