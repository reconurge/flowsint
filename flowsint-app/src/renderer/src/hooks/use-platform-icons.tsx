import { type JSX, useMemo } from "react";
import { type ActionItem } from "@/lib/action-items"
import { useIcon } from "@/hooks/use-icon"
import { useActionItems } from "./use-action-items"

export const usePlatformIcons = () => {
    const { actionItems } = useActionItems()
    
    return useMemo(() => {
        if (!actionItems) return {}
        
        const socials = actionItems.find((item) => item.type === "Socials")?.children
        if (!socials)
            return {};
        return socials.reduce((acc: Record<string, { icon: JSX.Element, color: string }>, item: ActionItem) => {
            const platform = item.key.split("_")[2];
            const IconComponent = useIcon(item.icon);
            acc[platform] = {
                icon: <IconComponent style={{ color: item.color }} />,
                color: item.color ?? "lightgray",
            };
            return acc;
        }, {} as Record<string, { icon: JSX.Element, color: string }>);
    }, [actionItems]);
};

