'use client'

import type { ActivityItem, PublicProfile } from '@/types'
import { useEffect, useState } from 'react'

// Mock data for development
const mockProfile: PublicProfile = {
  address: '0x14cc8b9a88f0b8f5d5e3a2f7c8d4e8a7b6c5d9a43',
  username: 'ibruno',
  avatar: undefined,
  joinedAt: new Date('2024-01-15'),
  stats: {
    positionsValue: 0.00,
    profitLoss: 0.00,
    volumeTraded: 3.50,
    marketsTraded: 2,
  },
}

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'Buy',
    market: {
      id: 'bitcoin-100k',
      title: 'Will Bitcoin reach $100k by end of 2024?',
      imageUrl: 'https://avatar.vercel.sh/bitcoin.png',
      outcome: 'Yes',
      price: 1, // 1¢
    },
    shares: 1,
    amount: 0.01,
    timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: '2',
    type: 'Sell',
    market: {
      id: 'us-election-2024',
      title: 'Will Democrats win the 2024 US Presidential Election?',
      imageUrl: 'https://avatar.vercel.sh/election.png',
      outcome: 'No',
      price: 91, // 91¢
    },
    shares: 0.1,
    amount: 1.00,
    timestamp: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  },
]

interface UsePublicProfileReturn {
  profile: PublicProfile | null
  activity: ActivityItem[]
  loading: boolean
  error: string | null
}

export function usePublicProfile(handleOrAddress: string): UsePublicProfileReturn {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      // Check if it's a username (starts with @) or wallet address
      const isUsername = handleOrAddress.startsWith('@')

      if (isUsername) {
        const username = handleOrAddress.slice(1) // Remove @
        if (username === mockProfile.username) {
          setProfile(mockProfile)
          setActivity(mockActivity)
        }
        else {
          setError('Profile not found')
        }
      }
      else {
        // Wallet address
        if (handleOrAddress.toLowerCase() === mockProfile.address.toLowerCase()) {
          setProfile(mockProfile)
          setActivity(mockActivity)
        }
        else {
          setError('Profile not found')
        }
      }

      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [handleOrAddress])

  return {
    profile,
    activity,
    loading,
    error,
  }
}
