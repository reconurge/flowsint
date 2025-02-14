import { Button } from "@/components/ui/button"

import { GemIcon } from "lucide-react"
import { useChatContext } from "./contexts/chatbot-context"

const Assistant = () => {
    const { handleOpenChat } = useChatContext()
    return (
        <Button onClick={() => handleOpenChat(null)} variant="ghost" size={"icon"} className="h-full w-12 rounded-none"><GemIcon className="h-6 w-6 text-primary" /></Button>
    )
}
export default Assistant