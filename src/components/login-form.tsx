import Link from "next/link"

import { Button, Card, TextField, Box, Text, Flex } from "@radix-ui/themes"
import { login, signup, signInWithGithub } from '@/src/lib/actions/auth'

export function LoginForm() {
    return (
        <Card className="mx-auto w-full max-w-md !p-6">
            <Flex direction={"column"} gap="2">
                <Text as="div" size="6" weight="bold">
                    Login
                </Text>
                <Text as="div" size="2" color="gray">
                    Login into your account or create a new one.
                </Text>
            </Flex>
            <Flex direction={"column"} gap="3">
                <form>
                    <Flex direction={"column"} gap="3">
                        <label htmlFor="email">
                            <Text as="div" size="2" mb="1" weight="bold">
                                Email
                            </Text>
                            <TextField.Root
                                id="email"
                                type="email"
                                name="email"
                                placeholder="m@example.com"
                                required
                            />
                        </label>
                        <label htmlFor="email">
                            <Text as="div" size="2" mb="1" weight="bold">
                                Password
                            </Text>
                            <TextField.Root id="password" name="password" placeholder="Your password" type="password" required />
                        </label>
                        <Link href="#" className="ml-auto inline-block text-sm underline">
                            Forgot your password?
                        </Link>
                        <Button formAction={login} type="submit" className="w-full mt-4">
                            Login
                        </Button>
                    </Flex>
                </form>
                <form>
                    <Flex direction={"column"} gap="3">
                        <Button formAction={signInWithGithub} variant="outline" className="w-full">
                            Login with Github
                        </Button>
                    </Flex>
                </form>
            </Flex>
            <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Button variant="ghost" formAction={signup}>
                    Sign up
                </Button>
            </div>
        </Card >
    )
}