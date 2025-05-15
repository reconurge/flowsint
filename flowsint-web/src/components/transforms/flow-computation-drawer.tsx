"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipForward, RefreshCw, ChevronRight, GitBranch } from "lucide-react"
import type { Edge, Node } from "@xyflow/react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { CopyButton } from "../copy"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import Loader from "../loader"
import { CopyButton } from "../copy"

interface FlowComputationDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    nodes: Node[]
    edges: Edge[]
    inputType: string | null
    transformId: string
}

interface FlowStep {
    nodeId: string
    inputs: Record<string, any>
    outputs: Record<string, any>
    status: "pending" | "processing" | "completed" | "error"
    branchId: string
    depth: number
}

interface FlowBranch {
    id: string
    name: string
    steps: FlowStep[]
}

export function FlowComputationDrawer({
    open,
    onOpenChange,
    nodes,
    edges,
    inputType,
    transformId,
}: FlowComputationDrawerProps) {
    const [transformBranches, setTransformsBranches] = useState<FlowBranch[]>([])
    const [isSimulating, setIsSimulating] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms per step
    const [progress, setProgress] = useState(0)
    const [initialData, setInitialData] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("all")

    // Use refs to avoid dependency issues in useEffect
    const transformBranchesRef = useRef<FlowBranch[]>([])
    const currentStepIndexRef = useRef<number>(0)
    const isSimulatingRef = useRef<boolean>(false)

    const { isLoading } = useQuery({
        queryKey: ["transforms", transformId, "compute"],
        queryFn: async () => {
            const body = JSON.stringify({ nodes, edges, initialValue: "domain" })
            const url = `${process.env.NEXT_PUBLIC_FLOWSINT_API}/transforms/${transformId}/compute`
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: body,
            })
            if (!res.ok) {
                toast.error("An error occured.")
            }
            const data = await res.json()
            console.log(data)
            setTransformsBranches(data.transformBranches as FlowBranch[])
            setInitialData(data.initialData)
            return data
        },
        enabled: open,
        refetchOnWindowFocus: true,
    })

    // Update refs when state changes
    useEffect(() => {
        if (isLoading) return
        transformBranchesRef.current = transformBranches
        currentStepIndexRef.current = currentStepIndex
        isSimulatingRef.current = isSimulating
    }, [transformBranches, currentStepIndex, isSimulating, isLoading])

    // Reset simulation when drawer closes
    useEffect(() => {
        if (!open) {
            setIsSimulating(false)
            setCurrentStepIndex(0)
            setProgress(0)
        }
    }, [open])

    // Simulation effect - separated from render cycle
    useEffect(() => {
        if (!isSimulating || isLoading) return

        let timer: NodeJS.Timeout

        const totalSteps = getTotalSteps(transformBranchesRef.current)
        const currentIndex = currentStepIndexRef.current

        if (currentIndex < totalSteps) {
            // Find the current branch and step
            let stepFound = false
            let branchIndex = 0
            let stepIndex = 0
            let currentStepCount = 0

            for (let i = 0; i < transformBranchesRef.current.length; i++) {
                const branch = transformBranchesRef.current[i]
                if (currentStepCount + branch.steps.length > currentIndex) {
                    branchIndex = i
                    stepIndex = currentIndex - currentStepCount
                    stepFound = true
                    break
                }
                currentStepCount += branch.steps.length
            }

            if (stepFound) {
                // Update current step to processing
                setTransformsBranches((prev) => {
                    const newBranches = [...prev]
                    if (newBranches[branchIndex] && newBranches[branchIndex].steps[stepIndex]) {
                        newBranches[branchIndex].steps[stepIndex].status = "processing"
                    }
                    return newBranches
                })

                // Set progress
                setProgress(Math.round((currentIndex / totalSteps) * 100))

                // After delay, mark as completed and move to next step
                timer = setTimeout(() => {
                    setTransformsBranches((prev) => {
                        const newBranches = [...prev]
                        if (newBranches[branchIndex] && newBranches[branchIndex].steps[stepIndex]) {
                            newBranches[branchIndex].steps[stepIndex].status = "completed"
                        }
                        return newBranches
                    })

                    setCurrentStepIndex((prev) => prev + 1)
                }, simulationSpeed)
            }
        } else {
            // End of simulation
            setIsSimulating(false)
            setProgress(100)
        }

        return () => clearTimeout(timer)
    }, [isSimulating, currentStepIndex, simulationSpeed, isLoading])

    const startSimulation = () => {
        setIsSimulating(true)
        setCurrentStepIndex(0)
        setProgress(0)

        // Reset all steps to pending
        setTransformsBranches((prev) =>
            prev.map((branch) => ({
                ...branch,
                steps: branch.steps.map((step) => ({ ...step, status: "pending" })),
            })),
        )
    }

    const pauseSimulation = () => {
        setIsSimulating(false)
    }

    const skipToEnd = () => {
        setIsSimulating(false)
        setProgress(100)

        // Mark all steps as completed
        setTransformsBranches((prev) =>
            prev.map((branch) => ({
                ...branch,
                steps: branch.steps.map((step) => ({ ...step, status: "completed" })),
            })),
        )

        // Set current step to the end
        const totalSteps = getTotalSteps(transformBranches)
        setCurrentStepIndex(totalSteps)
    }

    const resetSimulation = () => {
        setIsSimulating(false)
        setCurrentStepIndex(0)
        setProgress(0)

        // Reset all steps to pending
        setTransformsBranches((prev) =>
            prev.map((branch) => ({
                ...branch,
                steps: branch.steps.map((step) => ({ ...step, status: "pending" })),
            })),
        )
    }

    const getNodeById = (id: string) => {
        return nodes.find((node) => node.id === id)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-gray-200 text-gray-700"
            case "processing":
                return "bg-blue-100 text-blue-700"
            case "completed":
                return "bg-green-100 text-green-700"
            case "error":
                return "bg-red-100 text-red-700"
            default:
                return "bg-gray-200 text-gray-700"
        }
    }

    const formatValue = (value: any): string => {
        if (value === undefined || value === null) return "null"
        if (typeof value === "object") return JSON.stringify(value)
        return String(value)
    }

    // Get all steps from all branches in a flat array
    const getAllSteps = () => {
        return transformBranches
            ? transformBranches
                .flatMap((branch) => branch.steps.map((step) => ({ ...step, branchName: branch.name })))
                .sort((a, b) => a.depth - b.depth)
            : []
    }

    // Calculate total steps for progress - extracted as pure function
    const getTotalSteps = (branches: FlowBranch[]) => {
        return branches ? branches.reduce((sum, branch) => sum + branch.steps.length, 0) : 0
    }

    // Find if a step is the current step in simulation
    const isCurrentStep = (branchId: string, stepIndex: number) => {
        if (!isSimulating) return false

        let currentCount = 0
        for (const branch of transformBranches) {
            if (branch.id === branchId) {
                return currentCount + stepIndex === currentStepIndex
            }
            currentCount += branch.steps.length
        }
        return false
    }

    // Generate a human-readable explanation of the flow
    const generateFlowExplanation = () => {
        if (!transformBranches || transformBranches.length === 0) return null

        let explanation = ""

        // For each branch, describe the flow
        transformBranches.forEach((branch, branchIndex) => {
            if (branchIndex > 0) explanation += "\n\n"

            explanation += `Branch "${branch.name}":\n`

            branch.steps.forEach((step, stepIndex) => {
                const node = getNodeById(step.nodeId)
                const nodeName = node?.data.name || node?.data.class_name || step.nodeId

                if (stepIndex === 0) {
                    // First step in branch
                    explanation += `The flow starts with "${nodeName}"`
                    if (node?.data.type === "input") {
                        explanation += ` which takes the initial input of type "${inputType}"`
                    }
                    explanation += "."
                } else {
                    // Subsequent steps
                    const prevStep = branch.steps[stepIndex - 1]
                    const prevNode = getNodeById(prevStep.nodeId)
                    const prevNodeName = prevNode?.data.name || prevNode?.data.class_name || prevStep.nodeId

                    explanation += `\nThen, the output from "${prevNodeName}" is used as input for "${nodeName}"`

                    // Add details about the transformation if available
                    if (node?.data.doc) {
                        // @ts-ignore
                        explanation += `, which ${node.data?.doc?.toLowerCase()}`
                    }
                    explanation += "."
                }
            })
        })
        const result = explanation.replace('..', ".")
        return result
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full !max-w-3xl p-0 flex flex-col">
                <SheetHeader className="p-6 pb-2">
                    <SheetTitle>Flow Computation</SheetTitle>
                    <SheetDescription>Visualize how data flows through your transform pipeline.</SheetDescription>
                </SheetHeader>
                {isLoading ? (
                    <>
                        <Loader label="Loading pipeline..." />
                    </>
                ) : (
                    <>
                        <div className="px-6 py-2">
                            {inputType && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="bg-purple-100 text-purple-700">
                                            Input Type: {inputType}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            Sample value: <code className="bg-muted px-1 py-0.5 rounded">{formatValue(initialData)}</code>
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Progress value={progress} className="h-2" />

                            <div className="flex items-center justify-between mt-4 mb-2">
                                <div className="flex space-x-2">
                                    {isSimulating ? (
                                        <Button size="sm" variant="outline" onClick={pauseSimulation}>
                                            <Pause className="h-4 w-4 mr-1" /> Pause
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="default" onClick={startSimulation}>
                                            <Play className="h-4 w-4 mr-1" /> Simulate
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={skipToEnd}>
                                        <SkipForward className="h-4 w-4 mr-1" /> Skip
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={resetSimulation}>
                                        <RefreshCw className="h-4 w-4 mr-1" /> Reset
                                    </Button>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">Speed:</span>
                                    <select
                                        className="text-sm border rounded p-1"
                                        value={simulationSpeed}
                                        onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                                    >
                                        <option value="2000">Slow</option>
                                        <option value="1000">Normal</option>
                                        <option value="500">Fast</option>
                                        <option value="100">Very Fast</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {transformBranches?.length > 0 && (
                            <div className="px-6 pt-4">
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="w-full mb-4 overflow-x-auto w-full">
                                        <TabsTrigger value="all" className="flex items-center">
                                            All Flows
                                        </TabsTrigger>
                                        {transformBranches.map((branch) => (
                                            <TabsTrigger key={branch.id} value={branch.id} className="flex items-center">
                                                <GitBranch className="h-3 w-3 mr-1" />
                                                {branch.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                        )}

                        <div className="px-6 py-3">
                            <Collapsible className="w-full">
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
                                    <span className="text-sm font-medium">Flow Explanation</span>
                                    <ChevronRight className="h-4 w-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Card className="relative !p-0 mt-2">
                                        {generateFlowExplanation() && (
                                            <div className="mt-3 absolute top-0 right-2 flex justify-end">
                                                <CopyButton content={generateFlowExplanation() || ""} />
                                            </div>
                                        )}
                                        <CardContent className="p-4 max-h-[200px] overflow-y-auto">
                                            <div className="text-sm whitespace-pre-line">
                                                {generateFlowExplanation() || "No flow explanation available."}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <div className="flex-1 grow overflow-y-auto p-6 pt-3 border-t">
                            {!inputType ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No input type detected. Make sure your flow has an input node with a defined output type.
                                </div>
                            ) : !transformBranches || transformBranches.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No data flow found. Make sure your flow has at least one input node connected to other nodes.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeTab === "all"
                                        ? getAllSteps().map((step, index) => {
                                            const node = getNodeById(step.nodeId)
                                            const isInputNode = node?.data.type === "input"

                                            return (
                                                <Card
                                                    key={`${step.branchId}-${step.nodeId}-${index}`}
                                                    className={`overflow-hidden ${isCurrentStep(step.branchId, index) ? "border-blue-500 shadow-sm" : ""
                                                        }`}
                                                >
                                                    <CardContent className="p-0">
                                                        <div className="p-4 bg-muted/30 flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium flex items-center">
                                                                    <>{node?.data.name || node?.data.class_name || step.nodeId}</>
                                                                    {isInputNode && <Badge className="ml-2 bg-purple-100 text-purple-700">Input</Badge>}
                                                                    <Badge className="ml-2" variant="outline">
                                                                        {step.branchName}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-sm text-muted-foreground mt-1">
                                                                    <>{node?.data.doc || (isInputNode ? "Data source" : "Transformation node")}</>
                                                                </div>
                                                            </div>
                                                            <Badge className={getStatusColor(step.status)}>{step.status}</Badge>
                                                        </div>

                                                        <Collapsible className="w-full">
                                                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50">
                                                                <span className="text-sm font-medium">Data Flow Details</span>
                                                                <ChevronRight className="h-4 w-4" />
                                                            </CollapsibleTrigger>
                                                            <CollapsibleContent>
                                                                <div className="p-4 space-y-4 text-sm">
                                                                    {!isInputNode && Object.keys(step.inputs).length > 0 && (
                                                                        <div>
                                                                            <h4 className="font-medium mb-2">Inputs:</h4>
                                                                            <div className="bg-muted/30 p-2 rounded-md">
                                                                                {Object.entries(step.inputs).map(([key, value]) => (
                                                                                    <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                                                                                        <span className="font-mono text-xs">{key}:</span>
                                                                                        <span className="font-mono text-xs overflow-hidden text-ellipsis">
                                                                                            {formatValue(value)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div>
                                                                        <h4 className="font-medium mb-2">Outputs:</h4>
                                                                        <div className="bg-muted/30 p-2 rounded-md">
                                                                            {Object.entries(step.outputs).map(([key, value]) => (
                                                                                <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                                                                                    <span className="font-mono text-xs">{key}:</span>
                                                                                    <span className="font-mono text-xs overflow-hidden text-ellipsis">
                                                                                        {formatValue(value)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })
                                        : transformBranches
                                            .find((branch) => branch.id === activeTab)
                                            ?.steps.map((step, index) => {
                                                const node = getNodeById(step.nodeId)
                                                const isInputNode = node?.data.type === "input"

                                                return (
                                                    <Card
                                                        key={`${step.nodeId}-${index}`}
                                                        className={`overflow-hidden ${isCurrentStep(step.branchId, index) ? "border-blue-500 shadow-sm" : ""
                                                            }`}
                                                    >
                                                        <CardContent className="p-0">
                                                            <div className="p-4 bg-muted/30 flex justify-between items-center">
                                                                <div>
                                                                    <div className="font-medium flex items-center">
                                                                        <>{node?.data.name || node?.data.class_name || step.nodeId}</>
                                                                        {isInputNode && (
                                                                            <Badge className="ml-2 bg-purple-100 text-purple-700">Input</Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground mt-1">
                                                                        <>{node?.data.doc || (isInputNode ? "Data source" : "Transformation node")}</>
                                                                    </div>
                                                                </div>
                                                                <Badge className={getStatusColor(step.status)}>{step.status}</Badge>
                                                            </div>

                                                            <Collapsible className="w-full">
                                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50">
                                                                    <span className="text-sm font-medium">Data Flow Details</span>
                                                                    <ChevronRight className="h-4 w-4" />
                                                                </CollapsibleTrigger>
                                                                <CollapsibleContent>
                                                                    <div className="p-4 space-y-4 text-sm">
                                                                        {!isInputNode && Object.keys(step.inputs).length > 0 && (
                                                                            <div>
                                                                                <h4 className="font-medium mb-2">Inputs:</h4>
                                                                                <div className="bg-muted/30 p-2 rounded-md">
                                                                                    {Object.entries(step.inputs).map(([key, value]) => (
                                                                                        <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                                                                                            <span className="font-mono text-xs">{key}:</span>
                                                                                            <span className="font-mono text-xs overflow-hidden text-ellipsis">
                                                                                                {formatValue(value)}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div>
                                                                            <h4 className="font-medium mb-2">Outputs:</h4>
                                                                            <div className="bg-muted/30 p-2 rounded-md">
                                                                                {Object.entries(step.outputs).map(([key, value]) => (
                                                                                    <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                                                                                        <span className="font-mono text-xs">{key}:</span>
                                                                                        <span className="font-mono text-xs overflow-hidden text-ellipsis">
                                                                                            {formatValue(value)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CollapsibleContent>
                                                            </Collapsible>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })}
                                </div>
                            )}
                        </div>
                        {/* <div className="grow overflow-auto">
                            <pre>
                                <code>
                                    <CopyButton content={JSON.stringify(transformBranches, null, 2)} />
                                    {JSON.stringify(transformBranches, null, 2)}
                                </code>
                            </pre>
                        </div> */}
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
