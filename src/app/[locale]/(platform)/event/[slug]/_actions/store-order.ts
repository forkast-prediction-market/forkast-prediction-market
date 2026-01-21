'use server'

import { updateTag } from 'next/cache'
import { createPublicClient, erc1155Abi, http } from 'viem'
import { z } from 'zod'
import { defaultNetwork } from '@/lib/appkit'
import { cacheTags } from '@/lib/cache-tags'
import { CLOB_ORDER_TYPE, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { CONDITIONAL_TOKENS_CONTRACT } from '@/lib/contracts'
import { OrderRepository } from '@/lib/db/queries/order'
import { UserRepository } from '@/lib/db/queries/user'
import { buildClobHmacSignature } from '@/lib/hmac'
import { TRADING_AUTH_REQUIRED_ERROR } from '@/lib/trading-auth/errors'
import { getUserTradingAuthSecrets } from '@/lib/trading-auth/server'
import { normalizeAddress } from '@/lib/wallet'

const StoreOrderSchema = z.object({
  // begin blockchain data
  salt: z.string(),
  maker: z.string(),
  signer: z.string(),
  taker: z.string(),
  token_id: z.string(),
  maker_amount: z.string(),
  taker_amount: z.string(),
  expiration: z.string(),
  nonce: z.string(),
  fee_rate_bps: z.string(),
  side: z.union([z.literal(0), z.literal(1)]),
  signature_type: z.number(),
  signature: z.string(),
  // end blockchain data

  type: z.union([z.literal(ORDER_TYPE.MARKET), z.literal(ORDER_TYPE.LIMIT)]),
  clob_type: z.enum(CLOB_ORDER_TYPE).optional(),
  condition_id: z.string(),
  slug: z.string(),
})

type StoreOrderInput = z.infer<typeof StoreOrderSchema>

const DEFAULT_ERROR_MESSAGE = 'Something went wrong while processing your order. Please try again.'
const CLOB_REQUEST_TIMEOUT_MS = 20_000
const RPC_TRANSPORT = http(defaultNetwork.rpcUrls.default.http[0])

let conditionalTokensClient: ReturnType<typeof createPublicClient> | null = null

function getConditionalTokensClient() {
  if (!conditionalTokensClient) {
    conditionalTokensClient = createPublicClient({
      chain: defaultNetwork,
      transport: RPC_TRANSPORT,
    })
  }
  return conditionalTokensClient
}

async function ensureSufficientSellShares(maker: string, tokenId: string, makerAmount: string) {
  const normalizedMaker = normalizeAddress(maker)
  if (!normalizedMaker) {
    return { ok: false, error: 'Invalid maker address.' }
  }

  try {
    const balance = await getConditionalTokensClient().readContract({
      address: CONDITIONAL_TOKENS_CONTRACT,
      abi: erc1155Abi,
      functionName: 'balanceOf',
      args: [normalizedMaker, BigInt(tokenId)],
    }) as bigint

    if (balance < BigInt(makerAmount)) {
      return {
        ok: false,
        error: 'Insufficient shares available. Reduce the sell amount or split more shares.',
      }
    }

    return { ok: true }
  }
  catch (error) {
    console.error('Failed to verify conditional token balance.', error)
    return { ok: false, error: DEFAULT_ERROR_MESSAGE }
  }
}

export async function storeOrderAction(payload: StoreOrderInput) {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const auth = await getUserTradingAuthSecrets(user.id)
  if (!auth?.clob) {
    return { error: TRADING_AUTH_REQUIRED_ERROR }
  }
  if (!user.proxy_wallet_address) {
    return { error: 'Deploy your proxy wallet before trading.' }
  }

  const validated = StoreOrderSchema.safeParse(payload)

  if (!validated.success) {
    return {
      error: validated.error.issues[0].message,
    }
  }

  const defaultMarketOrderType = user.settings?.trading?.market_order_type ?? CLOB_ORDER_TYPE.FAK
  const clobOrderType = validated.data.clob_type
    ?? (validated.data.type === ORDER_TYPE.MARKET
      ? defaultMarketOrderType
      : CLOB_ORDER_TYPE.GTC)

  try {
    if (validated.data.side === ORDER_SIDE.SELL) {
      const shareCheck = await ensureSufficientSellShares(
        validated.data.maker,
        validated.data.token_id,
        validated.data.maker_amount,
      )

      if (!shareCheck.ok) {
        return { error: shareCheck.error }
      }
    }

    const expectedMaker = user.proxy_wallet_address.toLowerCase()
    if (validated.data.maker.toLowerCase() !== expectedMaker) {
      return { error: 'Invalid maker address for this order.' }
    }

    const clobPayload = {
      order: {
        salt: validated.data.salt,
        maker: validated.data.maker,
        signer: validated.data.signer,
        taker: validated.data.taker,
        conditionId: validated.data.condition_id,
        tokenId: validated.data.token_id,
        makerAmount: validated.data.maker_amount,
        takerAmount: validated.data.taker_amount,
        expiration: validated.data.expiration,
        nonce: validated.data.nonce,
        feeRateBps: validated.data.fee_rate_bps,
        side: validated.data.side === 0 ? 'BUY' : 'SELL',
        signatureType: validated.data.signature_type,
        signature: validated.data.signature,
      },
      orderType: clobOrderType,
      owner: auth.clob.key,
    }

    const method = 'POST'
    const path = '/order'
    const body = JSON.stringify(clobPayload)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = buildClobHmacSignature(
      auth.clob.secret,
      timestamp,
      method,
      path,
      body,
    )

    const clobStoreOrderResponse = await fetch(`${process.env.CLOB_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'KUEST_ADDRESS': user.address,
        'KUEST_API_KEY': auth.clob.key,
        'KUEST_PASSPHRASE': auth.clob.passphrase,
        'KUEST_TIMESTAMP': timestamp.toString(),
        'KUEST_SIGNATURE': signature,
      },
      body,
      signal: AbortSignal.timeout(CLOB_REQUEST_TIMEOUT_MS),
    })

    const clobStoreOrderResponseJson = await clobStoreOrderResponse.json()

    if (!clobStoreOrderResponse.ok) {
      const message = `Status ${clobStoreOrderResponse.status} (${clobStoreOrderResponse.statusText})`
      console.error('Failed to send order to CLOB.', message)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    if (clobStoreOrderResponseJson?.success === false) {
      return { error: clobStoreOrderResponseJson.errorMsg || DEFAULT_ERROR_MESSAGE }
    }

    const clobOrderId = clobStoreOrderResponseJson.orderID ?? clobStoreOrderResponseJson.orderId

    void OrderRepository.createOrder({
      ...validated.data,
      salt: BigInt(validated.data.salt),
      maker_amount: BigInt(validated.data.maker_amount),
      taker_amount: BigInt(validated.data.taker_amount),
      nonce: BigInt(validated.data.nonce),
      fee_rate_bps: Number(validated.data.fee_rate_bps),
      expiration: BigInt(validated.data.expiration),
      user_id: user.id,
      affiliate_user_id: user.referred_by_user_id,
      type: clobOrderType,
      clob_order_id: clobOrderId,
    })

    updateTag(cacheTags.activity(validated.data.slug))
    updateTag(cacheTags.holders(validated.data.condition_id))
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
