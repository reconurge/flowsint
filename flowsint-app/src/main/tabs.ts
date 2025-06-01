import { shell, WebContentsView } from 'electron'
import { join } from 'path'
import { getBaseWindow } from './main-window'
import { NavigationRoutes } from './navigation-routes'
import { getSelected, getTabs, setSelected, setTabs } from './tabs-store'
import { getToolbarHeight, resizeToolbar } from './toolbar'
import { getRootUrl } from './url-helpers'

const tabs: WebContentsView[] = []
let selectedTab: WebContentsView | null = null

/**
 * Creates and loads a new tab with the root URL.
 * @returns The ID of the new tab's web contents, or -1 if creation failed
 */
export async function addNewTab() {
  const mainWindow = getBaseWindow()
  if (mainWindow === null) {
    return
  }

  // load new content here
  const newTab = await loadTabContent(NavigationRoutes.root, { bringToFront: true })
  if (newTab === null) return -1
  return newTab.webContents.id
}

/**
 * Creates a new tab and loads the specified path asynchronously.
 * @param path The application route path to load
 * @returns Promise resolving to the WebContentView or null if loading failed
 */
export function loadTabContent(
  path: string,
  { bringToFront = false }: { bringToFront?: boolean } = {}
): Promise<WebContentsView | null> {
  return new Promise((resolve) => {
    const url = getRootUrl() + path
    const baseWindow = getBaseWindow()
    if (baseWindow === null) return resolve(null)
    const newContentView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        partition: 'persist:shared'
      }
    })
    newContentView.webContents.on('did-finish-load', () => {
      // Set CSP to allow connections to localhost:5001
      newContentView.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5001 ws: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
            ]
          }
        })
      })
      
      if (bringToFront) {
        showContent(newContentView)
        saveTabs()
      }
      resolve(newContentView)
    })

    newContentView.webContents.on('did-fail-load', () => {
      resolve(null)
    })

    newContentView.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    tabs.push(newContentView)
    newContentView.webContents.loadURL(url)
  })
}

/**
 * Displays a WebContentView in the main window and sets it as the active tab.
 * @param webContentsView The WebContentView to display
 */
export function showContent(webContentsView: WebContentsView) {
  const baseWindow = getBaseWindow()
  if (!baseWindow) {
    return
  }

  const setWebContentBounds = () => {
    const newBounds = baseWindow.getBounds()
    webContentsView.setBounds({
      x: 0,
      y: getToolbarHeight(),
      width: newBounds.width,
      height: newBounds.height - getToolbarHeight()
    })
  }

  setWebContentBounds()

  baseWindow.removeAllListeners('resize')

  baseWindow.on('resize', () => {
    setWebContentBounds()
    resizeToolbar()
  })

  selectedTab = webContentsView

  baseWindow.contentView.addChildView(webContentsView)
}

/**
 * Closes a specific tab and removes it from the application.
 * @param id The ID of the tab to close
 */
export function closeTab(id: number) {
  const idx = tabs.findIndex((tab) => tab.webContents.id === id)
  if (idx === -1) {
    return
  }
  const baseWindow = getBaseWindow()
  if (baseWindow) {
    baseWindow.contentView.removeChildView(tabs[idx])
  }
  tabs[idx].webContents.close()
  tabs.splice(idx, 1)
  saveTabs()
}

/**
 * Temporarily hides a tab from view without destroying it.
 * @param id The ID of the tab to hide
 */
export function hideTab(id: number) {
  const tab = tabs.find((tab) => tab.webContents.id === id)
  if (tab == null) {
    return
  }
  const baseWindow = getBaseWindow()
  if (baseWindow === null) {
    return
  }
  baseWindow.contentView.removeChildView(tab)
}

/**
 * Closes all open tabs.
 * @param options Optional configuration object
 * @param options.save Whether to save the tabs state before closing (default: true)
 */
export function closeAllTabs({ save = true }: { save?: boolean } = {}) {
  if (save) {
    saveTabs()
  }

  for (const tab of tabs) {
    tab.webContents.close()
  }

  tabs.splice(0, tabs.length)
  if (!save) {
    saveTabs()
  }
}

/**
 * Retrieves a tab by its ID.
 * @param id The ID of the tab to find
 * @returns The WebContentView if found, undefined otherwise
 */
export function getTab(id: number) {
  return tabs.find((tab) => tab.webContents.id === id)
}

/**
 * Gets all currently open tabs.
 * @returns Array of all WebContentsViews
 */
export function getAllTabs(): WebContentsView[] {
  return tabs
}

/**
 * Gets the IDs of all open tabs.
 * @returns Array of tab IDs
 */
export function getAllTabIds(): number[] {
  if (tabs.length === 0) {
    return []
  }
  const ids = tabs.map((tab) => tab.webContents.id)
  return ids
}

/**
 * Gets the currently selected tab.
 * @returns The active WebContentsView or null if none selected
 */
export function getSelectedTab(): WebContentsView | null {
  return selectedTab
}

/**
 * Changes the selected tab.
 * @param id The ID of the tab to select
 */
export function setSelectedTab(id: number) {
  if (selectedTab) {
    if (id === selectedTab.webContents.id) {
      return
    }
  }
  const idx = tabs.findIndex((tab) => tab.webContents.id === id)
  if (idx === -1) {
    return
  }
  showContent(tabs[idx])
  saveSelectedTab({ tabIndex: idx })
}

/**
 * Saves the currently selected tab index to storage.
 * @param options Optional configuration object
 * @param options.tabIndex Specific tab index to save as selected
 */
function saveSelectedTab({ tabIndex = -1 }: { tabIndex?: number } = {}) {
  if (tabIndex !== -1) {
    setSelected(tabIndex)
    return
  }

  if (selectedTab === null) {
    return
  }
  const idx = tabs.findIndex((tab) => {
    if (selectedTab === null) return false
    return tab.webContents.id === selectedTab!.webContents.id
  })
  if (idx === -1) {
    return
  }
  setSelected(idx)
}

/**
 * Gets the ID of the currently selected tab.
 * @returns The ID of the selected tab, or -1 if none selected
 */
export function getSelectedTabId() {
  if (selectedTab === null) return -1
  return selectedTab.webContents.id
}

/**
 * Reorders tabs based on an array of tab IDs.
 * @param ids Array of tab IDs in the desired order
 */
export function reorderTabs(ids: number[]) {
  const newTabs = ids
    .map((id) => tabs.find((tab) => tab.webContents.id === id))
    .filter((tab): tab is WebContentsView => tab !== undefined)
  if (newTabs.length === 0) return
  tabs.splice(0, tabs.length, ...newTabs)
  saveTabs()
  saveSelectedTab()
}

/**
 * Saves the current tabs state to storage.
 */
export function saveTabs() {
  const mainWindow = getBaseWindow()
  if (mainWindow === null) {
    return
  }
  const tabUrls = tabs.map((tab) => {
    const url = tab.webContents.getURL()
    const idx = url.indexOf('#')
    return idx === -1 ? '/' : url.substring(idx + 1)
  })

  setTabs(tabUrls)
}

/**
 * Restores tabs from the previous session.
 * @param options Optional configuration object
 * @param options.restore Whether to restore previous session tabs (default: true)
 * @returns Promise resolving to the selected tab's WebContentsView or null
 */
export async function restoreTabs({
  restore = true
}: {
  restore?: boolean
} = {}): Promise<WebContentsView | null> {
  if (!restore) {
    return loadTabContent(NavigationRoutes.root)
  }

  let lastSessionTabs = getTabs()
  let selectedTabIndex = getSelected()

  if (lastSessionTabs !== null && lastSessionTabs.length > 0) {
    if (selectedTabIndex < 0 || selectedTabIndex >= lastSessionTabs.length) {
      selectedTabIndex = 0
    }

    for (let i = 0; i < lastSessionTabs.length; i++) {
      if (i === selectedTabIndex) {
        selectedTab = await loadTabContent(lastSessionTabs[i])
        continue
      }
      loadTabContent(lastSessionTabs[i])
    }
  }

  if (selectedTab === null) {
    selectedTab = await loadTabContent(NavigationRoutes.root)
  }

  return selectedTab
}
