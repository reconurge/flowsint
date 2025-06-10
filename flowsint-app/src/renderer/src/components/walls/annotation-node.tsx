import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

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