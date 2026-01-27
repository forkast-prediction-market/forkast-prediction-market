import { createConfig } from '@lifi/sdk'
import 'server-only'

let isConfigured = false

export function ensureLiFiServerConfig() {
  if (isConfigured) {
    return
  }

  const integrator = process.env.LIFI_INTEGRATOR
  const apiKey = process.env.LIFI_API_KEY

  if (!integrator || !apiKey) {
    return
  }

  createConfig({
    integrator,
    apiKey,
  })

  isConfigured = true
}
