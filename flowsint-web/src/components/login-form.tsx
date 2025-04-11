import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { login, signInWithGithub } from "@/lib/actions/auth"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
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
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>
                </form>
                <form>
                    <SubmitButton pendingText="Logging in..." formAction={signInWithGithub} variant="outline" className="w-full">
                        <Github className="mr-2 h-4 w-4" />
                        Login with Github
                    </SubmitButton>
                </form>

            </CardContent>
            {/* <CardFooter className="flex justify-center">
                <div className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Button variant="link" formAction={signup} className="p-0">
                        Sign up
                    </Button>
                </div>
            </CardFooter> */}
        </Card>
    )
}

