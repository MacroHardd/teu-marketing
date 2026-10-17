import type { Tables } from '~/types/database.types'

type Post = Tables<'posts'>

/** Miniatura do Post na grade de Meus Posts: cópia pequena da prévia, gravada pelo editor. */
export const miniaturaDe = (clienteId: string, postId: string) => `${clienteId}/miniaturas/${postId}.jpg`
const LARGURA_MINIATURA = 270 // 1/4 de 1080: 4:5 → 270×338

/** Duplicar, excluir e miniaturas dos Posts (J4). Tudo pelo browser do Cliente, dentro da RLS. */
export function usePosts() {
  const supabase = useSupabaseClient()

  /** Cria um Rascunho igual ao Post (texto, Estilo, Variação, Ajustes, legenda e foto). Devolve o id novo. */
  async function duplica(p: Post): Promise<string | null> {
    const { id: _id, criado_em: _c, atualizado_em: _a, exportado_em: _e, status: _s, foto_path, ...resto } = p
    const { data, error } = await supabase.from('posts').insert({ ...resto, status: 'rascunho' }).select('id').single()
    if (error || !data) return null
    // foto antiga (de antes dos Ativos) mora na pasta do Post: copia, para excluir um não apagar a do outro
    if (foto_path) {
      const destino = `${p.cliente_id}/${data.id}/${foto_path.split('/').pop()}`
      const { error: e } = await supabase.storage.from('fotos').copy(foto_path, destino)
      if (!e) await supabase.from('posts').update({ foto_path: destino }).eq('id', data.id)
    }
    const { data: blob } = await supabase.storage.from('fotos').download(miniaturaDe(p.cliente_id, p.id))
    if (blob) await supabase.storage.from('fotos').upload(miniaturaDe(p.cliente_id, data.id), blob, { contentType: 'image/jpeg', upsert: true })
    return data.id
  }

  /** Apaga o Post, a miniatura e a foto antiga. O Ativo continua na aba Ativos. */
  async function exclui(p: Post): Promise<boolean> {
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) return false
    supabase.storage.from('fotos').remove([miniaturaDe(p.cliente_id, p.id), ...(p.foto_path ? [p.foto_path] : [])])
    return true
  }

  /** URL assinada da miniatura de cada Post que tem uma. */
  async function miniaturas(clienteId: string): Promise<Record<string, string>> {
    const { data: arquivos } = await supabase.storage.from('fotos').list(`${clienteId}/miniaturas`, { limit: 1000 })
    const paths = (arquivos ?? []).map(a => `${clienteId}/miniaturas/${a.name}`)
    if (!paths.length) return {}
    const { data } = await supabase.storage.from('fotos').createSignedUrls(paths, 3600)
    const r: Record<string, string> = {}
    for (const s of data ?? []) {
      const postId = s.path?.split('/').pop()?.replace(/\.jpg$/, '')
      if (postId && s.signedUrl) r[postId] = s.signedUrl
    }
    return r
  }

  /** Grava a miniatura a partir do canvas da prévia (1080×1350). */
  async function gravaMiniatura(clienteId: string, postId: string, origem: HTMLCanvasElement) {
    const cv = document.createElement('canvas')
    cv.width = LARGURA_MINIATURA
    cv.height = Math.round(LARGURA_MINIATURA * origem.height / origem.width)
    cv.getContext('2d')!.drawImage(origem, 0, 0, cv.width, cv.height)
    const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/jpeg', 0.8))
    if (blob) await supabase.storage.from('fotos').upload(miniaturaDe(clienteId, postId), blob, { contentType: 'image/jpeg', upsert: true })
  }

  return { duplica, exclui, miniaturas, gravaMiniatura }
}
