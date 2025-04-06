import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const BaseNode = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-md ring ring-transparent bg-background p-2 flex items-center justify-between text-card-foreground truncate",
            className,
            selected ? "ring-primary shadow-lg" : "",
            "hover:ring-primary",
        )}
        tabIndex={0}
        {...props}
    />
));

BaseNode.displayName = "BaseNode";