import { Button } from "@/components/ui/button"

import { GemIcon, ScanIcon } from "lucide-react"
import { useChatContext } from "./contexts/chatbot-context"

const Assistant = () => {
    const { handleOpenChat } = useChatContext()
    return (
        <Button onClick={() => handleOpenChat(null)} variant="ghost" size={"icon"} className="h-full w-12 rounded-none"><ScanIcon strokeWidth={3} className="h-12 w-12 text-primary font-bold" /></Button>
    )
}
export default Assistant