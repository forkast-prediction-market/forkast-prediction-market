'use client'

import { create } from 'zustand'

interface SignaturePromptState {
  open: boolean
  walletName?: string
  walletImageSrc?: string
  showPrompt: (payload: { walletName?: string | null, walletImageSrc?: string | null }) => void
  hidePrompt: () => void
}

export const useSignaturePrompt = create<SignaturePromptState>(set => ({
  open: false,
  walletName: undefined,
  walletImageSrc: undefined,
  showPrompt: ({ walletName, walletImageSrc }) => set({
    open: true,
    walletName: walletName ?? undefined,
    walletImageSrc: walletImageSrc ?? undefined,
  }),
  hidePrompt: () => set({
    open: false,
    walletName: undefined,
    walletImageSrc: undefined,
  }),
}))
