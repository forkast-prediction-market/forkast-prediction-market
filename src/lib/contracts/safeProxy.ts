import type { Address, TypedDataDomain } from 'viem'
import { createPublicClient, http } from 'viem'
import { defaultNetwork } from '@/lib/appkit'
import { CTF_EXCHANGE_ADDRESS, NEG_RISK_CTF_EXCHANGE_ADDRESS, ZERO_ADDRESS } from '@/lib/constants'

export const SAFE_PROXY_DOMAIN_NAME = 'Forkast Contract Proxy Factory'
export const SAFE_PROXY_PRIMARY_TYPE = 'CreateProxy'

export const SAFE_PROXY_FACTORY_ADDRESS = '0xeAaBa3185fA1B8C2eC1E2124E010b47260e03bE5' as Address

export const SAFE_PROXY_TYPES = {
  CreateProxy: [
    { name: 'paymentToken', type: 'address' },
    { name: 'payment', type: 'uint256' },
    { name: 'paymentReceiver', type: 'address' },
  ],
} as const

export const SAFE_PROXY_CREATE_PROXY_MESSAGE = {
  paymentToken: ZERO_ADDRESS,
  payment: 0n,
  paymentReceiver: ZERO_ADDRESS,
} as const

interface GetProxyWalletAddressOptions {
  exchangeAddress?: Address
  isNegRisk?: boolean
}

const CTF_EXCHANGE_SAFE_ABI = [
  {
    name: 'getSafeAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_addr', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

let client: ReturnType<typeof createPublicClient> | null = null

function getSafeProxyClient() {
  if (client) {
    return client
  }

  client = createPublicClient({
    chain: defaultNetwork,
    transport: http(defaultNetwork.rpcUrls.default.http[0]),
  })

  return client
}

function resolveExchangeAddress(options?: GetProxyWalletAddressOptions) {
  if (options?.exchangeAddress) {
    return options.exchangeAddress
  }
  return options?.isNegRisk ? NEG_RISK_CTF_EXCHANGE_ADDRESS : CTF_EXCHANGE_ADDRESS
}

export function getSafeProxyDomain(): TypedDataDomain {
  return {
    name: SAFE_PROXY_DOMAIN_NAME,
    chainId: defaultNetwork.id,
    verifyingContract: SAFE_PROXY_FACTORY_ADDRESS,
  }
}

export async function getSafeProxyWalletAddress(owner: Address, options?: GetProxyWalletAddressOptions) {
  const exchangeAddress = resolveExchangeAddress(options)
  const proxyAddress = await getSafeProxyClient().readContract({
    address: exchangeAddress,
    abi: CTF_EXCHANGE_SAFE_ABI,
    functionName: 'getSafeAddress',
    args: [owner],
  })

  return proxyAddress
}

export async function isProxyWalletDeployed(address?: Address | string | null) {
  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    return false
  }

  const normalizedAddress = address as Address
  if (normalizedAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return false
  }

  const bytecode = await getSafeProxyClient().getBytecode({ address: normalizedAddress })
  return Boolean(bytecode && bytecode !== '0x')
}
