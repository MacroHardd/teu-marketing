<script setup lang="ts">
// Escolha de textura do catálogo: "Nenhuma" + as amostras (1 clique).
defineProps<{ texturas: Textura[], valor: string | null }>()
const emit = defineEmits<{ escolhe: [string | null] }>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UTooltip text="Sem textura">
      <button
        type="button"
        class="size-12 rounded-md ring-2 ring-offset-2 ring-offset-default bg-default border border-default text-muted flex items-center justify-center"
        :class="valor === null ? 'ring-primary' : 'ring-transparent'"
        aria-label="Sem textura"
        @click="emit('escolhe', null)"
      >
        <UIcon name="i-lucide-ban" class="size-5" />
      </button>
    </UTooltip>
    <UTooltip v-for="t in texturas" :key="t.id" :text="t.nome">
      <button
        type="button"
        class="size-12 rounded-md ring-2 ring-offset-2 ring-offset-default bg-cover bg-center border border-default"
        :class="valor === t.id ? 'ring-primary' : 'ring-transparent'"
        :style="{ backgroundImage: `url(/texturas/${t.arquivo})` }"
        :aria-label="`Textura ${t.nome}`"
        @click="emit('escolhe', t.id)"
      />
    </UTooltip>
  </div>
</template>
