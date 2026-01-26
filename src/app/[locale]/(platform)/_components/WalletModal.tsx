'use client'

import type { ChangeEventHandler, FormEventHandler } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Fuel,
  Info,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

const WITHDRAW_TOKEN_OPTIONS = [
  { value: 'USDC', label: 'USDC', icon: '/images/withdraw/token/usdc.svg', enabled: false },
  { value: 'USDC.e', label: 'USDC.e', icon: '/images/withdraw/token/usdc.svg', enabled: true },
  { value: 'ARB', label: 'ARB', icon: '/images/withdraw/token/arb.svg', enabled: false },
  { value: 'BNB', label: 'BNB', icon: '/images/withdraw/token/bsc.svg', enabled: false },
  { value: 'BTCB', label: 'BTCB', icon: '/images/withdraw/token/btc.svg', enabled: false },
  { value: 'BUSD', label: 'BUSD', icon: '/images/withdraw/token/busd.svg', enabled: false },
  { value: 'CBBTC', label: 'CBBTC', icon: '/images/withdraw/token/cbbtc.svg', enabled: false },
  { value: 'DAI', label: 'DAI', icon: '/images/withdraw/token/dai.svg', enabled: false },
  { value: 'ETH', label: 'ETH', icon: '/images/withdraw/token/eth.svg', enabled: false },
  { value: 'MATIC', label: 'MATIC', icon: '/images/withdraw/token/matic.svg', enabled: false },
  { value: 'POL', label: 'POL', icon: '/images/withdraw/token/matic.svg', enabled: false },
  { value: 'SOL', label: 'SOL', icon: '/images/withdraw/token/sol.svg', enabled: false },
  { value: 'USDe', label: 'USDe', icon: '/images/withdraw/token/usde.svg', enabled: false },
  { value: 'USDT', label: 'USDT', icon: '/images/withdraw/token/usdt.svg', enabled: false },
  { value: 'WBNB', label: 'WBNB', icon: '/images/withdraw/token/bsc.svg', enabled: false },
  { value: 'WETH', label: 'WETH', icon: '/images/withdraw/token/weth.svg', enabled: false },
] as const

const WITHDRAW_CHAIN_OPTIONS = [
  { value: 'Ethereum', label: 'Ethereum', icon: '/images/withdraw/chain/ethereum.svg', enabled: false },
  { value: 'Solana', label: 'Solana', icon: '/images/withdraw/chain/solana.svg', enabled: false },
  { value: 'BSC', label: 'BSC', icon: '/images/withdraw/chain/bsc.svg', enabled: false },
  { value: 'Base', label: 'Base', icon: '/images/withdraw/chain/base.svg', enabled: false },
  { value: 'Polygon', label: 'Polygon', icon: '/images/withdraw/chain/polygon.svg', enabled: true },
  { value: 'Arbitrum', label: 'Arbitrum', icon: '/images/withdraw/chain/arbitrum.svg', enabled: false },
  { value: 'Optimism', label: 'Optimism', icon: '/images/withdraw/chain/optimism.svg', enabled: false },
] as const

type WalletDepositView = 'fund' | 'receive'

interface WalletDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  walletAddress?: string | null
  walletEoaAddress?: string | null
  siteName?: string
  meldUrl: string | null
  hasDeployedProxyWallet: boolean
  view: WalletDepositView
  onViewChange: (view: WalletDepositView) => void
  onBuy: (url: string) => void
  walletBalance?: string | null
  isBalanceLoading?: boolean
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
  isBalanceLoading?: boolean
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
    <div className="rounded-md border p-1.5 text-sm transition hover:bg-muted/40">
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
  onCopy,
  copied,
}: {
  walletAddress?: string | null
  siteName?: string
  onCopy: () => void
  copied: boolean
}) {
  const siteLabel = siteName ?? process.env.NEXT_PUBLIC_SITE_NAME!

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-center text-sm font-semibold text-muted-foreground">
          Scan QR Code or copy your
          {' '}
          {siteLabel}
          {' '}
          wallet address to transfer USDC on Polygon
        </p>
        <div className="flex justify-center">
          <div className="rounded-lg border p-2 transition hover:bg-muted/40">
            {walletAddress
              ? <QRCode value={walletAddress} size={200} />
              : <p className="text-sm text-destructive">Proxy wallet not ready yet.</p>}
          </div>
        </div>
      </div>
      <WalletAddressCard
        walletAddress={walletAddress}
        onCopy={onCopy}
        copied={copied}
        label=""
      />
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
  isBalanceLoading = false,
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
  isBalanceLoading?: boolean
}) {
  const trimmedRecipient = sendTo.trim()
  const isRecipientAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedRecipient)
  const parsedAmount = Number(sendAmount)
  const [receiveToken, setReceiveToken] = useState<string>('USDC.e')
  const [receiveChain, setReceiveChain] = useState<string>('Polygon')
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  const isSubmitDisabled = (
    isSending
    || !trimmedRecipient
    || !isRecipientAddress
    || !Number.isFinite(parsedAmount)
    || parsedAmount <= 0
  )
  const showConnectedWalletButton = !sendTo?.trim()
  const amountDisplay = Number.isFinite(parsedAmount)
    ? parsedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00'
  const receiveAmountDisplay = Number.isFinite(parsedAmount)
    ? parsedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 5,
        maximumFractionDigits: 5,
      })
    : '0.00000'
  const formattedBalance = Number.isFinite(availableBalance)
    ? Number(availableBalance).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00'
  const balanceDisplay = isBalanceLoading
    ? <Skeleton className="h-4 w-16" />
    : formattedBalance
  const selectedToken = WITHDRAW_TOKEN_OPTIONS.find(option => option.value === receiveToken)
  const selectedChain = WITHDRAW_CHAIN_OPTIONS.find(option => option.value === receiveChain)
  const isUsdcESelected = receiveToken === 'USDC.e'

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

      <form className="mt-2 grid gap-4" onSubmit={onSubmitSend}>
        <div className="grid gap-2">
          <Label htmlFor="wallet-send-to">Recipient address</Label>
          <div className="relative">
            <Input
              id="wallet-send-to"
              value={sendTo}
              onChange={onChangeSendTo}
              placeholder="0x..."
              className={`${showConnectedWalletButton ? 'pr-28' : ''} h-12 text-sm placeholder:text-sm`}
              required
            />
            {showConnectedWalletButton && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onUseConnectedWallet}
                disabled={!connectedWalletAddress}
                className="absolute inset-y-2 right-2 text-xs"
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
                h-12
                [appearance:textfield]
                pr-36 text-sm
                [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
              `}
              required
            />
            <div className="absolute inset-y-2 right-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">USDC</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-foreground hover:text-muted-foreground"
                onClick={onMax}
                disabled={!onMax || isBalanceLoading}
              >
                Max
              </Button>
            </div>
          </div>
          <div className="mx-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              $
              {amountDisplay}
            </span>
            <span className="flex items-center gap-1">
              <span>Balance:</span>
              <span>{balanceDisplay}</span>
              <span>USDC</span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Receive token</Label>
            <Select value={receiveToken} onValueChange={setReceiveToken}>
              <SelectTrigger className="h-12 w-full justify-between">
                <div className="flex items-center gap-2">
                  {selectedToken && (
                    <Image
                      src={selectedToken.icon}
                      alt={selectedToken.label}
                      width={20}
                      height={20}
                    />
                  )}
                  <span className="text-sm font-medium">{selectedToken?.label ?? 'Select token'}</span>
                </div>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
                {WITHDRAW_TOKEN_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} disabled={!option.enabled}>
                    <div className="flex items-center gap-2">
                      <Image src={option.icon} alt={option.label} width={18} height={18} />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receive chain</Label>
            <Select value={receiveChain} onValueChange={setReceiveChain}>
              <SelectTrigger className="h-12 w-full justify-between">
                <div className="flex items-center gap-2">
                  {selectedChain && (
                    <Image
                      src={selectedChain.icon}
                      alt={selectedChain.label}
                      width={20}
                      height={20}
                    />
                  )}
                  <span className="text-sm font-medium">{selectedChain?.label ?? 'Select chain'}</span>
                </div>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
                {WITHDRAW_CHAIN_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} disabled={!option.enabled}>
                    <div className="flex items-center gap-2">
                      <Image src={option.icon} alt={option.label} width={18} height={18} />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">You will receive</span>
            <div className="flex items-center gap-3 text-right">
              <span className="text-foreground">
                {receiveAmountDisplay}
                {' '}
                {receiveToken}
              </span>
              <span className="text-muted-foreground">
                $
                {amountDisplay}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm text-muted-foreground"
            onClick={() => setIsBreakdownOpen(current => !current)}
          >
            <span>Transaction breakdown</span>
            <span className="flex items-center gap-1">
              {!isBreakdownOpen && <span>0.00%</span>}
              <ChevronRight
                className={`size-4 transition ${isBreakdownOpen ? 'rotate-90' : ''}`}
              />
            </span>
          </button>
          {isBreakdownOpen && (
            <TooltipProvider>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Network cost</span>
                        <Info className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      hideArrow
                      className="border bg-background text-foreground shadow-lg"
                    >
                      <div className="space-y-1 text-xs text-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Total cost</span>
                          <span className="text-right">$0.00</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Source chain gas</span>
                          <span className="text-right">$0.00</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Destination chain gas</span>
                          <span className="text-right">$0.00</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1">
                    <Fuel className="size-4" />
                    <span>$0.00</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Price impact</span>
                        <Info className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      hideArrow
                      className="border bg-background text-foreground shadow-lg"
                    >
                      <div className="space-y-1 text-xs text-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Total impact</span>
                          <span className="text-right">0.00%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Swap impact</span>
                          <span className="text-right">0.00%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Fun.xyz fee</span>
                          <span className="text-right">0.00%</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <span>0.00%</span>
                </div>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Max slippage</span>
                        <Info className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      hideArrow
                      className="max-w-56 border bg-background text-foreground shadow-lg"
                    >
                      <p className="text-xs text-foreground">
                        Slippage occurs due to price changes during trade execution. Minimum received: $00.00
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <span>Auto • 0.00%</span>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>

        {isUsdcESelected && (
          <div className="rounded-lg bg-muted/60 p-4">
            <div className="flex items-start gap-3 text-xs text-foreground">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive">
                <Info className="size-4 text-background" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">USDCe is not widely supported by most exchanges</p>
                <p className="text-muted-foreground">
                  Sending USDCe to an unsupported platform may result in a permanent loss of funds. Always double-check token compatibility before transferring.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={isSubmitDisabled}>
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
  walletEoaAddress,
}: {
  onBuy: (url: string) => void
  onReceive: () => void
  disabledBuy: boolean
  disabledReceive: boolean
  meldUrl: string | null
  walletEoaAddress?: string | null
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const logoVariant = isDark ? 'dark' : 'light'
  const paymentLogos = MELD_PAYMENT_METHODS.map(method => `/images/deposit/meld/${method}_${logoVariant}.png`)
  const transferLogos = TRANSFER_PAYMENT_METHODS.map(method => `/images/deposit/transfer/${method}_${logoVariant}.png`)
  const walletSuffix = walletEoaAddress?.slice(-4) ?? '----'

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className={`
          group flex w-full items-center justify-between gap-4 rounded-lg border border-border px-4 py-2 text-left
          transition
          hover:bg-muted/50
          disabled:cursor-not-allowed disabled:opacity-50
        `}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center text-foreground">
            <Wallet className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Wallet (...
              {walletSuffix}
              )
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>$0.00</span>
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              <span>Instant</span>
            </div>
          </div>
        </div>
      </button>

      <div className="mx-auto flex w-full items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border/70" />
        <span>more</span>
        <div className="h-px flex-1 bg-border/70" />
      </div>

      <button
        type="button"
        className={`
          group flex w-full items-center justify-between gap-4 rounded-lg border border-border px-4 py-2 text-left
          transition
          hover:bg-muted/50
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
          <div className="flex size-12 items-center justify-center text-foreground">
            <CreditCard className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Buy Crypto</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>card</span>
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              <span>bank wire</span>
            </div>
          </div>
        </div>
        <div className="flex items-center -space-x-2 transition-all group-hover:-space-x-1">
          {paymentLogos.map(logo => (
            <div
              key={logo}
              className="relative size-5 overflow-hidden rounded-full bg-background shadow-sm"
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
          group flex w-full items-center justify-between gap-4 rounded-lg border border-border px-4 py-2 text-left
          transition
          hover:bg-muted/50
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        onClick={onReceive}
        disabled={disabledReceive}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center text-foreground">
            <CircleDollarSign className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Transfer Funds</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>USDC</span>
              <span className="size-1.5 rounded-full bg-muted-foreground" />
              <span>copy wallet or scan QR code</span>
            </div>
          </div>
        </div>
        <div className="flex items-center -space-x-2 transition-all group-hover:-space-x-1">
          {transferLogos.map(logo => (
            <div
              key={logo}
              className="relative size-6 overflow-hidden rounded-full bg-background shadow-sm"
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
    walletEoaAddress,
    siteName,
    meldUrl,
    hasDeployedProxyWallet,
    view,
    onViewChange,
    onBuy,
    walletBalance,
    isBalanceLoading = false,
  } = props

  const [copied, setCopied] = useState(false)
  const siteLabel = siteName ?? process.env.NEXT_PUBLIC_SITE_NAME!
  const formattedBalance = walletBalance && walletBalance !== ''
    ? walletBalance
    : '0.00'
  const balanceDisplay = isBalanceLoading
    ? <Skeleton className="inline-block h-3 w-12 align-middle" />
    : (
        <>
          $
          {formattedBalance}
        </>
      )
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
          walletEoaAddress={walletEoaAddress}
        />
      )
    : (
        <WalletReceiveView
          walletAddress={walletAddress}
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
        <DrawerContent className="max-h-[90vh] w-full bg-background px-0">
          <DrawerHeader className="gap-1 px-4 pt-3 pb-2">
            <div className="flex items-center">
              {view === 'receive'
                ? (
                    <button
                      type="button"
                      className={`
                        rounded-md p-2 opacity-70 ring-offset-background transition
                        hover:bg-muted hover:opacity-100
                        focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden
                        disabled:pointer-events-none
                        [&_svg]:pointer-events-none [&_svg]:shrink-0
                        [&_svg:not([class*='size-'])]:size-4
                      `}
                      onClick={() => onViewChange('fund')}
                    >
                      <ChevronLeft />
                    </button>
                  )
                : (
                    <span className="size-8" aria-hidden="true" />
                  )}
              <DrawerTitle className="flex-1 text-center text-xl font-semibold text-foreground">Deposit</DrawerTitle>
              <span className="size-8" aria-hidden="true" />
            </div>
            <DrawerDescription className="text-center text-xs text-muted-foreground">
              {siteLabel}
              {' '}
              Balance:
              {' '}
              {balanceDisplay}
            </DrawerDescription>
          </DrawerHeader>
          <div className="border-t" />
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
      <DialogContent className="max-w-md border bg-background pt-4 sm:max-w-md">
        <DialogHeader className="gap-1">
          <div className="flex items-center">
            {view === 'receive'
              ? (
                  <button
                    type="button"
                    className={`
                      rounded-md p-2 opacity-70 ring-offset-background transition
                      hover:bg-muted hover:opacity-100
                      focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden
                      disabled:pointer-events-none
                      [&_svg]:pointer-events-none [&_svg]:shrink-0
                      [&_svg:not([class*='size-'])]:size-4
                    `}
                    onClick={() => onViewChange('fund')}
                  >
                    <ChevronLeft />
                  </button>
                )
              : (
                  <span className="size-8" aria-hidden="true" />
                )}
            <DialogTitle className="flex-1 text-center text-lg font-semibold text-foreground">Deposit</DialogTitle>
            <span className="size-8" aria-hidden="true" />
          </div>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {siteLabel}
            {' '}
            Balance:
            {' '}
            {balanceDisplay}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-6 border-t" />
        {content}
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
    isBalanceLoading,
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
      isBalanceLoading={isBalanceLoading}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] w-full bg-background px-0">
          <DrawerHeader className="px-4 pt-4 pb-2">
            <DrawerTitle className="text-center text-foreground">
              Withdraw from
              {' '}
              {siteName}
            </DrawerTitle>
          </DrawerHeader>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl border bg-background">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Withdraw from
            {' '}
            {siteName}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
