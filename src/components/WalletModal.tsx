'use client'

import type { ChangeEventHandler, FormEventHandler } from 'react'
import {
  ArrowLeft,
  ArrowUpToLine,
  Check,
  CircleDollarSign,
  Copy,
  CreditCard,
  Wallet,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
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

const MELD_PAYMENT_METHODS = [
  'apple_pay',
  'google_pay',
  'pix',
  'paypal',
  'neteller',
  'skrill',
  'binance',
  'coinbase',
] as const

const TRANSFER_PAYMENT_METHODS = [
  'polygon',
  'usdc',
] as const

type WalletDepositView = 'fund' | 'receive'

interface WalletDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  walletAddress?: string | null
  siteName?: string
  meldUrl: string | null
  hasDeployedProxyWallet: boolean
  view: WalletDepositView
  onViewChange: (view: WalletDepositView) => void
  onBuy: (url: string) => void
  walletBalance?: string | null
}

interface WalletWithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  siteName?: string
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: ChangeEventHandler<HTMLInputElement>
  isSending: boolean
  onSubmitSend: FormEventHandler<HTMLFormElement>
  connectedWalletAddress?: string | null
  onUseConnectedWallet?: () => void
  availableBalance?: number | null
  onMax?: () => void
}

function WalletAddressCard({
  walletAddress,
  onCopy,
  copied,
  label = 'Proxy wallet',
}: {
  walletAddress?: string | null
  onCopy: () => void
  copied: boolean
  label?: string
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
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

function WalletReceiveView({
  walletAddress,
  siteName,
  onBack,
  onCopy,
  copied,
}: {
  walletAddress?: string | null
  siteName?: string
  onBack: () => void
  onCopy: () => void
  copied: boolean
}) {
  const siteLabel = siteName ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back
      </button>
      <WalletAddressCard
        walletAddress={walletAddress}
        onCopy={onCopy}
        copied={copied}
        label={`Your ${siteLabel} wallet address`}
      />
      <div className="flex justify-center rounded-lg border border-border/60 p-4">
        {walletAddress
          ? <QRCode value={walletAddress} size={200} />
          : <p className="text-sm text-destructive">Proxy wallet not ready yet.</p>}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Copy your address or scan this QR code to transfer USDC on Polygon
      </p>
    </div>
  )
}

function WalletSendForm({
  sendTo,
  onChangeSendTo,
  sendAmount,
  onChangeSendAmount,
  isSending,
  onSubmitSend,
  onBack,
  connectedWalletAddress,
  onUseConnectedWallet,
  availableBalance,
  onMax,
}: {
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: ChangeEventHandler<HTMLInputElement>
  isSending: boolean
  onSubmitSend: FormEventHandler<HTMLFormElement>
  onBack?: () => void
  connectedWalletAddress?: string | null
  onUseConnectedWallet?: () => void
  availableBalance?: number | null
  onMax?: () => void
}) {
  const trimmedRecipient = sendTo.trim()
  const isRecipientAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedRecipient)
  const parsedAmount = Number(sendAmount)
  const isSubmitDisabled = (
    isSending
    || !trimmedRecipient
    || !isRecipientAddress
    || !Number.isFinite(parsedAmount)
    || parsedAmount <= 0
  )
  const showConnectedWalletButton = !sendTo?.trim()

  function formatFullPrecision(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '0'
    }
    const asString = value.toLocaleString('en-US', {
      useGrouping: false,
      maximumFractionDigits: 6,
    })
    return asString.includes('.') ? (asString.replace(/\.?0+$/, '') || '0') : asString
  }

  return (
    <div className="space-y-5">
      {onBack && (
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}

      <form className="space-y-8" onSubmit={onSubmitSend}>
        <div className="space-y-2">
          <Label htmlFor="wallet-send-to">Recipient address</Label>
          <div className="relative">
            <Input
              id="wallet-send-to"
              value={sendTo}
              onChange={onChangeSendTo}
              placeholder="0x..."
              className={`${showConnectedWalletButton ? 'pr-28' : ''} h-14 text-sm placeholder:text-sm`}
              required
            />
            {showConnectedWalletButton && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onUseConnectedWallet}
                disabled={!connectedWalletAddress}
                className="absolute inset-y-3 right-2 text-xs"
              >
                <Wallet className="size-3.5 shrink-0" />
                <span>use connected</span>
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="wallet-send-amount">Amount</Label>
          <div className="relative">
            <Input
              id="wallet-send-amount"
              type="number"
              min="0"
              step="any"
              value={sendAmount}
              onChange={onChangeSendAmount}
              placeholder="0.00"
              className={`
                h-14
                [appearance:textfield]
                pr-16 text-sm
                [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
              `}
              required
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="absolute inset-y-3 right-2 text-xs"
              onClick={onMax}
              disabled={!onMax}
            >
              Max
            </Button>
          </div>
          {availableBalance && (
            <div className="mr-2 ml-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>USDC</span>
              <span>
                Balance:
                {' '}
                $
                {formatFullPrecision(availableBalance)}
              </span>
            </div>
          )}
        </div>

        <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={isSubmitDisabled}>
          <ArrowUpToLine className="size-4" />
          {isSending ? 'Submitting…' : 'Withdraw'}
        </Button>
      </form>
    </div>
  )
}

function WalletFundMenu({
  onBuy,
  onReceive,
  disabledBuy,
  disabledReceive,
  meldUrl,
}: {
  onBuy: (url: string) => void
  onReceive: () => void
  disabledBuy: boolean
  disabledReceive: boolean
  meldUrl: string | null
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const logoVariant = isDark ? 'dark' : 'light'
  const paymentLogos = MELD_PAYMENT_METHODS.map(method => `/images/deposit/meld/${method}_${logoVariant}.png`)
  const transferLogos = TRANSFER_PAYMENT_METHODS.map(method => `/images/deposit/transfer/${method}_${logoVariant}.png`)

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={`
          group flex w-full items-center justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-3
          text-left transition
          hover:border-primary hover:text-primary
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        onClick={() => {
          if (!meldUrl) {
            return
          }
          onBuy(meldUrl)
        }}
        disabled={disabledBuy}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-primary">
            <CreditCard className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Buy Crypto</p>
            <p className="text-xs text-muted-foreground">
              card
              {' \u00B7 '}
              bank wire
            </p>
          </div>
        </div>
        <div className="flex items-center -space-x-2 transition-all group-hover:-space-x-1">
          {paymentLogos.map(logo => (
            <div
              key={logo}
              className="relative size-6 overflow-hidden rounded-full border border-border/70 bg-background shadow-sm"
            >
              <Image
                src={logo}
                alt="Meld payment method"
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </button>

      <button
        type="button"
        className={`
          group flex w-full items-center justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-3
          text-left transition
          hover:border-primary hover:text-primary
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        onClick={onReceive}
        disabled={disabledReceive}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-primary">
            <CircleDollarSign className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Transfer Funds</p>
            <p className="text-xs text-muted-foreground">
              USDC
              {' \u00B7 '}
              copy wallet or scan QR code
            </p>
          </div>
        </div>
        <div className="flex items-center -space-x-2 transition-all group-hover:-space-x-1">
          {transferLogos.map(logo => (
            <div
              key={logo}
              className="relative size-7 overflow-hidden rounded-full border border-border/70 bg-background shadow-sm"
            >
              <Image
                src={logo}
                alt="Transfer method icon"
                fill
                sizes="28px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </button>
    </div>
  )
}

export function WalletDepositModal(props: WalletDepositModalProps) {
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
    onBuy,
    walletBalance,
  } = props

  const [copied, setCopied] = useState(false)
  const siteLabel = siteName ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'
  const formattedBalance = walletBalance && walletBalance !== ''
    ? walletBalance
    : '0.00'
  const content = view === 'fund'
    ? (
        <WalletFundMenu
          onBuy={(url) => {
            onBuy(url)
          }}
          onReceive={() => onViewChange('receive')}
          disabledBuy={!meldUrl}
          disabledReceive={!hasDeployedProxyWallet}
          meldUrl={meldUrl}
        />
      )
    : (
        <WalletReceiveView
          walletAddress={walletAddress}
          onBack={() => onViewChange('fund')}
          onCopy={handleCopy}
          copied={copied}
        />
      )

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

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(next) => {
          setCopied(false)
          onOpenChange(next)
        }}
      >
        <DrawerContent className="max-h-[90vh] w-full border-border/70 bg-background px-0">
          <DrawerHeader className="px-4 pt-4 pb-3">
            <DrawerTitle className="text-center text-2xl font-semibold text-foreground">Deposit</DrawerTitle>
            <p className="text-center text-sm text-muted-foreground">
              {siteLabel}
              {' '}
              Balance:
              {' '}
              $
              {formattedBalance}
            </p>
          </DrawerHeader>
          <div className="border-t border-border/60" />
          <div className="w-full px-4 pb-4">
            <div className="space-y-4 pt-4">
              {content}
            </div>
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
      <DialogContent className="w-full max-w-xl border border-border/70 bg-background p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-center text-2xl font-semibold text-foreground">Deposit</DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            {siteLabel}
            {' '}
            Balance:
            {' '}
            $
            {formattedBalance}
          </p>
        </DialogHeader>
        <div className="border-t border-border/60" />
        <div className="space-y-4 pt-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function WalletWithdrawModal(props: WalletWithdrawModalProps) {
  const {
    open,
    onOpenChange,
    isMobile,
    siteName,
    sendTo,
    onChangeSendTo,
    sendAmount,
    onChangeSendAmount,
    isSending,
    onSubmitSend,
    connectedWalletAddress,
    onUseConnectedWallet,
    availableBalance,
    onMax,
  } = props

  const content = (
    <WalletSendForm
      sendTo={sendTo}
      onChangeSendTo={onChangeSendTo}
      sendAmount={sendAmount}
      onChangeSendAmount={onChangeSendAmount}
      isSending={isSending}
      onSubmitSend={onSubmitSend}
      connectedWalletAddress={connectedWalletAddress}
      onUseConnectedWallet={onUseConnectedWallet}
      availableBalance={availableBalance}
      onMax={onMax}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] w-full border-border/70 bg-background px-0">
          <DrawerHeader className="px-4 pt-4 pb-2">
            <DrawerTitle className="text-center text-foreground">
              Withdraw from
              {' '}
              {siteName}
            </DrawerTitle>
          </DrawerHeader>
          <div className="border-t border-border/60" />
          <div className="w-full px-4 pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl border border-border/70 bg-background p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-center text-foreground">
            Withdraw from
            {' '}
            {siteName}
          </DialogTitle>
        </DialogHeader>
        <div className="border-t border-border/60" />

        {content}
      </DialogContent>
    </Dialog>
  )
}
