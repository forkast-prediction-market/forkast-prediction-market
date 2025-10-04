# Dynamic Affiliate Data MDX Components

This directory contains React components designed for use in MDX documentation pages to display dynamic affiliate data.

## Components

### Core Display Components

- **`TradingFeeDisplay`** - Shows the current trading fee percentage
- **`AffiliateShareDisplay`** - Shows the current affiliate share percentage
- **`PlatformShareDisplay`** - Shows the calculated platform share percentage
- **`FeeCalculationExample`** - Shows dynamic fee calculation examples

### Error Handling Components

- **`ErrorDisplay`** - Inline error display with refresh functionality
- **`ErrorDisplayBlock`** - Block-level error display for larger error states

## Usage in MDX

### Basic Usage

```mdx
import { TradingFeeDisplay, AffiliateShareDisplay, PlatformShareDisplay } from '@/components/docs'

The current trading fee is <TradingFeeDisplay />.

Affiliates earn <AffiliateShareDisplay /> of trading fees, while the platform keeps <PlatformShareDisplay />.
```

### With Server-Side Data (Recommended)

```mdx
// In your page component
import { getFormattedAffiliateSettings } from '@/lib/affiliate-data-server'
import { TradingFeeDisplay } from '@/components/docs'

export default async function TradingFeesPage() {
  const affiliateData = await getFormattedAffiliateSettings()

  return (
    <div>
      <p>Current trading fee: <TradingFeeDisplay data={affiliateData} /></p>
    </div>
  )
}
```

### Fee Calculation Examples

```mdx
import { FeeCalculationExample } from '@/components/docs'

<FeeCalculationExample amount={100} />

<FeeCalculationExample amount={1000} format="inline" />
```

## Features

- **Server-Side Rendering**: Components work with server-side data for optimal performance
- **Client-Side Fallback**: Automatically fetch data client-side if server data unavailable
- **Error Handling**: Graceful error states with refresh functionality
- **Fallback Values**: Display default values when data is unavailable
- **Flexible Styling**: Customizable className props for styling
- **TypeScript Support**: Full TypeScript support with proper type definitions

## Data Flow

1. **Preferred**: Server-side data passed as props (fastest, no loading states)
2. **Fallback**: Client-side API fetch if no server data provided
3. **Error State**: Display error with fallback values and refresh option
4. **Fallback Values**: Use hardcoded defaults if all else fails

## Error Handling

Components handle various error scenarios:

- Database connection failures
- Missing or incomplete settings
- Invalid data formats
- Network errors during client-side fetching

All errors display user-friendly messages with refresh functionality to retry data loading.
