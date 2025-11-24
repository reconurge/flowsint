import { useEffect } from "react";

type Callback = (event: KeyboardEvent) => void;

export function useKeyboard(
    targetKey?: string,
    onKeyDown?: Callback,
    onKeyUp?: Callback
) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!targetKey || e.key === targetKey) {
                onKeyDown?.(e);
            }
        }

        function handleKeyUp(e: KeyboardEvent) {
            if (!targetKey || e.key === targetKey) {
                onKeyUp?.(e);
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [targetKey, onKeyDown, onKeyUp]);
}
