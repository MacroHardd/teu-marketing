// J1 do MVP: o Admin cadastra um Parceiro. Cria o usuário do Auth (sem senha) e o Parceiro;
// o responsável entra depois pela tela Entrar, com link mágico.
//
//   pnpm parceiro:criar --nome "Escritório Lua" --email lua@exemplo.com --assentos 10
//
// Usa NUXT_PUBLIC_SUPABASE_URL e NUXT_SUPABASE_SECRET_KEY de apps/web/.env (ou do ambiente).
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const { values } = parseArgs({ options: { nome: { type: 'string' }, email: { type: 'string' }, assentos: { type: 'string' } } })
const nome = values.nome?.trim()
const email = values.email?.trim().toLowerCase()
const assentos = Number(values.assentos)
if (!nome || !email || !Number.isInteger(assentos) || assentos < 0) {
  console.error('uso: pnpm parceiro:criar --nome "<nome>" --email <email> --assentos <n>')
  process.exit(1)
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const chave = process.env.NUXT_SUPABASE_SECRET_KEY
if (!url || !chave) {
  console.error('faltam NUXT_PUBLIC_SUPABASE_URL e NUXT_SUPABASE_SECRET_KEY')
  process.exit(1)
}
const db = createClient(url, chave, { auth: { persistSession: false } })

const criado = await db.auth.admin.createUser({ email, email_confirm: true })
let usuarioId = criado.data.user?.id
if (criado.error) {
  if (criado.error.code !== 'email_exists') throw criado.error
  const link = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error) throw link.error
  usuarioId = link.data.user.id
}

const { data, error } = await db.from('parceiros')
  .upsert({ nome, email_responsavel: email, usuario_id: usuarioId, assentos }, { onConflict: 'email_responsavel' })
  .select('id').single()
if (error) throw error
console.log(`Parceiro "${nome}" pronto (${data.id}) com ${assentos} Assento(s). ${email} já pode entrar pela tela Entrar.`)
