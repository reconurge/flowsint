import { is } from '@electron-toolkit/utils'
import { app, BaseWindow } from 'electron'
import icon from '../../resources/icon.png?asset'
import { restoreTabs, saveTabs, showContent } from './tabs'
import { createToolbar } from './toolbar'

let baseWindow: BaseWindow | null = null
/**
 * Initializes the main application window with a splash screen.
 * Creates the window, configures settings, loads toolbar and content,
 * checks for updates, handles authentication, and restores previous window state.
 * Must only be called once during application startup.
 */
export async function initializeMainWindow() {
  baseWindow = new BaseWindow({
    width: 900,
    height: 770,
    show: false,
    autoHideMenuBar: true,
    titleBarOverlay: true,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: {
      x: 9,
      y: 9
    },
    backgroundColor: '#292524',
    ...(process.platform === 'linux' ? { icon } : {})
  })

  // Set the main window, Must be called here before any other functions.
  setupMainWindowEventHandlers()

  const toolbar = await createToolbar()
  const mainContent = await restoreTabs()
  if (mainContent === null || toolbar === null) {
    console.error('Failed to load toolbar or mainContent')
    return
  }

  baseWindow.contentView.addChildView(toolbar!)
  baseWindow.contentView.addChildView(mainContent)

  showContent(mainContent)
  mainContent.webContents.focus()
  showWindow()
}

/**
 * Configures event handlers for window resizing, movement, and application lifecycle events.
 * Handles window state persistence and platform-specific behaviors (Mac/Windows).
 * @param baseWindow - The main application window instance
 */
function setupMainWindowEventHandlers() {
  app.on('activate', () => {
    showWindow()
  })

  app.on('before-quit', () => {
    saveTabs()
  })
}

/**
 * Returns the main application window instance.
 * @returns The main BaseWindow instance or null if not initialized
 */
export function getBaseWindow() {
  return baseWindow
}

/**
 * Shows the main application window.
 * Handles different behavior for development and production environments.
 */
export function showWindow() {
  if (!baseWindow) {
    return
  }

  //? This is to prevent the window from gaining focus everytime we make a change in code.
  if (!is.dev && !process.env['ELECTRON_RENDERER_URL']) {
    baseWindow!.show()
    return
  }

  if (!baseWindow.isVisible()) {
    baseWindow!.show()
  }
}
