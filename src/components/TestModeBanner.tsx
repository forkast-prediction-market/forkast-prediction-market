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
      className={`
        sticky inset-x-0 top-0 z-60 border-b border-orange-200/70 bg-white text-orange-900
        shadow-[0_10px_30px_rgba(249,115,22,0.08)]
      `}
      role="region"
      aria-label="Test mode banner"
    >
      <div className="container px-4 py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <span className={`
              inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide
              text-orange-800 uppercase shadow-sm ring-1 ring-orange-200
            `}
            >
              <span className="size-2 rounded-full bg-orange-500 shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" />
              {label}
            </span>
            <p className="text-sm leading-relaxed text-orange-900">
              <span className="font-semibold text-orange-800">Heads up:</span>
              {' '}
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
