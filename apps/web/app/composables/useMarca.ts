// Perfil de Marca do Cliente: dados que aparecem nos Posts. Todos opcionais (CONTEXT.md).
import type { Marca } from '@teu/motor'
import type { Database } from '~/types/database.types'

export type PerfilMarca = Database['public']['Tables']['perfis_marca']['Row']

export interface LogoMeta { largura: number, altura: number }
/** O Perfil como o formulário edita (logo_meta tipado, em vez de Json). */
export type FormPerfil = Omit<PerfilMarca, 'cliente_id' | 'atualizado_em' | 'logo_meta'> & { logo_meta: LogoMeta | null }

export const PERFIL_VAZIO: FormPerfil = {
  nome: '', arroba: '', cor: null, contato: '', hashtags: '', logo_path: null, logo_meta: null
}

/** O Perfil do Cliente logado (ou vazio, se ele pulou). */
export function useMarca() {
  const supabase = useSupabaseClient()
  return useAsyncData('marca', async () => {
    const { data } = await supabase.from('perfis_marca').select('*').maybeSingle()
    return data
  })
}

/** Perfil → o que o Motor recebe. O logo vai só com o tamanho; a imagem é entregue ao Desenhista. */
export function marcaDoPerfil(p: FormPerfil | PerfilMarca | null | undefined): Marca {
  if (!p) return {}
  const logo = p.logo_meta as LogoMeta | null
  return {
    nome: p.nome || undefined,
    perfil: p.arroba ? (p.arroba.startsWith('@') ? p.arroba : `@${p.arroba}`) : undefined,
    cor: p.cor ?? undefined,
    contato: p.contato || undefined,
    logo: p.logo_path && logo ? { largura: logo.largura, altura: logo.altura } : undefined
  }
}

/** Campos preenchidos (só os nomes, nunca os valores: vai para a telemetria). */
export function camposPreenchidos(p: Partial<FormPerfil>): string[] {
  return (['nome', 'arroba', 'cor', 'contato', 'hashtags', 'logo_path'] as const)
    .filter(k => !!p[k]).map(k => (k === 'logo_path' ? 'logo' : k))
}

const LOGO_MAX = 800

/** Logo escolhido → PNG de até 800 px (mantém a transparência) + tamanho. */
export async function preparaLogo(arquivo: File): Promise<{ blob: Blob, largura: number, altura: number }> {
  if (arquivo.size > 10 * 1024 * 1024) throw new ErroFoto('O logo passa de 10 MB. Escolha um menor.')
  if (!/png|jpe?g/i.test(arquivo.type)) throw new ErroFoto('Use o logo em PNG (de preferência com fundo transparente) ou JPEG.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(arquivo)
  } catch {
    throw new ErroFoto('Não conseguimos abrir esse logo. Tente outro arquivo.')
  }
  const k = Math.min(1, LOGO_MAX / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/png'))
  if (!blob) throw new ErroFoto('Não conseguimos preparar o logo. Tente outro arquivo.')
  return { blob, largura: w, altura: h }
}

/** Imagem do logo pronta para o Desenhista (ou undefined sem logo / se falhar). */
interface ComStorage { storage: { from(b: string): { download(p: string): Promise<{ data: Blob | null }> } } }

export async function carregaLogo(supabase: ComStorage, path: string | null | undefined): Promise<ImageBitmap | undefined> {
  if (!path) return undefined
  const { data } = await supabase.storage.from('fotos').download(path)
  return data ? createImageBitmap(data) : undefined
}
