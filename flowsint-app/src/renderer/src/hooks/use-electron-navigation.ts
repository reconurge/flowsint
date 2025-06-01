import { useNavigate } from '@tanstack/react-router'
import { useElectronTabs } from './use-electron-tabs'

export function useElectronNavigation() {
  const navigate = useNavigate()
  const { addTab, selectTab } = useElectronTabs()

  const navigateToTab = async (params: {
    id: string
    type: string
    investigationId: string
    data?: any
    title?: string
  }) => {
    const { id, type, investigationId, data, title } = params
    const path = `/dashboard/investigations/${investigationId}/${type}/${id}`
    
    // Add a new tab with title
    const tabId = await addTab(path, title || `Investigation ${investigationId}`)
    
    if (tabId !== undefined) {
      // Select the tab
      await selectTab(tabId)
      
      // Navigate to the path
      navigate({ to: path })
    }
  }

  return {
    navigateToTab
  }
} 