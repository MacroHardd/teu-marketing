<script setup lang="ts">
// Assinatura direta (ADR 0005): sem Parceiro, sem trial. Página mínima para funcionar; a página pública de venda vem depois.
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Assinar' })

const config = useRuntimeConfig()
const brl = (v: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'preço a definir'
const planos = computed(() => [
  { value: 'mensal', label: 'Mensal', description: `${brl(Number(config.public.precoMensal))} por mês` },
  { value: 'anual', label: 'Anual', description: `${brl(Number(config.public.precoAnual))} por ano` }
])

const schema = z.object({
  plano: z.enum(['mensal', 'anual']),
  email: z.email('Email inválido'),
  nome: z.string().trim().min(2, 'Seu nome'),
  cpf: z.string().refine(c => c.replace(/\D/g, '').length === 11, 'CPF com 11 números')
})
const form = reactive({ plano: 'mensal' as 'mensal' | 'anual', email: '', nome: '', cpf: '' })
const erro = ref<{ titulo: string, entrar?: boolean } | null>(null)
const carregando = ref(false)

async function assinar(e: FormSubmitEvent<z.output<typeof schema>>) {
  erro.value = null
  carregando.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/assinatura', { method: 'POST', body: e.data })
    window.location.href = url
  } catch (err) {
    carregando.value = false
    const msg = (err as { data?: { statusMessage?: string } }).data?.statusMessage
    if (msg === 'parceiro') erro.value = { titulo: 'Este email já tem acesso pelo seu parceiro. É só entrar.', entrar: true }
    else if (msg === 'ja_assina') erro.value = { titulo: 'Este email já tem uma Assinatura ativa. É só entrar.', entrar: true }
    else if (/CPF/i.test(msg ?? '')) erro.value = { titulo: 'Confira o CPF.' }
    else erro.value = { titulo: 'Não deu para abrir o pagamento agora. Tente de novo em instantes.' }
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="text-center space-y-1">
      <p class="text-xl font-semibold">
        Assinar o Teu Marketing
      </p>
      <p class="text-sm text-muted">
        Posts de Instagram prontos em minutos. Você paga por Pix, boleto ou cartão na página do Asaas.
      </p>
    </div>
    <UForm
      :schema="schema"
      :state="form"
      class="space-y-4"
      @submit="assinar"
    >
      <UFormField name="plano" label="Plano">
        <URadioGroup v-model="form.plano" :items="planos" variant="table" />
      </UFormField>
      <UFormField name="email" label="Email" description="É com ele que você vai entrar.">
        <UInput
          v-model="form.email"
          type="email"
          placeholder="voce@email.com"
          class="w-full"
        />
      </UFormField>
      <UFormField name="nome" label="Nome completo">
        <UInput v-model="form.nome" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField name="cpf" label="CPF" description="Pedido pelo Asaas para emitir a cobrança. Não fica guardado aqui.">
        <UInput
          v-model="form.cpf"
          inputmode="numeric"
          placeholder="000.000.000-00"
          class="w-full"
        />
      </UFormField>
      <UAlert
        v-if="erro"
        color="error"
        variant="subtle"
        icon="i-lucide-info"
        :title="erro.titulo"
        :actions="erro.entrar ? [{ label: 'Entrar', to: '/entrar', color: 'error', variant: 'outline' }] : undefined"
      />
      <UButton
        type="submit"
        label="Ir para o pagamento"
        :loading="carregando"
        block
      />
    </UForm>
    <p class="text-center text-sm text-muted">
      Já tem acesso? <ULink to="/entrar" class="text-primary font-medium">Entrar</ULink>
    </p>
  </div>
</template>
