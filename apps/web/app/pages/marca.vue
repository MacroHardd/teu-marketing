<script setup lang="ts">
// Perfil de Marca: tudo opcional. O que for preenchido já aparece ligado nos Posts (Elementos opcionais).
import { desenha, motor, type Ctx2D, type Fontes } from '@teu/motor'

useSeoMeta({ title: 'Perfil de Marca' })

const supabase = useSupabaseClient()
const toast = useToast()
const evento = useEvento()
const route = useRoute()
const { data: acesso } = await useAcesso()
if (!acesso.value?.cliente?.ativo) await navigateTo('/')
const clienteId = acesso.value!.cliente!.id

const { data: perfil, refresh } = await useMarca()
const form = reactive<FormPerfil>({ ...PERFIL_VAZIO, ...perfil.value, logo_meta: (perfil.value?.logo_meta ?? null) as LogoMeta | null })
const outraCor = ref(form.cor ?? '')
const salvando = ref(false)
const enviandoLogo = ref(false)
const inputLogo = ref<HTMLInputElement>()
const logoImg = shallowRef<ImageBitmap>()

/** Paleta curta para quem não sabe o código da cor. "Outra cor" aceita #rrggbb. */
const CORES = ['#e0472b', '#d9480f', '#f2b705', '#1f8a70', '#2f6b4f', '#0b7285', '#2443d6', '#5f3dc4', '#c2185b', '#171512']

const corValida = (c: string) => /^#[0-9a-f]{6}$/i.test(c.trim())
function usaOutraCor() {
  if (corValida(outraCor.value)) form.cor = outraCor.value.trim().toLowerCase()
}

async function salva() {
  if (outraCor.value && !corValida(outraCor.value) && !CORES.includes(form.cor ?? '')) {
    return toast.add({ title: 'A cor precisa estar no formato #1f8a70', color: 'warning' })
  }
  salvando.value = true
  const dados = {
    cliente_id: clienteId,
    nome: form.nome.trim(),
    arroba: form.arroba.trim().replace(/^@+/, ''),
    cor: form.cor,
    logo_path: form.logo_path,
    logo_meta: form.logo_meta ? { ...form.logo_meta } : null
  }
  const { error } = await supabase.from('perfis_marca').upsert(dados)
  salvando.value = false
  if (error) return toast.add({ title: 'Não deu para salvar o Perfil', color: 'error' })
  evento('perfil_atualizado', { campos_preenchidos: camposPreenchidos(dados) })
  await refresh()
  toast.add({ title: 'Perfil de Marca salvo', color: 'success' })
  if (route.query.voltar) await navigateTo(String(route.query.voltar))
}

/** Pular = Perfil vazio (dá para preencher depois pelo menu). */
async function pula() {
  await supabase.from('perfis_marca').upsert({ cliente_id: clienteId }, { ignoreDuplicates: true })
  await refreshNuxtData('marca')
  await navigateTo(String(route.query.voltar))
}

async function enviaLogo(ev: Event) {
  const input = ev.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = ''
  if (!arquivo) return
  enviandoLogo.value = true
  try {
    const l = await preparaLogo(arquivo)
    const caminho = `${clienteId}/marca/${crypto.randomUUID()}.png`
    const { error } = await supabase.storage.from('fotos').upload(caminho, l.blob, { contentType: 'image/png' })
    if (error) throw new ErroFoto('Não deu para enviar o logo. Confira a internet e tente de novo.')
    if (form.logo_path) supabase.storage.from('fotos').remove([form.logo_path])
    form.logo_path = caminho
    form.logo_meta = { largura: l.largura, altura: l.altura }
    logoImg.value = await createImageBitmap(l.blob)
  } catch (e) {
    toast.add({ title: e instanceof ErroFoto ? e.message : 'Não deu para usar esse logo. Tente outro.', color: 'error' })
  } finally {
    enviandoLogo.value = false
  }
}

function removeLogo() {
  if (form.logo_path) supabase.storage.from('fotos').remove([form.logo_path])
  form.logo_path = null
  form.logo_meta = null
  logoImg.value = undefined
}

// prévia: um Post de exemplo com a marca, no mesmo Motor do editor
const canvas = ref<HTMLCanvasElement>()
const fontes = shallowRef<Fontes>()
function previa() {
  if (!fontes.value || !canvas.value) return
  const r = motor({
    texto: 'Seu texto aparece *assim*',
    estilo: 'acento',
    marca: marcaDoPerfil(form),
    ajustes: { cor: form.cor ? 'marca' : undefined }
  }, fontes.value)
  desenha(canvas.value.getContext('2d') as unknown as Ctx2D, r.cena, fontes.value, { escala: canvas.value.width / 1080, logo: logoImg.value, tela: novaTela })
}
watch(form, previa, { deep: true })
watch(logoImg, previa)
onMounted(async () => {
  fontes.value = await useFontes()
  logoImg.value = await carregaLogo(supabase, form.logo_path)
  previa()
})
</script>

<template>
  <UDashboardPanel id="marca">
    <template #header>
      <UDashboardNavbar title="Perfil de Marca">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="route.query.voltar && !perfil"
            label="Pular"
            color="neutral"
            variant="ghost"
            @click="pula"
          />
          <UButton
            label="Salvar"
            icon="i-lucide-check"
            :loading="salvando"
            @click="salva"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col lg:flex-row gap-8 items-start">
        <div class="flex flex-col gap-5 w-full lg:max-w-md">
          <p class="text-sm text-muted">
            Tudo aqui é opcional. O que você preencher já aparece nos seus Posts, e dá para desligar em cada um.
          </p>
          <UFormField label="Nome da marca">
            <UInput
              v-model="form.nome"
              maxlength="60"
              placeholder="Studio Lua"
              class="w-full"
            />
          </UFormField>
          <UFormField label="@ do Instagram">
            <UInput
              v-model="form.arroba"
              maxlength="31"
              placeholder="studiolua"
              class="w-full"
            >
              <template #leading>
                <span class="text-muted">@</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Cor da marca">
            <div class="flex flex-wrap gap-2 items-center">
              <button
                v-for="c in CORES"
                :key="c"
                type="button"
                class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default"
                :class="form.cor === c ? 'ring-primary' : 'ring-transparent'"
                :style="{ background: c }"
                :aria-label="`Cor ${c}`"
                @click="form.cor = c; outraCor = ''"
              />
              <UButton
                v-if="form.cor"
                label="Sem cor"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="form.cor = null; outraCor = ''"
              />
            </div>
            <UInput
              v-model="outraCor"
              placeholder="Outra cor: #1f8a70"
              size="sm"
              class="mt-2 w-48"
              @update:model-value="usaOutraCor"
            />
          </UFormField>
          <UFormField label="Logo" help="PNG com fundo transparente fica melhor.">
            <input
              ref="inputLogo"
              type="file"
              accept="image/png,image/jpeg"
              class="hidden"
              data-testid="input-logo"
              @change="enviaLogo"
            >
            <div class="flex gap-2">
              <UButton
                :label="form.logo_path ? 'Trocar logo' : 'Enviar logo'"
                icon="i-lucide-image-plus"
                color="neutral"
                variant="outline"
                :loading="enviandoLogo"
                @click="inputLogo?.click()"
              />
              <UButton
                v-if="form.logo_path"
                label="Remover"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                @click="removeLogo"
              />
            </div>
          </UFormField>
        </div>
        <canvas
          ref="canvas"
          width="540"
          height="675"
          class="w-full max-w-xs rounded-md shadow ring ring-default"
          aria-label="Exemplo de Post com a sua marca"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
