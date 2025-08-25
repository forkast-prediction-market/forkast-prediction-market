import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { BrowserProvider, Contract } from 'ethers'
import { useEffect, useState } from 'react'

const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' // Polygon Amoy USDC
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]

export function useBalance() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const [balance, setBalance] = useState<any>(null)

  useEffect(() => {
    if (!isConnected || !address || !walletProvider) {
      queueMicrotask(() => setBalance(null))
      return
    }

    let active = true

    async function fetchUSDCBalance() {
      if (!active) {
        return
      }

      try {
        const provider = new BrowserProvider(walletProvider as any)
        const contract = new Contract(USDC_ADDRESS, ERC20_ABI, provider)

        const [balanceRaw, decimals] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
        ])

        const balanceNumber = Number(balanceRaw) / (10 ** Number(decimals))

        const newBalance = {
          data: {
            balance: balanceNumber.toFixed(2),
            symbol: 'USDC',
          },
        }

        setBalance(newBalance)
      }
      catch (error) {
        console.error('Error fetching USDC balance:', error)
        if (active) {
          setBalance(null)
        }
      }
    }

    queueMicrotask(() => fetchUSDCBalance())
    const interval = setInterval(fetchUSDCBalance, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isConnected, address, walletProvider])

  return { balance }
}
