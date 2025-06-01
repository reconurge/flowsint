import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    tabs: ITabsAPI
  }
}

export interface ITabsAPI {
  new: () => Promise<number>
  close: (id: number) => Promise<void>
  select: (id: number) => Promise<void>
  reorder: (tabIds: number[]) => Promise<void>
  getAllTabIds: () => Promise<number[]>
  getSelectedTabId: () => Promise<number>
}

