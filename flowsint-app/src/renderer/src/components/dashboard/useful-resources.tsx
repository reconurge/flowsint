import { FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function UsefulResources() {
    return (
        <div className="w-full mt-10">
            <h3 className="text-lg font-semibold mb-2">Useful Resources</h3>
            <div className="flex flex-wrap gap-4">
                <Card className='gap-3 grow'>
                    <CardHeader>
                        <CardTitle>API Reference</CardTitle>
                        <CardDescription>Explore the API for integrations and automation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm">
                            <a href="https://api.yourproject.com" target="_blank" rel="noopener noreferrer">
                                <FileText className="w-4 h-4 mr-2" />
                                API Docs
                            </a>
                        </Button>
                    </CardContent>
                </Card>
                <Card className='gap-3 grow'>
                    <CardHeader>
                        <CardTitle>Community & Support</CardTitle>
                        <CardDescription>Get help or connect with other users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm">
                            <a href="https://community.yourproject.com" target="_blank" rel="noopener noreferrer">
                                <Users className="w-4 h-4 mr-2" />
                                Community
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 