import type { TabsSlice } from '../types/tabs'
import type { TabInfo } from '../types/tabs'
import { produce } from 'immer'
import type { StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'

export const createTabSlice: StateCreator<TabsSlice, [], [], TabsSlice> = (set) => ({
  tabs: {
    items: [],
    selectedTabId: null,
    selectedTabIndex: 0,
    initialize: async () => {
      set(
        produce((state: TabsSlice) => {
          state.tabs.items = []
          state.tabs.selectedTabId = null
          state.tabs.selectedTabIndex = 0
        })
      )
    },
    setSelectedTab: (tab: TabInfo) => {
      set(
        produce((state: TabsSlice) => {
          state.tabs.selectedTabId = tab.id
          state.tabs.selectedTabIndex = state.tabs.items.findIndex((item) => tab.id === item.id)
        })
      )
    },
    remove: (tab: TabInfo) =>
      set(
        produce((state: TabsSlice) => {
          if (state.tabs.items.length === 1) {
            // If we are deleting the last tab, close it and add a new tab
            state.tabs.items.splice(0, 1)
            state.tabs.selectedTabId = null
            state.tabs.selectedTabIndex = 0
            return
          }
          const index = state.tabs.items.findIndex((t) => t.id === tab.id)

          if (tab.id === state.tabs.selectedTabId) {
            // Set new selected tab if the current tab is selected
            if (index === -1) {
              state.tabs.selectedTabId = state.tabs.items[0].id
            } else if (index === state.tabs.items.length - 1) {
              state.tabs.selectedTabId = state.tabs.items[state.tabs.items.length - 2].id
            } else {
              state.tabs.selectedTabId = state.tabs.items[index + 1].id
            }
          }

          if (index === -1) return
          state.tabs.items.splice(index, 1)
        })
      ),
    add: async (params) => {
      const { id, type, investigationId, data, title, isLoading } = params

      if (!id || !type || !investigationId) {
        console.warn("Missing required parameters for tab creation")
        return
      }

      set(
        produce((state: TabsSlice) => {
          const existingTab = state.tabs.items.find(
            (tab) =>
              tab.id === id &&
              tab.type === type &&
              tab.investigationId === investigationId
          )

          if (existingTab) {
            state.tabs.selectedTabId = id
            return
          }

          const newTab: TabInfo = {
            id,
            title: title || `${type} ${id}`,
            data,
            investigationId,
            type,
            isDirty: false,
            isLoading: isLoading || false,
          }

          state.tabs.items.push(newTab)
          state.tabs.selectedTabId = id
          state.tabs.selectedTabIndex = state.tabs.items.length - 1
        })
      )
    },
    reorder: (tabs: TabInfo[]) => {
      set(
        produce((state: TabsSlice) => {
          state.tabs.items = tabs
          state.tabs.selectedTabIndex = tabs.findIndex((tab) => state.tabs.selectedTabId === tab.id)
        })
      )
    },
    updateTabData: (id: string, data: any) => {
      if (!id || !data) return

      set(
        produce((state: TabsSlice) => {
          state.tabs.items = state.tabs.items.map((tab) =>
            tab.id === id ? { ...tab, ...data } : tab
          )
        })
      )
    },
    markTabDirty: (id: string, isDirty = true) => {
      if (!id) return

      set(
        produce((state: TabsSlice) => {
          state.tabs.items = state.tabs.items.map((tab) =>
            tab.id === id ? { ...tab, isDirty } : tab
          )
        })
      )
    },
    clearTabs: () => {
      set(
        produce((state: TabsSlice) => {
          state.tabs.items = []
          state.tabs.selectedTabId = null
          state.tabs.selectedTabIndex = 0
        })
      )
    }
  }
}) 