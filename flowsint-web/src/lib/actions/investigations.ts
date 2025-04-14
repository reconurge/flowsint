"use server"
import { createClient } from "../supabase/server"
import { redirect } from "next/navigation"

export const createNewInvestigation = async (formData: FormData) => {
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
        const { data: investigation, error } = await supabase.from("investigations").insert({ ...data, owner_id: session?.user?.id }).select("id").single()
        if (error) throw error
        const { data: folder, error: bucketError } = await supabase.storage.from('documents').upload(`${investigation.id}/placeholder`, '')
        if (bucketError) throw bucketError
        return { success: true, id: investigation.id, path: folder.path }
    } catch (error) {
        if ((error as { code?: string })?.code === "42501")
            return { success: false, error: "Missing permission to create a new investigation." }
        return { success: false, error: "Failed to create new investigation." }
    }
}