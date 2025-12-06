'use client'

import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import type { ProxyWalletStatus } from '@/types'
import { useCallback, useMemo, useState } from 'react'
import { hashTypedData, isAddress } from 'viem'
import { useSignMessage } from 'wagmi'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
import { WalletModal } from '@/components/WalletModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { defaultNetwork } from '@/lib/appkit'
import { COLLATERAL_TOKEN_ADDRESS, DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { buildSendErc20Transaction, getSafeTxTypedData, packSafeSignature } from '@/lib/safe/transactions'

interface WalletFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    address: string
    proxy_wallet_address?: string | null
    proxy_wallet_status?: ProxyWalletStatus | null
  } | null
  meldUrl: string | null
}

export function WalletFlow({ open, onOpenChange, user, meldUrl }: WalletFlowProps) {
  const isMobile = useIsMobile()
  const { signMessageAsync } = useSignMessage()
  const [walletModalView, setWalletModalView] = useState<'menu' | 'fund' | 'buy' | 'send' | 'receive'>('menu')
  const [walletSendTo, setWalletSendTo] = useState('')
  const [walletSendAmount, setWalletSendAmount] = useState('')
  const [walletSendError, setWalletSendError] = useState<string | null>(null)
  const [isWalletSending, setIsWalletSending] = useState(false)

  const hasDeployedProxyWallet = useMemo(() => (
    Boolean(user?.proxy_wallet_address && user?.proxy_wallet_status === 'deployed')
  ), [user?.proxy_wallet_address, user?.proxy_wallet_status])

  const handleWalletModalChange = useCallback((next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setWalletModalView('menu')
      setWalletSendError(null)
      setIsWalletSending(false)
    }
  }, [onOpenChange])

  const handleWalletSend = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    setWalletSendError(null)

    if (!user?.address || !user?.proxy_wallet_address) {
      setWalletSendError('Deploy your proxy wallet first.')
      return
    }
    if (!isAddress(walletSendTo)) {
      setWalletSendError('Enter a valid recipient address.')
      return
    }
    const amountNumber = Number(walletSendAmount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setWalletSendError('Enter a valid amount.')
      return
    }

    setIsWalletSending(true)
    try {
      const nonceResult = await getSafeNonceAction()
      if (nonceResult.error || !nonceResult.nonce) {
        setWalletSendError(nonceResult.error ?? DEFAULT_ERROR_MESSAGE)
        return
      }

      const transaction = buildSendErc20Transaction({
        token: COLLATERAL_TOKEN_ADDRESS,
        to: walletSendTo as `0x${string}`,
        amount: walletSendAmount,
        decimals: 6,
      })

      const typedData = getSafeTxTypedData({
        chainId: defaultNetwork.id,
        safeAddress: user.proxy_wallet_address as `0x${string}`,
        transaction,
        nonce: nonceResult.nonce,
      })

      const structHash = hashTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      }) as `0x${string}`

      const signature = await signMessageAsync({ message: { raw: structHash } })

      const payload: SafeTransactionRequestPayload = {
        type: 'SAFE',
        from: user.address,
        to: transaction.to,
        proxyWallet: user.proxy_wallet_address,
        data: transaction.data,
        nonce: nonceResult.nonce,
        signature: packSafeSignature(signature as `0x${string}`),
        signatureParams: typedData.signatureParams,
        metadata: 'send_tokens',
      }

      const result = await submitSafeTransactionAction(payload)
      if (result.error) {
        setWalletSendError(result.error)
        return
      }

      setWalletSendTo('')
      setWalletSendAmount('')
      setWalletSendError(null)
      setWalletModalView('menu')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE
      setWalletSendError(message)
    }
    finally {
      setIsWalletSending(false)
    }
  }, [signMessageAsync, user?.address, user?.proxy_wallet_address, walletSendAmount, walletSendTo])

  return (
    <WalletModal
      open={open}
      onOpenChange={handleWalletModalChange}
      isMobile={isMobile}
      walletAddress={user?.proxy_wallet_address ?? null}
      siteName={process.env.NEXT_PUBLIC_SITE_NAME}
      meldUrl={meldUrl}
      hasDeployedProxyWallet={hasDeployedProxyWallet}
      view={walletModalView}
      onViewChange={setWalletModalView}
      sendTo={walletSendTo}
      onChangeSendTo={event => setWalletSendTo(event.target.value)}
      sendAmount={walletSendAmount}
      onChangeSendAmount={event => setWalletSendAmount(event.target.value)}
      sendError={walletSendError}
      isSending={isWalletSending}
      onSubmitSend={handleWalletSend}
    />
  )
}
