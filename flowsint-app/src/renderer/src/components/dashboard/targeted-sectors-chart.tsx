import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';

const chartData = [
    { date: 'Sep 7, 2023', government: 40, finance: 30, manufacturing: 25, telecommunications: 35, defense: 20 },
    { date: 'Sep 14, 2023', government: 80, finance: 65, manufacturing: 45, telecommunications: 55, defense: 40 },
    { date: 'Sep 21, 2023', government: 165, finance: 90, manufacturing: 85, telecommunications: 75, defense: 60 },
    { date: 'Sep 28, 2023', government: 45, finance: 35, manufacturing: 40, telecommunications: 30, defense: 25 },
    { date: 'Oct 5, 2023', government: 85, finance: 55, manufacturing: 60, telecommunications: 45, defense: 35 },
    { date: 'Oct 12, 2023', government: 35, finance: 25, manufacturing: 30, telecommunications: 20, defense: 15 },
];

const chartConfig = {
    government: {
        label: 'Government and administration',
        color: 'var(--chart-1)',
    },
    finance: {
        label: 'Finance',
        color: 'var(--chart-2)',
    },
    manufacturing: {
        label: 'Manufacturing',
        color: 'var(--chart-3)',
    },
    telecommunications: {
        label: 'Telecommunications',
        color: 'var(--chart-4)',
    },
    defense: {
        label: 'Defense',
        color: 'var(--chart-5)',
    },
};

export function TargetedSectorsChart() {
    return (
        <Card className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Targeted Sectors</h3>
            </div>
            <ChartContainer config={chartConfig} className="h-[450px]">
                <LineChart data={chartData}>
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                        type="monotone"
                        dataKey="government"
                        stroke="var(--color-government)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="finance"
                        stroke="var(--color-finance)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="manufacturing"
                        stroke="var(--color-manufacturing)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="telecommunications"
                        stroke="var(--color-telecommunications)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="defense"
                        stroke="var(--color-defense)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
                {Object.entries(chartConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div 
                            className="w-3 h-0.5 rounded-full"
                            style={{ backgroundColor: config.color }}
                        />
                        <span className="text-muted-foreground">{config.label}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
} 