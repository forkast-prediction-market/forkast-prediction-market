'use client'

import type { ReactNode } from 'react'
import type { ProxyWalletStatus } from '@/types'
import { Check, CircleDollarSign, Loader2, Wallet, X } from 'lucide-react'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { UserRejectedRequestError } from 'viem'
import { useSignTypedData } from 'wagmi'
import { saveProxyWalletSignature } from '@/app/(platform)/_actions/proxy-wallet'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppKit } from '@/hooks/useAppKit'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import {
  getSafeProxyDomain,
  SAFE_PROXY_CREATE_PROXY_MESSAGE,
  SAFE_PROXY_PRIMARY_TYPE,
  SAFE_PROXY_TYPES,
} from '@/lib/contracts/safeProxy'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

interface TradingOnboardingContextValue {
  startDepositFlow: () => void
  ensureTradingReady: () => boolean
  openTradeRequirements: () => void
  hasProxyWallet: boolean
}

const TradingOnboardingContext = createContext<TradingOnboardingContextValue | null>(null)

export function TradingOnboardingProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const { open } = useAppKit()
  const { signTypedDataAsync } = useSignTypedData()
  const [enableModalOpen, setEnableModalOpen] = useState(false)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [shouldShowFundAfterProxy, setShouldShowFundAfterProxy] = useState(false)
  const [isSigningProxyWallet, setIsSigningProxyWallet] = useState(false)
  const [proxyWalletError, setProxyWalletError] = useState<string | null>(null)

  const proxyWalletStatus = user?.proxy_wallet_status ?? null
  const hasProxyWalletAddress = Boolean(user?.proxy_wallet_address)
  const hasDeployedProxyWallet = useMemo(() => (
    Boolean(user?.proxy_wallet_address && proxyWalletStatus === 'deployed')
  ), [proxyWalletStatus, user?.proxy_wallet_address])
  const isProxyWalletDeploying = useMemo(() => (
    Boolean(user?.proxy_wallet_address && proxyWalletStatus === 'signed')
  ), [proxyWalletStatus, user?.proxy_wallet_address])
  const hasProxyWallet = hasDeployedProxyWallet

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const needsSync = !hasProxyWalletAddress || !hasDeployedProxyWallet
    if (!needsSync) {
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function shouldContinuePolling() {
      const current = useUser.getState()
      return Boolean(current && (!current.proxy_wallet_address || current.proxy_wallet_status !== 'deployed'))
    }

    function scheduleRetry(delay: number) {
      if (!cancelled && shouldContinuePolling()) {
        timeoutId = setTimeout(fetchProxyDetails, delay)
      }
    }

    function fetchProxyDetails() {
      fetch('/api/user/proxy')
        .then(async (response) => {
          if (!response.ok) {
            return null
          }
          return await response.json() as {
            proxy_wallet_address?: string | null
            proxy_wallet_signature?: string | null
            proxy_wallet_signed_at?: string | null
            proxy_wallet_status?: string | null
            proxy_wallet_tx_hash?: string | null
          }
        })
        .then((data) => {
          if (cancelled) {
            return
          }

          if (!data) {
            scheduleRetry(10000)
            return
          }

          useUser.setState((previous) => {
            if (!previous) {
              return previous
            }

            const nextAddress = data.proxy_wallet_address ?? previous.proxy_wallet_address
            const nextSignature = data.proxy_wallet_signature ?? previous.proxy_wallet_signature
            const nextSignedAt = data.proxy_wallet_signed_at ?? previous.proxy_wallet_signed_at
            const nextStatus = (data.proxy_wallet_status as ProxyWalletStatus | null | undefined) ?? previous.proxy_wallet_status
            const nextTxHash = data.proxy_wallet_tx_hash ?? previous.proxy_wallet_tx_hash

            const nothingChanged = (
              nextAddress === previous.proxy_wallet_address
              && nextSignature === previous.proxy_wallet_signature
              && nextSignedAt === previous.proxy_wallet_signed_at
              && nextStatus === previous.proxy_wallet_status
              && nextTxHash === previous.proxy_wallet_tx_hash
            )

            if (nothingChanged) {
              return previous
            }

            return {
              ...previous,
              proxy_wallet_address: nextAddress,
              proxy_wallet_signature: nextSignature,
              proxy_wallet_signed_at: nextSignedAt,
              proxy_wallet_status: nextStatus,
              proxy_wallet_tx_hash: nextTxHash,
            }
          })

          if (!cancelled && data.proxy_wallet_address && data.proxy_wallet_status === 'signed') {
            timeoutId = setTimeout(fetchProxyDetails, 6000)
          }
        })
        .catch(() => {
          scheduleRetry(10000)
        })
    }

    fetchProxyDetails()

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [hasDeployedProxyWallet, hasProxyWalletAddress, user?.id, user?.proxy_wallet_address, user?.proxy_wallet_status])

  const resetPendingFundState = useCallback(() => {
    setShouldShowFundAfterProxy(false)
  }, [])

  const handleDepositModalOpen = useCallback(() => {
    queueMicrotask(() => {
      void open()
    })
  }, [open])

  const handleProxyWalletSignature = useCallback(async () => {
    setProxyWalletError(null)

    try {
      const domain = getSafeProxyDomain()
      setIsSigningProxyWallet(true)

      const signature = await signTypedDataAsync({
        domain,
        types: SAFE_PROXY_TYPES,
        primaryType: SAFE_PROXY_PRIMARY_TYPE,
        message: SAFE_PROXY_CREATE_PROXY_MESSAGE,
      })

      const result = await saveProxyWalletSignature({ signature })

      if (result.error || !result.data) {
        setProxyWalletError(result.error ?? DEFAULT_ERROR_MESSAGE)
        return
      }

      useUser.setState((previous) => {
        if (!previous) {
          return previous
        }

        return {
          ...previous,
          ...result.data,
        }
      })

      setEnableModalOpen(false)

      if (shouldShowFundAfterProxy) {
        setFundModalOpen(true)
      }

      resetPendingFundState()
    }
    catch (error) {
      if (error instanceof UserRejectedRequestError) {
        setProxyWalletError('You rejected the signature request.')
      }
      else if (error instanceof Error) {
        setProxyWalletError(error.message || DEFAULT_ERROR_MESSAGE)
      }
      else {
        setProxyWalletError(DEFAULT_ERROR_MESSAGE)
      }
    }
    finally {
      setIsSigningProxyWallet(false)
    }
  }, [resetPendingFundState, shouldShowFundAfterProxy, signTypedDataAsync])

  const startDepositFlow = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return
    }

    if (hasDeployedProxyWallet) {
      handleDepositModalOpen()
      return
    }

    setProxyWalletError(null)
    setShouldShowFundAfterProxy(true)
    setEnableModalOpen(true)
  }, [handleDepositModalOpen, hasDeployedProxyWallet, open, user])

  const ensureTradingReady = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return false
    }

    if (hasDeployedProxyWallet) {
      return true
    }

    setProxyWalletError(null)
    setTradeModalOpen(true)
    return false
  }, [hasDeployedProxyWallet, open, user])

  const openTradeRequirements = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return
    }

    setProxyWalletError(null)
    setTradeModalOpen(true)
  }, [open, user])

  const closeFundModal = useCallback((nextOpen: boolean) => {
    setFundModalOpen(nextOpen)
    if (!nextOpen) {
      resetPendingFundState()
    }
  }, [resetPendingFundState])

  const contextValue = useMemo<TradingOnboardingContextValue>(() => ({
    startDepositFlow,
    ensureTradingReady,
    openTradeRequirements,
    hasProxyWallet,
  }), [ensureTradingReady, hasProxyWallet, openTradeRequirements, startDepositFlow])

  return (
    <TradingOnboardingContext value={contextValue}>
      {children}

      <Dialog
        open={enableModalOpen}
        onOpenChange={(next) => {
          setEnableModalOpen(next)
          if (!next) {
            resetPendingFundState()
          }
        }}
      >
        <DialogContent className="max-w-md border border-border/70 bg-background p-8 text-center">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="size-8" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">Enable Trading</DialogTitle>
            <DialogDescription className="text-center text-base text-muted-foreground">
              {`Let's set up your wallet to trade on ${process.env.NEXT_PUBLIC_SITE_NAME}.`}
            </DialogDescription>
          </DialogHeader>

          {proxyWalletError && (
            <p className="mt-2 text-sm text-destructive">{proxyWalletError}</p>
          )}

          <Button
            className="mt-6 h-12 w-full text-base"
            onClick={handleProxyWalletSignature}
            disabled={isSigningProxyWallet || isProxyWalletDeploying}
          >
            {isSigningProxyWallet || isProxyWalletDeploying ? <Loader2 className="size-5 animate-spin" /> : 'Enable Trading'}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={fundModalOpen} onOpenChange={closeFundModal}>
        <DialogContent className="max-w-md border border-border/70 bg-background p-8 text-center">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleDollarSign className="size-8" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">Fund Your Account</DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <Button
              className="h-12 w-full text-base"
              onClick={() => {
                closeFundModal(false)
                handleDepositModalOpen()
              }}
            >
              Deposit Funds
            </Button>

            <button
              type="button"
              className={`
                mx-auto block text-sm font-medium text-muted-foreground transition-colors
                hover:text-foreground
              `}
              onClick={() => closeFundModal(false)}
            >
              Skip for now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tradeModalOpen} onOpenChange={setTradeModalOpen}>
        <DialogContent showCloseButton={false} className="max-w-xl border border-border/70 bg-background p-6">
          <DialogHeader className="pb-2 text-center">
            <DialogTitle className="text-lg font-semibold">
              Trade on
              {' '}
              {process.env.NEXT_PUBLIC_SITE_NAME}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type="button"
              className={`
                absolute top-4 right-4 rounded-full p-1 text-muted-foreground transition-colors
                hover:text-foreground
              `}
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </DialogClose>

          <div className="space-y-4">
            <TradingRequirementStep
              title="Deploy Proxy Wallet"
              description={`Deploy your proxy wallet to trade on ${process.env.NEXT_PUBLIC_SITE_NAME}.`}
              actionLabel={isProxyWalletDeploying ? 'Deploying' : 'Deploy'}
              isLoading={isSigningProxyWallet || isProxyWalletDeploying}
              disabled={isProxyWalletDeploying}
              isComplete={hasProxyWallet}
              error={proxyWalletError}
              onAction={handleProxyWalletSignature}
            />
          </div>
        </DialogContent>
      </Dialog>
    </TradingOnboardingContext>
  )
}

interface TradingRequirementStepProps {
  title: string
  description: string
  actionLabel: string
  isLoading: boolean
  disabled?: boolean
  isComplete: boolean
  error?: string | null
  onAction: () => void
}

function TradingRequirementStep({
  title,
  description,
  actionLabel,
  isLoading,
  disabled,
  isComplete,
  error,
  onAction,
}: TradingRequirementStepProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {!isComplete && error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        {isComplete
          ? (
              <div className="flex min-w-[110px] items-center justify-center gap-1 text-sm font-semibold text-primary">
                <Check className="size-4" />
                Complete
              </div>
            )
          : (
              <Button
                size="sm"
                className={cn('min-w-[110px]', isLoading && 'pointer-events-none opacity-80')}
                disabled={Boolean(disabled) || isLoading}
                onClick={onAction}
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : actionLabel}
              </Button>
            )}
      </div>
    </div>
  )
}

export function useTradingOnboarding() {
  const context = use(TradingOnboardingContext)
  if (!context) {
    throw new Error('useTradingOnboarding must be used within TradingOnboardingProvider')
  }
  return context
}
