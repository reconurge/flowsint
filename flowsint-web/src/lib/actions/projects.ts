"use server"
import { createClient } from "../supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
export const createNewProject = async (formData: FormData) => {
    const supabase = await createClient()
    const { data: session, error: userError } = await supabase.auth.getUser()
    if (userError || !session?.user) {
        redirect('/login')
    }
    const data = {
        name: formData.get("name"),
        description: formData.get("description"),
    }
    try {
        const { data: project, error } = await supabase.from("projects").insert({ ...data, owner_id: session?.user?.id }).select("id").single()
        if (error) throw error
        const { data: folder, error: bucketError } = await supabase.storage.from('documents').upload(`${project.id}/placeholder`, '')
        if (bucketError) throw bucketError
        return { success: true, id: project.id, path: folder.path }
    } catch (error) {
        console.error("Error creating new project:", error)
        return { success: false, error: "Failed to create new project." }
    }
}