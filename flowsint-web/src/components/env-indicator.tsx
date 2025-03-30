"use client"

import { useEffect, useState } from "react"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"

export default function EnvIndicator() {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])
    if (!isClient) return null
    const isDevelopment = process.env.NODE_ENV === "development"

    return (
        <Badge variant={"outline"}
            className={cn("z-50 px-2 py-1 text-xs font-medium rounded-full", isDevelopment && "bg-primary/60 text-white")}
        >
            {isDevelopment ? "development" : "production"}
        </Badge >
    )
}

