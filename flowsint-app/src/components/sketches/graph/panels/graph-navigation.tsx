import { useGraphStore } from '@/stores/graph-store'
import NodesPanel from './nodes-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus, Users } from 'lucide-react'
import { ItemsPanel } from './items-panel'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useLayoutStore } from '@/stores/layout-store'
import SelectedItemsPanel from './selected-items-panel'

const GraphNavigation = () => {
  const nodes = useGraphStore((s) => s.nodes)
  const activeTab = useLayoutStore((s) => s.activeTab)
  const setActiveTab = useLayoutStore((s) => s.setActiveTab)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const selectedNodesSome = selectedNodes.length > 0
  return (
    <div className="h-full h-10 w-full min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="entities"
        className="w-full h-full gap-0 flex flex-col min-w-0"
      >
        <TabsList className="w-full p-0 rounded-none my-0 border-b">
          <TabsTrigger value="entities">
            <Users className="h-3 w-3 opacity-60" /> Entities
          </TabsTrigger>
          <TabsTrigger value="items">
            <UserPlus className="h-3 w-3 opacity-60" /> Add
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="entities"
          className="grow flex flex-col min-h-0 min-w-0 overflow-hidden"
        >
          <ResizablePanelGroup
            autoSaveId="conditional"
            direction="vertical"
            className="flex-1 min-h-0 flex w-full flex-col"
          >
            {selectedNodesSome && (
              <>
                <ResizablePanel
                  order={2}
                  id="infos"
                  defaultSize={30}
                  className="flex flex-col w-full overflow-hidden min-h-0 min-w-0"
                >
                  <SelectedItemsPanel />
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}
            <ResizablePanel
              order={3}
              id="nodes"
              defaultSize={40}
              className="flex flex-col overflow-hidden min-h-0 min-w-0"
            >
              <NodesPanel nodes={nodes} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>
        <TabsContent value="items" className="my-0 grow h-full overflow-hidden min-h-0">
          <ItemsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GraphNavigation
