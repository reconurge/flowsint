import { useMemo } from "react"
import { CameraIcon, FacebookIcon, InstagramIcon, MessageCircleDashedIcon, SendIcon } from 'lucide-react';

export const usePlatformIcons = (size = "small") => {
    const className = size === "small" ? 'h-3 w-3' : 'h-5 w-5'
    const platformsIcons = useMemo(() => ({
        "facebook": {
            icon: <FacebookIcon className={className} />, color: "indigo"
        },
        "instagram": {
            icon: <InstagramIcon className={className} />, color: "plum"
        },
        "telegram": {
            icon: <SendIcon className={className} />, color: "cyan"
        },
        "signal": {
            icon: <MessageCircleDashedIcon className={className} />, color: "blue"
        },
        "snapchat": {
            icon: <CameraIcon className={className} />, color: "yellow"
        },
    }), [])
    return platformsIcons
}