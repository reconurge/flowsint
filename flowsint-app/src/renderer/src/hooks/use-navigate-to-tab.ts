import { useNavigate } from "@tanstack/react-router";
import { useBoundStore } from "@/stores/use-bound-store";

export interface NavigateToTabOptions {
    id: string;
    type: "graph" | "wall";
    investigationId: string;
    data?: any;
    title?: string;
}

export function useNavigateToTab() {
    const navigate = useNavigate();
    const add = useBoundStore((state) => state.tabs.add);
    const setSelectedTab = useBoundStore((state) => state.tabs.setSelectedTab);
    const tabs = useBoundStore((state) => state.tabs.items);

    const navigateToTab = async ({
        id,
        type,
        investigationId,
        data,
        title,
    }: NavigateToTabOptions) => {
        // Find existing tab
        const existingTab = tabs.find(
            (tab) =>
                tab.id === id &&
                tab.type === type &&
                tab.investigationId === investigationId
        );

        // If tab exists, activate it immediately
        if (existingTab) {
            setSelectedTab(existingTab);
            // Navigate asynchronously
            Promise.resolve().then(() => {
                navigate({
                    to: "/dashboard/investigations/$investigationId/$type/$id",
                    params: {
                        investigationId,
                        type,
                        id,
                    },
                });
            });
            return true;
        }

        // If we have data, create the tab immediately
        if (data) {
            await add({
                id,
                type,
                investigationId,
                data,
                title: title || `${type} ${id}`,
            });

            // Navigate asynchronously
            Promise.resolve().then(() => {
                navigate({
                    to: "/dashboard/investigations/$investigationId/$type/$id",
                    params: {
                        investigationId,
                        type,
                        id,
                    },
                });
            });
            return true;
        }

        // If no data and no existing tab, just navigate asynchronously
        Promise.resolve().then(() => {
            navigate({
                to: "/dashboard/investigations/$investigationId/$type/$id",
                params: {
                    investigationId,
                    type,
                    id,
                },
            });
        });
        return false;
    };

    return { navigateToTab };
} 