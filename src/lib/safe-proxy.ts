import type { Address, TypedDataDomain } from 'viem'
import { createPublicClient, http } from 'viem'
import { defaultNetwork } from '@/lib/appkit'
import { SAFE_PROXY_FACTORY_ADDRESS, ZERO_ADDRESS } from '@/lib/contracts'

export const SAFE_PROXY_DOMAIN_NAME = 'Forkast Contract Proxy Factory'
export const SAFE_PROXY_PRIMARY_TYPE = 'CreateProxy'

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

const SAFE_FACTORY_ABI = [
  {
    name: 'computeProxyAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'address' }],
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

export function getSafeProxyDomain(): TypedDataDomain {
  return {
    name: SAFE_PROXY_DOMAIN_NAME,
    chainId: defaultNetwork.id,
    verifyingContract: SAFE_PROXY_FACTORY_ADDRESS,
  }
}

export async function getSafeProxyWalletAddress(owner: Address) {
  return await getSafeProxyClient().readContract({
    address: SAFE_PROXY_FACTORY_ADDRESS,
    abi: SAFE_FACTORY_ABI,
    functionName: 'computeProxyAddress',
    args: [owner],
  }) as Address
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
