"use server"
import { createClient } from "../supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createNewCase(formData: FormData) {
    const supabase = await createClient()
    const { data: session, error: userError } = await supabase.auth.getUser()
    if (userError || !session?.user) {
        redirect('/login')
    }
    const data = {
        title: formData.get("title"),
        description: formData.get("description"),
    }
    try {
        const { data: investigation, error } = await supabase.from("investigations").insert({ ...data, owner_id: session?.user?.id }).select("id").single()
        if (error) throw error
        revalidatePath("/")
        return { success: true, id: investigation.id }
    } catch (error) {
        console.error("Error creating new case:", error)
        return { success: false, error: "Failed to create new case" }
    }
}
