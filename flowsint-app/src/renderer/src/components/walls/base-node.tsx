import { forwardRef, useCallback, HTMLAttributes, ReactNode, memo } from "react";
import { useNodeId, useReactFlow, NodeProps } from "@xyflow/react";
import { EllipsisVertical, Trash, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { BaseNode } from "@/components/ui/base-node";
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Rocket } from "lucide-react";

/* NODE HEADER -------------------------------------------------------------- */

export type NodeHeaderProps = HTMLAttributes<HTMLElement>;

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const NodeHeader = forwardRef<HTMLElement, NodeHeaderProps>(
    ({ className, ...props }, ref) => {
        return (
            <header
                ref={ref}
                {...props}
                className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2",
                    // Remove or modify these classes if you modify the padding in the
                    // `<BaseNode />` component.
                    className,
                )}
            />
        );
    },
);

NodeHeader.displayName = "NodeHeader";

/* NODE HEADER TITLE -------------------------------------------------------- */

export type NodeHeaderTitleProps = HTMLAttributes<HTMLHeadingElement> & {
    asChild?: boolean;
};

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const NodeHeaderTitle = forwardRef<
    HTMLHeadingElement,
    NodeHeaderTitleProps
>(({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "h3";

    return (
        <Comp
            ref={ref}
            {...props}
            className={cn(className, "user-select-none flex-1 font-semibold")}
        />
    );
});

NodeHeaderTitle.displayName = "NodeHeaderTitle";

/* NODE HEADER ICON --------------------------------------------------------- */

export type NodeHeaderIconProps = HTMLAttributes<HTMLSpanElement>;

export const NodeHeaderIcon = forwardRef<HTMLSpanElement, NodeHeaderIconProps>(
    ({ className, ...props }, ref) => {
        return (
            <span ref={ref} {...props} className={cn(className, "[&>*]:size-5")} />
        );
    },
);

NodeHeaderIcon.displayName = "NodeHeaderIcon";

/* NODE HEADER ACTIONS ------------------------------------------------------ */

export type NodeHeaderActionsProps = HTMLAttributes<HTMLDivElement>;

/**
 * A container for right-aligned action buttons in the node header.
 */
export const NodeHeaderActions = forwardRef<
    HTMLDivElement,
    NodeHeaderActionsProps
>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            {...props}
            className={cn(
                "ml-auto flex items-center gap-1 justify-self-end",
                className,
            )}
        />
    );
});

NodeHeaderActions.displayName = "NodeHeaderActions";

/* NODE HEADER ACTION ------------------------------------------------------- */

export type NodeHeaderActionProps = any & {
    label: string;
};

/**
 * A thin wrapper around the `<Button />` component with a fixed sized suitable
 * for icons.
 *
 * Because the `<NodeHeaderAction />` component is intended to render icons, it's
 * important to provide a meaningful and accessible `label` prop that describes
 * the action.
 */
export const NodeHeaderAction = forwardRef<
    HTMLButtonElement,
    NodeHeaderActionProps
>(({ className, label, title, ...props }, ref) => {
    return (
        <Button
            ref={ref}
            variant="ghost"
            aria-label={label}
            title={title ?? label}
            className={cn(className, "nodrag size-6 p-1")}
            {...props}
        />
    );
});

NodeHeaderAction.displayName = "NodeHeaderAction";

//

export type NodeHeaderMenuActionProps = Omit<
    NodeHeaderActionProps,
    "onClick"
> & {
    trigger?: ReactNode;
};

/**
 * Renders a header action that opens a dropdown menu when clicked. The dropdown
 * trigger is a button with an ellipsis icon. The trigger's content can be changed
 * by using the `trigger` prop.
 *
 * Any children passed to the `<NodeHeaderMenuAction />` component will be rendered
 * inside the dropdown menu. You can read the docs for the shadcn dropdown menu
 * here: https://ui.shadcn.com/docs/components/dropdown-menu
 *
 */
export const NodeHeaderMenuAction = forwardRef<
    HTMLButtonElement,
    NodeHeaderMenuActionProps
>(({ trigger, children, ...props }, ref) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                <NodeHeaderAction ref={ref} {...props}>
                    {trigger ?? <EllipsisVertical />}
                </NodeHeaderAction>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>{children}</DropdownMenuContent>
        </DropdownMenu>
    );
});

NodeHeaderMenuAction.displayName = "NodeHeaderMenuAction";

/* NODE HEADER DELETE ACTION --------------------------------------- */

export const NodeHeaderDeleteAction = () => {
    const id = useNodeId();
    const { setNodes } = useReactFlow();

    const handleClick = useCallback(() => {
        setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
    }, [id, setNodes]);

    return (
        <NodeHeaderAction onClick={handleClick} variant="ghost" label="Delete node">
            <Trash />
        </NodeHeaderAction>
    );
};

NodeHeaderDeleteAction.displayName = "NodeHeaderDeleteAction";

/* ANNOTATION NODE -----------------------------------------------------------
   A container for an annotation node.
*/
 
export type AnnotationNodeProps = HTMLAttributes<HTMLDivElement>;
 
export const AnnotationNode = forwardRef<HTMLDivElement, AnnotationNodeProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "relative flex max-w-[180px] items-start p-2 text-sm text-secondary-foreground",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
 
AnnotationNode.displayName = "AnnotationNode";
 
/* ANNOTATION NODE NUMBER -----------------------------------------------------
   Renders the annotation node number.
*/
 
export type AnnotationNodeNumberProps = HTMLAttributes<HTMLDivElement>;
 
export const AnnotationNodeNumber = forwardRef<
  HTMLDivElement,
  AnnotationNodeNumberProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} {...props} className={cn("mr-1 leading-snug", className)}>
      {children}
    </div>
  );
});
 
AnnotationNodeNumber.displayName = "AnnotationNodeNumber";
 
/* ANNOTATION NODE CONTENT ----------------------------------------------------
   Renders the main content of the annotation node.
*/
 
export type AnnotationNodeContentProps = HTMLAttributes<HTMLDivElement>;
 
export const AnnotationNodeContent = forwardRef<
  HTMLDivElement,
  AnnotationNodeContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} {...props} className={cn("leading-snug", className)}>
      {children}
    </div>
  );
});
 
AnnotationNodeContent.displayName = "AnnotationNodeContent";
 
/* ANNOTATION NODE ICON -------------------------------------------------------
   Renders the icon for the annotation node.
*/
 
export type AnnotationNodeIconProps = HTMLAttributes<HTMLDivElement>;
 
export const AnnotationNodeIcon = forwardRef<
  HTMLDivElement,
  AnnotationNodeIconProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className={cn("absolute bottom-0 right-2 text-2xl", className)}
    >
      {children}
    </div>
  );
});
 
AnnotationNodeIcon.displayName = "AnnotationNodeIcon";

interface AnnotationNodeData {
    type: 'annotation';
    number?: string | number;
    content: ReactNode;
    icon?: ReactNode;
}

interface BaseNodeData {
    type?: string;
    title?: string;
    content?: ReactNode;
}

type CustomNodeData = AnnotationNodeData | BaseNodeData;

const isAnnotationNode = (data: CustomNodeData): data is AnnotationNodeData => {
    return data.type === 'annotation';
};

const CustomNode = memo(({ selected, data }: NodeProps) => {
    const { setNodes, getNodes } = useReactFlow();
    const nodeId = useNodeId();

    const handleAddAnnotation = useCallback(() => {
        const nodes = getNodes();
        const currentNode = nodes.find(n => n.id === nodeId);
        if (!currentNode) return;

        const annotationId = `annotation-${Date.now()}`;
        const annotationNode = {
            id: annotationId,
            type: 'custom',
            position: {
                x: currentNode.position.x + 200,
                y: currentNode.position.y
            },
            data: {
                type: 'annotation',
                content: 'New annotation',
                number: nodes.filter(n => n.data?.type === 'annotation').length + 1
            }
        };

        setNodes(nodes => [...nodes, annotationNode]);
    }, [nodeId, getNodes, setNodes]);

    if (!data) return null;
    
    const customData = data as CustomNodeData;
    
    if (isAnnotationNode(customData)) {
        return (
            <AnnotationNode>
                {customData.number && <AnnotationNodeNumber>{customData.number}</AnnotationNodeNumber>}
                <AnnotationNodeContent>{customData.content}</AnnotationNodeContent>
                {customData.icon && <AnnotationNodeIcon>{customData.icon}</AnnotationNodeIcon>}
            </AnnotationNode>
        );
    }

    return (
        <BaseNode selected={selected} className="px-3 py-2 border">
            <NodeHeader className="-mx-3 -mt-2 border-b">
                <NodeHeaderIcon>
                    <Rocket />
                </NodeHeaderIcon>
                <NodeHeaderTitle>{customData.title || 'Node Title'}</NodeHeaderTitle>
                <NodeHeaderActions>
                    <NodeHeaderMenuAction label="Expand account options">
                        <DropdownMenuLabel>Node Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleAddAnnotation}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            Add Annotation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Billing</DropdownMenuItem>
                        <DropdownMenuItem>Team</DropdownMenuItem>
                        <DropdownMenuItem>Subscription</DropdownMenuItem>
                    </NodeHeaderMenuAction>
                    <NodeHeaderDeleteAction />
                </NodeHeaderActions>
            </NodeHeader>
            <div className="mt-2">{customData.content || 'Node Content'}</div>
        </BaseNode>
    );
});

export default CustomNode;