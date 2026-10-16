<script setup lang="ts">
import { z } from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrar' })

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const enviadoPara = ref('')
const erro = ref('')
const carregando = ref(false)
const dev = import.meta.dev

const fields: AuthFormField[] = [{ name: 'email', type: 'email', label: 'Email', placeholder: 'voce@email.com', required: true }]
const schema = z.object({ email: z.email('Email inválido') })

async function entrar(e: FormSubmitEvent<z.output<typeof schema>>) {
  erro.value = ''
  carregando.value = true
  // shouldCreateUser: false → quem não foi convidado não entra (ninguém se cadastra sozinho)
  const { error } = await supabase.auth.signInWithOtp({
    email: e.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${config.public.siteUrl}/confirmar` }
  })
  carregando.value = false
  if (!error) enviadoPara.value = e.data.email
  else if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)) erro.value = 'Este email ainda não tem acesso. Peça acesso ao seu parceiro.'
  else if (error.status === 429) erro.value = 'Muitas tentativas. Espere um minuto e tente de novo.'
  else erro.value = 'Não deu para enviar o link agora. Tente de novo em instantes.'
}
</script>

<template>
  <div v-if="enviadoPara" class="text-center space-y-3">
    <UIcon name="i-lucide-mail-check" class="size-10 text-primary" />
    <p class="font-semibold">
      Verifique seu email
    </p>
    <p class="text-sm text-muted">
      Enviamos um link de entrada para <strong>{{ enviadoPara }}</strong>. Abra no mesmo navegador.
    </p>
    <UButton variant="link" label="Usar outro email" @click="enviadoPara = ''" />
    <!-- só no `nuxt dev`: com o Supabase local, o email cai no Mailpit, não numa caixa de verdade -->
    <UAlert
      v-if="dev"
      color="info"
      variant="subtle"
      icon="i-lucide-flask-conical"
      title="Ambiente local"
      description="O email está no Mailpit. Abra a mensagem e clique no link, neste mesmo navegador."
      :actions="[{ label: 'Abrir o Mailpit', to: 'http://127.0.0.1:54324', target: '_blank', color: 'info', variant: 'outline' }]"
      class="text-left"
    />
  </div>
  <UAuthForm
    v-else
    :fields="fields"
    :schema="schema"
    title="Entrar"
    description="Enviamos um link para o seu email. Sem senha."
    :submit="{ label: 'Enviar link de entrada', loading: carregando }"
    @submit="entrar"
  >
    <template #validation>
      <UAlert
        v-if="erro"
        color="error"
        variant="subtle"
        icon="i-lucide-info"
        :title="erro"
      />
    </template>
  </UAuthForm>
</template>
