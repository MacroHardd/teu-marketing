// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Valores vêm do ambiente (NUXT_*). Ver .env.example.
  runtimeConfig: {
    resendApiKey: '',
    emailRemetente: 'Teu Marketing <convite@teumarketing.com.br>',
    // só em dev, sem Resend: os emails do app caem no Mailpit do Supabase local
    mailpitUrl: '',
    public: {
      siteUrl: 'http://localhost:3000',
      versaoApp: 'dev'
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    types: '~/types/database.types.ts',
    redirectOptions: {
      login: '/entrar',
      callback: '/confirmar',
      exclude: ['/acesso/*']
    }
  }
})
