import { PlusCircle, Import, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DiscoverSection() {
    return (
        <div className="w-full mt-2">
            <h2 className="text-xl font-bold mb-1 text-foreground">Discover what you can do</h2>
            <p className="text-muted-foreground mb-4">Explore the full potential of the platform with these quick actions.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border border-border/60 bg-card/90">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className="bg-muted rounded-lg p-2 flex items-center justify-center"><PlusCircle className="w-5 h-5 text-muted-foreground" /></div>
                        <CardTitle className="text-base">Start a new investigation</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">Quickly create a new investigation to begin your work.</CardContent>
                </Card>
                <Card className="border border-border/60 bg-card/90">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className="bg-muted rounded-lg p-2 flex items-center justify-center"><Import className="w-5 h-5 text-muted-foreground" /></div>
                        <CardTitle className="text-base">Import data</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">Import investigations or data from files to get started quickly.</CardContent>
                </Card>
                <Card className="border border-border/60 bg-card/90">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className="bg-muted rounded-lg p-2 flex items-center justify-center"><FileText className="w-5 h-5 text-muted-foreground" /></div>
                        <CardTitle className="text-base">Read documentation</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">Learn how to use the platform and best practices.</CardContent>
                </Card>
            </div>
        </div>
    );
} 