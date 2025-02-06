"use client"

import { useState, useCallback } from "react"
import { IconButton, Tooltip } from "@radix-ui/themes"
import { Copy } from "lucide-react"
import { useTimeout } from "usehooks-ts"

interface CopyButtonProps {
    content: string
    delay?: number
}

export function CopyButton({ content, delay = 2000 }: CopyButtonProps) {
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
        <Tooltip open={isCopied} content="Copied !">
            <IconButton size={"1"} color="gray" radius="large" variant="ghost" onClick={handleCopy} aria-label="Copy content">
                <Copy className="h-3 w-3" />
            </IconButton>
        </Tooltip>
    )
}

