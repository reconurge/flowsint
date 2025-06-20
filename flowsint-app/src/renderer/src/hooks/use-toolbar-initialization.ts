import { useBoundStore } from '@/stores/use-bound-store'
import { useEffect, useState } from 'react'

export function useToolbarInitialization() {
  const initTab = useBoundStore((state) => state.tabs.initialize)
  const [isInit, setInit] = useState(false)

  useEffect(() => {
    const init = async () => {
      await initTab()
      setInit(true)
    }
    init()
  }, [])

  return isInit
}
