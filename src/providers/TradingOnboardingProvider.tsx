'use client'

import type { ReactNode } from 'react'
import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import type { ProxyWalletStatus } from '@/types'
import { Check, CircleDollarSign, Loader2, Wallet, X } from 'lucide-react'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { hashTypedData, UserRejectedRequestError } from 'viem'
import { useSignMessage, useSignTypedData } from 'wagmi'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
import { saveProxyWalletSignature } from '@/app/(platform)/_actions/proxy-wallet'
import { generateTradingAuthAction } from '@/app/(platform)/_actions/trading-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useAppKit } from '@/hooks/useAppKit'
import { defaultNetwork } from '@/lib/appkit'
import { authClient } from '@/lib/auth-client'
import { CONDITIONAL_TOKENS_CONTRACT, CTF_EXCHANGE_ADDRESS, DEFAULT_ERROR_MESSAGE, NEG_RISK_CTF_EXCHANGE_ADDRESS } from '@/lib/constants'
import {
  getSafeProxyDomain,
  SAFE_PROXY_CREATE_PROXY_MESSAGE,
  SAFE_PROXY_PRIMARY_TYPE,
  SAFE_PROXY_TYPES,
} from '@/lib/contracts/safeProxy'
import {
  aggregateSafeTransactions,
  buildApproveTokenTransactions,
  getSafeTxTypedData,
  packSafeSignature,
} from '@/lib/safe/transactions'
import {
  buildTradingAuthMessage,
  getTradingAuthDomain,
  TRADING_AUTH_PRIMARY_TYPE,
  TRADING_AUTH_TYPES,
} from '@/lib/trading-auth/client'
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
  const { signMessageAsync } = useSignMessage()
  const [enableModalOpen, setEnableModalOpen] = useState(false)
  const [fundModalOpen, setFundModalOpen] = useState(false)
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [shouldShowFundAfterProxy, setShouldShowFundAfterProxy] = useState(false)
  const [proxyWalletError, setProxyWalletError] = useState<string | null>(null)
  const [tradingAuthError, setTradingAuthError] = useState<string | null>(null)
  const [tokenApprovalError, setTokenApprovalError] = useState<string | null>(null)
  const [proxyStep, setProxyStep] = useState<'idle' | 'signing' | 'deploying' | 'completed'>('idle')
  const [tradingAuthStep, setTradingAuthStep] = useState<'idle' | 'signing' | 'completed'>('idle')
  const [approvalsStep, setApprovalsStep] = useState<'idle' | 'signing' | 'completed'>('idle')

  const proxyWalletStatus = user?.proxy_wallet_status ?? null
  const hasProxyWalletAddress = Boolean(user?.proxy_wallet_address)
  const hasDeployedProxyWallet = useMemo(() => (
    Boolean(user?.proxy_wallet_address && proxyWalletStatus === 'deployed')
  ), [proxyWalletStatus, user?.proxy_wallet_address])
  const isProxyWalletDeploying = useMemo(() => (
    Boolean(user?.proxy_wallet_address && proxyWalletStatus === 'deploying')
  ), [proxyWalletStatus, user?.proxy_wallet_address])
  const tradingAuthSettings = user?.settings?.tradingAuth ?? null
  const hasTradingAuth = Boolean(
    tradingAuthSettings?.relayer?.enabled
    && tradingAuthSettings?.clob?.enabled,
  )
  const approvalsSettings = tradingAuthSettings?.approvals ?? null
  const hasTokenApprovals = Boolean(approvalsSettings?.enabled)
  const localStepsComplete
    = proxyStep === 'completed'
      && tradingAuthStep === 'completed'
      && approvalsStep === 'completed'
  const tradingReady
    = (hasTradingAuth && hasDeployedProxyWallet && hasTokenApprovals)
      || localStepsComplete

  useEffect(() => {
    if (hasDeployedProxyWallet) {
      setProxyStep('completed')
    }
    else if (isProxyWalletDeploying) {
      setProxyStep(prev => (prev === 'completed' ? 'completed' : 'deploying'))
    }
  }, [hasDeployedProxyWallet, isProxyWalletDeploying])

  useEffect(() => {
    if (hasTradingAuth) {
      setTradingAuthStep('completed')
    }
  }, [hasTradingAuth])

  useEffect(() => {
    if (hasTokenApprovals) {
      setApprovalsStep('completed')
    }
  }, [hasTokenApprovals])

  const refreshSessionUserState = useCallback(async () => {
    try {
      const session = await authClient.getSession()
      const sessionUser = session?.data?.user
      if (sessionUser) {
        useUser.setState({
          ...sessionUser,
          image: sessionUser.image ?? '',
        })
      }
    }
    catch (error) {
      console.error('Failed to refresh user session', error)
    }
  }, [])

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

          if (!cancelled && data.proxy_wallet_address && data.proxy_wallet_status !== 'deployed') {
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

  const resetEnableFlowState = useCallback(() => {
    setProxyWalletError(null)
    setTradingAuthError(null)
    setTokenApprovalError(null)
    setShouldShowFundAfterProxy(false)
    if (proxyStep !== 'completed') {
      setProxyStep('idle')
    }
  }, [proxyStep])

  const handleDepositModalOpen = useCallback(() => {
    queueMicrotask(() => {
      void open()
    })
  }, [open])

  const handleProxyWalletSignature = useCallback(async () => {
    setProxyWalletError(null)

    try {
      setProxyStep('signing')
      const domain = getSafeProxyDomain()

      const signature = await signTypedDataAsync({
        domain,
        types: SAFE_PROXY_TYPES,
        primaryType: SAFE_PROXY_PRIMARY_TYPE,
        message: SAFE_PROXY_CREATE_PROXY_MESSAGE,
      })

      const result = await saveProxyWalletSignature({ signature })

      if (result.error || !result.data) {
        setProxyStep('idle')
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

      const nextStatus = result.data.proxy_wallet_status
      if (nextStatus === 'deployed') {
        setProxyStep('completed')
      }
      else if (nextStatus === 'deploying') {
        setProxyStep('deploying')
      }
      else {
        setProxyStep('idle')
      }

      void refreshSessionUserState()

      setEnableModalOpen(false)

      if (shouldShowFundAfterProxy) {
        setFundModalOpen(true)
      }

      resetPendingFundState()
    }
    catch (error) {
      if (error instanceof UserRejectedRequestError) {
        setProxyWalletError('You rejected the signature request.')
        setProxyStep('idle')
      }
      else if (error instanceof Error) {
        setProxyWalletError(error.message || DEFAULT_ERROR_MESSAGE)
        setProxyStep('idle')
      }
      else {
        setProxyWalletError(DEFAULT_ERROR_MESSAGE)
        setProxyStep('idle')
      }
    }
  }, [refreshSessionUserState, resetPendingFundState, shouldShowFundAfterProxy, signTypedDataAsync])

  const handleTradingAuthSignature = useCallback(async () => {
    if (!user?.address) {
      setTradingAuthError('Please sign in to continue.')
      return
    }

    setTradingAuthError(null)

    try {
      setTradingAuthStep('signing')
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const message = buildTradingAuthMessage({
        address: user.address as `0x${string}`,
        timestamp,
      })

      const signature = await signTypedDataAsync({
        domain: getTradingAuthDomain(),
        types: TRADING_AUTH_TYPES,
        primaryType: TRADING_AUTH_PRIMARY_TYPE,
        message,
      })

      const result = await generateTradingAuthAction({
        signature,
        timestamp,
        nonce: message.nonce.toString(),
      })

      if (result.error || !result.data) {
        setTradingAuthError(result.error ?? DEFAULT_ERROR_MESSAGE)
        setTradingAuthStep('idle')
        return
      }

      useUser.setState((previous) => {
        if (!previous) {
          return previous
        }

        const nextSettings = { ...(previous.settings ?? {}) }
        nextSettings.tradingAuth = {
          ...(nextSettings.tradingAuth ?? {}),
          relayer: result.data?.relayer,
          clob: result.data?.clob,
        }

        return {
          ...previous,
          settings: nextSettings,
        }
      })

      void refreshSessionUserState()
      setTradingAuthStep('completed')
    }
    catch (error) {
      if (error instanceof UserRejectedRequestError) {
        setTradingAuthError('You rejected the signature request.')
        setTradingAuthStep('idle')
      }
      else if (error instanceof Error) {
        setTradingAuthError(error.message || DEFAULT_ERROR_MESSAGE)
        setTradingAuthStep('idle')
      }
      else {
        setTradingAuthError(DEFAULT_ERROR_MESSAGE)
        setTradingAuthStep('idle')
      }
    }
  }, [refreshSessionUserState, signTypedDataAsync, user])

  const handleApproveTokens = useCallback(async () => {
    if (!user?.address || !user?.proxy_wallet_address) {
      setTokenApprovalError('Deploy your proxy wallet first.')
      return
    }

    if (!hasTradingAuth) {
      setTokenApprovalError('Enable trading before approving tokens.')
      return
    }

    setTokenApprovalError(null)

    try {
      setApprovalsStep('signing')
      const nonceResult = await getSafeNonceAction()
      if (nonceResult.error || !nonceResult.nonce) {
        setTokenApprovalError(nonceResult.error ?? DEFAULT_ERROR_MESSAGE)
        setApprovalsStep('idle')
        return
      }

      const transactions = buildApproveTokenTransactions({
        spender: CONDITIONAL_TOKENS_CONTRACT as `0x${string}`,
        operators: [
          CTF_EXCHANGE_ADDRESS as `0x${string}`,
          NEG_RISK_CTF_EXCHANGE_ADDRESS as `0x${string}`,
        ],
      })
      const aggregated = aggregateSafeTransactions(transactions)
      const typedData = getSafeTxTypedData({
        chainId: defaultNetwork.id,
        safeAddress: user.proxy_wallet_address as `0x${string}`,
        transaction: aggregated,
        nonce: nonceResult.nonce,
      })

      const structHash = hashTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      }) as `0x${string}`

      const signature = await signMessageAsync({
        message: { raw: structHash },
      })

      const requestPayload: SafeTransactionRequestPayload = {
        type: 'SAFE',
        from: user.address,
        to: aggregated.to,
        proxyWallet: user.proxy_wallet_address,
        data: aggregated.data,
        nonce: nonceResult.nonce,
        signature: packSafeSignature(signature as `0x${string}`),
        signatureParams: typedData.signatureParams,
        metadata: 'approve_tokens',
      }

      const submitResult = await submitSafeTransactionAction(requestPayload)
      if (submitResult.error) {
        setTokenApprovalError(submitResult.error)
        setApprovalsStep('idle')
        return
      }

      if (submitResult.approvals) {
        useUser.setState((previous) => {
          if (!previous) {
            return previous
          }
          const nextSettings = { ...(previous.settings ?? {}) }
          nextSettings.tradingAuth = {
            ...(nextSettings.tradingAuth ?? {}),
            approvals: submitResult.approvals,
          }
          return {
            ...previous,
            settings: nextSettings,
          }
        })

        void refreshSessionUserState()
      }

      setApprovalsStep('completed')
    }
    catch (error) {
      console.error('Failed to approve tokens', error)
      if (error instanceof Error) {
        setTokenApprovalError(error.message || DEFAULT_ERROR_MESSAGE)
      }
      else {
        setTokenApprovalError(DEFAULT_ERROR_MESSAGE)
      }
      setApprovalsStep('idle')
    }
  }, [hasTradingAuth, refreshSessionUserState, signMessageAsync, user])

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

    resetEnableFlowState()
    setShouldShowFundAfterProxy(true)
    setEnableModalOpen(true)
  }, [handleDepositModalOpen, hasDeployedProxyWallet, open, resetEnableFlowState, user])

  const ensureTradingReady = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return false
    }

    if (tradingReady) {
      return true
    }

    resetEnableFlowState()
    setTradeModalOpen(true)
    return false
  }, [open, resetEnableFlowState, tradingReady, user])

  const openTradeRequirements = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return
    }

    resetEnableFlowState()
    setTradeModalOpen(true)
  }, [open, resetEnableFlowState, user])

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
    hasProxyWallet: hasDeployedProxyWallet,
  }), [ensureTradingReady, hasDeployedProxyWallet, openTradeRequirements, startDepositFlow])

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

          <div className="mt-6 space-y-6 text-left">
            <TradingRequirementStep
              title="Deploy Proxy Wallet"
              description={`Deploy your proxy wallet to trade on ${process.env.NEXT_PUBLIC_SITE_NAME}.`}
              actionLabel={proxyStep === 'signing' ? 'Signing…' : proxyStep === 'deploying' ? 'Deploying' : 'Deploy'}
              isLoading={proxyStep === 'signing'}
              disabled={proxyStep === 'signing' || proxyStep === 'deploying'}
              isComplete={proxyStep === 'completed'}
              error={proxyWalletError}
              onAction={handleProxyWalletSignature}
            />

            <Separator className="bg-border/70" />

            <TradingRequirementStep
              title="Enable Trading"
              description="You need to sign this each time you trade on a new browser."
              actionLabel={tradingAuthStep === 'signing' ? 'Signing…' : 'Sign'}
              isLoading={tradingAuthStep === 'signing'}
              disabled={!hasDeployedProxyWallet || tradingAuthStep === 'completed' || tradingAuthStep === 'signing'}
              isComplete={tradingAuthStep === 'completed'}
              error={tradingAuthError}
              onAction={handleTradingAuthSignature}
            />

            <Separator className="bg-border/70" />

            <TradingRequirementStep
              title="Approve Tokens"
              description="Start trading securely with your USDC."
              actionLabel={approvalsStep === 'signing' ? 'Signing…' : 'Sign'}
              isLoading={approvalsStep === 'signing'}
              disabled={
                !hasTradingAuth
                || !hasDeployedProxyWallet
                || approvalsStep === 'completed'
                || approvalsStep === 'signing'
              }
              isComplete={approvalsStep === 'completed'}
              error={tokenApprovalError}
              onAction={handleApproveTokens}
            />
          </div>
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
            <DialogTitle className="text-center text-lg font-semibold">
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
              actionLabel={proxyStep === 'signing' ? 'Signing…' : proxyStep === 'deploying' ? 'Deploying' : 'Deploy'}
              isLoading={proxyStep === 'signing'}
              disabled={proxyStep === 'signing' || proxyStep === 'deploying'}
              isComplete={proxyStep === 'completed'}
              error={proxyWalletError}
              onAction={handleProxyWalletSignature}
            />
            <Separator className="bg-border/70" />
            <TradingRequirementStep
              title="Enable Trading"
              description="You need to sign this each time you trade on a new browser."
              actionLabel={tradingAuthStep === 'signing' ? 'Signing…' : 'Sign'}
              isLoading={tradingAuthStep === 'signing'}
              disabled={!hasDeployedProxyWallet || tradingAuthStep === 'completed' || tradingAuthStep === 'signing'}
              isComplete={tradingAuthStep === 'completed'}
              error={tradingAuthError}
              onAction={handleTradingAuthSignature}
            />
            <Separator className="bg-border/70" />
            <TradingRequirementStep
              title="Approve Tokens"
              description="Start trading securely with your USDC."
              actionLabel={approvalsStep === 'signing' ? 'Signing…' : 'Sign'}
              isLoading={approvalsStep === 'signing'}
              disabled={
                !hasTradingAuth
                || !hasDeployedProxyWallet
                || approvalsStep === 'completed'
                || approvalsStep === 'signing'
              }
              isComplete={approvalsStep === 'completed'}
              error={tokenApprovalError}
              onAction={handleApproveTokens}
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
