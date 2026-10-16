<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-8 px-4 bg-elevated/40">
    <NuxtLink to="/" class="text-xl font-semibold tracking-tight">
      Teu Marketing
    </NuxtLink>
    <UPageCard class="w-full max-w-sm">
      <slot />
    </UPageCard>
  </div>
</template>
