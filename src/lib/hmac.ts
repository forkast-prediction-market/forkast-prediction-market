import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

export function buildForkastHmacSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  base64Secret: string,
): string {
  const secret = Buffer.from(base64Secret, 'base64')
  const message = timestamp + method.toUpperCase() + path + body
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}
