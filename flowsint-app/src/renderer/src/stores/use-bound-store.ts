import { create } from 'zustand'
import type { TabsSlice } from '../types/tabs'
import { createTabSlice } from './tab-slice'

type Store = TabsSlice

export const useBoundStore = create<Store>()((...args) => ({
  ...createTabSlice(...args)
})) 