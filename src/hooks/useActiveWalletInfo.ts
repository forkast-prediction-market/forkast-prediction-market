'use client'

import { AssetUtil, ChainController, ConnectorController, StorageUtil } from '@reown/appkit-controllers'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

const WALLET_LOGO_MAP: Record<string, { src: string, label: string }> = {
  '1inch': { src: '/images/wallets/1inch.webp', label: '1inch' },
  'anchorage': { src: '/images/wallets/anchorage.webp', label: 'Anchorage' },
  'binance': { src: '/images/wallets/binance.webp', label: 'Binance' },
  'bitget': { src: '/images/wallets/bitget.webp', label: 'Bitget' },
  'hot': { src: '/images/wallets/hot.webp', label: 'Huobi Wallet' },
  'imtoken': { src: '/images/wallets/imtoken.webp', label: 'imToken' },
  'metamask': { src: '/images/wallets/metamask.webp', label: 'MetaMask' },
  'io-metamask': { src: '/images/wallets/metamask.webp', label: 'MetaMask' },
  'okx': { src: '/images/wallets/okx.webp', label: 'OKX' },
  'onekey': { src: '/images/wallets/onekey.webp', label: 'OneKey' },
  'safepal': { src: '/images/wallets/safepal.webp', label: 'SafePal' },
  'tokenpocket': { src: '/images/wallets/tokenpocket.webp', label: 'TokenPocket' },
  'trust': { src: '/images/wallets/trust.webp', label: 'Trust Wallet' },
  'reown': { src: '/images/wallets/reown.webp', label: 'Reown' },
  'binanceweb3': { src: '/images/wallets/binance.webp', label: 'Binance Web3' },
}

function normalizeKey(value?: string | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
}

function resolveLocalLogo(connectorId?: string, name?: string, rdns?: string) {
  const candidates = [connectorId, name, rdns].map(normalizeKey).map(value => value.replace(/\./g, '-')).filter(Boolean)

  const entry = Object.entries(WALLET_LOGO_MAP).find(([key]) => (
    candidates.some(candidate => candidate.includes(key))
  ))

  if (!entry) {
    return null
  }

  const [, value] = entry
  return value
}

export function useActiveWalletInfo() {
  const { activeConnectorIds } = useSnapshot(ConnectorController.state)
  const { activeChain } = useSnapshot(ChainController.state)

  const connectorId = activeChain ? activeConnectorIds[activeChain] : undefined
  const connector = connectorId ? ConnectorController.getConnectorById(connectorId) : undefined
  const connectorName = connector ? ConnectorController.getConnectorName(connector.name) : undefined
  const connectorRdns = connector?.rdns
  const recentWallet = useMemo(() => {
    try {
      const single = StorageUtil.getRecentWallet() as { id?: string, name?: string, rdns?: string } | null
      const list = StorageUtil.getRecentWallets?.() as { id?: string, name?: string, rdns?: string }[] | undefined
      const fromList = Array.isArray(list) && list.length > 0 ? list[0] : null
      return single ?? fromList ?? null
    }
    catch {
      return null
    }
  }, [])

  const resolved = useMemo(() => {
    const local = resolveLocalLogo(connectorId, connectorName, connectorRdns)
      || resolveLocalLogo(recentWallet?.id, recentWallet?.name, recentWallet?.rdns)
    const preferRecentName = connectorName?.toLowerCase() === 'walletconnect' ? (recentWallet?.name || undefined) : undefined
    const name = preferRecentName ?? recentWallet?.name ?? local?.label ?? connectorName ?? recentWallet?.id
    return {
      name: name ?? undefined,
      imageSrc: local?.src ?? (connector ? AssetUtil.getConnectorImage(connector) : undefined) ?? undefined,
    }
  }, [connector, connectorId, connectorName, connectorRdns, recentWallet])

  return {
    connectorId,
    walletName: resolved.name,
    walletImageSrc: resolved.imageSrc,
  }
}
