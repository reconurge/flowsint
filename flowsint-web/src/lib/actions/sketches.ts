"use server"
import { createClient } from "../supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createNewSketch(formData: FormData, investigation_id: string) {
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
        const { data: sketch, error } = await supabase.from("sketches").insert({ ...data, owner_id: session?.user?.id, investigation_id }).select("id").single()
        if (error) throw error
        revalidatePath("/")
        return { success: true, id: sketch.id }
    } catch (error) {
        if ((error as { code?: string })?.code === "42501")
            return { success: false, error: "Missing permission to create a new sketch." }
        return { success: false, error: "Failed to create new sketch." }
    }
}
