// Jornada J1 → J3 do MVP de ponta a ponta, num Chrome de verdade.
// Pré-requisitos: `pnpm exec supabase start` + `pnpm dev` (porta 3000, sem Resend: emails no Mailpit).
//   pnpm --filter @teu/web e2e            (CHROME=/caminho/do/chrome para outro navegador)
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:3000'
const MAIL = 'http://127.0.0.1:54324'
const run = Date.now().toString(36)
const PARCEIRO = `parceiro-${run}@teste.dev`
const CLIENTE = `cliente-${run}@teste.dev`

const log = (...a) => console.log('•', ...a)

// no dev o Vue hidrata depois do load: clicar antes perde o evento
async function abre(pg, url) {
  if (url) await pg.goto(url)
  await pg.waitForLoadState('networkidle')
  await pg.waitForTimeout(800)
}

async function ultimoEmail(para, desde) {
  for (let i = 0; i < 30; i++) {
    const r = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`)).json()
    const m = r.messages?.find(m => new Date(m.Created) > desde)
    if (m) return (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json()
    await new Promise(res => setTimeout(res, 500))
  }
  throw new Error(`email não chegou: ${para}`)
}

function linkDe(msg, re) {
  const links = (msg.HTML.match(/href="([^"]+)"/g) ?? []).map(h => h.slice(6, -1).replaceAll('&amp;', '&'))
  return links.find(h => re.test(h))
}

execFileSync('node', ['--env-file-if-exists=.env', 'scripts/criar-parceiro.ts', '--nome', 'Escritório Teste', '--email', PARCEIRO, '--assentos', '2'], { stdio: 'inherit' })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: true })
const erros = []
async function novaAba() {
  const ctx = await browser.newContext({ acceptDownloads: true })
  const pg = await ctx.newPage()
  pg.on('pageerror', e => erros.push(e.message))
  return pg
}

// ------------------------------------------------------------------ sem Convite não entra
const p = await novaAba()
await abre(p, `${BASE}/entrar`)
await p.fill('input[type=email]', 'estranho@teste.dev')
await p.click('button[type=submit]')
await p.getByText('Peça acesso ao seu parceiro').waitFor()
log('email sem Convite → "peça acesso"')

// ------------------------------------------------------------------ J1: Parceiro entra por link mágico
let desde = new Date(Date.now() - 1000)
await p.fill('input[type=email]', PARCEIRO)
await p.click('button[type=submit]')
await p.getByText('Verifique seu email').waitFor()
await p.goto(linkDe(await ultimoEmail(PARCEIRO, desde), /verify|confirmar/))
await p.waitForURL('**/clientes', { timeout: 20000 })
await abre(p)
await p.getByText('0 de 2 acessos em uso').waitFor()
log('Parceiro entrou por link mágico')

// ------------------------------------------------------------------ J2: Parceiro convida
await p.fill('textarea', `${CLIENTE}, ${CLIENTE}\nnao-e-email`)
await p.getByText('1 válido(s)').waitFor()
await p.getByText('1 repetido(s)').waitFor()
await p.getByText('Inválido(s): nao-e-email').waitFor()
log('prévia: válidos, repetidos e inválidos')
desde = new Date(Date.now() - 1000)
await p.getByRole('button', { name: /Enviar 1 Convite/ }).click()
await p.getByText('1 Convite(s) enviado(s)', { exact: true }).waitFor()
const convite = await ultimoEmail(CLIENTE, desde)
log('Convite enviado:', convite.Subject)

// ------------------------------------------------------------------ J3: Cliente entra pelo Convite e exporta
const c = await novaAba()
await c.goto(linkDe(convite, /\/convite\//))
await c.waitForURL('**/posts', { timeout: 20000 })
await abre(c)
log('Cliente entrou pelo Convite com 1 clique')
await c.getByRole('button', { name: 'Criar meu primeiro Post' }).click()
await c.waitForURL('**/posts/*')
await abre(c)
await c.fill('textarea', 'Seu cliente não quer barato, quer *confiança*')
await c.getByText('Salvo', { exact: true }).waitFor({ timeout: 10000 })
const [download] = await Promise.all([c.waitForEvent('download'), c.getByRole('button', { name: 'Baixar imagem' }).click()])
await c.getByText('Imagem baixada', { exact: true }).waitFor()
log('PNG baixado:', download.suggestedFilename())
await abre(c, `${BASE}/posts`)
await c.getByText('Exportado').waitFor()
log('Meus Posts mostra Exportado')

// o mesmo link de Convite ainda entra (mesmo usuário), não ocupa outro Assento
const c2 = await novaAba()
await c2.goto(linkDe(convite, /\/convite\//))
await c2.waitForURL('**/posts', { timeout: 20000 })
log('link do Convite de novo → entra')

// ------------------------------------------------------------------ Parceiro vê o Uso
await p.reload()
await abre(p)
await p.getByText('1 de 2 acessos em uso').waitFor()
log('Parceiro vê 1 de 2 em uso')

await browser.close()
if (erros.length) {
  console.error('erros de página:', erros)
  process.exit(1)
}
console.log('jornada ok')
