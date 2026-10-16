<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const MOTIVOS: Record<string, { titulo: string, texto: string }> = {
  'convite-invalido': { titulo: 'Convite inválido', texto: 'Este link de Convite não vale. Peça um novo Convite ao seu parceiro.' },
  'convite-expirado': { titulo: 'Convite expirado', texto: 'O Convite vale 7 dias e este já venceu. Peça ao seu parceiro para reenviar.' },
  'sem-assento': { titulo: 'Sem vaga no momento', texto: 'Seu parceiro não tem acessos livres agora. Fale com ele para liberar uma vaga.' },
  'outro-parceiro': { titulo: 'Email já em uso', texto: 'Este email já tem acesso por outro parceiro. Fale com quem te convidou.' },
  'sem-acesso': { titulo: 'Sem acesso', texto: 'Este email ainda não tem acesso. Peça acesso ao seu parceiro.' },
  'desativado': { titulo: 'Acesso desativado', texto: 'Seu acesso foi desativado pelo seu parceiro. Fale com ele para voltar.' }
}
const route = useRoute()
const m = computed(() => MOTIVOS[String(route.params.motivo)] ?? MOTIVOS['sem-acesso']!)
useSeoMeta({ title: () => m.value.titulo })

const supabase = useSupabaseClient()
async function sair() {
  await supabase.auth.signOut()
  clearNuxtData('acesso')
  await navigateTo('/entrar')
}
</script>

<template>
  <div class="text-center space-y-3">
    <UIcon name="i-lucide-circle-alert" class="size-10 text-warning" />
    <p class="font-semibold">
      {{ m.titulo }}
    </p>
    <p class="text-sm text-muted">
      {{ m.texto }}
    </p>
    <UButton variant="link" label="Entrar com outro email" @click="sair" />
  </div>
</template>
