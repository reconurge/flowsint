import { useBoundStore } from '@/store/useBoundStore'
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
