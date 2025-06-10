"use client"

import { createFileRoute } from "@tanstack/react-router"
import InvestigationsWall from "@/components/walls/investigations-wall"

export const Route = createFileRoute('/_auth/dashboard/investigations/wall')({
    component: InvestigationsWall,
    pendingComponent: () => <div>Loading...</div>,
}) 