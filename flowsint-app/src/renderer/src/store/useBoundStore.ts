import { TabsSlice } from '@renderer/types/tab-slice'
import { merge } from 'lodash'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createTabSlice } from './tab-slice'

type Store = TabsSlice
export const useBoundStore = create(
  persist<Store>(
    (...a) => ({
      ...createTabSlice(...a)
    }),
    {
      name: 'electron-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        //? We need this otherwise action (functions inside the state) will be undefined.
        return merge({}, currentState, persistedState)
      },
      partialize: (state) =>
        ({
          tabs: {}
        }) as Pick<Store, 'tabs'>
    }
  )
)