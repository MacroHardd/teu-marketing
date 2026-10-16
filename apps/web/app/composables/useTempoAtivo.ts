/**
 * tempo_ativo_ms (docs/medicao/tecnico.md): conta só com a aba visível e com interação
 * nos últimos 60 s, para aba esquecida aberta não inflar a métrica.
 */
export function useTempoAtivo() {
  const total = ref(0)
  let ultimaInteracao = Date.now()
  let ultimoTique = Date.now()
  const marca = () => {
    ultimaInteracao = Date.now()
  }
  const tique = () => {
    const agora = Date.now()
    if (document.visibilityState === 'visible' && agora - ultimaInteracao < 60_000) total.value += agora - ultimoTique
    ultimoTique = agora
  }
  let id: ReturnType<typeof setInterval>
  onMounted(() => {
    ultimoTique = Date.now()
    id = setInterval(tique, 1000)
    for (const ev of ['pointerdown', 'keydown', 'pointermove', 'wheel']) window.addEventListener(ev, marca, { passive: true })
  })
  onBeforeUnmount(() => {
    clearInterval(id)
    for (const ev of ['pointerdown', 'keydown', 'pointermove', 'wheel']) window.removeEventListener(ev, marca)
  })
  return {
    ms: () => {
      tique()
      return Math.round(total.value)
    }
  }
}
