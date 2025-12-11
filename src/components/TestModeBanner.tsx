interface TestModeBannerProps {
  message?: string
  label?: string
}

export default function TestModeBanner({
  message = 'You are in test mode. USDC is on Amoy Network (no real value).',
  label = 'Test mode',
}: TestModeBannerProps) {
  return (
    <div
      className="sticky inset-x-0 top-0 z-60 bg-orange-50 text-orange-900 shadow-sm"
      role="region"
      aria-label="Test mode banner"
    >
      <div className="mx-auto flex max-w-screen items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <span className="inline-block size-3 rounded-full bg-orange-500" />
          </span>
          <p className="text-sm">
            <span className="font-medium">
              {label}
              {' '}
            </span>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
