'use client'

import { Loader2Icon, WalletIcon } from 'lucide-react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSignaturePrompt } from '@/stores/useSignaturePrompt'

export function SignaturePrompt() {
  const { open, walletName, walletImageSrc, hidePrompt } = useSignaturePrompt()

  const displayName = walletName || 'your wallet'
  const description = `Open your ${displayName} app and approve the signature to continue.`

  function handleOpenChange(next: boolean) {
    if (!next) {
      hidePrompt()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`
        min-h-[260px] w-[260px] max-w-[260px] border border-border/70 bg-background p-5 text-center
      `}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-center text-base font-semibold">Approve in your wallet</DialogTitle>
          <p className="mx-auto max-w-[240px] text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
            {walletImageSrc
              ? (
                  <Image
                    src={walletImageSrc}
                    alt={`${displayName} logo`}
                    width={48}
                    height={48}
                    className="h-10 w-10 rounded-lg object-contain"
                  />
                )
              : <WalletIcon className="h-7 w-7 text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <span>Waiting for your approval…</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
