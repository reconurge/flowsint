import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
    forwardRef,
    HTMLAttributes,
} from "react";
import { NodeToolbar, NodeProps, NodeToolbarProps } from "@xyflow/react";
import { BaseNode } from "@/components/ui/base-node";

/* TOOLTIP CONTEXT ---------------------------------------------------------- */

const TooltipContext = createContext(false);

/* TOOLTIP NODE ------------------------------------------------------------- */

export type TooltipNodeProps = Partial<NodeProps> & {
    children?: ReactNode;
    className: string;
    selected?: boolean;
};
export const TooltipNode = forwardRef<HTMLDivElement, TooltipNodeProps>(
    ({ selected, children, className }, ref) => {
        const [isTooltipVisible, setTooltipVisible] = useState(false);
        const showTooltip = useCallback(() => setTooltipVisible(true), []);
        const hideTooltip = useCallback(() => setTooltipVisible(false), []);

        return (
            <TooltipContext.Provider value={isTooltipVisible}>
                <BaseNode
                    ref={ref}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                    onFocus={showTooltip}
                    onBlur={hideTooltip}
                    tabIndex={0}
                    selected={selected}
                    className={className}
                >
                    {children}
                </BaseNode>
            </TooltipContext.Provider>
        );
    },
);

TooltipNode.displayName = "TooltipNode";

/* TOOLTIP CONTENT ---------------------------------------------------------- */

export type TooltipContentProps = NodeToolbarProps;

/**
 * A component that displays the tooltip content based on visibility context.
 */
export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps & { selected: boolean }>(
    ({ position, children, selected }, ref) => {
        const isTooltipVisible = useContext(TooltipContext);

        return (
            <div ref={ref}>
                <NodeToolbar
                    isVisible={isTooltipVisible || selected}
                    className="rounded-sm bg-card p-2 shadow-md flex items-center gap-1"
                    tabIndex={1}
                    position={position}
                >
                    {children}
                </NodeToolbar>
            </div>
        );
    },
);

TooltipContent.displayName = "TooltipContent";

/* TOOLTIP TRIGGER ---------------------------------------------------------- */

export type TooltipTriggerProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * A component that triggers the tooltip visibility.
 */
export const TooltipTrigger = forwardRef<
    HTMLParagraphElement,
    TooltipTriggerProps
>(({ children, ...props }, ref) => {
    return (
        <div ref={ref} {...props}>
            {children}
        </div>
    );
});

TooltipTrigger.displayName = "TooltipTrigger";