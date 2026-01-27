import type { LiFiWalletTokenItem } from '@/hooks/useLiFiWalletTokens'
import { getQuote, getStepTransaction, getTokens } from '@lifi/sdk'
import { useMutation } from '@tanstack/react-query'
import { encodeFunctionData, erc20Abi, maxUint256, parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { COLLATERAL_TOKEN_ADDRESS, ZERO_ADDRESS } from '@/lib/contracts'

interface UseLiFiExecutionParams {
  fromToken?: LiFiWalletTokenItem | null
  amountValue: string
  fromAddress?: string | null
  toAddress?: string | null
}

export function useLiFiExecution({
  fromToken,
  amountValue,
  fromAddress,
  toAddress,
}: UseLiFiExecutionParams) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!walletClient) {
        throw new Error('Wallet not connected.')
      }
      if (!publicClient) {
        throw new Error('Public client not available.')
      }
      if (!fromToken || !fromAddress || !toAddress) {
        throw new Error('Missing token or wallet addresses.')
      }

      const amountNumber = Number.parseFloat(amountValue || '0')
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        throw new Error('Enter a valid amount.')
      }

      const fromAmount = parseUnits(amountNumber.toString(), fromToken.decimals).toString()
      const tokensResponse = await getTokens({ extended: true, chains: [fromToken.chainId] })
      const chainTokens = tokensResponse.tokens[fromToken.chainId] ?? []
      const usdcToken = chainTokens.find(token => token.address.toLowerCase() === COLLATERAL_TOKEN_ADDRESS.toLowerCase())
        ?? chainTokens.find(token => token.symbol.toUpperCase() === 'USDC')

      if (!usdcToken) {
        throw new Error('USDC token not available on this chain.')
      }

      const quoteStep = await getQuote({
        fromChain: fromToken.chainId,
        toChain: fromToken.chainId,
        fromToken: fromToken.address,
        toToken: usdcToken.address,
        fromAddress,
        toAddress,
        fromAmount,
      })
      const approvalAddress = quoteStep.estimate?.approvalAddress
      const requiresApproval = Boolean(
        approvalAddress
        && fromToken.address.toLowerCase() !== ZERO_ADDRESS.toLowerCase()
        && approvalAddress.toLowerCase() !== ZERO_ADDRESS.toLowerCase(),
      )

      if (requiresApproval) {
        const allowance = await publicClient.readContract({
          address: fromToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [fromAddress as `0x${string}`, approvalAddress as `0x${string}`],
        })

        if (allowance < BigInt(fromAmount)) {
          const approveHash = await walletClient.sendTransaction({
            account: fromAddress as `0x${string}`,
            chain: walletClient.chain,
            to: fromToken.address as `0x${string}`,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: 'approve',
              args: [approvalAddress as `0x${string}`, maxUint256],
            }),
            value: 0n,
          })

          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      const stepWithTx = await getStepTransaction(quoteStep)
      const tx = stepWithTx.transactionRequest

      if (!tx?.to) {
        throw new Error('No transaction request returned by LI.FI.')
      }

      const hash = await walletClient.sendTransaction({
        account: fromAddress as `0x${string}`,
        chain: walletClient.chain,
        to: tx.to as `0x${string}`,
        data: (tx.data ?? '0x') as `0x${string}`,
        value: tx.value ? BigInt(tx.value) : 0n,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
      })

      await publicClient.waitForTransactionReceipt({ hash })

      return hash
    },
  })

  return {
    execute: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    executionError: mutation.error,
    executionHash: mutation.data,
  }
}
