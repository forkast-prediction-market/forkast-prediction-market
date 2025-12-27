import { ImageResponse } from 'next/og'

interface ShareCardPayload {
  title: string
  outcome: string
  avgPrice: string
  odds: string
  cost: string
  invested: string
  toWin: string
  imageUrl?: string
  variant: 'yes' | 'no'
  eventSlug: string
}

const fallbackPayload: ShareCardPayload = {
  title: 'Untitled market',
  outcome: 'Yes',
  avgPrice: '50c',
  odds: '50%',
  cost: '$0.00',
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
    const rawImageUrl = typeof parsed.imageUrl === 'string' ? parsed.imageUrl.trim() : ''
    const safeImageUrl = rawImageUrl && rawImageUrl.length <= 2048 ? rawImageUrl : ''
    return {
      title: normalizeText(parsed.title, fallbackPayload.title, 140),
      outcome: normalizeText(parsed.outcome, fallbackPayload.outcome, 24),
      avgPrice: normalizeText(parsed.avgPrice, fallbackPayload.avgPrice, 24),
      odds: normalizeText(parsed.odds, fallbackPayload.odds, 16),
      cost: normalizeText(parsed.cost, fallbackPayload.cost, 24),
      invested: normalizeText(parsed.invested, fallbackPayload.invested, 24),
      toWin: normalizeText(parsed.toWin, fallbackPayload.toWin, 24),
      imageUrl: safeImageUrl || undefined,
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
          background: 'linear-gradient(135deg, #0f172a 0%, #0b1324 100%)',
          padding: '56px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: '44px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.35)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '-18px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              backgroundColor: '#0b1324',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '-18px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              backgroundColor: '#0b1324',
            }}
          />
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              gap: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flex: '3 1 0%',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '160px',
                  height: '160px',
                  borderRadius: '20px',
                  backgroundColor: '#e2e8f0',
                  overflow: 'hidden',
                  border: '2px solid #e2e8f0',
                }}
              >
                {payload.imageUrl
                  ? (
                      // eslint-disable-next-line next/no-img-element
                      <img
                        src={payload.imageUrl}
                        alt=""
                        width={160}
                        height={160}
                        style={{
                          width: '160px',
                          height: '160px',
                          objectFit: 'cover',
                        }}
                      />
                    )
                  : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569',
                          fontSize: '18px',
                          fontWeight: 600,
                        }}
                      >
                        No image
                      </div>
                    )}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                {payload.title}
              </div>
            </div>
            <div
              style={{
                width: '1px',
                backgroundColor: '#e2e8f0',
                alignSelf: 'stretch',
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flex: '2 1 0%',
                minWidth: 0,
                alignItems: 'stretch',
                paddingLeft: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  alignItems: 'stretch',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    color: accent,
                    fontSize: '52px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                  }}
                >
                  {`Bought ${outcomeLabel}`}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxWidth: '100%',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: '32px', color: '#64748b' }}>Cost</div>
                    <div style={{ display: 'flex', fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>
                      {payload.cost}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: '32px', color: '#64748b' }}>Odds</div>
                    <div style={{ display: 'flex', fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>
                      {payload.odds}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: '1px',
                    backgroundColor: '#e2e8f0',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '38px', fontWeight: 900, color: '#0f172a' }}>To win</div>
                  <div style={{ display: 'flex', fontSize: '64px', fontWeight: 900, color: '#0f172a' }}>
                    {payload.toWin}
                  </div>
                </div>
              </div>
            </div>
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
