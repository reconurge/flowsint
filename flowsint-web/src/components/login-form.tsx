import Link from "next/link"
import { login } from "@/lib/actions/auth"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "./submit-button"
import { FormMessage, Message } from "./form-message"

export default async function LoginForm(props: { searchParams: Promise<Message> }) {
    const searchParams = await props.searchParams;
    return (
        <Card className="mx-auto bg-background w-full max-w-md">
            <CardHeader className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Login</h2>
                <p className="text-sm text-muted-foreground">Login into your account or create a new one.</p>
            </CardHeader>
            <CardContent className="space-y-4">
                <form className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link href="#" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <Input id="password" name="password" type="password" placeholder="Your password" required />
                    </div>
                    <SubmitButton pendingText="Logging in..." formAction={login} className="w-full">
                        Log in
                    </SubmitButton>
                    <FormMessage message={searchParams} />
                </form>
            </CardContent>
        </Card>
    )
}

