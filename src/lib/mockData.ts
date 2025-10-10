// Function to form complete URL for Supabase Storage images

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
