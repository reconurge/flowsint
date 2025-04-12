import { Activity, CheckIcon, Hourglass, Package } from 'lucide-react'
import React from 'react'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils';
const statuses = {
    "active": {
        "icon": Activity,
        "className": "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow dark:from-slate-800 text-slate-700 dark:text-slate-100 dark:to-slate-900 dark:border-slate-700 dark:shadow-slate-900/30",
    },
    "pending": {
        "icon": Hourglass,
        "className": "bg-gradient-to-br from-violet-50 to-violet-100 border-ovioletrange-200 shadow dark:from-violet-800 text-violet-700 dark:text-violet-100 dark:to-violet-900 dark:border-violet-700 dark:shadow-violet-900/30",
    },
    "archived": {
        "icon": Package,
        "className": "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow dark:from-orange-800 text-orange-700 dark:text-orange-100 dark:to-orange-900 dark:border-orange-700 dark:shadow-orange-900/30",
    },
    "closed": {
        "icon": CheckIcon,
        "className": "bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow dark:from-green-800 text-green-700 dark:text-green-100 dark:to-green-900 dark:border-green-700 dark:shadow-green-900/30",
    }
} as const;


const StatusBadge = ({ status }: { status: string }) => {

    const statusFound = statuses[status.toLowerCase() as "active" || "pending" || "archived" || "close"] || statuses["active"]
    const Icon = statusFound.icon

    return (
        <Badge variant="outline" className={cn('opacity-60 flex items-center gap-1')}>{status} <Icon /></Badge>
    )
}

export default StatusBadge