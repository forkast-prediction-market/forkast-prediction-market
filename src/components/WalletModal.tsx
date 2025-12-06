'use client'

import type { ChangeEventHandler, FormEventHandler } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
} from 'lucide-react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type WalletView = 'menu' | 'fund' | 'buy' | 'receive' | 'send'

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  walletAddress?: string | null
  siteName?: string
  meldUrl: string | null
  hasDeployedProxyWallet: boolean
  view: WalletView
  onViewChange: (view: WalletView) => void
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: ChangeEventHandler<HTMLInputElement>
  sendError: string | null
  isSending: boolean
  onSubmitSend: FormEventHandler<HTMLFormElement>
}

function WalletAddressCard({
  walletAddress,
  onCopy,
  copied,
}: {
  walletAddress?: string | null
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Proxy wallet</p>
          <p className="font-mono text-xs break-all">{walletAddress}</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onCopy}
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

function WalletMenu({
  onFund,
  onSend,
  disabledFund,
  disabledSend,
}: {
  onFund: () => void
  onSend: () => void
  disabledFund: boolean
  disabledSend: boolean
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className={`
          flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left
          transition
          hover:border-primary hover:text-primary
        `}
        onClick={onFund}
        disabled={disabledFund}
      >
        <div>
          <p className="text-sm font-semibold">Fund wallet</p>
          <p className="text-xs text-muted-foreground">Buy with card/PIX to your proxy wallet.</p>
        </div>
        <ArrowRight className="size-4" />
      </button>

      <button
        type="button"
        className={`
          flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left
          transition
          hover:border-primary hover:text-primary
        `}
        onClick={onSend}
        disabled={disabledSend}
      >
        <div>
          <p className="text-sm font-semibold">Send</p>
          <p className="text-xs text-muted-foreground">Withdraw from your proxy wallet.</p>
        </div>
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

function WalletReceiveView({
  walletAddress,
  onBack,
}: {
  walletAddress?: string | null
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back
      </button>
      <div className="flex justify-center rounded-lg border border-border/60 bg-white p-4">
        {walletAddress
          ? <QRCode value={walletAddress} size={200} />
          : <p className="text-sm text-destructive">Proxy wallet not ready yet.</p>}
      </div>
      <p className="text-center text-xs text-muted-foreground">Copy your address or scan this QR code</p>
    </div>
  )
}
function WalletSendForm({
  sendTo,
  onChangeSendTo,
  sendAmount,
  onChangeSendAmount,
  sendError,
  isSending,
  onSubmitSend,
  onBack,
}: {
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: ChangeEventHandler<HTMLInputElement>
  sendError: string | null
  isSending: boolean
  onSubmitSend: FormEventHandler<HTMLFormElement>
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <form className="space-y-3" onSubmit={onSubmitSend}>
        <div className="space-y-1">
          <Label htmlFor="wallet-send-to">Recipient address</Label>
          <Input
            id="wallet-send-to"
            value={sendTo}
            onChange={onChangeSendTo}
            placeholder="0x..."
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wallet-send-amount">Amount (USDC)</Label>
          <Input
            id="wallet-send-amount"
            type="number"
            min="0"
            step="0.01"
            value={sendAmount}
            onChange={onChangeSendAmount}
            placeholder="0.00"
            required
          />
        </div>

        {sendError && (
          <p className="text-sm text-destructive">{sendError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSending}>
          {isSending ? 'Submitting…' : 'Send from Proxy'}
        </Button>
      </form>
    </div>
  )
}

function WalletFundView({
  meldUrl,
  onBack,
}: {
  meldUrl: string | null
  onBack: () => void
}) {
  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        className={`
          absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-background/90 p-2 text-sm
          text-muted-foreground shadow
          hover:text-foreground
        `}
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </button>
      {meldUrl
        ? (
            <iframe
              src={meldUrl}
              title="Meld Onramp"
              className="size-full"
              allow="payment *"
            />
          )
        : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
              Proxy wallet not ready yet.
            </div>
          )}
    </div>
  )
}

export function WalletModal(props: WalletModalProps) {
  const {
    open,
    onOpenChange,
    isMobile,
    walletAddress,
    siteName,
    meldUrl,
    hasDeployedProxyWallet,
    view,
    onViewChange,
    sendTo,
    onChangeSendTo,
    sendAmount,
    onChangeSendAmount,
    sendError,
    isSending,
    onSubmitSend,
  } = props

  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!walletAddress) {
      return
    }
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
    catch {
      //
    }
  }

  function renderMenu() {
    return (
      <WalletMenu
        onFund={() => onViewChange('fund')}
        onSend={() => onViewChange('send')}
        disabledFund={!meldUrl}
        disabledSend={!hasDeployedProxyWallet}
      />
    )
  }

  function renderFundMenu() {
    return (
      <WalletFundMenu
        onBuy={() => onViewChange('buy')}
        onReceive={() => onViewChange('receive')}
        onBack={() => onViewChange('menu')}
        disabledBuy={!meldUrl}
        disabledReceive={!hasDeployedProxyWallet}
      />
    )
  }

  const sharedNonFund = (
    <div className="space-y-4">
      {(view === 'menu' || view === 'fund' || view === 'send' || view === 'receive') && (
        <WalletAddressCard walletAddress={walletAddress} onCopy={handleCopy} copied={copied} />
      )}
      {view === 'menu' && renderMenu()}
      {view === 'fund' && renderFundMenu()}
      {view === 'receive' && (
        <WalletReceiveView walletAddress={walletAddress} onBack={() => onViewChange('fund')} />
      )}
      {view === 'send' && (
        <WalletSendForm
          sendTo={sendTo}
          onChangeSendTo={onChangeSendTo}
          sendAmount={sendAmount}
          onChangeSendAmount={onChangeSendAmount}
          sendError={sendError}
          isSending={isSending}
          onSubmitSend={onSubmitSend}
          onBack={() => onViewChange('menu')}
        />
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          setCopied(false)
          onOpenChange(next)
        }}
      >
        <DrawerContent
          className={cn(
            'w-full border-border/70 bg-background',
            view === 'buy'
              ? 'h-[90vh] w-full max-w-screen overflow-hidden border-none bg-[#0D111C] p-0'
              : 'max-h-[90vh] overflow-y-auto px-0',
          )}
        >
          {view !== 'buy' && (
            <DrawerHeader className="px-4 pt-4 pb-2">
              <DrawerTitle>
                Your Wallet on
                {' '}
                {siteName}
              </DrawerTitle>
            </DrawerHeader>
          )}
          <div className={cn('w-full', view === 'buy' ? 'h-full' : 'px-4 pb-4')}>
            {view === 'buy'
              ? <WalletFundView meldUrl={meldUrl} onBack={() => onViewChange('fund')} />
              : sharedNonFund}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setCopied(false)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className={cn(
          'border border-border/70 bg-background',
          view === 'buy'
            ? 'h-[90vh] w-full max-w-screen overflow-hidden border-none bg-transparent p-0'
            : 'w-full max-w-2xl p-6',
        )}
      >
        {view !== 'buy' && (
          <DialogHeader className="pb-3">
            <DialogTitle>
              Your Wallet on
              {' '}
              {siteName}
            </DialogTitle>
          </DialogHeader>
        )}

        {view === 'buy'
          ? <WalletFundView meldUrl={meldUrl} onBack={() => onViewChange('fund')} />
          : sharedNonFund}
      </DialogContent>
    </Dialog>
  )
}
function WalletFundMenu({
  onBuy,
  onReceive,
  onBack,
  disabledBuy,
  disabledReceive,
}: {
  onBuy: () => void
  onReceive: () => void
  onBack: () => void
  disabledBuy: boolean
  disabledReceive: boolean
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <button
        type="button"
        className={`
          flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left
          transition
          hover:border-primary hover:text-primary
        `}
        onClick={onBuy}
        disabled={disabledBuy}
      >
        <div>
          <p className="text-sm font-semibold">Buy crypto</p>
          <p className="text-xs text-muted-foreground">Purchase with card/PIX via Meld.</p>
        </div>
        <ArrowRight className="size-4" />
      </button>

      <button
        type="button"
        className={`
          flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left
          transition
          hover:border-primary hover:text-primary
        `}
        onClick={onReceive}
        disabled={disabledReceive}
      >
        <div>
          <p className="text-sm font-semibold">Receive funds</p>
          <p className="text-xs text-muted-foreground">Share your proxy address or QR code.</p>
        </div>
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
