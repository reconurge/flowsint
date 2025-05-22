import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { type HandleProps } from "@xyflow/react";

import { BaseHandle } from "@/components/ui/base-handle";
import { Badge } from "../../../../flowsint-web/src/components/ui/badge";

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
        name: string | (string & Element);
        dataType: string,
        handleClassName?: string;
        labelClassName?: string;
    }
>(
    (
        { className, labelClassName, handleClassName, name, position, dataType, ...props },
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
                {name} <Badge variant={"outline"}>{dataType}</Badge>
            </label>
        </div>
    ),
);

LabeledHandle.displayName = "LabeledHandle";