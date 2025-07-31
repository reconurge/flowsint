import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getWindowState: () => Promise<{
        isFullscreen: boolean
        isMaximized: boolean
      }>
    }
  }
}

