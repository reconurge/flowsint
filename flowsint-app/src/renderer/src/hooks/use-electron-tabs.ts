import { useEffect, useState } from 'react'

declare global {
  interface Window {
    electron: {
      tabs: {
        add: (path: string, title?: string) => Promise<number>
        close: (id: number) => Promise<void>
        closeAll: () => Promise<void>
        getSelected: () => Promise<number>
        setSelected: (id: number) => Promise<void>
        getAll: () => Promise<number[]>
        reorder: (ids: number[]) => Promise<void>
        update: (path: string, data: { title?: string }) => Promise<void>
        onSelected: (callback: (id: number) => void) => () => void
      }
    }
  }
}

interface TabInfo {
  id: number
  path: string
  title?: string
}

export function useElectronTabs() {
  const [tabs, setTabs] = useState<number[]>([])
  const [selectedTab, setSelectedTab] = useState<number>(-1)
  const [tabInfos, setTabInfos] = useState<TabInfo[]>([])

  useEffect(() => {
    // Initial load
    loadTabs()

    // Set up event listeners
    const handleTabChange = async () => {
      const selected = await window.electron.tabs.getSelected()
      setSelectedTab(selected)
    }

    const handleTabsChange = async () => {
      const allTabs = await window.electron.tabs.getAll()
      setTabs(allTabs)
    }

    // Listen for tab changes
    window.addEventListener('focus', handleTabChange)
    window.addEventListener('blur', handleTabChange)

    // Listen for tab selection events
    const unsubscribe = window.electron.tabs.onSelected((id) => {
      setSelectedTab(id)
    })

    // Poll for tab changes
    const interval = setInterval(handleTabsChange, 1000)

    return () => {
      window.removeEventListener('focus', handleTabChange)
      window.removeEventListener('blur', handleTabChange)
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    // Update tab infos when tabs change
    const infos = tabs.map(id => ({
      id,
      path: `/dashboard/investigations/${id}`,
      title: `Tab ${id}`
    }))
    setTabInfos(infos)
  }, [tabs])

  const loadTabs = async () => {
    const [allTabs, selected] = await Promise.all([
      window.electron.tabs.getAll(),
      window.electron.tabs.getSelected()
    ])
    setTabs(allTabs)
    setSelectedTab(selected)
  }

  const addTab = async (path: string, title?: string) => {
    const id = await window.electron.tabs.add(path, title)
    if (id !== undefined) {
      setTabs((prev) => [...prev, id])
      setSelectedTab(id)
    }
    return id
  }

  const closeTab = async (id: number) => {
    await window.electron.tabs.close(id)
    setTabs((prev) => prev.filter((tabId) => tabId !== id))
  }

  const closeAllTabs = async () => {
    await window.electron.tabs.closeAll()
    setTabs([])
    setSelectedTab(-1)
  }

  const selectTab = async (id: number) => {
    await window.electron.tabs.setSelected(id)
    setSelectedTab(id)
  }

  const reorderTabs = async (ids: number[]) => {
    await window.electron.tabs.reorder(ids)
    setTabs(ids)
  }

  const updateTab = async (path: string, data: { title?: string }) => {
    await window.electron.tabs.update(path, data)
  }

  return {
    tabs,
    selectedTab,
    tabInfos,
    addTab,
    closeTab,
    closeAllTabs,
    selectTab,
    reorderTabs,
    updateTab
  }
} 