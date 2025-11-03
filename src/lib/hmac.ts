import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace)
}

export function buildForkastHmacSignature(method: string, requestPath: string, body?: string): string {
  let message = Math.floor(Date.now() / 1000) + method + requestPath
  if (body !== undefined) {
    message += body
  }
  const base64Secret = Buffer.from(process.env.FORKAST_API_SECRET!, 'base64')
  const hmac = crypto.createHmac('sha256', base64Secret)
  const sig = hmac.update(message).digest('base64')

  return replaceAll(replaceAll(sig, '+', '-'), '/', '_')
}
