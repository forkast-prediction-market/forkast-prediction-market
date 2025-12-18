import { defaultNetwork } from '@/lib/appkit'

export const AMOY_CHAIN_ID = 80_002

export const IS_TEST_MODE = defaultNetwork.id === AMOY_CHAIN_ID
