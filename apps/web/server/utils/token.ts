import { createHash, randomBytes } from 'node:crypto'

/** Token do link do Convite. Só o hash vai para o banco. */
export function novoToken(): { token: string, hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
