'use client'

import { Magic } from 'magic-sdk'
import { useEffect, useState } from 'react'

interface User {
  address: string
  isConnected: boolean
  walletType?: string
  email?: string
}

// Create Magic instance
let magic: Magic | null = null
function getMagic() {
  if (typeof window !== 'undefined' && !magic) {
    magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY!, {
      network: {
        rpcUrl: 'https://rpc-amoy.polygon.technology/',
        chainId: 80002,
      },
    })
  }
  return magic
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Helper function to update user state with persistence
  function updateUser(newUser: User | null) {
    setUser(newUser)
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem('forkast_user', JSON.stringify(newUser))
      }
      else {
        localStorage.removeItem('forkast_user')
      }
    }
  }

  // Initialize user state from localStorage and check Magic login
  useEffect(() => {
    async function initializeAuth() {
      if (typeof window !== 'undefined') {
        // Check localStorage first
        const savedUser = localStorage.getItem('forkast_user')
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser)
            setUser(parsedUser)
          }
          catch (error) {
            console.error('Error parsing saved user:', error)
            localStorage.removeItem('forkast_user')
          }
        }

        // Check if Magic user is logged in
        try {
          const magicInstance = getMagic()
          if (magicInstance) {
            const isLoggedIn = await magicInstance.user.isLoggedIn()
            if (isLoggedIn) {
              const metadata = await magicInstance.user.getInfo()
              if (metadata.email && metadata.publicAddress) {
                const userData = {
                  address: metadata.publicAddress,
                  isConnected: true,
                  walletType: 'magic',
                  email: metadata.email,
                }
                updateUser(userData)
              }
            }
          }
        }
        catch (error) {
          console.error('Error checking Magic login status:', error)
        }

        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [])

  // Listen for Magic login events
  useEffect(() => {
    async function checkMagicLogin() {
      try {
        const magicInstance = getMagic()

        if (magicInstance) {
          const isLoggedIn = await magicInstance.user.isLoggedIn()
          if (isLoggedIn && (!user || user.walletType !== 'magic')) {
            const metadata = await magicInstance.user.getInfo()
            if (metadata.email && metadata.publicAddress) {
              const userData = {
                address: metadata.publicAddress,
                isConnected: true,
                walletType: 'magic',
                email: metadata.email,
              }
              updateUser(userData)
            }
          }
          else if (!isLoggedIn && user?.walletType === 'magic') {
            updateUser(null)
          }
        }
      }
      catch (error) {
        console.error('Error checking Magic login:', error)
      }
    }

    // Check periodically for Magic login changes
    const interval = setInterval(checkMagicLogin, 1000)

    return () => clearInterval(interval)
  }, [user])

  // Check if MetaMask is installed
  function isMetaMaskInstalled() {
    return (
      typeof window !== 'undefined'
      && window.ethereum
      && window.ethereum.isMetaMask
    )
  }

  // Connect to MetaMask
  async function connectMetaMask() {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed')
    }

    if (!window.ethereum) {
      throw new Error('Ethereum provider not found')
    }

    setIsLoading(true)

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]

      if (accounts.length > 0) {
        const userData = {
          address: accounts[0],
          isConnected: true,
          walletType: 'metamask',
        }

        updateUser(userData)
        return accounts[0]
      }
      else {
        throw new Error('No accounts found')
      }
    }
    catch (error) {
      console.error('Error connecting to MetaMask:', error)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }

  // Connect to other wallets (placeholder functions)
  async function connectCoinbase() {
    setIsLoading(true)
    try {
      // TODO: Implement Coinbase Wallet connection
      console.log('Connecting to Coinbase Wallet...')
      throw new Error('Coinbase Wallet connection not implemented yet')
    }
    catch (error) {
      console.error('Error connecting to Coinbase Wallet:', error)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }

  async function connectWalletConnect() {
    // WalletConnect disabled for now
    throw new Error('WalletConnect is not available')
  }

  async function connectPhantom() {
    setIsLoading(true)
    try {
      // TODO: Implement Phantom connection
      console.log('Connecting to Phantom...')
      throw new Error('Phantom connection not implemented yet')
    }
    catch (error) {
      console.error('Error connecting to Phantom:', error)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }

  // Magic.link email login
  async function loginWithMagicEmail(email: string) {
    const magicInstance = getMagic()
    if (!magicInstance) {
      throw new Error('Magic not initialized')
    }

    setIsLoading(true)
    try {
      const didToken = await magicInstance.auth.loginWithMagicLink({ email })

      if (didToken) {
        const metadata = await magicInstance.user.getInfo()

        if (metadata.email && metadata.publicAddress) {
          const userData = {
            address: metadata.publicAddress,
            isConnected: true,
            walletType: 'magic',
            email: metadata.email,
          }
          updateUser(userData)
          return userData
        }
      }

      throw new Error('Failed to get user metadata')
    }
    catch (error) {
      console.error('Error logging in with Magic email:', error)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }

  // Disconnect wallet
  async function disconnect() {
    if (user?.walletType === 'magic') {
      try {
        const magicInstance = getMagic()
        if (magicInstance) {
          await magicInstance.user.logout()
        }
      }
      catch (error) {
        console.error('Error logging out from Magic:', error)
      }
    }
    updateUser(null)
  }

  // Check connection status on mount
  useEffect(() => {
    async function checkConnection() {
      if (isMetaMaskInstalled() && user) {
        try {
          if (!window.ethereum)
            return

          const accounts = (await window.ethereum.request({
            method: 'eth_accounts',
          })) as string[]

          if (accounts.length > 0) {
            // Only update if the address is different
            if (user.address !== accounts[0]) {
              updateUser({
                address: accounts[0],
                isConnected: true,
                walletType: 'metamask',
              })
            }
          }
          else {
            // If no accounts are connected, clear the user
            updateUser(null)
          }
        }
        catch {
          // Silently handle connection errors in anonymous mode
          console.log('MetaMask not connected or in anonymous mode')
        }
      }
    }

    // Only check connection after initialization and if we have a saved user
    if (isInitialized && user) {
      checkConnection()
    }
  }, [user, isInitialized])

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskInstalled() && window.ethereum) {
      function handleAccountsChanged(...args: unknown[]) {
        const accounts = args[0] as string[]
        if (accounts.length === 0) {
          updateUser(null)
        }
        else {
          updateUser({
            address: accounts[0],
            isConnected: true,
            walletType: 'metamask',
          })
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener(
            'accountsChanged',
            handleAccountsChanged,
          )
        }
      }
    }
  }, [])

  return {
    user,
    isLoading,
    isInitialized,
    isMetaMaskInstalled,
    connectMetaMask,
    connectCoinbase,
    connectWalletConnect,
    connectPhantom,
    loginWithMagicEmail,
    disconnect,
  }
}
