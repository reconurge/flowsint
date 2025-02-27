import Link from "next/link"
import { Button } from "@/components/ui/button"
import { login, signup, signInWithGithub } from '@/lib/actions/auth'
import { Card } from "./ui/card"
import { Input } from "./ui/input"

export function LoginForm() {
    return (
        <Card className="mx-auto w-full max-w-md !p-6">
            <div className="flex flex-col gap-2">
                <div>
                    Login
                </div>
                <div>
                    Login into your account or create a new one.
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <form>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="email">
                            <div>
                                Email
                            </div>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="m@example.com"
                                required
                            />
                        </label>
                        <label htmlFor="email">
                            Password
                            <Input id="password" name="password" placeholder="Your password" type="password" required />
                        </label>
                        <Link href="#" className="ml-auto inline-block text-sm underline">
                            Forgot your password?
                        </Link>
                        <Button formAction={login} type="submit" className="w-full mt-4">
                            Login
                        </Button>
                    </div>
                </form>
                <form>
                    <div className="flex flex-col gap-3">
                        <Button formAction={signInWithGithub} variant="outline" className="w-full">
                            Login with Github
                        </Button>
                    </div>
                </form>
            </div>
            <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Button variant="ghost" formAction={signup}>
                    Sign up
                </Button>
            </div>
        </Card >
    )
}