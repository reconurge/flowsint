import type React from 'react'
import { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  Background,
  type NodeTypes,
  type Node,
  useReactFlow,
  type NodeMouseHandler,
  type ColorMode,
  MarkerType,
  type EdgeMarker,
  MiniMap
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Play, Pause, SkipForward, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EnricherNode from './enricher-node'
import TypeNode from './type-node'
import { type EnricherNodeData } from '@/types/enricher'
import { FlowControls } from './controls'
import { getFlowDagreLayoutedElements } from '@/lib/utils'
import { toast } from 'sonner'
import { SaveModal } from './save-modal'
import { useConfirm } from '@/components/use-confirm-dialog'
import { useParams, useRouter } from '@tanstack/react-router'
import { flowService } from '@/api/flow-service'
import { useFlowStore, type FlowNode, type FlowEdge } from '@/stores/flow-store'
import type { CSSProperties } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTheme } from '../theme-provider'
import ParamsDialog from './params-dialog'
import FlowSheet from './flow-sheet'
import ContextMenu from './context-menu'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'

const nodeTypes: NodeTypes = {
  enricher: EnricherNode,
  type: TypeNode
}

interface FlowEditorProps {
  theme?: ColorMode
  initialEdges: FlowEdge[]
  initialNodes: FlowNode[]
  flow?: any
}

const defaultEdgeStyle: CSSProperties = { stroke: '#64748b' }
const defaultMarkerEnd: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 15,
  height: 15,
  color: '#64748b'
}

const FlowEditor = memo(({ initialEdges, initialNodes, theme, flow }: FlowEditorProps) => {
  // #### React Flow and UI State ####
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const router = useRouter()
  const { confirm } = useConfirm()
  const { flowId } = useParams({ strict: false })
  const [showModal, setShowModal] = useState(false)
  const hasInitialized = useRef(false)
  const queryClient = useQueryClient()

  // #### Simulation State ####
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms per step
  const [flowBranches, setFlowBranches] = useState<any[]>([])

  // #### Enricher Store State ####
  const nodes = useFlowStore((state) => state.nodes)
  const edges = useFlowStore((state) => state.edges)
  const loading = useFlowStore((state) => state.loading)
  const setNodes = useFlowStore((state) => state.setNodes)
  const setEdges = useFlowStore((state) => state.setEdges)
  const onNodesChange = useFlowStore((state) => state.onNodesChange)
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange)
  const onConnect = useFlowStore((state) => state.onConnect)
  const setSelectedNode = useFlowStore((state) => state.setSelectedNode)
  const setLoading = useFlowStore((state) => state.setLoading)
  const colors = useNodesDisplaySettings((s) => s.colors)

  // #### TanStack Query Mutations ####
  // Create flow mutation
  const createFlowMutation = useMutation({
    mutationFn: flowService.create,
    onSuccess: (data) => {
      toast.success('Enricher saved successfully.')
      router.navigate({ to: `/dashboard/flows/${data.id}` })
    },
    onError: (error) => {
      toast.error(
        'Error creating enricher: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  // Update flow mutation
  const updateFlowMutation = useMutation({
    mutationFn: ({ flowId, body }: { flowId: string; body: BodyInit }) =>
      flowService.update(flowId, body),
    onSuccess: () => {
      toast.success('Enricher saved successfully.')
      // Invalidate the flow detail query
      if (flowId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.flows.detail(flowId)
        })
      }
    },
    onError: (error) => {
      toast.error(
        'Error saving enricher: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  // Delete flow mutation
  const deleteFlowMutation = useMutation({
    mutationFn: flowService.delete,
    onSuccess: () => {
      router.navigate({ to: '/dashboard/flows' })
      toast.success('Flow deleted successfully.')
      // Invalidate flows list
      queryClient.invalidateQueries({
        queryKey: queryKeys.flows.list
      })
    },
    onError: (error) => {
      toast.error(
        'Error deleting flow: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  // Compute flow mutation
  const computeFlowMutation = useMutation({
    mutationFn: ({ flowId, body }: { flowId: string; body: BodyInit }) =>
      flowService.compute(flowId, body),
    onSuccess: (response) => {
      setFlowBranches(response.flowBranches)
      startSimulation()
    },
    onError: (error) => {
      toast.error(
        'Error computing flow: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const [menu, setMenu] = useState<{
    node: FlowNode
    top?: number
    left?: number
    right?: number
    bottom?: number
    rawTop?: number
    rawLeft?: number
    wrapperWidth: number
    wrapperHeight: number
    setMenu: (menu: any | null) => void
  } | null>(null)

  // #### Initialization Effects ####
  // Initialize store with initial data
  useEffect(() => {
    if (!hasInitialized.current && (initialNodes.length > 0 || initialEdges.length > 0)) {
      setNodes(initialNodes)
      setEdges(initialEdges)
      hasInitialized.current = true
    }
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Prevent native context menu from showing
      event.preventDefault()

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      if (!reactFlowWrapper.current) return

      const pane = reactFlowWrapper.current.getBoundingClientRect()
      const relativeX = event.clientX - pane.left
      const relativeY = event.clientY - pane.top

      setMenu({
        node: node as FlowNode,
        rawTop: relativeY,
        rawLeft: relativeX,
        wrapperWidth: pane.width,
        wrapperHeight: pane.height,
        setMenu: setMenu
      })
    },
    [setMenu]
  )

  // Center view on selected node
  // useEffect(() => {
  //     if (selectedNode && reactFlowInstance) {
  //         const nodeWidth = selectedNode.measured?.width ?? 0
  //         const nodeHeight = selectedNode.measured?.height ?? 0
  //         setCenter(
  //             selectedNode.position.x + nodeWidth / 2,
  //             selectedNode.position.y + nodeHeight / 2 + 20,
  //             { duration: 500, zoom: 1.5 }
  //         )
  //     }
  // }, [selectedNode, reactFlowInstance, setCenter])

  // #### Drag and Drop Handlers ####
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    //@ts-ignore
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!reactFlowWrapper.current || !reactFlowInstance) return
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const enricherData = JSON.parse(
        event.dataTransfer.getData('application/json')
      ) as EnricherNodeData & {
        category: string
      }

      if (enricherData.type === 'type') {
        const existsType = nodes.find((node) => node.data.type === 'type')
        if (existsType) {
          return toast.error('Only one type node is allowed')
        }
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      })
      const newNode: FlowNode = {
        id: `${enricherData.name}-${Date.now()}`,
        type: enricherData.type === 'type' ? 'type' : 'enricher',
        position,
        data: {
          id: enricherData.id,
          class_name: enricherData.class_name,
          module: enricherData.module || '',
          key: enricherData.name,
          // @ts-ignore
          color: colors[enricherData.category.toLowerCase()] || '#94a3b8',
          name: enricherData.name,
          category: enricherData.category,
          type: enricherData.type,
          inputs: enricherData.inputs,
          outputs: enricherData.outputs,
          documentation: enricherData.documentation,
          description: enricherData.description,
          required_params: enricherData.required_params,
          params: enricherData.params,
          params_schema: enricherData.params_schema,
          icon: enricherData.icon
        }
      }
      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      const nodeWidth = newNode.measured?.width ?? 0
      const nodeHeight = newNode.measured?.height ?? 0
      setCenter(newNode.position.x + nodeWidth / 2, newNode.position.y + nodeHeight / 2 + 20, {
        duration: 500,
        zoom: 1.5
      })
    },
    [reactFlowInstance, nodes, setNodes, setCenter]
  )

  // #### Node Interaction Handlers ####
  const onNodeClick: NodeMouseHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const typedNode = node as FlowNode
      setSelectedNode(typedNode)
      // const nodeWidth = typedNode.measured?.width ?? 0
      // const nodeHeight = typedNode.measured?.height ?? 0
      // setCenter(typedNode.position.x + nodeWidth / 2, typedNode.position.y + nodeHeight / 2 + 20, {
      //     duration: 500,
      //     zoom: 1.5,
      // })
    },
    [setCenter, setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setMenu(null)
  }, [setSelectedNode, setMenu])

  // #### Layout and Node Management ####
  const onLayout = useCallback(() => {
    // Wait for nodes to be measured before running layout
    setTimeout(() => {
      const layouted = getFlowDagreLayoutedElements(
        nodes.map((node) => ({
          ...node,
          measured: {
            width: node.measured?.width ?? 150,
            height: node.measured?.height ?? 40
          },
          data: {
            ...node.data,
            key: node.data.class_name || node.id
          }
        })),
        edges as FlowEdge[],
        { direction: 'LR' }
      )
      setNodes(layouted.nodes as FlowNode[])
      setEdges(layouted.edges as FlowEdge[])
      window.requestAnimationFrame(() => {
        fitView()
      })
    }, 100)
  }, [nodes, edges, setNodes, setEdges, fitView])

  // #### Enricher CRUD Operations ####
  const saveFlow = useCallback(
    async (name: string, description: string) => {
      setLoading(true)
      try {
        const inputType = nodes.find((node) => node.data.type === 'type')?.data?.class_name
        if (!inputType) {
          toast.error('Make sure your enricher contains an input type.')
          return
        }

        const body = JSON.stringify({
          name: name,
          description: description,
          category: [inputType],
          flow_schema: {
            nodes,
            edges
          }
        })

        if (flowId) {
          await updateFlowMutation.mutateAsync({ flowId, body })
        } else {
          await createFlowMutation.mutateAsync(body)
        }
      } catch (error) {
        console.error('Error saving flow:', error)
      } finally {
        setLoading(false)
        setShowModal(false)
      }
    },
    [nodes, edges, flowId, createFlowMutation, updateFlowMutation, setLoading]
  )

  const handleSaveFlow = useCallback(async () => {
    setShowModal(true)
  }, [setShowModal])

  const handleDeleteFlow = useCallback(async () => {
    if (!flowId) return
    if (
      await confirm({
        title: 'Are you sure you want to delete this flow ?',
        message: "All of the flow's settings will be lost."
      })
    ) {
      setLoading(true)
      await deleteFlowMutation.mutateAsync(flowId)
      setLoading(false)
    }
  }, [flowId, confirm, deleteFlowMutation, setLoading])

  // #### Flow Computation ####
  const handleComputeFlow = useCallback(async () => {
    if (!flowId) {
      toast.error('Save the flow first to compute it.')
      return
    }
    await handleSaveFlow()

    setLoading(true)
    try {
      const body = {
        nodes,
        edges,
        initialValue: 'domain'
      }
      await computeFlowMutation.mutateAsync({ flowId, body: JSON.stringify(body) })
    } catch (error) {
      console.error('Error computing flow:', error)
    } finally {
      setLoading(false)
    }
  }, [flowId, nodes, edges, computeFlowMutation, setLoading])

  // #### Simulation State Management ####
  // Update the updateNodeState function with proper types
  const updateNodeState = useCallback(
    (nds: FlowNode[], nodeId: string, state: 'pending' | 'processing' | 'completed' | 'error') => {
      return nds.map((node) => {
        // focus on node
        if (node.id === nodeId) {
          const nodeWidth = node.measured?.width ?? 0
          const nodeHeight = node.measured?.height ?? 0
          setCenter(node.position.x + nodeWidth / 2, node.position.y + nodeHeight / 2 + 20, {
            duration: 500,
            zoom: 1
          })
          return {
            ...node,
            data: {
              ...node.data,
              computationState: state
            }
          }
        }
        return node
      })
    },
    [setCenter]
  )

  // #### Simulation Effect ####
  useEffect(() => {
    if (!isSimulating || loading) return

    let timer: NodeJS.Timeout

    const totalSteps = flowBranches.reduce((sum, branch) => sum + branch.steps.length, 0)

    if (currentStepIndex < totalSteps) {
      // Find the current branch and step
      let stepFound = false
      let branchIndex = 0
      let stepIndex = 0
      let currentStepCount = 0

      for (let i = 0; i < flowBranches.length; i++) {
        const branch = flowBranches[i]
        if (currentStepCount + branch.steps.length > currentStepIndex) {
          branchIndex = i
          stepIndex = currentStepIndex - currentStepCount
          stepFound = true
          break
        }
        currentStepCount += branch.steps.length
      }

      if (stepFound) {
        const currentStep = flowBranches[branchIndex].steps[stepIndex]

        // Update node states with proper types
        setNodes((nds: FlowNode[]) => updateNodeState(nds, currentStep.nodeId, 'processing'))

        // Update edges with proper types
        setEdges((eds: FlowEdge[]) => {
          return eds.map((edge) => ({
            ...edge,
            style: {
              ...edge.style,
              stroke:
                edge.source === currentStep.nodeId || edge.target === currentStep.nodeId
                  ? '#3b82f6'
                  : '#64748b',
              strokeWidth:
                edge.source === currentStep.nodeId || edge.target === currentStep.nodeId ? 2 : 1
            },
            animated: edge.source === currentStep.nodeId || edge.target === currentStep.nodeId
          }))
        })

        // After delay, mark as completed and move to next step
        timer = setTimeout(() => {
          setNodes((nds: FlowNode[]) => updateNodeState(nds, currentStep.nodeId, 'completed'))
          setCurrentStepIndex((prev) => prev + 1)
        }, simulationSpeed)
      }
    } else {
      // End of simulation
      fitView({ duration: 500 })
      resetSimulation()
    }

    return () => clearTimeout(timer)
  }, [
    isSimulating,
    currentStepIndex,
    simulationSpeed,
    loading,
    flowBranches,
    updateNodeState,
    setCurrentStepIndex
  ])

  // #### Simulation Control Functions ####
  const startSimulation = () => {
    // Reset all nodes to pending state
    setNodes((nds: FlowNode[]) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          computationState: 'pending'
        }
      }))
    )

    // Reset all edges
    setEdges((eds: FlowEdge[]) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: '#64748b',
          strokeWidth: 1
        },
        animated: false
      }))
    )

    setCurrentStepIndex(0)
    setIsSimulating(true)
  }

  const pauseSimulation = () => {
    setIsSimulating(false)
  }

  const skipToEnd = () => {
    setIsSimulating(false)

    // Mark all nodes as completed
    setNodes((nds: FlowNode[]) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          computationState: 'completed'
        }
      }))
    )

    // Reset edge styling
    setEdges((eds: FlowEdge[]) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: '#64748b',
          strokeWidth: 1
        },
        animated: false
      }))
    )

    const totalSteps = flowBranches.reduce((sum, branch) => sum + branch.steps.length, 0)
    setCurrentStepIndex(totalSteps)
  }

  const resetSimulation = () => {
    setIsSimulating(false)
    setCurrentStepIndex(0)

    // Reset all nodes
    setNodes((nds: FlowNode[]) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          computationState: undefined
        }
      }))
    )

    // Reset all edges
    setEdges((eds: FlowEdge[]) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: '#64748b',
          strokeWidth: 1
        },
        animated: false
      }))
    )
  }

  // #### Render ####
  return (
    <>
      <div
        ref={reactFlowWrapper}
        className="w-full h-full bg-background"
        data-tour-id="flow-canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          colorMode={theme}
        >
          {flowId && (
            <Panel
              position="top-right"
              className="space-x-2 mt-14 mr-2 z-50 flex items-center"
              data-tour-id="simulation-controls"
            >
              {isSimulating ? (
                <Button size="sm" variant="outline" className="h-7" onClick={pauseSimulation}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7"
                  onClick={handleComputeFlow}
                  data-tour-id="compute-button"
                >
                  <Play className="h-4 w-4 mr-1" /> Compute
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7" onClick={skipToEnd}>
                <SkipForward className="h-4 w-4 mr-1" /> Skip
              </Button>
              <Button size="sm" variant="outline" className="h-7" onClick={resetSimulation}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Select
                value={String(simulationSpeed)}
                onValueChange={(value) => setSimulationSpeed(Number(value))}
              >
                <SelectTrigger className="!h-7">
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">Slow</SelectItem>
                  <SelectItem value="1000">Normal</SelectItem>
                  <SelectItem value="750">Fast</SelectItem>
                  <SelectItem value="400">Very fast</SelectItem>
                </SelectContent>
              </Select>
            </Panel>
          )}
          <FlowControls
            loading={loading}
            flow={flow}
            handleSaveFlow={handleSaveFlow}
            handleDeleteFlow={handleDeleteFlow}
            onLayout={onLayout}
            fitView={fitView}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            isSaved={Boolean(flowId)}
          />
          <Background bgColor="var(--background)" />
          <ParamsDialog />
          {menu && <ContextMenu {...menu}></ContextMenu>}
          <MiniMap className="bg-background" position="bottom-left" pannable zoomable />
        </ReactFlow>
      </div>
      <FlowSheet onLayout={onLayout} />
      <SaveModal
        open={showModal}
        onOpenChange={setShowModal}
        onSave={saveFlow}
        isLoading={loading}
        initialName={flow?.name}
        initialDescription={flow?.description}
      />
    </>
  )
})

FlowEditorComp.displayName = 'FlowEditorComp'

// #### Main Component ####
function FlowEditorComp({ initialEdges = [], initialNodes = [], flow }: FlowEditorProps) {
  const { theme } = useTheme()

  // Enricher any plain edges into edges with required properties
  const enhancedEdges = initialEdges.map((edge) => ({
    ...edge,
    animated: true,
    style: defaultEdgeStyle,
    markerEnd: defaultMarkerEnd
  })) as FlowEdge[]

  return (
    <ReactFlowProvider>
      <FlowEditor
        flow={flow}
        initialEdges={enhancedEdges}
        initialNodes={initialNodes}
        theme={theme as ColorMode}
      />
    </ReactFlowProvider>
  )
}

export default FlowEditorComp
