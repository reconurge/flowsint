import { useCallback } from 'react'
import { useGraphStore } from '@/stores/graph-store'
// import { useCreateOnPaste } from './use-create-on-paste'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

export const useKeyboardEvents = (sketchId: string) => {
  const setSelectedNodes = useGraphStore((s) => s.setSelectedNodes)
  const filteredNodes = useGraphStore((s) => s.filteredNodes)

  const handleCheckAll = useCallback(() => {
    setSelectedNodes(filteredNodes)
  }, [filteredNodes, setSelectedNodes])

  // useCreateOnPaste(sketchId)
  useKeyboardShortcut({
    key: 'a',
    ctrlOrCmd: true,
    callback: handleCheckAll
  })
}
