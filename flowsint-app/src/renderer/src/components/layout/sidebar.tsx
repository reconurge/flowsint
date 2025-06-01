import {
    Fingerprint,
    Home,
    type LucideIcon,
    Workflow
} from "lucide-react"
import { Link } from "@tanstack/react-router"

interface NavItem {
    icon: LucideIcon
    label: string
    href?: string
}

export function Sidebar() {
    const navItems: NavItem[] = [
        { icon: Home, label: "Dashboard", href: "/dashboard" },
        { icon: Fingerprint, label: "Cases", href: "/dashboard/investigations" },
        { icon: Workflow, label: "Transforms", href: "/dashboard/transforms" },
    ]

    const commonClasses =
        "flex flex-col items-center justify-center h-14 w-full rounded-sm gap-1 text-xs font-normal hover:bg-muted"

    return (
        <div className="w-22 border-r h-full shrink-0 bg-card">
            <div className="flex flex-col items-center gap-1 p-2 h-full">
                {navItems.map((item, index) => {
                    const IconComponent = item.icon
                    // Render content consistently regardless of container
                    const content = (
                        <>
                            <IconComponent key={index} strokeWidth={1.2} className="h-4 w-4 opacity-70" />
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                        </>
                    )
                    return item.href ? (
                        <Link
                            key={index}
                            to={item.href}
                            className={commonClasses}
                            activeProps={{ className: `${commonClasses} bg-muted` }}
                        >
                            {content}
                        </Link>
                    ) : (
                        <button key={index} className={commonClasses}>
                            {content}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
