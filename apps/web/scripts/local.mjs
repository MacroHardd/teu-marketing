// Roda um comando com as chaves do Supabase LOCAL, sem mexer no apps/web/.env (que pode apontar para o hospedado).
// Variável do processo vence o .env no Nuxt e no `node --env-file`.
//   node scripts/local.mjs nuxt dev
import { execFileSync, spawn } from 'node:child_process'

let saida
try {
  saida = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch {
  console.error('Supabase local não está rodando. Suba com: pnpm exec supabase start')
  process.exit(1)
}
const st = Object.fromEntries([...saida.matchAll(/^(\w+)="?(.*?)"?$/gm)].map(m => [m[1], m[2]]))
const env = {
  ...process.env,
  NUXT_PUBLIC_SITE_URL: `http://localhost:${process.env.PORT || 3000}`,
  NUXT_PUBLIC_SUPABASE_URL: st.API_URL,
  NUXT_PUBLIC_SUPABASE_KEY: st.PUBLISHABLE_KEY,
  NUXT_SUPABASE_SECRET_KEY: st.SECRET_KEY,
  NUXT_MAILPIT_URL: st.MAILPIT_URL,
  NUXT_RESEND_API_KEY: '',
  // Assinatura (ADR 0005): pagamento simulado no local, sem Asaas; cron chamado com `Bearer local`
  NUXT_ASAAS_API_KEY: '',
  NUXT_ASAAS_SIMULADO: '1',
  NUXT_CRON_SECRET: 'local'
}
const [cmd, ...args] = process.argv.slice(2)
spawn(cmd, args, { env, stdio: 'inherit', shell: process.platform === 'win32' }).on('exit', c => process.exit(c ?? 1))
