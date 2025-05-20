import { auth } from "@/auth";
import { Message } from "@/components/form-message"
import LoginForm from "@/components/login-form"
import { redirect } from "next/navigation"

export default async function Page(props: { searchParams: Promise<Message> }) {
    const session = await auth();
    if (session) {
        redirect("/");
    }
    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <LoginForm searchParams={props.searchParams} />
        </div>
    )
}