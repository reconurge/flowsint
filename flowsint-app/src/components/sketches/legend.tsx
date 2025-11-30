import { memo } from 'react'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { Info } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'

const Legend = () => {
  const getIcon = useNodesDisplaySettings((s) => s.getIcon)
  const colors = useNodesDisplaySettings((s) => s.colors)
  const entries = Object.entries(colors)

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <div>
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
              <Info className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-2">
            <ul className="grid grid-cols-2 items-center gap-1">
              {entries.map(([key, value]) => (
                <li key={key}>
                  <div className="flex items-center gap-2">
                    {/* @ts-ignore */}
                    <span>{getIcon(key)}</span>
                    <span className="capitalize">{key.split('_').join(' ')}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: value }}
                    ></span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(Legend)
