import { ImageResponse } from 'next/og'
import { sanitizeSvg } from '@/lib/utils'

interface ShareCardPayload {
  title: string
  outcome: string
  avgPrice: string
  odds: string
  cost: string
  invested: string
  toWin: string
  imageUrl?: string
  userName?: string
  userImage?: string
  variant: 'yes' | 'no'
  eventSlug: string
}

function normalizeRequiredText(value: unknown, maxLength = 120) {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed
}

function normalizeOptionalText(value: unknown, maxLength = 120) {
  if (typeof value !== 'string') {
    return ''
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed
}

function sanitizeImageUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.length > 2048) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return trimmed
  }
  catch {
    return ''
  }
}

function buildSvgDataUri(svg: string) {
  const sanitized = sanitizeSvg(svg)
  if (!sanitized) {
    return ''
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(sanitized)}`
}

function parsePayload(rawPayload: string | null): ShareCardPayload | null {
  if (!rawPayload) {
    return null
  }

  try {
    const parsed = parsePayloadJson(rawPayload)
    if (!parsed) {
      return null
    }
    const normalized = normalizeSharePayload(parsed)
    return normalized ?? null
  }
  catch (error) {
    console.error('Failed to parse share payload.', error)
    return null
  }
}

function parsePayloadJson(rawPayload: string) {
  try {
    return JSON.parse(rawPayload) as Partial<ShareCardPayload>
  }
  catch {
    try {
      const decoded = decodeBase64Url(rawPayload)
      return JSON.parse(decoded) as Partial<ShareCardPayload>
    }
    catch {
      return null
    }
  }
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function normalizeSharePayload(parsed: Partial<ShareCardPayload>): ShareCardPayload | null {
  const title = normalizeRequiredText(parsed.title, 140)
  const outcome = normalizeRequiredText(parsed.outcome, 24)
  const avgPrice = normalizeRequiredText(parsed.avgPrice, 24)
  const odds = normalizeRequiredText(parsed.odds, 16)
  const cost = normalizeRequiredText(parsed.cost, 24)
  const toWin = normalizeRequiredText(parsed.toWin, 24)
  const eventSlug = normalizeRequiredText(parsed.eventSlug, 120)

  if (!title || !outcome || !avgPrice || !odds || !cost || !toWin || !eventSlug) {
    return null
  }

  const variant = parsed.variant === 'no' || parsed.variant === 'yes' ? parsed.variant : null
  if (!variant) {
    return null
  }

  const rawImageUrl = typeof parsed.imageUrl === 'string' ? parsed.imageUrl : ''
  const rawUserImage = typeof parsed.userImage === 'string' ? parsed.userImage : ''
  const safeImageUrl = sanitizeImageUrl(rawImageUrl)
  const safeUserImage = sanitizeImageUrl(rawUserImage)
  return {
    title,
    outcome,
    avgPrice,
    odds,
    cost,
    invested: normalizeOptionalText(parsed.invested, 24),
    toWin,
    imageUrl: safeImageUrl || undefined,
    userName: typeof parsed.userName === 'string' ? parsed.userName.trim() || undefined : undefined,
    userImage: safeUserImage || undefined,
    variant,
    eventSlug,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const payload = parsePayload(searchParams.get('position'))
  if (!payload) {
    return new Response('Missing or invalid share payload.', { status: 400 })
  }
  const variant = payload.variant === 'no' ? 'no' : 'yes'
  const accent = variant === 'no' ? '#ef4444' : '#22c55e'
  const outcomeLabel = payload.outcome || (variant === 'no' ? 'No' : 'Yes')
  const siteLogoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG ?? ''
  const siteLogoSrc = siteLogoSvg ? buildSvgDataUri(siteLogoSvg) : ''
  const hasUserBadge = Boolean(payload.userName || payload.userImage)

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: 'linear-gradient(135deg, #0f172a 0%, #0b1324 100%)',
          padding: '0 56px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        {hasUserBadge && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              borderRadius: '999px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: '#e2e8f0',
            }}
          >
            {payload.userImage && (
              // eslint-disable-next-line next/no-img-element
              <img
                src={payload.userImage}
                alt=""
                width={40}
                height={40}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '999px',
                  objectFit: 'cover',
                }}
              />
            )}
            {payload.userName && (
              <div style={{ display: 'flex', fontSize: '32px', fontWeight: 600 }}>
                {payload.userName}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            width: '100%',
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
              left: '63%',
              top: '-18px',
              transform: 'translateX(-50%)',
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              backgroundColor: '#0b1324',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '63%',
              bottom: '-18px',
              transform: 'translateX(-50%)',
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
                width: '2px',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: '2px',
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

        {siteLogoSrc && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            {/* eslint-disable-next-line next/no-img-element */}
            <img
              src={siteLogoSrc}
              alt=""
              width={64}
              height={64}
              style={{
                width: '64px',
                height: '64px',
              }}
            />
            <div style={{ color: '#fff', fontSize: '64px' }}>{process.env.NEXT_PUBLIC_SITE_NAME}</div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 640,
    },
  )

  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300')
  return response
}
