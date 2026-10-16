<script setup lang="ts">
// Spike do M1 (ADR 0001): preview ao vivo do Estilo Acento, p95 no browser e Exportação PNG.
import { desenha, motor, TEMAS, type Ctx2D, type Fontes, type NomeTema } from '@teu/motor'

const texto = ref('Menos ruído, mais resultado')
const perfil = ref('@teumarketing')
const tema = ref<NomeTema>('creme')
const escuro = ref(false)
const cor = ref('')

const canvas = ref<HTMLCanvasElement>()
const fontes = shallowRef<Fontes>()
const tempos = ref<number[]>([])
const ultimo = ref(0)
const avisos = ref<string[]>([])
const acentoPct = ref<number>()

const temas = Object.keys(TEMAS).map(t => ({ label: t, value: t }))

function render() {
  if (!fontes.value || !canvas.value) return
  const t0 = performance.now()
  const { cena } = motor({
    texto: texto.value,
    estilo: 'acento',
    marca: { perfil: perfil.value || undefined, cor: /^#[0-9a-f]{6}$/i.test(cor.value) ? cor.value : undefined },
    tema: tema.value,
    modo: escuro.value ? 'escuro' : 'claro'
  }, fontes.value)
  desenha(canvas.value.getContext('2d') as unknown as Ctx2D, cena, fontes.value)
  ultimo.value = performance.now() - t0
  tempos.value = [...tempos.value.slice(-199), ultimo.value]
  avisos.value = cena.travas.avisos
  acentoPct.value = cena.travas.acentoAreaPct
}

const p = (q: number) => {
  const s = [...tempos.value].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))]! : 0
}

function bench() {
  for (let i = 0; i < 100; i++) render()
}

function exporta() {
  canvas.value?.toBlob((b) => {
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = 'post-acento.png'
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}

onMounted(async () => {
  fontes.value = await useFontes()
  render()
})
watch([texto, perfil, tema, escuro, cor], render)
</script>

<template>
  <UDashboardPanel id="spike">
    <template #header>
      <UDashboardNavbar title="Spike do Motor · Acento">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="flex flex-col gap-4 lg:w-80 shrink-0">
          <UFormField label="Texto">
            <UTextarea
              v-model="texto"
              :rows="4"
              autoresize
              class="w-full"
            />
          </UFormField>
          <UFormField label="Perfil">
            <UInput v-model="perfil" class="w-full" />
          </UFormField>
          <UFormField label="Tema">
            <USelect v-model="tema" :items="temas" class="w-full" />
          </UFormField>
          <UFormField label="Cor da marca (opcional)">
            <UInput v-model="cor" placeholder="#1f8a70" class="w-full" />
          </UFormField>
          <USwitch v-model="escuro" label="Versão escura" />
          <div class="text-sm text-muted space-y-1">
            <p>último: {{ ultimo.toFixed(1) }} ms · p50 {{ p(0.5).toFixed(1) }} · <strong>p95 {{ p(0.95).toFixed(1) }} ms</strong> (n={{ tempos.length }})</p>
            <p>acento: {{ acentoPct }}% da peça</p>
            <p v-for="a in avisos" :key="a" class="text-warning">
              {{ a }}
            </p>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Medir 100x"
              color="neutral"
              variant="outline"
              @click="bench"
            />
            <UButton label="Exportar PNG" icon="i-lucide-download" @click="exporta" />
          </div>
        </div>
        <canvas
          ref="canvas"
          width="1080"
          height="1350"
          class="w-full max-w-md rounded-md shadow ring ring-default"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
