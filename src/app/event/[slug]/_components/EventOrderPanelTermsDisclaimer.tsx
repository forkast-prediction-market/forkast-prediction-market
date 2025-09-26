import Link from 'next/link'

export default function EventOrderPanelTermsDisclaimer() {
  return (
    <p className="mt-3 text-center text-[10px] text-muted-foreground">
      By trading, you agree to our
      {' '}
      <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/terms-of-use">
        Terms of Use
      </Link>
      .
    </p>
  )
}
