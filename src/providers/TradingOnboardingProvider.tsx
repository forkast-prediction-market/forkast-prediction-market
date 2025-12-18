'use client'

import type { ReactNode } from 'react'
import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import type { ProxyWalletStatus } from '@/types'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { hashTypedData, UserRejectedRequestError } from 'viem'
import { useSignMessage, useSignTypedData } from 'wagmi'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
import { saveProxyWalletSignature } from '@/app/(platform)/_actions/proxy-wallet'
import { generateTradingAuthAction } from '@/app/(platform)/_actions/trading-auth'
import { EnableTradingDialog, FundAccountDialog, TradeRequirementsDialog } from '@/components/trading/TradingDialogs'
import { WalletFlow } from '@/components/trading/WalletFlow'
import { useAppKit } from '@/hooks/useAppKit'
import { defaultNetwork } from '@/lib/appkit'
import { authClient } from '@/lib/auth-client'
import {
  DEFAULT_ERROR_MESSAGE,

} from '@/lib/constants'
import { CONDITIONAL_TOKENS_CONTRACT, CTF_EXCHANGE_ADDRESS, NEG_RISK_CTF_EXCHANGE_ADDRESS } from '@/lib/contracts'
import {
  getSafeProxyDomain,
  SAFE_PROXY_CREATE_PROXY_MESSAGE,
  SAFE_PROXY_PRIMARY_TYPE,
  SAFE_PROXY_TYPES,
} from '@/lib/safe-proxy'
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
import { useUser } from '@/stores/useUser'

interface TradingOnboardingContextValue {
  startDepositFlow: () => void
  startWithdrawFlow: () => void
  ensureTradingReady: () => boolean
  openTradeRequirements: () => void
  hasProxyWallet: boolean
  openWalletModal: () => void
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
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)

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
    if (!enableModalOpen && !tradeModalOpen) {
      return
    }
    void refreshSessionUserState()
  }, [enableModalOpen, refreshSessionUserState, tradeModalOpen])

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
    setDepositModalOpen(false)
    setWithdrawModalOpen(false)
    if (proxyStep !== 'completed') {
      setProxyStep('idle')
    }
    if (!hasTradingAuth) {
      setTradingAuthStep('idle')
    }
    if (!hasTokenApprovals) {
      setApprovalsStep('idle')
    }
  }, [hasTokenApprovals, hasTradingAuth, proxyStep])

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
      setTradingAuthError('Unauthenticated.')
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
        spenders: [
          CONDITIONAL_TOKENS_CONTRACT as `0x${string}`,
          CTF_EXCHANGE_ADDRESS as `0x${string}`,
          NEG_RISK_CTF_EXCHANGE_ADDRESS as `0x${string}`,
        ],
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

  const openWalletModal = useCallback(() => {
    if (!user) {
      queueMicrotask(() => void open())
      return
    }
    if (!hasDeployedProxyWallet) {
      openTradeRequirements()
      return
    }
    setDepositModalOpen(true)
  }, [hasDeployedProxyWallet, open, openTradeRequirements, user])

  const startDepositFlow = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return
    }

    if (hasDeployedProxyWallet) {
      setDepositModalOpen(true)
      return
    }

    resetEnableFlowState()
    setShouldShowFundAfterProxy(true)
    setEnableModalOpen(true)
  }, [hasDeployedProxyWallet, open, resetEnableFlowState, user])

  const startWithdrawFlow = useCallback(() => {
    if (!user) {
      queueMicrotask(() => {
        void open()
      })
      return
    }

    if (!hasDeployedProxyWallet) {
      openTradeRequirements()
      return
    }

    setWithdrawModalOpen(true)
  }, [hasDeployedProxyWallet, open, openTradeRequirements, user])

  const closeFundModal = useCallback((nextOpen: boolean) => {
    setFundModalOpen(nextOpen)
    if (!nextOpen) {
      resetPendingFundState()
    }
  }, [resetPendingFundState])

  const contextValue = useMemo<TradingOnboardingContextValue>(() => ({
    startDepositFlow,
    startWithdrawFlow,
    ensureTradingReady,
    openTradeRequirements,
    hasProxyWallet: hasDeployedProxyWallet,
    openWalletModal,
  }), [ensureTradingReady, hasDeployedProxyWallet, openTradeRequirements, openWalletModal, startDepositFlow, startWithdrawFlow])

  const meldUrl = useMemo(() => {
    if (!hasDeployedProxyWallet || !user?.proxy_wallet_address) {
      return null
    }
    const params = new URLSearchParams({
      publicKey: 'WXETMuFUQmqqybHuRkSgxv:25B8LJHSfpG6LVjR2ytU5Cwh7Z4Sch2ocoU',
      destinationCurrencyCodeLocked: 'USDC',
      walletAddressLocked: user.proxy_wallet_address,
    })
    return `https://meldcrypto.com/?${params.toString()}`
  }, [hasDeployedProxyWallet, user])

  return (
    <TradingOnboardingContext value={contextValue}>
      {children}

      <EnableTradingDialog
        open={enableModalOpen}
        onOpenChange={(next) => {
          setEnableModalOpen(next)
          if (!next) {
            resetPendingFundState()
          }
        }}
        proxyStep={proxyStep}
        tradingAuthStep={tradingAuthStep}
        approvalsStep={approvalsStep}
        hasTradingAuth={hasTradingAuth}
        hasDeployedProxyWallet={hasDeployedProxyWallet}
        proxyWalletError={proxyWalletError}
        tradingAuthError={tradingAuthError}
        tokenApprovalError={tokenApprovalError}
        onProxyAction={handleProxyWalletSignature}
        onTradingAuthAction={handleTradingAuthSignature}
        onApprovalsAction={handleApproveTokens}
      />

      <FundAccountDialog
        open={fundModalOpen}
        onOpenChange={closeFundModal}
        onDeposit={() => {
          closeFundModal(false)
          openWalletModal()
        }}
        onSkip={() => closeFundModal(false)}
      />

      <TradeRequirementsDialog
        open={tradeModalOpen}
        onOpenChange={setTradeModalOpen}
        proxyStep={proxyStep}
        tradingAuthStep={tradingAuthStep}
        approvalsStep={approvalsStep}
        hasTradingAuth={hasTradingAuth}
        hasDeployedProxyWallet={hasDeployedProxyWallet}
        proxyWalletError={proxyWalletError}
        tradingAuthError={tradingAuthError}
        tokenApprovalError={tokenApprovalError}
        onProxyAction={handleProxyWalletSignature}
        onTradingAuthAction={handleTradingAuthSignature}
        onApprovalsAction={handleApproveTokens}
      />

      <WalletFlow
        depositOpen={depositModalOpen}
        onDepositOpenChange={setDepositModalOpen}
        withdrawOpen={withdrawModalOpen}
        onWithdrawOpenChange={setWithdrawModalOpen}
        user={user}
        meldUrl={meldUrl}
      />
    </TradingOnboardingContext>
  )
}

export function useTradingOnboarding() {
  const context = use(TradingOnboardingContext)
  if (!context) {
    throw new Error('useTradingOnboarding must be used within TradingOnboardingProvider')
  }
  return context
}
