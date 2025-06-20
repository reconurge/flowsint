import { PlusCircle, Import } from 'lucide-react';
import NewInvestigation from '@/components/investigations/new-investigation';

export function GetStartedSection() {
    return (
        <div className="w-full flex flex-col gap-2">
            <h2 className="text-xl font-bold mb-4 text-foreground">Get started</h2>
            <div className="flex flex-col gap-0 divide-y divide-border rounded-xl overflow-hidden bg-card/80 border border-border">
                {/* Action 1 */}
                <NewInvestigation noDropDown>
                    <div className="flex flex-row items-center gap-4 px-6 py-5 hover:bg-accent/50 cursor-pointer transition-colors">
                        <div className="bg-muted rounded-lg p-3 flex items-center justify-center">
                            <PlusCircle className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <span className="font-semibold text-lg text-foreground">Start a new investigation</span>
                            <span className="text-muted-foreground text-sm">Quickly create and organize a new investigation.</span>
                        </div>
                    </div>
                </NewInvestigation>
                {/* Action 2 */}
                <div className="flex flex-row items-center gap-4 px-6 py-5 hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="bg-muted rounded-lg p-3 flex items-center justify-center">
                        <Import className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <span className="font-semibold text-lg text-foreground">Import data</span>
                        <span className="text-muted-foreground text-sm">Easily import your existing investigations or data files.</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 