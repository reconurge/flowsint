"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Button } from "@/components/ui/button";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";

// Define a default function for the confirm dialog
const defaultFunction = (props: ConfirmProps): Promise<boolean> => Promise.resolve(true);

// Define the props that the ConfirmDialog will use
interface ConfirmProps {
    title: string;
    message: string;
}

// Define the context value shape
interface ConfirmContextValue {
    confirmRef: React.MutableRefObject<(props: ConfirmProps) => Promise<boolean>>;
}

// Default value for the ConfirmContext
const defaultValue: ConfirmContextValue = {
    confirmRef: {
        current: defaultFunction,
    },
};

// Create the ConfirmContext
const ConfirmContext = createContext<ConfirmContextValue>(defaultValue);

// Context provider component
export function ConfirmContextProvider({ children }: { children: ReactNode }) {
    const confirmRef = useRef<(props: ConfirmProps) => Promise<boolean>>(defaultFunction);

    return (
        <ConfirmContext.Provider value={{ confirmRef }}>
            {children}
            <ConfirmDialogWithContext />
        </ConfirmContext.Provider>
    );
}

// Component that renders the dialog and handles its state
function ConfirmDialogWithContext() {
    const [open, setOpen] = useState(false);
    const [props, setProps] = useState<ConfirmProps | null>(null);
    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const { confirmRef } = useContext(ConfirmContext);

    confirmRef.current = (dialogProps: ConfirmProps) =>
        new Promise<boolean>((resolve) => {
            setProps(dialogProps);
            setOpen(true);
            resolveRef.current = resolve;
        });

    const onConfirm = () => {
        resolveRef.current(true);
        setOpen(false);
    };

    const onCancel = () => {
        resolveRef.current(false);
        setOpen(false);
    };

    return (
        <ConfirmDialog
            onConfirm={onConfirm}
            onCancel={onCancel}
            open={open}
            title={props?.title || ""}
            message={props?.message || ""}
        />
    );
}

// Hook to access the confirm function
export function useConfirm() {
    const { confirmRef } = useContext(ConfirmContext);

    return {
        confirm: useCallback(
            (props: ConfirmProps) => confirmRef.current(props),
            [confirmRef]
        ),
    };
}

// The ConfirmDialog component that displays the UI for the dialog
const ConfirmDialog = ({
    open,
    onConfirm,
    onCancel,
    title,
    message,
}: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
}) => {
    return (
        <AlertDialog open={open} onOpenChange={onCancel}>
            <AlertDialogContent>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>
                    {message}
                </AlertDialogDescription>
                <div className="flex items-center gap-3 mt-4 justify-end">
                    <AlertDialogCancel asChild>
                        <Button onClick={onCancel} variant="destructive">
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button onClick={onConfirm} variant={"destructive"}>
                            Continue
                        </Button>
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};