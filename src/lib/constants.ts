import { defaultNetwork } from '@/lib/appkit'

export const DEFAULT_ERROR_MESSAGE = 'Internal server error. Try again in a few moments.'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

const conditionalTokensAddress = (
  process.env.CONDITIONAL_TOKENS_CONTRACT
  ?? process.env.NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS
  ?? '0x4F047bD628145de7F902Af7f8B5988e1A8767148'
) as `0x${string}`

const collateralTokenAddress = (
  process.env.COLLATERAL_TOKEN_ADDRESS
  ?? process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
  ?? '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
) as `0x${string}`

export const CONDITIONAL_TOKENS_CONTRACT = conditionalTokensAddress
export const COLLATERAL_TOKEN_ADDRESS = collateralTokenAddress
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

export const CTF_EXCHANGE_ADDRESS = '0x8e7C334F111e45DF9C160DE56958E37c473081CB' as `0x${string}`
const negRiskExchangeAddress = (
  process.env.NEGRISK_CTFEXCHANGE_ADDRESS
  ?? process.env.NEXT_PUBLIC_NEGRISK_CTFEXCHANGE_ADDRESS
  ?? '0x0B31dD379DF27A0ede14336F696412DF7b702e50'
) as `0x${string}`
export const NEG_RISK_CTF_EXCHANGE_ADDRESS = negRiskExchangeAddress

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

export function getExchangeEip712Domain(isNegRisk?: boolean) {
  return isNegRisk ? NEG_RISK_EIP712_DOMAIN : EIP712_DOMAIN
}
