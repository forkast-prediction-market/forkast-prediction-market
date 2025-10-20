# Development Guidelines & Architecture

This document outlines the development standards, architectural decisions, and coding conventions for the Forkast prediction market platform.

## 🏗️ Tech Stack

### Core Framework
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework

### UI & Components
- **shadcn/ui** - Component library (New York style)
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Vaul** - Drawer component

### Backend & Database
- **Supabase** - Backend-as-a-Service (PostgreSQL)
- **Better Auth** - Authentication with SIWE support
- **Zod** - Schema validation
- **Server Actions** - Next.js server-side functions

### Web3 & Blockchain
- **Reown AppKit** - Wallet connection
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **Polygon** - Primary blockchain network

### Data & State Management
- **Zustand** - Client-side state management
- **TanStack Query** - Server state management
- **TanStack Table** - Data tables
- **TanStack Virtual** - Virtualization

### Development Tools
- **ESLint** - Code linting (@antfu/eslint-config)
- **Playwright** - End-to-end testing
- **Husky** - Git hooks
- **Lint-staged** - Pre-commit linting

## 📋 Coding Standards

### Function Style
**ALWAYS use function declarations, never arrow functions for named functions:**

```typescript
// ✅ Correct
export function calculateProbability(value: number) {
  return value * 100
}

// ❌ Incorrect
export const calculateProbability = (value: number) => {
  return value * 100
}
```

**ESLint Rule**: `'func-style': ['error', 'declaration', { allowArrowFunctions: false }]`

### Component Structure
**Use default exports for React components:**

```typescript
// ✅ Correct
export default function EventCard({ event }: EventCardProps) {
  return <div>{event.title}</div>
}

// ❌ Incorrect
export const EventCard = ({ event }: EventCardProps) => {
  return <div>{event.title}</div>
}
```

### UI Components
**ALWAYS use shadcn/ui components when available:**

```typescript
// ✅ Correct
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ❌ Incorrect - Don't create custom buttons/cards when shadcn exists
import { CustomButton } from '@/components/CustomButton'
```

When adding new shadcn components, do not add new radis-ui packages, component will still working normally with `@radix-ui/<package>`

### Styling Guidelines
**Use Tailwind CSS classes with consistent patterns:**

```typescript
// ✅ Correct - Consistent line wrapping
<div className={`
  flex h-[180px] cursor-pointer flex-col transition-all
  hover:-translate-y-0.5 hover:shadow-lg
  ${isActive ? 'ring-2 ring-primary/20' : ''}
  overflow-hidden
`}>

// ❌ Incorrect - Long single line
<div className="flex h-[180px] cursor-pointer flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg overflow-hidden">
```

**ESLint Rule**: `'better-tailwindcss/enforce-consistent-line-wrapping'`

### Import Organization
**Follow consistent import ordering:**

```typescript
// 1. React/Next.js imports
import { useState } from 'react'
import Image from 'next/image'

// 2. Third-party libraries
import { toast } from 'sonner'
import { BookmarkIcon } from 'lucide-react'

// 3. Internal components
import { Button } from '@/components/ui/button'
import EventBookmark from '@/components/EventBookmark'

// 4. Utilities and types
import { cn } from '@/lib/utils'
import type { Event } from '@/types'
```

### File Naming Conventions
- **Components**: PascalCase (`EventCard.tsx`)
- **Pages**: kebab-case (`market-context/page.tsx`)
- **Utilities**: kebab-case (`market-context.ts`)
- **Types**: PascalCase (`Event`, `Market`)
- **Constants**: UPPER_SNAKE_CASE (`NEW_MARKET_MAX_AGE_DAYS`)

## 🎨 Component Patterns

### Client Components
**Use 'use client' directive for interactive components:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function InteractiveComponent() {
  const [count, setCount] = useState(0)
  // Component logic
}
```

### Server Actions
**Use server actions for form submissions and data mutations:**

```typescript
'use server'

import { z } from 'zod'

const Schema = z.object({
  eventId: z.string(),
})

export async function toggleBookmarkAction(eventId: string) {
  const parsed = Schema.safeParse({ eventId })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }
  // Server logic
}
```

### Error Handling
**Always handle errors gracefully:**

```typescript
export async function fetchMarketData(id: string) {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to fetch market data' }
    }

    return { data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
```

## 🗂️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (platform)/        # Platform routes
│   ├── admin/             # Admin panel
│   ├── api/               # Public API routes (not implemented yet)
│   └── docs/              # Documentation
├── components/            # Reusable components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
│   ├── ai/              # AI/LLM integrations
│   ├── db/              # Database repositories
│   └── utils.ts         # Common utilities
├── providers/            # React context providers
├── stores/              # Zustand state stores
└── types/               # TypeScript type definitions
```

## 🔧 Configuration Files

### Path Aliases
**Use consistent import paths:**

```typescript
// ✅ Correct
import { Button } from '@/components/ui/button'
import { formatVolume } from '@/lib/utils'
import type { Event } from '@/types'

// ❌ Incorrect
import { Button } from '../../../components/ui/button'
import { formatVolume } from '../../lib/utils'
```

### Environment Variables
**Required for development:**

```bash
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_URL=

# Authentication
BETTER_AUTH_SECRET=
NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID=

# Automation
CRON_SECRET=
PNL_SUBGRAPH_URL=
MARKET_CREATORS_ADDRESS=
```

## 🧪 Testing Standards

### End-to-End Testing
**Use Playwright for E2E tests:**

```typescript
import { test, expect } from '@playwright/test'

test('should display market cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="event-card"]')).toBeVisible()
})
```

### Component Testing
**Test user interactions and state changes:**

```typescript
test('should toggle bookmark state', async ({ page }) => {
  await page.click('[data-testid="bookmark-button"]')
  await expect(page.locator('[data-testid="bookmark-button"]')).toHaveAttribute('aria-pressed', 'true')
})
```

## 🚀 Performance Guidelines

### Image Optimization
**Always use Next.js Image component:**

```typescript
import Image from 'next/image'

<Image
  src={event.icon_url}
  alt={event.title}
  width={40}
  height={40}
  className="rounded object-cover"
/>
```

### Bundle Optimization
**Use dynamic imports for heavy components:**

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
})
```

### Database Queries
**Use efficient queries with proper indexing:**

```typescript
// ✅ Efficient - Select only needed fields
const { data } = await supabase
  .from('events')
  .select('id, title, slug, probability')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20)
```

### Cache
**Use `use cache` directive for queries, remind to revalidateTag:**

```typescript
export const NotificationRepository = {
  async getByUserId(userId: string) {
    'use cache'
    cacheTag(cacheTags.notifications(userId))

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, category, title, description, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error }
    }

    return { data: data as Notification[], error: null }
  },

  async deleteById(notificationId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      return { data: null, error }
    }

    revalidateTag(cacheTags.notifications(userId))

    return { data: null, error: null }
  },
}
```

## 🔐 Security Best Practices

### Input Validation
**Always validate user input with Zod:**

```typescript
import { z } from 'zod'

const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  tags: z.array(z.string()).max(10),
})
```

### Authentication
**Check user permissions for protected actions:**

```typescript
export async function adminOnlyAction() {
  const user = await getCurrentUser()
  if (!user?.is_admin) {
    throw new Error('Unauthorized')
  }
  // Admin logic
}
```

## 📚 Documentation Standards

### Code Comments
**Document complex business logic:**

```typescript
/**
 * Calculates market probability based on YES/NO token prices
 * Uses Automated Market Maker (AMM) formula: P = YES_price / (YES_price + NO_price)
 */
export function calculateProbability(yesPrice: number, noPrice: number): number {
  return yesPrice / (yesPrice + noPrice)
}
```

### Type Definitions
**Provide clear type documentation:**

```typescript
interface Market {
  /** Unique identifier from blockchain condition */
  condition_id: string
  /** Human-readable market title */
  title: string
  /** Current probability (0-1 range) */
  probability: number
  /** Whether market accepts new trades */
  is_active: boolean
}
```

## 🔄 Git Workflow

### Commit Messages
**Use conventional commit format:**

```bash
feat: add market context AI generation
fix: resolve bookmark toggle state issue
docs: update development guidelines
refactor: extract market calculation utilities
```

### Branch Naming
**Use descriptive branch names:**

```bash
feat/market-context-ai
fix/bookmark-toggle-bug
docs/development-guidelines
refactor/market-calculations
```

### Pre-commit Hooks
**Automatic linting and formatting:**

```json
{
  "lint-staged": {
    "*": "eslint --fix"
  }
}
```

This ensures code quality and consistency across all contributions.
