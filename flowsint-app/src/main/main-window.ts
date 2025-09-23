import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import icon from '../../resources/icon.png?asset'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

/**
 * Initializes the main application window.
 * Creates the window and loads the renderer content.
 * Must only be called once during application startup.
 */
export async function initializeMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    icon: join(__dirname, 'icon.png'),
    title: 'Flowsint',
    height: 770,
    show: false,
    autoHideMenuBar: true,
    titleBarOverlay: {
      color: '#292524',
      symbolColor: '#ffffff',
      height: 48
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: {
      x: 12,
      y: 14
    },
    backgroundColor: '#292524',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      partition: 'persist:shared'
    },
    ...(process.platform === 'linux' ? { icon } : {})
  })

  // Set up event handlers
  setupMainWindowEventHandlers()

  // Load the renderer content
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Set CSP to allow connections to localhost:5001
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:5001 ws: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
        ]
      }
    })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    require('electron').shell.openExternal(details.url)
    return { action: 'deny' }
  })

  showWindow()
}

/**
 * Configures event handlers for window resizing, movement, and application lifecycle events.
 * Handles window state persistence and platform-specific behaviors (Mac/Windows).
 */
function setupMainWindowEventHandlers() {
  app.on('activate', () => {
    showWindow()
  })
}

/**
 * Returns the main application window instance.
 * @returns The main BrowserWindow instance or null if not initialized
 */
export function getMainWindow() {
  return mainWindow
}

/**
 * Shows the main application window.
 * Handles different behavior for development and production environments.
 */
export function showWindow() {
  if (!mainWindow) {
    return
  }

  //? This is to prevent the window from gaining focus everytime we make a change in code.
  if (!is.dev && !process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.show()
    return
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }
}
