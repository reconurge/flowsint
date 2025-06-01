import * as React from "react";
import { Link } from "@tanstack/react-router";
import type { NavigateToTabOptions } from "@/hooks/use-navigate-to-tab";

interface TabLinkProps {
    id: string;
    type: "graph" | "wall";
    investigationId: string;
    children: ({ isActive }: { isActive: boolean }) => React.ReactNode;
    onNavigate: (options: NavigateToTabOptions) => void;
    preload?: boolean;
}

export const TabLink: React.FC<TabLinkProps> = ({
    id,
    type,
    investigationId,
    children,
    onNavigate,
    preload = false,
}) => (
    <Link
        to="/dashboard/investigations/$investigationId/$type/$id"
        params={{
            investigationId,
            type,
            id,
        }}
        preload={preload ? "intent" : false}
        onClick={(e) => {
            e.preventDefault();
            onNavigate({ id, type, investigationId });
        }}
    >
        {({ isActive }) => children({ isActive })}
    </Link>
); 