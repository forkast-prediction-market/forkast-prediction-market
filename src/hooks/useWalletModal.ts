'use client'

import type { OpenOptions, Views } from '@reown/appkit/react'
import { createContext, use } from 'react'

export interface WalletModalValue {
  open: (options?: OpenOptions<Views>) => Promise<void>
  close: () => Promise<void>
  isReady: boolean
}

export const defaultWalletModalValue: WalletModalValue = {
  open: async () => {},
  close: async () => {},
  isReady: false,
}

export const WalletModalContext = createContext<WalletModalValue>(defaultWalletModalValue)

export function useWalletModal() {
  return use(WalletModalContext)
}
