<script setup lang="ts">
// Miniatura do Ativo já tratado (receita aplicada numa cópia pequena do original).
import type { Receita } from '@teu/motor'

const props = defineProps<{ path: string, receita: Receita, corMarca?: string }>()
const supabase = useSupabaseClient()
const canvas = ref<HTMLCanvasElement>()
const pronto = ref(false)

async function desenha() {
  const blob = await originalDe(supabase, props.path)
  if (!blob || !canvas.value) return
  const img = await aplicaReceita(await pixelsDe(blob, 360), props.receita, props.corMarca)
  canvas.value.width = img.width
  canvas.value.height = img.height
  canvas.value.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  pronto.value = true
}
onMounted(desenha)
watch(() => [props.receita, props.corMarca], desenha, { deep: true })
</script>

<template>
  <div class="relative aspect-4/5 bg-elevated rounded-md overflow-hidden">
    <canvas ref="canvas" class="absolute inset-0 size-full object-cover" :class="pronto ? '' : 'opacity-0'" />
    <USkeleton v-if="!pronto" class="absolute inset-0" />
  </div>
</template>
