// Function to form complete URL for Supabase Storage images
export function getSupabaseImageUrl(iconPath: string | null): string | null {
  if (!iconPath) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return null
  }

  return `${supabaseUrl}/storage/v1/object/public/forkast-assets/${iconPath}`
}

// Data for specific market sections
export const mockMarketDetails = {
  // Holder data (Yes/No holders)
  holders: {
    yes: [
      {
        name: 'crypto_bull',
        amount: '55,406',
        avatar: 'https://avatar.vercel.sh/crypto_bull.png',
      },
      {
        name: 'btc_hodler',
        amount: '42,891',
        avatar: 'https://avatar.vercel.sh/btc_hodler.png',
      },
      {
        name: 'diamond_hands',
        amount: '31,205',
        avatar: 'https://avatar.vercel.sh/diamond_hands.png',
      },
    ],
    no: [
      {
        name: 'bear_market',
        amount: '82,396',
        avatar: 'https://avatar.vercel.sh/bear_market.png',
      },
      {
        name: 'skeptic_trader',
        amount: '67,543',
        avatar: 'https://avatar.vercel.sh/skeptic_trader.png',
      },
      {
        name: 'reality_check',
        amount: '51,872',
        avatar: 'https://avatar.vercel.sh/reality_check.png',
      },
    ],
  },

  // Trading activity data
  activities: [
    {
      user: 'apriladams',
      action: 'bought',
      amount: '2',
      type: 'Yes',
      market: 'Andrew Cuomo',
      price: '75.0¢',
      total: '$1',
      time: '4 m ago',
      avatar: 'https://avatar.vercel.sh/apriladams.png',
    },
    {
      user: 'Ziigmund',
      action: 'sold',
      amount: '10',
      type: 'No',
      market: 'Bitcoin $150k',
      price: '33.0¢',
      total: '$3.30',
      time: '12 m ago',
      avatar: 'https://avatar.vercel.sh/Ziigmund.png',
    },
    {
      user: 'trader_pro',
      action: 'bought',
      amount: '50',
      type: 'Yes',
      market: 'GPT-5 Release',
      price: '84.0¢',
      total: '$42',
      time: '1 h ago',
      avatar: 'https://avatar.vercel.sh/trader_pro.png',
    },
    {
      user: 'crypto_whale',
      action: 'bought',
      amount: '100',
      type: 'No',
      market: 'Taylor Swift Grammy',
      price: '55.0¢',
      total: '$55',
      time: '2 h ago',
      avatar: 'https://avatar.vercel.sh/crypto_whale.png',
    },
  ],

  // Related markets
  relatedMarkets: [
    {
      title: 'Will Ethereum reach $8,000 by end of 2025?',
      volume: '$234k',
      yesPrice: '43¢',
      noPrice: '57¢',
      avatar: 'https://avatar.vercel.sh/ethereum.png',
    },
    {
      title: 'Will Tesla stock hit $500 in 2025?',
      volume: '$156k',
      yesPrice: '62¢',
      noPrice: '38¢',
      avatar: 'https://avatar.vercel.sh/tesla.png',
    },
    {
      title: 'Will S&P 500 reach 7000 by end of 2025?',
      volume: '$89k',
      yesPrice: '71¢',
      noPrice: '29¢',
      avatar: 'https://avatar.vercel.sh/sp500.png',
    },
  ],

  // Expanded rules (Lorem Ipsum text)
  expandedRules: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.',
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.',
  ],

  // Oracle/resolver info
  resolver: {
    address: '0x2F5e...3684cb',
    name: 'UMA Oracle',
    avatar: 'https://avatar.vercel.sh/umaoracle.png',
    gradientColors: 'from-red-500 to-pink-500',
  },

  // UI configurations
  timeRanges: ['1H', '6H', '1D', '1W', '1M', 'ALL'],
  eventTabs: ['comments', 'holders', 'activity'],
  activityFilters: ['All', 'Min amount'],

  // Dummy data for statistics
  trendingData: {
    changePercentage: 94, // For red arrow "94%"
    direction: 'down', // "up" or "down"
  },
}

// Utility functions that can be reused
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`
  }
  else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}k`
  }
  return `$${volume.toFixed(0)}`
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function calculateWinnings(amount: number, price: number): number {
  return amount / price - amount
}

export const mockUser = {
  portfolio: 2847.32,
  cash: 1205.67,
  isConnected: true,
  // Shares that the user owns in each outcome
  shares: {
    // marketId-outcomeId: amount
    '1-yes': 2.3, // Elon Musk announcement - Yes
    '1-no': 0,
    '2-yes': 5.7, // Bitcoin $150k - Yes
    '2-no': 1.2,
    '3-yes': 0,
    '3-no': 3.4, // GPT-5 - No
    '4-yes': 1.8, // Taylor Swift Grammy - Yes
    '4-no': 0,
    '5-brazil': 0.5, // FIFA World Cup - Brazil
    '5-france': 1.1,
    '5-england': 0,
    '5-argentina': 0,
    '5-other': 0,
    '6-yes': 0,
    '6-no': 0.9, // California earthquake - No
  },
}
