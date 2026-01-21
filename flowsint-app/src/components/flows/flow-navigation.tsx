import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus, Users } from 'lucide-react'
import RawMaterial from './raw-material'
import EnrichersList from './flow-list'
import { useLayoutStore } from '@/stores/layout-store'
import { useParams } from '@tanstack/react-router'
import { useEffect } from 'react'

const FlowNavigation = () => {
  const { flowId } = useParams({ strict: false })
  const activeEnricherTab = useLayoutStore((s) => s.activeEnricherTab)
  const setActiveEnricherTab = useLayoutStore((s) => s.setActiveEnricherTab)

  useEffect(() => {
    setActiveEnricherTab(flowId ? 'items' : 'flows')
  }, [setActiveEnricherTab, flowId])

  return (
    <div className="h-full w-full bg-card flex flex-col min-h-0" data-tour-id="flow-sidebar">
      <Tabs
        value={activeEnricherTab}
        onValueChange={setActiveEnricherTab}
        defaultValue="flows"
        className="w-full h-full flex flex-col gap-0 min-h-0"
      >
        <TabsList className="w-full p-0 rounded-none my-0 border-b shrink-0">
          <TabsTrigger value="flows">
            <Users className="h-3 w-3 opacity-60" /> Flows
          </TabsTrigger>
          {flowId && (
            <TabsTrigger value="items">
              <UserPlus className="h-3 w-3 opacity-60" /> Items
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent
          value="flows"
          className="my-0 w-full flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <EnrichersList />
        </TabsContent>
        {flowId && (
          <TabsContent
            value="items"
            className="my-0 w-full flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <RawMaterial />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default FlowNavigation
