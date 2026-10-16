<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Tables } from '~/types/database.types'

useSeoMeta({ title: 'Clientes' })

const supabase = useSupabaseClient()
const toast = useToast()
const { data: acesso } = await useAcesso()
if (!acesso.value?.parceiro) await navigateTo('/')

const { data, refresh } = await useAsyncData('painel-parceiro', async () => {
  const [p, cl, cv] = await Promise.all([
    supabase.from('parceiros').select('nome, assentos').single(),
    supabase.from('clientes').select('id, email, ativo, aceito_em, ultimo_acesso_em').order('aceito_em', { ascending: false }),
    supabase.from('convites').select('id, email, status, enviado_em, expira_em').neq('status', 'cancelado').order('criado_em', { ascending: false })
  ])
  return { parceiro: p.data, clientes: cl.data ?? [], convites: cv.data ?? [] }
})

const ativos = computed(() => data.value?.clientes.filter(c => c.ativo).length ?? 0)
const assentos = computed(() => data.value?.parceiro?.assentos ?? 0)
const livres = computed(() => Math.max(0, assentos.value - ativos.value))

// ------------------------------------------------------------------ convidar
const texto = ref('')
const enviando = ref(false)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const previa = computed(() => {
  const vistos = new Set<string>()
  const r = { validos: [] as string[], duplicados: 0, invalidos: [] as string[], jaClientes: 0 }
  const clientes = new Set(data.value?.clientes.filter(c => c.ativo).map(c => c.email))
  for (const bruto of texto.value.split(/[\s,;]+/)) {
    const e = bruto.trim().toLowerCase()
    if (!e) continue
    if (!EMAIL.test(e)) r.invalidos.push(bruto)
    else if (vistos.has(e)) r.duplicados++
    else if (clientes.has(e)) {
      vistos.add(e)
      r.jaClientes++
    } else {
      vistos.add(e)
      r.validos.push(e)
    }
  }
  return r
})

async function convidar() {
  enviando.value = true
  try {
    const r = await $fetch('/api/convites', { method: 'POST', body: { emails: previa.value.validos } })
    toast.add({ title: `${r.enviados.length} Convite(s) enviado(s)`, color: 'success', icon: 'i-lucide-send' })
    if (r.falhas.length) toast.add({ title: `Falhou: ${r.falhas.join(', ')}`, color: 'error' })
    texto.value = ''
    await refresh()
  } catch (e) {
    toast.add({ title: 'Não deu para enviar', description: (e as { statusMessage?: string }).statusMessage, color: 'error' })
  } finally {
    enviando.value = false
  }
}

async function reenviar(id: string) {
  try {
    await $fetch(`/api/convites/${id}/reenviar`, { method: 'POST' })
    toast.add({ title: 'Convite reenviado', color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Não deu para reenviar', description: (e as { statusMessage?: string }).statusMessage, color: 'error' })
  }
}

// ------------------------------------------------------------------ tabelas
const data_ = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
type Convite = Pick<Tables<'convites'>, 'id' | 'email' | 'status' | 'enviado_em' | 'expira_em'>
const STATUS: Record<string, { label: string, color: 'neutral' | 'success' | 'warning' | 'info' }> = {
  agendado: { label: 'agendado', color: 'info' },
  enviado: { label: 'pendente', color: 'neutral' },
  aceito: { label: 'aceito', color: 'success' },
  expirado: { label: 'expirado', color: 'warning' }
}
const vencido = (c: Convite) => c.status === 'enviado' && new Date(c.expira_em) < new Date()
const colConvites: TableColumn<Convite>[] = [
  { accessorKey: 'email', header: 'Email' },
  { id: 'status', header: 'Status' },
  { accessorKey: 'enviado_em', header: 'Enviado', cell: ({ row }) => data_(row.original.enviado_em) },
  { id: 'acoes', header: '' }
]
type Cliente = Pick<Tables<'clientes'>, 'id' | 'email' | 'ativo' | 'aceito_em' | 'ultimo_acesso_em'>
const colClientes: TableColumn<Cliente>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'aceito_em', header: 'Desde', cell: ({ row }) => data_(row.original.aceito_em) },
  { id: 'status', header: 'Status', cell: ({ row }) => row.original.ativo ? 'ativo' : 'desativado' }
]
</script>

<template>
  <UDashboardPanel id="clientes">
    <template #header>
      <UDashboardNavbar :title="data?.parceiro?.nome ?? 'Clientes'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            :label="`${ativos} de ${assentos} acessos em uso`"
            color="neutral"
            variant="subtle"
            size="lg"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <UPageCard title="Convidar Clientes" description="Cole os emails, um por linha ou separados por vírgula.">
          <UTextarea
            v-model="texto"
            :rows="6"
            placeholder="ana@email.com&#10;carlos@email.com"
            class="w-full"
          />
          <div v-if="texto.trim()" class="text-sm space-y-1">
            <p>{{ previa.validos.length }} válido(s) · {{ livres }} acesso(s) livre(s)</p>
            <p v-if="previa.duplicados" class="text-muted">
              {{ previa.duplicados }} repetido(s), ignorado(s)
            </p>
            <p v-if="previa.jaClientes" class="text-muted">
              {{ previa.jaClientes }} já é(são) Cliente(s)
            </p>
            <p v-if="previa.invalidos.length" class="text-error">
              Inválido(s): {{ previa.invalidos.join(', ') }}
            </p>
            <p v-if="previa.validos.length > livres" class="text-warning">
              Mais Convites que acessos livres: só os primeiros a aceitar vão entrar.
            </p>
          </div>
          <UButton
            :label="`Enviar ${previa.validos.length || ''} Convite(s)`"
            icon="i-lucide-send"
            :disabled="!previa.validos.length"
            :loading="enviando"
            block
            @click="convidar"
          />
        </UPageCard>

        <div class="space-y-8 min-w-0">
          <section>
            <h2 class="font-semibold mb-2">
              Clientes
            </h2>
            <UTable :data="data?.clientes ?? []" :columns="colClientes" empty="Nenhum Cliente ainda. Convide o primeiro ao lado." />
          </section>
          <section>
            <h2 class="font-semibold mb-2">
              Convites
            </h2>
            <UTable :data="data?.convites ?? []" :columns="colConvites" empty="Nenhum Convite enviado.">
              <template #status-cell="{ row }">
                <UBadge
                  v-if="vencido(row.original)"
                  label="expirado"
                  color="warning"
                  variant="subtle"
                />
                <UBadge v-else v-bind="STATUS[row.original.status]" variant="subtle" />
              </template>
              <template #acoes-cell="{ row }">
                <UButton
                  v-if="row.original.status === 'enviado' || row.original.status === 'expirado'"
                  label="Reenviar"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="reenviar(row.original.id)"
                />
              </template>
            </UTable>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
