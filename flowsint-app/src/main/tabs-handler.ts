import { ipcMain } from 'electron'
import {
  addNewTab,
  closeTab,
  getAllTabIds,
  getSelectedTabId,
  reorderTabs,
  setSelectedTab
} from './tabs'
export const initTabsIpcHandlers = () => {
  ipcMain.handle('tabs:new', () => addNewTab())
  ipcMain.handle('tabs:select', (_, id: number) => setSelectedTab(id))
  ipcMain.handle('tabs:getAllTabIds', () => getAllTabIds())
  ipcMain.handle('tabs:getSelectedTabId', () => getSelectedTabId())
  ipcMain.handle('tabs:close', (_, id: number) => closeTab(id))
  ipcMain.handle('tabs:reorder', (_, tabIds: number[]) => reorderTabs(tabIds))
}
