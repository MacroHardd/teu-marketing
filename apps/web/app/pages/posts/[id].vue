<script setup lang="ts">
// Editor. Preview e Exportação usam o mesmo canvas 1080×1350: o PNG é exatamente o que está na tela (ADR 0001).
import {
  amostraPaleta, desenha, ENQUADRAMENTO_PADRAO, escolhe, motor, NOMES_PALETA, PALETAS_ESTILO, SUPORTE, TEMAS, VARIACOES, ZONA_PADRAO,
  type Ajustes, type Ctx2D, type Elemento, type Enquadramento, type Fontes, type MetaFoto, type NomeTema,
  type ProvedorFoto, type Receita, type Resultado, type Tamanho, type TipoEstilo, type Zona
} from '@teu/motor'

useSeoMeta({ title: 'Editor' })

const supabase = useSupabaseClient()
const route = useRoute()
const toast = useToast()
const evento = useEvento()
const tempo = useTempoAtivo()
const id = String(route.params.id)

const { data: post } = await useAsyncData(`post-${id}`, async () => {
  const { data } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  return data
})
if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post não encontrado' })

/** Os Estilos, na ordem em que aparecem: primeiro os só de texto, depois os que usam foto. */
const ESTILOS: { tipo: TipoEstilo, nome: string, foto: boolean }[] = [
  { tipo: 'acento', nome: 'Acento', foto: false },
  { tipo: 'manchete', nome: 'Manchete', foto: false },
  { tipo: 'numero', nome: 'Número', foto: false },
  { tipo: 'zona', nome: 'Zona calma', foto: false },
  { tipo: 'sincope', nome: 'Síncope', foto: false },
  { tipo: 'riscada', nome: 'Riscada', foto: false },
  { tipo: 'heroi', nome: 'Herói', foto: true },
  { tipo: 'fina', nome: 'Letra fina', foto: true },
  { tipo: 'selo', nome: 'Foto que fala', foto: true },
  { tipo: 'duotom', nome: 'Duas tintas', foto: true },
  { tipo: 'vazio', nome: 'Vazio', foto: true },
  { tipo: 'ogilvy', nome: 'Foto e legenda', foto: true },
  { tipo: 'citacao', nome: 'Depoimento', foto: true }
]
const ehEstilo = (t: unknown): t is TipoEstilo => ESTILOS.some(e => e.tipo === t)

const { data: perfil } = await useMarca()
const marca = computed(() => marcaDoPerfil(perfil.value))
const logo = shallowRef<ImageBitmap>()

/** Tudo o que o Cliente ajusta fica em posts.ajustes (o enquadramento junto). */
type AjustesPost = Ajustes & { enquadramento?: Enquadramento }
const { enquadramento: enq0, ...aj0 } = (post.value.ajustes ?? {}) as AjustesPost
const ajustes = ref<Ajustes>(aj0)

const texto = ref(post.value.texto)
const legenda = ref(post.value.legenda)
/** null = o Cliente não escolheu: vale a sugestão do Motor. */
const estiloEscolhido = ref<TipoEstilo | null>(ehEstilo(post.value.estilo) ? post.value.estilo : null)
const enquadramento = ref<Enquadramento>({ ...ENQUADRAMENTO_PADRAO, ...enq0 })
/** Foto do Post = um Ativo (tratado na aba Ativos). Posts antigos têm a foto direto no Post (foto_path). */
const ativoId = ref<string | null>(post.value.ativo_id)
const fotoPath = ref<string | null>(post.value.ativo_id ? null : post.value.foto_path)
const fotoMeta = shallowRef<MetaFoto | null>(post.value.ativo_id ? null : post.value.foto_meta as MetaFoto | null)
const provedor = shallowRef<ProvedorFoto>()
const enviandoFoto = ref(false)
const inputFoto = ref<HTMLInputElement>()
const aceita = ACEITA_FOTO

const canvas = ref<HTMLCanvasElement>()
const fontes = shallowRef<Fontes>()
const resultado = shallowRef<Resultado>()
const salvo = ref<'salvo' | 'salvando' | 'erro'>('salvo')
const exportando = ref(false)
let criadoAvisado = !route.query.novo
let trocasEstilo = 0
let nAjustes = 0
let msRender = 0

const temFoto = computed(() => !!fotoMeta.value)
const sugerido = computed<TipoEstilo>(() => escolhe(texto.value.trim(), temFoto.value))
const estilo = computed(() => estiloEscolhido.value ?? sugerido.value)
const estiloComFoto = computed(() => ESTILOS.find(e => e.tipo === estilo.value)!.foto)
const suporte = computed(() => SUPORTE[estilo.value]!)

// ------------------------------------------------------------------ Ajustes (lista fechada)
const TAMANHOS: Record<Tamanho, string> = { P: 'P', M: 'M', G: 'G' }
const ZONAS: { z: Zona, nome: string, icon: string }[] = [
  { z: 'topo', nome: 'Em cima', icon: 'i-lucide-align-vertical-justify-start' },
  { z: 'centro', nome: 'No meio', icon: 'i-lucide-align-vertical-justify-center' },
  { z: 'base', nome: 'Embaixo', icon: 'i-lucide-align-vertical-justify-end' }
]
const NOMES_TEMA: Record<NomeTema, string> = { creme: 'Creme', noite: 'Noite', salvia: 'Sálvia', cobalto: 'Cobalto', rosa: 'Rosa', papel: 'Papel' }
const ELEMENTOS_UI: { k: Exclude<Elemento, 'cta'>, nome: string, dado: () => boolean }[] = [
  { k: 'assinatura', nome: '@ / nome', dado: () => !!(marca.value.perfil || marca.value.nome) },
  { k: 'logo', nome: 'Logo', dado: () => !!marca.value.logo },
  { k: 'selo', nome: 'Selo', dado: () => !!(marca.value.perfil || marca.value.nome) }
]
const tamanho = computed(() => ajustes.value.tamanho ?? 'M')
const zona = computed(() => ajustes.value.zona ?? ZONA_PADRAO[estilo.value])
/** Paletas do Estilo atual: as aprovadas da skill (Acento, Zona calma, Síncope) ou os temas (Estilos do publi). */
const paletas = computed(() => {
  const nomes = PALETAS_ESTILO[estilo.value]
  if (nomes) return nomes.map(k => ({ k, nome: NOMES_PALETA[k]!, cores: amostraPaleta(k)!.map(c => `rgb(${c.join(',')})`) }))
  return (Object.keys(NOMES_TEMA) as NomeTema[]).map(k => ({ k, nome: NOMES_TEMA[k], cores: [TEMAS[k].fundo, TEMAS[k].acento] }))
})
const corAtual = computed(() => {
  const c = ajustes.value.cor
  if (c && (c === 'marca' || paletas.value.some(p => p.k === c))) return c
  return marca.value.cor ? 'marca' : (PALETAS_ESTILO[estilo.value]?.[0] ?? (ajustes.value.modo === 'escuro' ? 'noite' : 'creme'))
})

// ------------------------------------------------------------------ Variações
const variacaoEscolhida = ref<string | null>(post.value.variacao)
const variacoes = computed(() => (VARIACOES[estilo.value] ?? []).filter(v => !v.foto || temFoto.value))
const variacao = computed(() => resultado.value?.variacao ?? null)
function trocaVariacao(v: string) {
  if (v === variacao.value) return
  ultimaAcao = 'variacao'
  evento('variacao_trocada', { estilo: estilo.value, de: variacao.value, para: v }, id)
  variacaoEscolhida.value = v
}
const elementoLigado = (e: (typeof ELEMENTOS_UI)[number]) => e.dado() && (ajustes.value.elementos?.[e.k] ?? (e.k !== 'selo'))

function ajusta(tipo: TipoAjuste, mudanca: Partial<Ajustes>) {
  ajustes.value = { ...ajustes.value, ...mudanca }
  ultimaAcao = 'ajuste'
  aplicou(tipo)
}
function escreveCta(v: string | number) {
  ajustes.value = { ...ajustes.value, cta: String(v) }
  ultimaAcao = 'ajuste'
}
function alternaElemento(e: (typeof ELEMENTOS_UI)[number]) {
  ajusta('elemento', { elementos: { ...ajustes.value.elementos, [e.k]: !elementoLigado(e) } })
}

// ajuste_aplicado: 1 evento por tipo a cada 1 s de calmaria (sem conteúdo, só o tipo)
type TipoAjuste = 'texto' | 'tamanho' | 'zona' | 'foto_enquadre' | 'cor' | 'elemento' | 'cta' | 'reforco' | 'textura'
const pendentes = new Set<TipoAjuste>()
const enviaAjustes = useDebounceFn(() => {
  for (const tipo of pendentes) {
    nAjustes++
    evento('ajuste_aplicado', { tipo, ms_render: Math.round(msRender * 10) / 10 }, id)
  }
  pendentes.clear()
}, 1000)
function aplicou(tipo: TipoAjuste) {
  pendentes.add(tipo)
  enviaAjustes()
}

// ------------------------------------------------------------------ Travas e avisos
type NomeTrava = 'texto_cortado' | 'contraste'
interface Acao { label: string, faz: () => void }
const TRAVAS: { trava: NomeTrava, re: RegExp }[] = [
  { trava: 'texto_cortado', re: /cortado|letra fina/ },
  { trava: 'contraste', re: /contraste/ }
]
/** Avisos que não bloqueiam (dicas). */
const DICAS: [RegExp, string][] = [
  [/pede foto/, 'Este Estilo fica melhor com foto. Envie uma foto ou escolha outro Estilo.'],
  [/emoji/, 'Tiramos os emojis: a fonte deste Estilo não desenha emoji.'],
  [/destaque grande/, 'A palavra em destaque ficou grande demais. Destaque só 1 palavra curta.'],
  [/manchete longa/, 'Manchete funciona melhor com até 12 palavras.'],
  [/pede o retrato/, 'Este Estilo pede o retrato de quem fala. Envie uma foto ou escolha outro Estilo.'],
  [/falta o número/, 'Este Estilo precisa de um número no texto (ex.: 1.200, 98%, 15 anos).'],
  [/falta o objeto/, 'Envie a foto do produto ou escreva um preço ou valor (ex.: R$ 49,90).'],
  [/vazio é a mensagem|foto é a mensagem|legenda longa|citação longa|letra riscada/, 'Este Estilo fica melhor com menos palavras.']
]
const avisosMotor = computed(() => resultado.value?.cena.travas.avisos ?? [])
const travas = computed(() => TRAVAS.filter(t => avisosMotor.value.some(a => t.re.test(a))).map(t => t.trava))
const dicas = computed(() => DICAS.filter(([re]) => avisosMotor.value.some(a => re.test(a))).map(([, m]) => m))
const bloqueado = computed(() => travas.value.length > 0 || !texto.value.trim() || enviandoFoto.value)

/** Outra zona em que o contraste passa (o Motor confere antes de sugerir). */
const zonaBoa = computed<Zona | null>(() => {
  if (!travas.value.includes('contraste') || !suporte.value.zona || !fontes.value) return null
  for (const z of ZONAS.map(x => x.z).filter(z => z !== zona.value)) {
    const r = motor({ ...entrada(), ajustes: { ...ajustes.value, zona: z } }, fontes.value)
    if (!r.cena.travas.avisos.some(a => /contraste/.test(a))) return z
  }
  return null
})

function mensagemTrava(t: NomeTrava): { titulo: string, acoes: Acao[] } {
  if (t === 'contraste') {
    const acoes: Acao[] = []
    if (zonaBoa.value) {
      const nome = ZONAS.find(z => z.z === zonaBoa.value)!.nome.toLowerCase()
      acoes.push({ label: `Mover o texto para ${nome}`, faz: () => ajusta('zona', { zona: zonaBoa.value! }) })
    }
    if (!ajustes.value.reforco) acoes.push({ label: 'Escurecer atrás do texto', faz: () => ajusta('reforco', { reforco: true }) })
    return { titulo: 'A letra está difícil de ler sobre esta parte da foto.', acoes }
  }
  const acoes: Acao[] = []
  if (suporte.value.tamanho.includes('P') && tamanho.value !== 'P') acoes.push({ label: 'Diminuir a letra', faz: () => ajusta('tamanho', { tamanho: 'P' }) })
  if (estilo.value === 'fina') acoes.push({ label: 'Usar Foto e legenda', faz: () => trocaEstilo('ogilvy') })
  else if (['acento', 'zona', 'sincope', 'riscada', 'numero'].includes(estilo.value)) acoes.push({ label: 'Usar Manchete', faz: () => trocaEstilo('manchete') })
  return { titulo: 'O texto não cabe inteiro: uma parte foi cortada. Encurte, divida em 2 Posts ou use uma das opções.', acoes }
}

// trava_disparada / trava_resolvida (estável por 1,5 s, para não disparar a cada letra digitada)
let ultimaAcao: 'ajuste' | 'estilo' | 'variacao' = 'ajuste'
let travasAvisadas: NomeTrava[] = []
const conferirTravas = useDebounceFn(() => {
  const agora = travas.value
  for (const t of agora.filter(t => !travasAvisadas.includes(t))) {
    evento('trava_disparada', { estilo: estilo.value, variacao: variacao.value, trava: t, bloqueante: true }, id)
  }
  for (const t of travasAvisadas.filter(t => !agora.includes(t))) evento('trava_resolvida', { trava: t, acao: ultimaAcao }, id)
  travasAvisadas = [...agora]
}, 1500)
watch(travas, conferirTravas)

// ------------------------------------------------------------------ preview
function entrada() {
  return {
    texto: texto.value || ' ',
    estilo: estilo.value,
    variacao: variacaoEscolhida.value ?? undefined,
    foto: fotoMeta.value ?? undefined,
    enquadramento: enquadramento.value,
    marca: marca.value,
    ajustes: ajustes.value
  }
}

function render() {
  if (!fontes.value || !canvas.value) return
  const t0 = performance.now()
  try {
    resultado.value = motor(entrada(), fontes.value)
  } catch (e) {
    return evento('erro_motor', { estilo: estilo.value, variacao: variacao.value, etapa: 'layout', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
  }
  try {
    desenha(canvas.value.getContext('2d') as unknown as Ctx2D, resultado.value.cena, fontes.value, { foto: provedor.value, logo: logo.value, tela: novaTela, textura: texturaDe })
    msRender = performance.now() - t0
  } catch (e) {
    evento('erro_motor', { estilo: estilo.value, variacao: variacao.value, etapa: 'desenho', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
  }
}

// ------------------------------------------------------------------ salvamento automático
const salva = useDebounceFn(async () => {
  salvo.value = 'salvando'
  const { error } = await supabase.from('posts').update({
    texto: texto.value,
    estilo: estiloEscolhido.value,
    variacao: variacaoEscolhida.value,
    ajustes: { ...ajustes.value, enquadramento: enquadramento.value } as never,
    legenda: legenda.value,
    ativo_id: ativoId.value,
    foto_path: fotoPath.value,
    foto_meta: (fotoPath.value ? fotoMeta.value : null) as never
  }).eq('id', id)
  salvo.value = error ? 'erro' : 'salvo'
  if (!error && !criadoAvisado && texto.value.trim()) {
    criadoAvisado = true
    evento('post_criado', { tem_foto: temFoto.value, tem_pauta: false, n_palavras: texto.value.trim().split(/\s+/).length }, id)
  }
}, 800)

// miniatura de Meus Posts: grava um tempo depois da última mudança, ao sair do editor e na Exportação
const { gravaMiniatura } = usePosts()
let miniaturaPendente = false
function miniatura() {
  if (!miniaturaPendente || !canvas.value || !resultado.value) return
  miniaturaPendente = false
  gravaMiniatura(post.value!.cliente_id, id, canvas.value).catch(e => console.warn('miniatura não gravada', e))
}
const miniaturaDepois = useDebounceFn(miniatura, 4000)
onBeforeRouteLeave(miniatura)

function mudou() {
  render()
  salvo.value = 'salvando'
  salva()
  miniaturaPendente = true
  miniaturaDepois()
}
watch([texto, estiloEscolhido, variacaoEscolhida, enquadramento, fotoMeta, ajustes, legenda, logo, ativoId], mudou, { deep: true })
watch(versaoTexturas, render)
watch(texto, () => {
  ultimaAcao = 'ajuste'
  aplicou('texto')
})
watch(() => ajustes.value.cta, () => aplicou('cta'))

async function copiaLegenda() {
  await navigator.clipboard.writeText(legenda.value)
  evento('legenda_copiada', { n_hashtags: (legenda.value.match(/#[\p{L}\p{N}_]+/gu) ?? []).length }, id)
  toast.add({ title: 'Legenda copiada', color: 'success', icon: 'i-lucide-copy' })
}

function trocaEstilo(t: TipoEstilo) {
  if (t === estilo.value) return
  trocasEstilo++
  ultimaAcao = 'estilo'
  evento('estilo_trocado', { de: estilo.value, para: t, posicao_na_lista: ESTILOS.findIndex(e => e.tipo === t) }, id)
  estiloEscolhido.value = t
  variacaoEscolhida.value = null
}

// ------------------------------------------------------------------ foto (Ativo)
/** Usa um Ativo no Post: baixa o original, aplica a receita e analisa a imagem tratada. */
async function usaAtivo(a: Ativo) {
  const blob = await originalDe(supabase, a.path)
  if (!blob) return toast.add({ title: 'Não deu para abrir a imagem deste Post', color: 'warning' })
  const t = await ativoTratado(blob, a.receita as Receita, marca.value.cor)
  provedor.value = await provedorDe(t.canvas)
  fotoMeta.value = t.meta
  render()
}

async function enviaFoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = ''
  if (!arquivo) return
  enviandoFoto.value = true
  try {
    // a foto enviada no editor também fica nos Ativos (dá para tratar e reusar)
    const r = await enviaAtivo(supabase, post.value!.cliente_id, arquivo)
    evento('ativo_enviado', { formato_origem: r.formato, bytes: arquivo.size, ms_processamento: r.ms })
    evento('foto_enviada', { formato_origem: r.formato, bytes: arquivo.size, ms_processamento: r.ms, rosto_detectado: false }, id)
    await trocaAtivo(r.ativo)
  } catch (e) {
    const msg = e instanceof ErroFoto ? e.message : 'Não deu para usar essa foto. Tente outra.'
    if (!(e instanceof ErroFoto)) evento('erro_motor', { estilo: estilo.value, variacao: variacao.value, etapa: 'foto', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
    toast.add({ title: msg, color: 'error' })
  } finally {
    enviandoFoto.value = false
  }
}

async function trocaAtivo(a: Ativo) {
  escolhendoAtivo.value = false
  if (fotoPath.value) supabase.storage.from('fotos').remove([fotoPath.value]) // foto antiga, de antes dos Ativos
  fotoPath.value = null
  enquadramento.value = { ...ENQUADRAMENTO_PADRAO }
  ativoId.value = a.id
  await usaAtivo(a)
}

/** Tira a foto do Post (o Ativo continua na aba Ativos). */
function removeFoto() {
  if (fotoPath.value) supabase.storage.from('fotos').remove([fotoPath.value])
  fotoPath.value = null
  ativoId.value = null
  fotoMeta.value = null
  provedor.value = undefined
}

async function carregaFoto() {
  if (ativoId.value) {
    const { data } = await supabase.from('ativos').select('*').eq('id', ativoId.value).maybeSingle()
    if (data) return usaAtivo(data)
    ativoId.value = null
    return
  }
  if (!fotoPath.value) return
  const { data, error } = await supabase.storage.from('fotos').download(fotoPath.value)
  if (error || !data) return toast.add({ title: 'Não deu para abrir a foto deste Post', color: 'warning' })
  provedor.value = await provedorDe(data)
  render()
}

// escolher dos Ativos
const escolhendoAtivo = ref(false)
const { data: listaAtivos, refresh: atualizaAtivos } = await useAsyncData('ativos-editor', async () => {
  const { data } = await supabase.from('ativos').select('*').order('criado_em', { ascending: false })
  return data ?? []
}, { lazy: true, server: false })
function abreAtivos() {
  atualizaAtivos()
  escolhendoAtivo.value = true
}

// ------------------------------------------------------------------ textura no Post (fundo ou letra)
const texturas = ref<Textura[]>([])
const textura = computed(() => ajustes.value.textura ?? null)
function escolheTextura(t: string | null) {
  ajusta('textura', { textura: t ? { id: t, onde: textura.value?.onde ?? 'fundo', forca: textura.value?.forca ?? 'leve' } : undefined })
}

// arrastar na prévia: o texto (encaixa em cima / no meio / embaixo) ou a foto (enquadrar)
let arrasto: { x: number, y: number } | null = null
const itemFoto = computed(() => resultado.value?.cena.itens.find(i => i.tipo === 'foto'))
/** Caixa do texto principal na peça (as letras maiores), para saber se o dedo/mouse pegou o texto. */
const caixaTexto = computed(() => {
  const f = fontes.value
  const its = (resultado.value?.cena.itens ?? []).filter(i => i.tipo === 'texto')
  if (!f || !its.length) return null
  const maior = Math.max(...its.map(i => i.tam))
  let c = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const i of its.filter(i => i.tam >= maior * 0.6)) {
    c = { x0: Math.min(c.x0, i.x), y0: Math.min(c.y0, i.y - i.tam * 0.8), x1: Math.max(c.x1, i.x + f[i.fonte].largura(i.texto, i.tam)), y1: Math.max(c.y1, i.y + i.tam * 0.25) }
  }
  return c
})
const arrastandoTexto = ref(false)
const sobreTexto = ref(false)
/** Ponto do ponteiro em px da peça (1080 de largura). */
function naPeca(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  const k = 1080 / r.width
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }
}
function pegouTexto(e: PointerEvent) {
  const c = caixaTexto.value
  if (!suporte.value.zona || !c || !canvas.value) return false
  const p = naPeca(e)
  return p.x >= c.x0 - 24 && p.x <= c.x1 + 24 && p.y >= c.y0 - 24 && p.y <= c.y1 + 24
}
/** Zona em que o texto encaixa ao soltar: o terço da peça em que está o ponteiro. */
function zonaEm(e: PointerEvent): Zona {
  const y = naPeca(e).y / (resultado.value?.cena.altura ?? 1350)
  return y < 1 / 3 ? 'topo' : y < 2 / 3 ? 'centro' : 'base'
}
function arrastaInicio(e: PointerEvent) {
  if (pegouTexto(e)) {
    arrastandoTexto.value = true
  } else if (!itemFoto.value) {
    return
  }
  arrasto = { x: e.clientX, y: e.clientY }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function arrasta(e: PointerEvent) {
  if (!arrasto) {
    sobreTexto.value = pegouTexto(e)
    return
  }
  if (arrastandoTexto.value) {
    const z = zonaEm(e)
    if (z !== zona.value) ajustes.value = { ...ajustes.value, zona: z }
    return
  }
  const it = itemFoto.value
  if (!it || it.tipo !== 'foto' || !fotoMeta.value || !canvas.value) return
  const k = 1080 / canvas.value.clientWidth // px da tela → px da peça
  const dx = (e.clientX - arrasto.x) * k * it.recorte.sw / it.w
  const dy = (e.clientY - arrasto.y) * k * it.recorte.sh / it.h
  arrasto = { x: e.clientX, y: e.clientY }
  const folgaX = fotoMeta.value.largura - it.recorte.sw
  const folgaY = fotoMeta.value.altura - it.recorte.sh
  const lim = (v: number) => Math.min(1, Math.max(0, v))
  enquadramento.value = {
    ...enquadramento.value,
    x: folgaX > 0.5 ? lim(enquadramento.value.x - dx / folgaX) : enquadramento.value.x,
    y: folgaY > 0.5 ? lim(enquadramento.value.y - dy / folgaY) : enquadramento.value.y
  }
}
function arrastaFim() {
  if (arrasto && arrastandoTexto.value) {
    ultimaAcao = 'ajuste'
    aplicou('zona')
  } else if (arrasto) {
    aplicou('foto_enquadre')
  }
  arrasto = null
  arrastandoTexto.value = false
}

// ------------------------------------------------------------------ Exportação
async function exporta() {
  if (!canvas.value || bloqueado.value) return
  exportando.value = true
  const t0 = performance.now()
  const blob = await new Promise<Blob | null>(r => canvas.value!.toBlob(r, 'image/png'))
  if (!blob) {
    exportando.value = false
    evento('erro_motor', { estilo: estilo.value, variacao: variacao.value, etapa: 'exportacao', mensagem_curta: 'toBlob vazio' }, id)
    return toast.add({ title: 'Não deu para gerar a imagem', color: 'error' })
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `post-${new Date().toISOString().slice(0, 10)}.png`
  a.click()
  URL.revokeObjectURL(a.href)
  const reexport = post.value!.status === 'exportado'
  await supabase.from('posts').update({ texto: texto.value, legenda: legenda.value, status: 'exportado', exportado_em: new Date().toISOString() }).eq('id', id)
  post.value!.status = 'exportado'
  miniaturaPendente = true
  miniatura()
  evento('post_exportado', {
    estilo: estilo.value, variacao: variacao.value, n_trocas_estilo: trocasEstilo, n_ajustes: nAjustes,
    tempo_ativo_ms: tempo.ms(), ms_export: Math.round(performance.now() - t0), reexport
  }, id)
  exportando.value = false
  toast.add({ title: 'Imagem baixada', description: 'Pronta para postar no Instagram.', color: 'success', icon: 'i-lucide-download' })
}

onMounted(async () => {
  evento('editor_aberto', { novo: !!route.query.novo }, id)
  fontes.value = await useFontes()
  render()
  carregaFoto()
  texturas.value = await useCatalogoTexturas()
  logo.value = await carregaLogo(supabase, perfil.value?.logo_path)
})
</script>

<template>
  <UDashboardPanel id="editor">
    <template #header>
      <UDashboardNavbar title="Editor">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/posts"
            aria-label="Voltar"
          />
        </template>
        <template #right>
          <span class="text-sm text-muted">{{ { salvo: 'Salvo', salvando: 'Salvando…', erro: 'Não salvou' }[salvo] }}</span>
          <UButton
            label="Baixar imagem"
            icon="i-lucide-download"
            :disabled="bloqueado"
            :loading="exportando"
            @click="exporta"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col xl:flex-row gap-8 items-start">
        <div class="flex flex-col gap-5 w-full xl:w-72 shrink-0">
          <UFormField label="Seu texto" help="Uma frase curta e forte funciona melhor. Use *asteriscos* para escolher a palavra em destaque.">
            <UTextarea
              v-model="texto"
              :rows="5"
              autoresize
              autofocus
              placeholder="Menos ruído, mais resultado"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Foto (opcional)">
            <input
              ref="inputFoto"
              type="file"
              :accept="aceita"
              class="hidden"
              data-testid="input-foto"
              @change="enviaFoto"
            >
            <div class="flex flex-wrap gap-2">
              <UButton
                :label="temFoto ? 'Trocar foto' : 'Enviar foto'"
                icon="i-lucide-image-plus"
                color="neutral"
                variant="outline"
                :loading="enviandoFoto"
                @click="inputFoto?.click()"
              />
              <UButton
                label="Dos Ativos"
                icon="i-lucide-folder-open"
                color="neutral"
                variant="outline"
                @click="abreAtivos"
              />
              <UButton
                v-if="ativoId"
                label="Tratar imagem"
                icon="i-lucide-wand-sparkles"
                color="neutral"
                variant="ghost"
                :to="`/ativos?id=${ativoId}`"
              />
              <UButton
                v-if="temFoto"
                label="Remover"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="removeFoto"
              />
            </div>
            <UModal v-model:open="escolhendoAtivo" title="Escolher dos Ativos" :ui="{ content: 'sm:max-w-3xl' }">
              <template #body>
                <UEmpty
                  v-if="!listaAtivos?.length"
                  icon="i-lucide-images"
                  title="Nenhuma imagem nos Ativos ainda"
                  description="Use Enviar foto: ela entra nos Ativos e no Post."
                />
                <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <button
                    v-for="a in listaAtivos"
                    :key="a.id"
                    type="button"
                    class="rounded-md ring-2 ring-offset-2 ring-offset-default"
                    :class="a.id === ativoId ? 'ring-primary' : 'ring-transparent hover:ring-accented'"
                    data-testid="escolhe-ativo"
                    @click="trocaAtivo(a)"
                  >
                    <AtivosMiniatura :path="a.path" :receita="a.receita as Receita" :cor-marca="marca.cor" />
                  </button>
                </div>
              </template>
            </UModal>
          </UFormField>

          <UFormField v-if="temFoto && estiloComFoto" label="Zoom da foto" help="Arraste a foto na prévia para enquadrar.">
            <USlider
              v-model="enquadramento.zoom"
              :min="1"
              :max="3"
              :step="0.05"
              aria-label="Zoom da foto"
              @update:model-value="aplicou('foto_enquadre')"
            />
          </UFormField>

          <UFormField label="Estilo">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="e in ESTILOS"
                :key="e.tipo"
                :color="e.tipo === estilo ? 'primary' : 'neutral'"
                :variant="e.tipo === estilo ? 'solid' : 'outline'"
                @click="trocaEstilo(e.tipo)"
              >
                {{ e.nome }}
                <UBadge
                  v-if="e.tipo === sugerido"
                  label="sugerido"
                  size="sm"
                  :color="e.tipo === estilo ? 'neutral' : 'primary'"
                  variant="subtle"
                />
              </UButton>
            </div>
          </UFormField>

          <UFormField v-if="variacoes.length > 1" label="Variação">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="v in variacoes"
                :key="v.id"
                :label="v.nome"
                size="sm"
                :color="v.id === variacao ? 'primary' : 'neutral'"
                :variant="v.id === variacao ? 'solid' : 'outline'"
                @click="trocaVariacao(v.id)"
              />
            </div>
          </UFormField>
        </div>

        <div class="flex flex-col gap-3 w-full max-w-md">
          <div class="relative">
            <canvas
              ref="canvas"
              width="1080"
              height="1350"
              class="w-full rounded-md shadow ring ring-default touch-none"
              :class="arrastandoTexto ? 'cursor-grabbing' : sobreTexto ? 'cursor-move' : itemFoto ? 'cursor-grab active:cursor-grabbing' : ''"
              aria-label="Prévia do Post"
              data-testid="previa"
              @pointerdown="arrastaInicio"
              @pointermove="arrasta"
              @pointerup="arrastaFim"
              @pointercancel="arrastaFim"
            />
            <!-- ao arrastar o texto: as 3 posições em que ele encaixa -->
            <div v-if="arrastandoTexto" class="absolute inset-0 flex flex-col pointer-events-none rounded-md overflow-hidden">
              <div
                v-for="z in ZONAS"
                :key="z.z"
                class="flex-1 flex items-center justify-center border-2 border-dashed text-sm font-medium"
                :class="z.z === zona ? 'border-primary bg-primary/15 text-white' : 'border-white/40 text-white/70'"
              >
                <span class="px-2 py-0.5 rounded bg-black/50">{{ z.nome }}</span>
              </div>
            </div>
          </div>
          <p v-if="suporte.zona" class="text-xs text-muted -mt-1">
            Arraste o texto na prévia para mudar a posição.
          </p>
          <UAlert
            v-for="t in travas"
            :key="t"
            color="error"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :title="mensagemTrava(t).titulo"
            :actions="mensagemTrava(t).acoes.map(a => ({ label: a.label, color: 'error', variant: 'solid', size: 'xs', onClick: a.faz }))"
            data-testid="trava"
          />
          <UAlert
            v-for="msg in dicas"
            :key="msg"
            color="warning"
            variant="subtle"
            :title="msg"
          />
        </div>

        <div class="flex flex-col gap-5 w-full xl:w-72 shrink-0">
          <UFormField label="Tamanho da letra">
            <div class="flex gap-2">
              <UButton
                v-for="t in suporte.tamanho"
                :key="t"
                :label="TAMANHOS[t]"
                class="w-10 justify-center"
                :color="t === tamanho ? 'primary' : 'neutral'"
                :variant="t === tamanho ? 'solid' : 'outline'"
                :aria-label="`Letra ${t}`"
                @click="ajusta('tamanho', { tamanho: t })"
              />
            </div>
          </UFormField>

          <UFormField v-if="suporte.zona" label="Posição do texto">
            <div class="flex gap-2">
              <UTooltip v-for="z in ZONAS" :key="z.z" :text="z.nome">
                <UButton
                  :icon="z.icon"
                  :color="z.z === zona ? 'primary' : 'neutral'"
                  :variant="z.z === zona ? 'solid' : 'outline'"
                  :aria-label="`Texto ${z.nome.toLowerCase()}`"
                  @click="ajusta('zona', { zona: z.z })"
                />
              </UTooltip>
            </div>
          </UFormField>

          <UFormField v-if="suporte.cor" label="Cores">
            <div class="flex flex-wrap gap-2 items-center">
              <UTooltip v-if="marca.cor" text="Cor da sua marca">
                <button
                  type="button"
                  class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default"
                  :class="corAtual === 'marca' ? 'ring-primary' : 'ring-transparent'"
                  :style="{ background: marca.cor }"
                  aria-label="Cor da sua marca"
                  @click="ajusta('cor', { cor: 'marca' })"
                />
              </UTooltip>
              <UTooltip v-for="p in paletas" :key="p.k" :text="p.nome">
                <button
                  type="button"
                  class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default overflow-hidden flex"
                  :class="corAtual === p.k ? 'ring-primary' : 'ring-transparent'"
                  :aria-label="`Cores ${p.nome}`"
                  @click="ajusta('cor', { cor: p.k })"
                >
                  <span class="w-1/2 h-full" :style="{ background: p.cores[0] }" />
                  <span class="w-1/2 h-full" :style="{ background: p.cores[1] }" />
                </button>
              </UTooltip>
            </div>
            <div v-if="suporte.modo" class="flex gap-2 mt-3">
              <UButton
                v-for="m in (['claro', 'escuro'] as const)"
                :key="m"
                :label="m === 'claro' ? 'Claro' : 'Escuro'"
                size="sm"
                :color="(ajustes.modo ?? 'claro') === m ? 'primary' : 'neutral'"
                :variant="(ajustes.modo ?? 'claro') === m ? 'solid' : 'outline'"
                @click="ajusta('cor', { modo: m })"
              />
            </div>
          </UFormField>

          <UFormField v-if="texturas.length" label="Textura">
            <SeletorTextura :texturas="texturas" :valor="textura?.id ?? null" @escolhe="escolheTextura" />
            <div v-if="textura" class="flex flex-wrap gap-2 mt-3">
              <UButton
                v-for="o in ([['fundo', 'No fundo'], ['letra', 'Na letra']] as const)"
                :key="o[0]"
                :label="o[1]"
                size="sm"
                :color="textura.onde === o[0] ? 'primary' : 'neutral'"
                :variant="textura.onde === o[0] ? 'solid' : 'outline'"
                @click="ajusta('textura', { textura: { ...textura, onde: o[0] } })"
              />
              <UButton
                v-for="f in ([['leve', 'Leve'], ['forte', 'Forte']] as const)"
                :key="f[0]"
                :label="f[1]"
                size="sm"
                :color="(textura.forca ?? 'leve') === f[0] ? 'primary' : 'neutral'"
                :variant="(textura.forca ?? 'leve') === f[0] ? 'solid' : 'outline'"
                @click="ajusta('textura', { textura: { ...textura, forca: f[0] } })"
              />
            </div>
          </UFormField>

          <UFormField label="Na imagem">
            <div class="flex flex-wrap gap-2">
              <UTooltip
                v-for="e in ELEMENTOS_UI"
                :key="e.k"
                :text="e.dado() ? '' : 'Preencha no Perfil de Marca'"
                :disabled="e.dado()"
              >
                <UButton
                  :label="e.nome"
                  size="sm"
                  :icon="elementoLigado(e) ? 'i-lucide-check' : undefined"
                  :color="elementoLigado(e) ? 'primary' : 'neutral'"
                  :variant="elementoLigado(e) ? 'soft' : 'outline'"
                  :disabled="!e.dado()"
                  @click="alternaElemento(e)"
                />
              </UTooltip>
            </div>
            <ULink v-if="!perfil" to="/marca" class="text-xs text-primary mt-2 inline-block">
              Preencher o Perfil de Marca
            </ULink>
          </UFormField>

          <UFormField label="Chamada para ação (CTA)" help="Opcional. Você escreve, a gente só posiciona.">
            <UInput
              :model-value="ajustes.cta ?? ''"
              maxlength="60"
              placeholder="Ex.: Agende pelo link da bio"
              class="w-full"
              @update:model-value="escreveCta"
            />
          </UFormField>

          <UFormField label="Legenda" help="Com as hashtags deste Post, se quiser.">
            <UTextarea
              v-model="legenda"
              :rows="4"
              autoresize
              placeholder="Escreva a legenda do Instagram"
              class="w-full"
            />
            <UButton
              label="Copiar legenda"
              icon="i-lucide-copy"
              size="sm"
              color="neutral"
              variant="outline"
              class="mt-2"
              :disabled="!legenda.trim()"
              @click="copiaLegenda"
            />
          </UFormField>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
