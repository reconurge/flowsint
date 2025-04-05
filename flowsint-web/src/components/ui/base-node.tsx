import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const BaseNode = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-md border bg-background p-2 flex items-center justify-between text-card-foreground",
            className,
            selected ? "border-primary shadow-lg" : "",
            "hover:border-primary",
        )}
        tabIndex={0}
        {...props}
    />
));

BaseNode.displayName = "BaseNode";