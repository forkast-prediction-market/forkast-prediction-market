import type { AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { polygonAmoy } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID is not defined')
}

export const defaultNetwork = polygonAmoy
export const networks = [defaultNetwork] as [AppKitNetwork, ...AppKitNetwork[]]

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
