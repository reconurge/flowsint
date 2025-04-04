import { JSX, useMemo } from "react";
import { actionItems, type ActionItem } from "../action-items"

export const usePlatformIcons = () => {
    return useMemo(() => {
        if (!actionItems[5]?.children)
            return {};
        return actionItems[5].children.reduce((acc: Record<string, { icon: JSX.Element }>, item: ActionItem) => {
            const platform = item.key.split("_")[2];
            acc[platform] = {
                icon: <item.icon style={{ color: item.color }} />,
            };
            return acc;
        }, {} as Record<string, { icon: JSX.Element }>);
    }, []);
};