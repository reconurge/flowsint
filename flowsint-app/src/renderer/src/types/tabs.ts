export interface TabInfo {
  id: string
  title: string
  type: "graph" | "wall"
  investigationId: string
  data?: any
  isDirty?: boolean
  isLoading?: boolean
}

export interface TabsState {
  items: TabInfo[]
  selectedTabId: string | null
  selectedTabIndex: number
}

export interface TabsSlice {
  tabs: TabsState & {
    initialize: () => Promise<void>
    setSelectedTab: (tab: TabInfo) => void
    remove: (tab: TabInfo) => void
    add: (params: {
      id: string
      type: "graph" | "wall"
      investigationId: string
      data?: any
      title?: string
      isLoading?: boolean
    }) => Promise<void>
    reorder: (tabs: TabInfo[]) => void
    updateTabData: (id: string, data: any) => void
    markTabDirty: (id: string, isDirty?: boolean) => void
    clearTabs: () => void
  }
} 