import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import { initializeMainWindow, getMainWindow } from './main-window'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initializeMainWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for window state
ipcMain.handle('get-window-state', () => {
  const mainWindow = getMainWindow()
  if (!mainWindow) return { isFullscreen: false, isMaximized: false }
  
  return {
    isFullscreen: mainWindow.isFullScreen(),
    isMaximized: mainWindow.isMaximized()
  }
})
