"use client"

import { useState, useCallback } from "react"
import { Copy } from "lucide-react"
import { useTimeout } from "usehooks-ts"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { Button } from "./ui/button"

interface CopyButtonProps {
    content: string
    delay?: number
    className?: string
}

export function CopyButton({ content, className, delay = 2000 }: CopyButtonProps) {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopy = useCallback((e: { stopPropagation: () => void }) => {
        e.stopPropagation()
        navigator.clipboard.writeText(content).then(() => {
            setIsCopied(true)
        })
    }, [content])

    useTimeout(
        () => {
            if (isCopied) {
                setIsCopied(false)
            }
        },
        isCopied ? delay : null,
    )

    return (
        <Tooltip open={isCopied}>
            <TooltipTrigger asChild>
                <Button className={className} size={"icon"} variant="ghost" onClick={handleCopy} aria-label="Copy content">
                    <Copy className="h-3 w-3 opacity-50" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                Copied !
            </TooltipContent>
        </Tooltip>
    )
}

