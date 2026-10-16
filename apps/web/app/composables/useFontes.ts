import { carregaFontes, NOMES_FONTES, type Fontes, type NomeFonte } from '@teu/motor'

const urls = import.meta.glob('../../../../packages/motor/fontes/*.ttf', { query: '?url', import: 'default', eager: true }) as Record<string, string>

let promessa: Promise<Fontes> | undefined

/** Baixa e prepara as fontes do Motor uma vez por sessão (só no browser). */
export function useFontes(): Promise<Fontes> {
  promessa ??= (async () => {
    const arquivos = {} as Record<NomeFonte, ArrayBuffer>
    await Promise.all(NOMES_FONTES.map(async (n) => {
      const url = Object.entries(urls).find(([k]) => k.endsWith(`/${n}.ttf`))![1]
      arquivos[n] = await (await fetch(url)).arrayBuffer()
    }))
    return carregaFontes(arquivos)
  })()
  return promessa
}
