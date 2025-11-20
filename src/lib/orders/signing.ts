import type { OpenOptions, Views } from '@reown/appkit/react'
import type { TypedDataDomain } from 'viem'
import type { SignTypedDataParameters } from 'wagmi/actions'
import type { BlockchainOrder } from '@/types'
import { EIP712_TYPES } from '@/lib/constants'

type SignTypedDataFn = (args: SignTypedDataParameters) => Promise<string>

export interface SignOrderArgs {
  payload: BlockchainOrder
  domain: TypedDataDomain
  signTypedDataAsync: SignTypedDataFn
  openAppKit: (options?: OpenOptions<Views>) => Promise<void>
  closeAppKit: () => Promise<void>
  embeddedWalletInfo?: unknown
  onWalletApprovalPrompt?: () => void
}

export async function signOrderPayload({
  payload,
  domain,
  signTypedDataAsync,
  openAppKit,
  closeAppKit,
  embeddedWalletInfo,
  onWalletApprovalPrompt,
}: SignOrderArgs) {
  let shouldCloseModal = false

  if (!embeddedWalletInfo) {
    try {
      await openAppKit({ view: 'ApproveTransaction' })
      shouldCloseModal = true
      onWalletApprovalPrompt?.()
    }
    catch {
      shouldCloseModal = false
    }
  }

  try {
    return await signTypedDataAsync({
      domain,
      types: EIP712_TYPES,
      primaryType: 'Order',
      message: {
        salt: payload.salt,
        maker: payload.maker,
        signer: payload.signer,
        taker: payload.taker,
        referrer: payload.referrer,
        affiliate: payload.affiliate,
        tokenId: payload.token_id,
        makerAmount: payload.maker_amount,
        takerAmount: payload.taker_amount,
        expiration: payload.expiration,
        nonce: payload.nonce,
        feeRateBps: payload.fee_rate_bps,
        affiliatePercentage: payload.affiliate_percentage,
        side: payload.side,
        signatureType: payload.signature_type,
      },
    })
  }
  finally {
    if (shouldCloseModal) {
      try {
        await closeAppKit()
      }
      catch {}
    }
  }
}
