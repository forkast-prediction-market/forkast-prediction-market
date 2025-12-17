import { defaultNetwork } from '@/lib/appkit'

export const DEFAULT_ERROR_MESSAGE = 'Internal server error. Try again in a few moments.'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

export const AMOY_CHAIN_ID = 80_002

export const IS_TEST_MODE = defaultNetwork.id === AMOY_CHAIN_ID

export const CONDITIONAL_TOKENS_CONTRACT = '0x211B46233799C69da351cd7e8d0Bfe9071323Cb6' as `0x${string}`

export const COLLATERAL_TOKEN_ADDRESS = IS_TEST_MODE
  ? '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' as `0x${string}`
  : '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as `0x${string}`

export const ZERO_COLLECTION_ID = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

export const DEFAULT_CONDITION_PARTITION = ['1', '2'] as const

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

export const CTF_EXCHANGE_ADDRESS = '0x828da759D63e7d7890AF8F30e3Cdc9c456F7533e' as `0x${string}`

export const NEG_RISK_CTF_EXCHANGE_ADDRESS = '0x3314ad2140f1b5F3b305Fd062E2D2d3E75Fc5205' as `0x${string}`

export const EIP712_DOMAIN = {
  name: 'Forkast CTF Exchange',
  version: '1',
  chainId: defaultNetwork.id,
  verifyingContract: CTF_EXCHANGE_ADDRESS,
} as const

export const NEG_RISK_EIP712_DOMAIN = {
  name: 'Forkast CTF Exchange',
  version: '1',
  chainId: defaultNetwork.id,
  verifyingContract: NEG_RISK_CTF_EXCHANGE_ADDRESS,
} as const

export const EIP712_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
    { name: 'referrer', type: 'address' },
    { name: 'affiliate', type: 'address' },
    { name: 'affiliatePercentage', type: 'uint256' },
  ],
}

export function getExchangeEip712Domain(isNegRisk?: boolean) {
  return isNegRisk ? NEG_RISK_EIP712_DOMAIN : EIP712_DOMAIN
}
