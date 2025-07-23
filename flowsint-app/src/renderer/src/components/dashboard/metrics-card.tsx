import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Database, Network, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
    title: string;
    value: string;
    trend: {
        value: number;
        period: string;
        isPositive: boolean;
    };
    type: 'entities' | 'relationships' | 'reports';
}

const iconMap = {
    entities: Database,
    relationships: Network,
    reports: FileText,
};

const colorMap = {
    entities: 'text-chart-1',
    relationships: 'text-chart-2', 
    reports: 'text-chart-3',
};

export function MetricsCard({ title, value, trend, type }: MetricsCardProps) {
    const Icon = iconMap[type];
    const TrendIcon = trend.isPositive ? TrendingUp : TrendingDown;
    
    return (
        <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                        <Icon className={cn("w-5 h-5", colorMap[type])} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">{title}</p>
                        <p className="text-3xl font-bold">{value}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        trend.isPositive ? "text-green-500" : "text-red-500"
                    )}>
                        <TrendIcon className="w-4 h-4" />
                        {trend.value.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{trend.period}</p>
                </div>
            </div>
        </Card>
    );
} 