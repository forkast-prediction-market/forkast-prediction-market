import { ImageResponse } from 'next/og'

interface ShareCardPayload {
  title: string
  outcome: string
  avgPrice: string
  invested: string
  toWin: string
  variant: 'yes' | 'no'
  eventSlug: string
}

const fallbackPayload: ShareCardPayload = {
  title: 'Untitled market',
  outcome: 'Yes',
  avgPrice: '50c',
  invested: '$0.00',
  toWin: '$0.00',
  variant: 'yes',
  eventSlug: '',
}

function normalizeText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== 'string') {
    return fallback
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return fallback
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed
}

function parsePayload(rawPayload: string | null): ShareCardPayload {
  if (!rawPayload) {
    return fallbackPayload
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<ShareCardPayload>
    return {
      title: normalizeText(parsed.title, fallbackPayload.title, 140),
      outcome: normalizeText(parsed.outcome, fallbackPayload.outcome, 24),
      avgPrice: normalizeText(parsed.avgPrice, fallbackPayload.avgPrice, 24),
      invested: normalizeText(parsed.invested, fallbackPayload.invested, 24),
      toWin: normalizeText(parsed.toWin, fallbackPayload.toWin, 24),
      variant: parsed.variant === 'no' ? 'no' : 'yes',
      eventSlug: normalizeText(parsed.eventSlug, fallbackPayload.eventSlug, 120),
    }
  }
  catch (error) {
    console.error('Failed to parse share payload.', error)
    return fallbackPayload
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const payload = parsePayload(searchParams.get('position'))
  const variant = payload.variant === 'no' ? 'no' : 'yes'
  const accent = variant === 'no' ? '#ef4444' : '#22c55e'
  const accentSoft = variant === 'no' ? '#fee2e2' : '#dcfce7'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'
  const outcomeLabel = payload.outcome || (variant === 'no' ? 'No' : 'Yes')

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
          padding: '48px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            borderRadius: '32px',
            padding: '52px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#94a3b8',
              }}
            >
              {siteName}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accentSoft,
                color: accent,
                borderRadius: '999px',
                padding: '10px 20px',
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {`Bought ${outcomeLabel}`}
            </div>
          </div>

          <div
            style={{
              marginTop: '26px',
              fontSize: '48px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: '1.2',
              flexGrow: 1,
            }}
          >
            {payload.title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '24px', color: '#64748b' }}>Avg price</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a' }}>
                {payload.avgPrice}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '24px', color: '#64748b' }}>To win</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: accent }}>
                {payload.toWin}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              fontSize: '24px',
              color: '#64748b',
            }}
          >
            {`Invested ${payload.invested}`}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )

  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300')
  return response
}
