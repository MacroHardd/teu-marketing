export interface Acesso {
  parceiro: { id: string, nome: string } | null
  cliente: { id: string, ativo: boolean, direto: boolean } | null
}

/** O que o usuário logado é (Parceiro e/ou Cliente). Lido do banco, com RLS. */
export function useAcesso() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  return useAsyncData('acesso', async () => {
    if (!user.value) return null
    const { data, error } = await supabase.rpc('meu_acesso')
    if (error) throw error
    return data as unknown as Acesso
  }, { watch: [() => user.value?.sub] })
}
