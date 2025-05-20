import { auth } from "@/auth";
import { Message } from "@/components/form-message"
import RegisterForm from "@/components/register-form"
import { redirect } from "next/navigation"

export default async function Page(props: { searchParams: Promise<Message> }) {
    const session = await auth();
    if (session) {
        redirect("/");
    }
    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <RegisterForm searchParams={props.searchParams} />
        </div>
    )
}