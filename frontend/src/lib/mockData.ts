import type { EventWithMarkets, Tag } from './supabase'
import type { Event, EventCategory, FilterPill } from '@/types'
import { fetchEvents, fetchTags } from './data'

// Function to form complete URL for Supabase Storage images
export function getSupabaseImageUrl(iconPath: string | null): string | null {
  if (!iconPath)
    return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl)
    return null

  return `${supabaseUrl}/storage/v1/object/public/forkast-assets/${iconPath}`
}

export const mockMarkets: Event[] = [
  {
    id: '1',
    active_markets_count: 1,
    slug: 'will-elon-musk-announce-a-presidential-run-by-end-of-2025',
    title: 'Will Elon Musk announce a Presidential run by end of 2025?',
    description:
      'This market will resolve to "Yes" if Elon Musk officially announces his candidacy for President of the United States by December 31, 2025.',
    category: 'politics',
    probability: 23,
    volume: 473000,
    endDate: new Date('2025-12-31'),
    isResolved: false,
    isTrending: true,
    creator: '0x1234...5678',
    creatorAvatar: 'https://avatar.vercel.sh/creator1.png',
    tags: ['elon-musk', '2028-election', 'announcement'],
    outcomes: [
      {
        id: '1-yes',
        name: 'Yes',
        probability: 23,
        price: 0.23,
        volume: 298000,
        isYes: true,
        avatar: 'https://avatar.vercel.sh/elon-yes.png',
      },
      {
        id: '1-no',
        name: 'No',
        probability: 77,
        price: 0.77,
        volume: 175000,
        isYes: false,
        avatar: 'https://avatar.vercel.sh/elon-no.png',
      },
    ],
  },
  {
    id: '2',
    active_markets_count: 1,
    slug: 'will-bitcoin-reach-150000-by-end-of-2025',
    title: 'Will Bitcoin reach $150,000 by end of 2025?',
    description:
      'This market resolves to "Yes" if Bitcoin (BTC) reaches or exceeds $150,000 USD on any major exchange by December 31, 2025.',
    category: 'crypto',
    probability: 67,
    volume: 892000,
    endDate: new Date('2025-12-31'),
    isResolved: false,
    isTrending: true,
    creator: '0x2345...6789',
    creatorAvatar: 'https://avatar.vercel.sh/creator2.png',
    tags: ['bitcoin', 'btc', 'price-prediction'],
    outcomes: [
      {
        id: '2-yes',
        name: 'Yes',
        probability: 67,
        price: 0.67,
        volume: 534000,
        isYes: true,
        avatar: 'https://avatar.vercel.sh/bitcoin-yes.png',
      },
      {
        id: '2-no',
        name: 'No',
        probability: 33,
        price: 0.33,
        volume: 358000,
        isYes: false,
        avatar: 'https://avatar.vercel.sh/bitcoin-no.png',
      },
    ],
  },
  {
    id: '3',
    active_markets_count: 1,
    slug: 'will-openai-release-gpt-5-by-mid-2025',
    title: 'Will OpenAI release GPT-5 by mid-2025?',
    description:
      'This market will resolve to "Yes" if OpenAI officially releases a model called "GPT-5" or equivalent by June 30, 2025.',
    category: 'tech',
    probability: 84,
    volume: 256000,
    endDate: new Date('2025-06-30'),
    isResolved: false,
    creator: '0x3456...7890',
    creatorAvatar: 'https://avatar.vercel.sh/creator3.png',
    tags: ['openai', 'gpt-5', 'ai', 'release'],
    outcomes: [
      {
        id: '3-yes',
        name: 'Yes',
        probability: 84,
        price: 0.84,
        volume: 198000,
        isYes: true,
        avatar: 'https://avatar.vercel.sh/gpt5-yes.png',
      },
      {
        id: '3-no',
        name: 'No',
        probability: 16,
        price: 0.16,
        volume: 58000,
        isYes: false,
        avatar: 'https://avatar.vercel.sh/gpt5-no.png',
      },
    ],
  },
  {
    id: '4',
    active_markets_count: 1,
    slug: 'will-taylor-swift-win-a-grammy-for-album-of-the-year-at-the-2026-ceremony',
    title:
      'Will Taylor Swift win a Grammy for Album of the Year at the 2026 ceremony?',
    description:
      'This market resolves to "Yes" if Taylor Swift wins the Grammy Award for Album of the Year at the 68th Annual Grammy Awards ceremony.',
    category: 'culture',
    probability: 45,
    volume: 167000,
    endDate: new Date('2026-02-15'),
    isResolved: false,
    creator: '0x4567...8901',
    creatorAvatar: 'https://avatar.vercel.sh/creator4.png',
    tags: ['taylor-swift', 'grammys', 'music'],
    outcomes: [
      {
        id: '4-yes',
        name: 'Yes',
        probability: 45,
        price: 0.45,
        volume: 89000,
        isYes: true,
        avatar: 'https://avatar.vercel.sh/taylor-yes.png',
      },
      {
        id: '4-no',
        name: 'No',
        probability: 55,
        price: 0.55,
        volume: 78000,
        isYes: false,
        avatar: 'https://avatar.vercel.sh/taylor-no.png',
      },
    ],
  },
  {
    id: '5',
    active_markets_count: 1,
    slug: 'who-will-win-the-2026-fifa-world-cup',
    title: 'Who will win the 2026 FIFA World Cup?',
    description:
      'This market will resolve to the country that wins the 2026 FIFA World Cup final match.',
    category: 'sports',
    probability: 0,
    volume: 1234000,
    endDate: new Date('2026-07-19'),
    isResolved: false,
    creator: '0x5678...9012',
    creatorAvatar: 'https://avatar.vercel.sh/creator5.png',
    tags: ['fifa', 'world-cup', '2026'],
    outcomes: [
      {
        id: '5-brazil',
        name: 'Brazil',
        probability: 18,
        price: 0.18,
        volume: 234000,
        avatar: 'https://avatar.vercel.sh/brazil.png',
      },
      {
        id: '5-france',
        name: 'France',
        probability: 16,
        price: 0.16,
        volume: 198000,
        avatar: 'https://avatar.vercel.sh/france.png',
      },
      {
        id: '5-england',
        name: 'England',
        probability: 14,
        price: 0.14,
        volume: 167000,
        avatar: 'https://avatar.vercel.sh/england.png',
      },
      {
        id: '5-argentina',
        name: 'Argentina',
        probability: 12,
        price: 0.12,
        volume: 145000,
        avatar: 'https://avatar.vercel.sh/argentina.png',
      },
      {
        id: '5-other',
        name: 'Other',
        probability: 40,
        price: 0.4,
        volume: 490000,
        avatar: 'https://avatar.vercel.sh/other-countries.png',
      },
    ],
  },
  {
    id: '6',
    active_markets_count: 1,
    slug: 'will-a-major-earthquake-70-hit-california-in-2025',
    title: 'Will a major earthquake (7.0+) hit California in 2025?',
    description:
      'This market resolves to "Yes" if an earthquake of magnitude 7.0 or higher occurs in California during 2025.',
    category: 'world',
    probability: 12,
    volume: 89000,
    endDate: new Date('2025-12-31'),
    isResolved: false,
    creator: '0x6789...0123',
    creatorAvatar: 'https://avatar.vercel.sh/creator6.png',
    tags: ['earthquake', 'california', 'natural-disaster'],
    outcomes: [
      {
        id: '6-yes',
        name: 'Yes',
        probability: 12,
        price: 0.12,
        volume: 34000,
        isYes: true,
        avatar: 'https://avatar.vercel.sh/earthquake-yes.png',
      },
      {
        id: '6-no',
        name: 'No',
        probability: 88,
        price: 0.88,
        volume: 55000,
        isYes: false,
        avatar: 'https://avatar.vercel.sh/earthquake-no.png',
      },
    ],
  },
]

export const marketCategories: {
  id: EventCategory
  label: string
}[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'tech', label: 'Tech' },
  { id: 'culture', label: 'Culture' },
  { id: 'world', label: 'World' },
]

export function getFilterPillsByCategory(
  category: EventCategory,
): FilterPill[] {
  const basePills: FilterPill[] = [
    { id: 'all', label: 'All', category, isActive: true },
  ]

  switch (category) {
    case 'politics':
      return [
        ...basePills,
        {
          id: 'trump-vs-elon',
          label: 'Trump vs Elon',
          category,
          isActive: false,
        },
        {
          id: '2024-elections',
          label: '2024 Elections',
          category,
          isActive: false,
        },
        { id: 'geopolitics', label: 'Geopolitics', category, isActive: false },
      ]
    case 'crypto':
      return [
        ...basePills,
        { id: 'bitcoin', label: 'Bitcoin', category, isActive: false },
        { id: 'ethereum', label: 'Ethereum', category, isActive: false },
        {
          id: 'crypto-prices',
          label: 'Crypto Prices',
          category,
          isActive: false,
        },
        { id: 'defi', label: 'DeFi', category, isActive: false },
      ]
    case 'tech':
      return [
        ...basePills,
        { id: 'ai', label: 'AI', category, isActive: false },
        { id: 'openai', label: 'OpenAI', category, isActive: false },
        { id: 'tech-stocks', label: 'Tech Stocks', category, isActive: false },
      ]
    case 'sports':
      return [
        ...basePills,
        { id: 'fifa', label: 'FIFA', category, isActive: false },
        { id: 'nfl', label: 'NFL', category, isActive: false },
        { id: 'olympics', label: 'Olympics', category, isActive: false },
      ]
    default:
      return basePills
  }
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

// ============================================================
// FUNÇÕES PARA DADOS REAIS DO SUPABASE
// ============================================================

// Function to convert Event from Supabase to Market for frontend
function convertEventToMarket(event: EventWithMarkets): Event {
  // Se o evento tem apenas 1 market, usamos os outcomes como Yes/No
  if (event.markets.length === 1) {
    const market = event.markets[0]
    const outcomes = market.outcomes.map(outcome => ({
      id: `${event.id}-${outcome.outcome_index}`,
      name: outcome.outcome_text,
      probability: Math.random() * 100, // TODO: calculate real probability
      price: Math.random() * 0.99 + 0.01, // TODO: calculate real price
      volume: Math.random() * 100000, // TODO: real volume
      isYes: outcome.outcome_index === 0,
      avatar: `https://avatar.vercel.sh/${outcome.outcome_text.toLowerCase()}.png`,
    }))

    return {
      id: event.id.toString(),
      active_markets_count: event.markets.length,
      slug: event.slug,
      title: market.short_title || market.name,
      description: market.description || event.description || '',
      category: getCategoryFromTags(event.tags),
      probability: outcomes[0]?.probability || 50,
      volume: Math.random() * 1000000, // TODO: real volume
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // TODO: real date
      isResolved: market.is_resolved,
      isTrending: Math.random() > 0.7,
      creator: '0x1234...5678', // TODO: real creator
      creatorAvatar:
        getSupabaseImageUrl(event.icon_url)
        || 'https://avatar.vercel.sh/creator.png', // URL COMPLETA DO SUPABASE
      tags: event.tags.map(tag => tag.slug),
      outcomes,
      show_market_icons: event.show_market_icons,
    }
  }

  // If the event has multiple markets, we create one outcome per market (representing the "Yes" option)
  const outcomes = event.markets.map((market) => {
    // Get the "Yes" outcome (index 0) for probability calculation
    const yesOutcome = market.outcomes.find(o => o.outcome_index === 0)
    const noOutcome = market.outcomes.find(o => o.outcome_index === 1)

    return {
      id: `${event.id}-${market.slug}`,
      name: market.short_title || market.name, // Nome do market (ex: ">100k")
      probability: Math.random() * 100, // TODO: calculate real probability based on yes outcome
      price: Math.random() * 0.99 + 0.01, // TODO: calculate real price
      volume: Math.random() * 100000, // TODO: real volume
      isYes: true, // Representa a opção "Yes" deste market
      avatar: getSupabaseImageUrl(market.icon_url) || `https://avatar.vercel.sh/${market.slug}.png`,
      // Store both outcomes for the buttons
      yesOutcome: yesOutcome
        ? {
            id: `${event.id}-${market.slug}-yes`,
            name: yesOutcome.outcome_text,
            outcome_index: yesOutcome.outcome_index,
          }
        : null,
      noOutcome: noOutcome
        ? {
            id: `${event.id}-${market.slug}-no`,
            name: noOutcome.outcome_text,
            outcome_index: noOutcome.outcome_index,
          }
        : null,
      marketSlug: market.slug,
    }
  })

  return {
    id: event.id.toString(),
    active_markets_count: event.markets.length,
    slug: event.slug,
    title: event.title,
    description: event.description || '',
    category: getCategoryFromTags(event.tags),
    probability: 0, // For multiple markets, there's no single probability
    volume: Math.random() * 1000000, // TODO: real volume
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // TODO: real date
    isResolved: false,
    isTrending: Math.random() > 0.7,
    creator: '0x1234...5678', // TODO: real creator
    creatorAvatar:
      getSupabaseImageUrl(event.icon_url)
      || 'https://avatar.vercel.sh/creator.png', // URL COMPLETA DO SUPABASE
    tags: event.tags.map(tag => tag.slug),
    outcomes,
    show_market_icons: event.show_market_icons,
  }
}

// Function to map database tags to frontend categories
function getCategoryFromTags(tags: Tag[]): EventCategory {
  // Find the first main tag (is_main_category = true)
  const mainTag = tags.find(tag => tag.is_main_category)

  if (mainTag) {
    return mainTag.slug
  }

  // If no main tag, use the first available tag
  if (tags.length > 0) {
    return tags[0].slug
  }

  return 'world' // default fallback
}

// Function to fetch main categories from database
export async function getMainCategories(): Promise<
  { id: EventCategory, label: string }[]
> {
  try {
    const tags = await fetchTags(true) // apenas main categories
    const categories = tags.map(tag => ({
      id: tag.slug as EventCategory,
      label: tag.name,
    }))

    // Adicionar categorias especiais
    return [
      { id: 'trending', label: 'Trending' },
      { id: 'new', label: 'New' },
      ...categories,
    ]
  }
  catch (error) {
    console.error('Error fetching main categories:', error)
    return [
      { id: 'trending', label: 'Trending' },
      { id: 'new', label: 'New' },
    ]
  }
}

// Function to fetch all markets/events
export async function getAllMarkets(
  category?: EventCategory,
  limit?: number,
): Promise<Event[]> {
  try {
    let categorySlug = category

    // Mapear categorias especiais
    if (category === 'trending' || category === 'new') {
      categorySlug = undefined // fetch all
    }

    const events = await fetchEvents(categorySlug, limit)
    const markets = events.map(convertEventToMarket)

    // Filter by trending if necessary
    if (category === 'trending') {
      return markets.filter(market => market.isTrending)
    }

    // Sort by new if necessary (by events created_at)
    if (category === 'new') {
      return markets.sort((a, b) => {
        // Find the original event to get created_at
        const eventA = events.find(e => e.id.toString() === a.id)
        const eventB = events.find(e => e.id.toString() === b.id)
        if (!eventA || !eventB)
          return 0
        return (
          new Date(eventB.created_at).getTime()
            - new Date(eventA.created_at).getTime()
        )
      })
    }

    return markets
  }
  catch (error) {
    console.error('Error fetching markets:', error)
    return mockMarkets // fallback to mock data
  }
}
