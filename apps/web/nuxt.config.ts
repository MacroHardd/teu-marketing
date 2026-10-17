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
    // Asaas (ADR 0005). Sem chave + asaasSimulado: pagamento simulado no local, mesmo código de ativação.
    asaasApiKey: '',
    asaasUrl: 'https://api-sandbox.asaas.com/v3',
    asaasWebhookToken: '',
    asaasSimulado: false,
    // a Vercel manda `Authorization: Bearer <CRON_SECRET>` no cron
    cronSecret: '',
    public: {
      siteUrl: 'http://localhost:3000',
      versaoApp: 'dev',
      // preços da Assinatura em reais; 0 = não configurado
      precoMensal: 0,
      precoAnual: 0
    }
  },

  compatibilityDate: '2026-06-30',

  // Cron da Vercel (Hobby: 1x/dia). Vai para .vercel/output/config.json no build com NITRO_PRESET=vercel.
  nitro: {
    vercel: {
      config: { crons: [{ path: '/api/cron/diario', schedule: '0 9 * * *' }] }
    }
  },

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
      exclude: ['/acesso/*', '/assinar', '/assinar/*']
    }
  }
})
