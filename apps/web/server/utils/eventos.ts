import type { H3Event } from 'h3'
import { z } from 'zod'

// Telemetria (docs/medicao/tecnico.md): props só com metadados, NUNCA conteúdo do Cliente.
// .strict() recusa qualquer campo a mais (ex.: texto da legenda colado por engano).
export const PROPS = {
  convite_enviado: z.object({ lote_id: z.uuid(), origem: z.enum(['manual', 'planilha']) }).strict(),
  editor_aberto: z.object({ novo: z.boolean() }).strict(),
  post_criado: z.object({ tem_foto: z.boolean(), tem_pauta: z.boolean(), n_palavras: z.int().min(0) }).strict(),
  post_exportado: z.object({
    estilo: z.string().max(20),
    variacao: z.string().max(20).nullable(),
    n_trocas_estilo: z.int().min(0),
    n_ajustes: z.int().min(0),
    tempo_ativo_ms: z.int().min(0),
    ms_export: z.number().min(0),
    reexport: z.boolean()
  }).strict(),
  estilo_trocado: z.object({ de: z.string().max(20), para: z.string().max(20), posicao_na_lista: z.int().min(0) }).strict(),
  foto_enviada: z.object({
    formato_origem: z.enum(['jpeg', 'png', 'heic']),
    bytes: z.int().min(0),
    ms_processamento: z.number().min(0),
    rosto_detectado: z.boolean()
  }).strict(),
  perfil_atualizado: z.object({
    campos_preenchidos: z.array(z.enum(['nome', 'arroba', 'cor', 'logo'])).max(4)
  }).strict(),
  ajuste_aplicado: z.object({
    tipo: z.enum(['texto', 'tamanho', 'zona', 'foto_enquadre', 'cor', 'elemento', 'cta', 'reforco']),
    ms_render: z.number().min(0).optional()
  }).strict(),
  trava_disparada: z.object({
    estilo: z.string().max(20),
    variacao: z.string().max(20).nullable(),
    trava: z.enum(['texto_cortado', 'contraste']),
    bloqueante: z.boolean()
  }).strict(),
  trava_resolvida: z.object({ trava: z.enum(['texto_cortado', 'contraste']), acao: z.enum(['variacao', 'estilo', 'ajuste']) }).strict(),
  variacao_trocada: z.object({ estilo: z.string().max(20), de: z.string().max(20).nullable(), para: z.string().max(20) }).strict(),
  legenda_copiada: z.object({ n_hashtags: z.int().min(0) }).strict(),
  erro_motor: z.object({
    estilo: z.string().max(20),
    variacao: z.string().max(20).nullable(),
    etapa: z.enum(['layout', 'desenho', 'exportacao', 'foto']),
    mensagem_curta: z.string().max(120)
  }).strict()
} as const

export type NomeEvento = keyof typeof PROPS

/** Eventos que o browser do Cliente pode mandar por /api/eventos. */
export const DO_CLIENTE = [
  'editor_aberto', 'post_criado', 'estilo_trocado', 'foto_enviada', 'post_exportado', 'erro_motor',
  'perfil_atualizado', 'ajuste_aplicado', 'trava_disparada', 'trava_resolvida', 'legenda_copiada', 'variacao_trocada'
] as const satisfies NomeEvento[]

export async function registraEvento(event: H3Event, e: {
  nome: NomeEvento
  parceiro_id: string
  cliente_id?: string | null
  post_id?: string | null
  sessao_id?: string | null
  props: unknown
}) {
  const props = PROPS[e.nome].parse(e.props)
  const { error } = await servico(event).from('eventos').insert({
    nome: e.nome,
    parceiro_id: e.parceiro_id,
    cliente_id: e.cliente_id ?? null,
    post_id: e.post_id ?? null,
    sessao_id: e.sessao_id ?? null,
    props,
    versao_app: useRuntimeConfig().public.versaoApp
  })
  if (error) console.error('evento não gravado', e.nome, error.message)
}
