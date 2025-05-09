import { cn } from "@/lib/utils";

function Loader({ className, label }: { className?: string, label?: string }) {
    return (
        <div className="h-full w-full flex items-center justify-center gap-2">
            <div className={cn("relative w-8 h-8", className)}>
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-l-transparent border-r-primary border-b-primary animate-spin" />
                <div
                    className="absolute inset-1 rounded-full border-4 border-b-transparent border-r-transparent border-t-secondary border-secondary animate-spin"
                    style={{ animationDirection: "reverse", animationDuration: "1s" }}
                />
                <div
                    className="absolute inset-2 rounded-full border-4 border-t-transparent border-l-transparent border-r-cyan-500 border-b-cyan-500 animate-spin"
                    style={{ animationDuration: "0.5s" }}
                />
            </div>
            {label && <p>{label}</p>}
        </div>
    )
}
export default Loader