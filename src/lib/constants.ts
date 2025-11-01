import { defaultNetwork } from '@/lib/appkit'

export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const

export const ORDER_TYPE = {
  MARKET: 0,
  LIMIT: 1,
} as const

export const OUTCOME_INDEX = {
  YES: 0,
  NO: 1,
}

export const CAP_MICRO = 990_000n
export const FLOOR_MICRO = 10_000n

export const EIP712_DOMAIN = {
  name: 'Forkast CLOB',
  version: '1',
  chainId: defaultNetwork.id,
} as const

export const EIP712_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'referrer', type: 'address' },
    { name: 'affiliate', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'affiliatePercentage', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
} as const
