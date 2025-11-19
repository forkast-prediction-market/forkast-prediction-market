import type { Address } from 'viem'
import { defaultNetwork } from '@/lib/appkit'

export const DEFAULT_ERROR_MESSAGE = 'Internal server error. Try again in a few moments.'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const

export const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
} as const

export const CLOB_ORDER_TYPE = {
  FOK: 'FOK',
  FAK: 'FAK',
  GTC: 'GTC',
  GTD: 'GTD',
} as const

export const OUTCOME_INDEX = {
  YES: 0,
  NO: 1,
} as const

export const CAP_MICRO = 990_000n
export const FLOOR_MICRO = 10_000n

export const CTF_EXCHANGE_ADDRESS = '0x006ce6484eA6114fB0D4F26660de0F37d35001Ba' as `0x${string}`
export const NEGRISK_CTF_EXCHANGE_ADDRESS = '0x68dDb555b640De7f0D7eFFd31ee5CCB841DD86AD' as `0x${string}`

export function getExchangeEip712Domain(verifyingContract: Address) {
  return {
    name: 'Forkast CTF Exchange',
    version: '1',
    chainId: defaultNetwork.id,
    verifyingContract,
  }
}

export const EIP712_DOMAIN = getExchangeEip712Domain(CTF_EXCHANGE_ADDRESS)

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
}
