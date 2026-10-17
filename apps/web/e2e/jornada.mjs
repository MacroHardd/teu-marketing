// Jornada J1 → J3 do MVP de ponta a ponta, num Chrome de verdade.
// Pré-requisitos: `pnpm exec supabase start` + `pnpm dev` (porta 3000, sem Resend: emails no Mailpit).
// Outra porta (ex.: com o dev rodando na 3000): BASE=http://localhost:3001 (3001 já liberada no Auth local).
//   pnpm --filter @teu/web e2e            (CHROME=/caminho/do/chrome para outro navegador)
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://localhost:3000'
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

execFileSync('node', ['--env-file-if-exists=.env', 'scripts/criar-parceiro.ts', '--nome', 'Escritório E2E', '--email', PARCEIRO, '--assentos', '2'], { stdio: 'inherit' })

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

// Perfil de Marca (opcional): preenche e volta para Meus Posts
const LOGO = new URL('../../../packages/oraculo/fotos/clara.png', import.meta.url).pathname
await c.getByRole('link', { name: 'Preencher Perfil de Marca' }).first().click()
await c.waitForURL('**/marca**')
await abre(c)
await c.getByPlaceholder('Studio Lua').fill('Studio E2E')
await c.getByPlaceholder('studiolua').fill('studioe2e')
await c.getByLabel('Cor #1f8a70').click()
await c.setInputFiles('[data-testid=input-logo]', LOGO)
await c.getByRole('button', { name: 'Trocar logo' }).waitFor({ timeout: 20000 })
await c.getByRole('button', { name: 'Salvar' }).click()
await c.waitForURL('**/posts', { timeout: 10000 })
log('Perfil de Marca salvo (nome, @, cor, logo)')

await c.getByRole('button', { name: 'Criar meu primeiro Post' }).click()
await c.waitForURL('**/posts/*')
await abre(c)
await c.getByPlaceholder('Escreva a legenda do Instagram').fill('Legenda do Post #e2e')
await c.getByRole('button', { name: '@ / nome' }).waitFor()
log('editor: Elementos do Perfil ligados; legenda com hashtags do Post')

// Trava: texto longo demais na Síncope (1 palavra por linha) → bloqueia a Exportação → correção com 1 clique
await c.getByRole('textbox').first().fill('Quando você entende o que o seu cliente sente de verdade, a venda deixa de ser um empurrão e passa a ser a consequência natural de uma conversa honesta, feita com calma e atenção aos detalhes. E isso vale para qualquer negócio: da padaria da esquina ao escritório de advocacia, quem escuta antes de oferecer vende mais e vende melhor, sempre')
await c.getByRole('button', { name: 'Síncope' }).click()
await c.locator('[data-testid=trava]').first().waitFor({ timeout: 5000 })
if (await c.getByRole('button', { name: 'Baixar imagem' }).isEnabled()) throw new Error('Trava bloqueante devia desabilitar a Exportação')
await c.getByRole('button', { name: 'Usar Manchete' }).click()
await c.locator('[data-testid=trava]').waitFor({ state: 'detached', timeout: 5000 })
log('Trava de texto cortado: bloqueou e "Usar Manchete" resolveu')

// Variação: Síncope com bloco → sem bloco muda o preview e fica salva
await c.getByRole('textbox').first().fill('menos ruído mais *resultado*')
await c.getByRole('button', { name: 'Síncope' }).click()
await c.getByRole('button', { name: 'Com bloco' }).waitFor()
const comBloco = await c.$eval('canvas[aria-label="Prévia do Post"]', cv => cv.toDataURL())
await c.getByRole('button', { name: 'Sem bloco' }).click()
if (await c.$eval('canvas[aria-label="Prévia do Post"]', cv => cv.toDataURL()) === comBloco) throw new Error('Variação não mudou o preview')
log('Variação: Síncope sem bloco')

// Ajustes: P/M/G, posição, cor, CTA
await c.getByRole('button', { name: /^Acento(\s*sugerido)?$/ }).click()
const antes = await c.$eval('canvas[aria-label="Prévia do Post"]', cv => cv.toDataURL())
await c.getByRole('button', { name: 'Letra P' }).click()
await c.getByRole('button', { name: 'Texto em cima' }).click()
await c.getByRole('button', { name: 'Cores Noite' }).click()
await c.getByPlaceholder('Ex.: Agende pelo link da bio').fill('Agende pelo link da bio')
const depois = await c.$eval('canvas[aria-label="Prévia do Post"]', cv => cv.toDataURL())
if (antes === depois) throw new Error('Ajustes não mudaram o preview')
log('Ajustes (P, em cima, Noite, CTA) mudam o preview')

// Arrastar o texto na prévia: solta embaixo → encaixa na posição "Embaixo"
const cv = await c.locator('canvas[aria-label="Prévia do Post"]').boundingBox()
const k = cv.width / 1080
const emCima = await c.$eval('canvas[aria-label="Prévia do Post"]', el => el.toDataURL())
await c.mouse.move(cv.x + 200 * k, cv.y + 320 * k)
await c.mouse.down()
await c.mouse.move(cv.x + 200 * k, cv.y + 700 * k, { steps: 5 })
await c.getByText('No meio', { exact: true }).waitFor()
await c.mouse.move(cv.x + 200 * k, cv.y + 1250 * k, { steps: 5 })
await c.mouse.up()
if (await c.$eval('canvas[aria-label="Prévia do Post"]', el => el.toDataURL()) === emCima) throw new Error('Arrastar o texto não mudou a posição')
if (await c.getByRole('button', { name: 'Texto embaixo' }).getAttribute('class').then(cl => !/(^|\s)bg-primary(\s|$)/.test(cl))) throw new Error('Arrastar devia escolher "Embaixo"')
log('arrastar o texto: encaixou embaixo')

// Riscada (textura feita à mão no Desenhista) desenha no browser
await c.getByRole('textbox').first().fill('eu perdi o *medo* de vender')
await c.getByRole('button', { name: 'Riscada' }).click()
await c.waitForFunction(() => {
  const d = document.querySelector('canvas[aria-label="Prévia do Post"]').getContext('2d').getImageData(0, 0, 1080, 1350).data
  let claros = 0
  for (let i = 0; i < d.length; i += 4 * 97) if (d[i] > 150) claros++
  return claros > 50 // letra clara sobre o fundo quase preto
}, null, { timeout: 5000 })
log('Riscada desenhada no browser')

await c.getByRole('textbox').first().fill('Seu cliente não quer barato, quer *confiança*')
await c.getByRole('button', { name: /^Acento(\s*sugerido)?$/ }).click()
await c.getByText('Salvo', { exact: true }).waitFor({ timeout: 10000 })
await c.reload()
await abre(c)
if (await c.getByPlaceholder('Ex.: Agende pelo link da bio').inputValue() !== 'Agende pelo link da bio') throw new Error('CTA não ficou salvo')
log('recarregou: Ajustes salvos')
const [download] = await Promise.all([c.waitForEvent('download'), c.getByRole('button', { name: 'Baixar imagem' }).click()])
await c.getByText('Imagem baixada', { exact: true }).waitFor()
log('PNG baixado:', download.suggestedFilename())
await abre(c, `${BASE}/posts`)
await c.getByText('Exportado').waitFor()
log('Meus Posts mostra Exportado')

// ------------------------------------------------------------------ Post com foto (M3)
const FOTO = new URL('../../../packages/oraculo/fotos/clara.png', import.meta.url).pathname
/** Cor de um pixel do preview (canvas 1080×1350). */
const pixel = (x, y) => c.$eval('canvas[aria-label="Prévia do Post"]', (cv, [x, y]) => [...cv.getContext('2d').getImageData(x, y, 1, 1).data.slice(0, 3)], [x, y])
await c.getByRole('button', { name: 'Novo Post' }).first().click()
await c.waitForURL('**/posts/*')
await abre(c)
await c.fill('textarea', 'Feito à mão, feito pra você')
await c.setInputFiles('[data-testid=input-foto]', FOTO)
await c.getByRole('button', { name: 'Trocar foto' }).waitFor({ timeout: 20000 })
await c.getByRole('button', { name: /Letra fina\s*sugerido/ }).waitFor()
const [r, g, b] = await pixel(540, 1300)
if (!(r === g && g === b)) throw new Error(`Letra fina devia mostrar a foto em cinza, veio ${r},${g},${b}`)
log('foto enviada → Letra fina sugerida, foto em preto e branco no preview')
// os 13 Estilos desenham com foto (cada um muda o preview)
let anterior = ''
for (const nome of ['Acento', 'Manchete', 'Número', 'Zona calma', 'Síncope', 'Riscada', 'Herói', 'Letra fina', 'Foto que fala', 'Duas tintas', 'Vazio', 'Foto e legenda', 'Depoimento']) {
  await c.getByRole('button', { name: new RegExp(`^${nome}(\\s*sugerido)?$`) }).click()
  await c.waitForFunction(a => document.querySelector('canvas[aria-label="Prévia do Post"]').toDataURL() !== a, anterior, { timeout: 5000 })
  anterior = await c.$eval('canvas[aria-label="Prévia do Post"]', el => el.toDataURL())
}
log('13 Estilos desenham com foto')
await c.getByRole('button', { name: 'Foto e legenda' }).click()
await c.getByText('Salvo', { exact: true }).waitFor({ timeout: 10000 })
await c.reload()
await abre(c)
await c.getByRole('button', { name: 'Trocar foto' }).waitFor()
await c.waitForFunction(() => {
  const d = document.querySelector('canvas[aria-label="Prévia do Post"]').getContext('2d').getImageData(540, 60, 1, 1).data
  return d[2] > d[0] // céu azulado da foto (sem foto, o bloco seria laranja, da cor de acento)
}, null, { timeout: 15000 })
log('recarregou: Foto e legenda com a foto do Storage')
const [download2] = await Promise.all([c.waitForEvent('download'), c.getByRole('button', { name: 'Baixar imagem' }).click()])
log('PNG com foto baixado:', download2.suggestedFilename())

// ------------------------------------------------------------------ Ativos: tratar imagem e usar no Post
await abre(c, `${BASE}/ativos`)
// a foto enviada no editor já está nos Ativos
await c.locator('[data-testid=ativo]').first().waitFor({ timeout: 10000 })
await c.setInputFiles('[data-testid=input-ativo]', new URL('../../../packages/oraculo/fotos/mista.png', import.meta.url).pathname)
await c.waitForFunction(() => document.querySelectorAll('[data-testid=ativo]').length >= 2, null, { timeout: 20000 })
log('Ativos: imagem enviada')
await c.locator('[data-testid=ativo]').first().click()
const previa = 'canvas[aria-label="Prévia da imagem"]'
await c.waitForFunction(s => document.querySelector(s)?.width > 0, previa, { timeout: 10000 })
await c.getByRole('button', { name: 'Duotom', exact: true }).click()
await c.getByLabel('Duotom Azul').click()
await c.getByRole('button', { name: 'Recortar' }).click()
await c.locator('[data-testid=caixa-corte]').waitFor()
await c.getByRole('button', { name: 'Quadrado' }).click()
await c.getByRole('button', { name: 'Aplicar recorte' }).click()
await c.waitForFunction(s => Math.abs(document.querySelector(s).width - document.querySelector(s).height) <= 1, previa, { timeout: 5000 })
await c.getByRole('button', { name: 'Salvar' }).click()
await c.getByText('Imagem salva', { exact: true }).waitFor()
log('Ativos: duotom azul + recorte quadrado salvos (o original fica)')
await c.getByRole('button', { name: 'Usar num Post novo' }).click()
await c.waitForURL('**/posts/*')
await abre(c)
await c.fill('textarea', 'Feito à mão, feito pra você')
await c.getByRole('link', { name: 'Tratar imagem' }).waitFor({ timeout: 15000 })
// Foto e legenda: a foto do Ativo em cima, tingida de azul (duotom)
await c.getByRole('button', { name: /^Foto e legenda(\s*sugerido)?$/ }).click()
await c.waitForFunction(() => {
  const d = document.querySelector('canvas[aria-label="Prévia do Post"]').getContext('2d').getImageData(540, 300, 1, 1).data
  return d[2] > d[0] + 40 && d[2] > d[1] + 20
}, null, { timeout: 15000 })
log('Post novo com o Ativo tratado (duotom azul no preview)')
const semTextura = await c.$eval('canvas[aria-label="Prévia do Post"]', el => el.toDataURL())
await c.getByLabel('Textura Papel').click()
await c.getByRole('button', { name: 'Na letra' }).click()
await c.waitForFunction(a => document.querySelector('canvas[aria-label="Prévia do Post"]').toDataURL() !== a, semTextura, { timeout: 10000 })
await c.getByText('Salvo', { exact: true }).waitFor({ timeout: 10000 })
const [download3] = await Promise.all([c.waitForEvent('download'), c.getByRole('button', { name: 'Baixar imagem' }).click()])
log('textura na letra + PNG baixado:', download3.suggestedFilename())

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
