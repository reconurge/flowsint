import React, { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { HandleProps } from "@xyflow/react";

import { BaseHandle } from "@/components/ui/base-handle";
import { Badge } from "./badge";

const flexDirections = {
    top: "flex-col",
    right: "flex-row-reverse justify-end",
    bottom: "flex-col-reverse justify-end",
    left: "flex-row",
};

export const LabeledHandle = forwardRef<
    HTMLDivElement,
    HandleProps &
    HTMLAttributes<HTMLDivElement> & {
        title: string | (string & Element);
        handleClassName?: string;
        labelClassName?: string;
    }
>(
    (
        { className, labelClassName, handleClassName, title, position, ...props },
        ref,
    ) => (
        <div
            ref={ref}
            className={cn(
                "relative flex items-center",
                flexDirections[position],
                className,
            )}
        >
            <BaseHandle position={position} className={handleClassName} {...props} />
            <label className={cn("px-3 text-foreground", labelClassName)}>
                {title}
            </label>
        </div>
    ),
);

LabeledHandle.displayName = "LabeledHandle";