import type { PressProofAPI } from './index'

declare global {
  interface Window {
    api: PressProofAPI
  }
}
