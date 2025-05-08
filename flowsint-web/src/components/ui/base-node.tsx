import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const BaseNode = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-md ring ring-transparent bg-background p-2 flex flex-col items-center justify-between text-card-foreground truncate",
            className,
            selected ? "ring-primary shadow-lg" : "",
            "hover:ring-primary",
        )}
        tabIndex={0}
        {...props}
    />
));

BaseNode.displayName = "BaseNode";


export const BaseNodeSchema = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-md border bg-card p-5 text-card-foreground",
            className,
            selected ? "shadow-lg" : "",
            "hover:ring-1",
        )}
        tabIndex={0}
        {...props}
    />
));

BaseNodeSchema.displayName = "BaseNodeSchema";