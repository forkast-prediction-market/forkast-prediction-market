import type { LucideIcon } from 'lucide-react'
import { loader } from 'fumadocs-core/source'
import * as lucideIcons from 'lucide-react'
import { createElement } from 'react'
import { docs } from '../../.source'

function isLucideIcon(value: unknown): value is LucideIcon {
  return typeof value === 'function'
    || (typeof value === 'object' && value !== null && '$$typeof' in value)
}

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) {
      return
    }
    const candidates = [icon, `${icon}Icon`]
    for (const name of candidates) {
      const component = lucideIcons[name as keyof typeof lucideIcons]
      if (isLucideIcon(component)) {
        return createElement(component)
      }
    }
  },
})
