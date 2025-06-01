import Store from 'electron-store'

export const globalStore = new Store()

/**
 * Updates stored tabs
 * @param tabs Array of tab urls
 */
export function setTabs(tabs: string[]) {
  globalStore.set('tabs', tabs)
}

/**
 * Retrieves stored tabs
 */
export function getTabs(): string[] | null {
  const data = globalStore.get('tabs', null) as string[] | null
  if (!data) return null
  return data
}

/**
 * Updates selected tab index
 * @param index Index of selected tab
 */
export function setSelected(index: number) {
  globalStore.set('selectedTabIndex', index)
}

/**
 * Retrieves selected tab index
 */
export function getSelected(): number {
  const data = globalStore.get('selectedTabIndex', null) as number | null
  if (!data) return -1
  return data
}
