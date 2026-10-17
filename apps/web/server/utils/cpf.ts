/** CPF com dígitos verificadores certos (o Asaas recusa CPF inválido; melhor avisar no formulário). */
export function cpfValido(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (n: number) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
