// Usuários de teste para validar à mão os dois lados (Parceiro e Cliente). SÓ no Supabase local.
//
//   pnpm teste:usuarios                       cria/recria o cenário e imprime um link de entrada por usuário
//   pnpm teste:usuarios cliente@teste.dev     só imprime um link novo para esse email
//
// Cenário (idempotente: rodar de novo não duplica):
//   Escritório Teste (3 Assentos) ── parceiro@teste.dev
//     ├─ cliente@teste.dev     Cliente ativo
//     ├─ cliente2@teste.dev    Cliente ativo
//     └─ pendente@teste.dev    Convite enviado, ainda não aceito
//   Agência Outra (2 Assentos) ── parceiro-b@teste.dev
//     └─ cliente-b@teste.dev   Cliente ativo (para conferir que um Parceiro não vê o outro)
//
// Cada link vale ~1 h e só uma vez (é um link mágico). Abra numa janela anônima para não misturar sessões.
// Também dá para entrar pela tela Entrar e pegar o email no Mailpit (http://127.0.0.1:54324).
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const chave = process.env.NUXT_SUPABASE_SECRET_KEY
const site = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
if (!url || !chave) {
  console.error('faltam NUXT_PUBLIC_SUPABASE_URL e NUXT_SUPABASE_SECRET_KEY (chaves de `pnpm exec supabase status`)')
  process.exit(1)
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error(`recusado: ${url} não é o Supabase local. Usuários de teste nunca vão para o hospedado.`)
  process.exit(1)
}
const db = createClient(url, chave, { auth: { persistSession: false } })

const PARCEIROS = [
  { nome: 'Escritório Teste', email: 'parceiro@teste.dev', assentos: 3, clientes: ['cliente@teste.dev', 'cliente2@teste.dev'], pendentes: ['pendente@teste.dev'] },
  { nome: 'Agência Outra', email: 'parceiro-b@teste.dev', assentos: 2, clientes: ['cliente-b@teste.dev'], pendentes: [] }
]

const falha = (e: { message: string } | null) => {
  if (e) throw new Error(e.message)
}

/** Usuário do Auth (cria se não existe) e um link de entrada novo. */
async function usuario(email: string) {
  const criado = await db.auth.admin.createUser({ email, email_confirm: true })
  if (criado.error && criado.error.code !== 'email_exists') throw criado.error
  const link = await db.auth.admin.generateLink({ type: 'magiclink', email })
  falha(link.error)
  return { id: link.data.user!.id, link: `${site}/confirmar?token_hash=${link.data.properties!.hashed_token}` }
}

const hashAleatorio = () => `teste-${randomBytes(16).toString('hex')}`

const so = process.argv[2]?.trim().toLowerCase()
if (so) {
  console.log(`${so}\n  ${(await usuario(so)).link}`)
  process.exit(0)
}

const links: [string, string, string][] = []
for (const p of PARCEIROS) {
  const u = await usuario(p.email)
  const { data: parceiro, error } = await db.from('parceiros')
    .upsert({ nome: p.nome, email_responsavel: p.email, usuario_id: u.id, assentos: p.assentos }, { onConflict: 'email_responsavel' })
    .select('id').single()
  falha(error)
  links.push([`Parceiro · ${p.nome}`, p.email, u.link])

  for (const email of p.clientes) {
    const c = await usuario(email)
    let { data: cliente } = await db.from('clientes').select('id').eq('email', email).eq('ativo', true).maybeSingle()
    if (!cliente) {
      const r = await db.from('clientes').insert({ parceiro_id: parceiro!.id, usuario_id: c.id, email }).select('id').single()
      falha(r.error)
      cliente = r.data
    }
    // o Convite aceito que trouxe esse Cliente (aparece no painel do Parceiro como aceito)
    const { data: cv } = await db.from('convites').select('id').eq('parceiro_id', parceiro!.id).eq('email', email).eq('status', 'aceito').maybeSingle()
    if (!cv) {
      falha((await db.from('convites').insert({
        parceiro_id: parceiro!.id, email, token_hash: hashAleatorio(), status: 'aceito',
        enviado_em: new Date().toISOString(), aceito_em: new Date().toISOString(), cliente_id: cliente!.id
      })).error)
    }
    links.push([`Cliente de ${p.nome}`, email, c.link])
  }

  for (const email of p.pendentes) {
    const { data: cv } = await db.from('convites').select('id').eq('parceiro_id', parceiro!.id).eq('email', email).in('status', ['agendado', 'enviado']).maybeSingle()
    if (!cv) {
      falha((await db.from('convites').insert({
        parceiro_id: parceiro!.id, email, token_hash: hashAleatorio(), status: 'enviado', enviado_em: new Date().toISOString()
      })).error)
    }
  }
}

console.log('Usuários de teste prontos. Links de entrada (valem ~1 h, uso único; abra cada um numa janela anônima):\n')
for (const [papel, email, link] of links) console.log(`${papel}\n  ${email}\n  ${link}\n`)
console.log('Link novo depois: pnpm teste:usuarios <email>')
