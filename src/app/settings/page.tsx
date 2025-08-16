import type { Metadata } from 'next'
import SettingsLayout from './_components/SettingsLayout'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return <SettingsLayout defaultTab="profile" />
}
