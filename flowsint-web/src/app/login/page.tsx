import { Message } from "@/components/form-message"
import LoginForm from "@/components/login-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Page(props: { searchParams: Promise<Message> }) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error || data.user) {
        redirect('/dashboard')
    }

    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <LoginForm searchParams={props.searchParams} />
        </div>
    )
}