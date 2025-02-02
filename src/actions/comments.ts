"use server"

import { Comment } from "@/types/kanban";
import { createClient } from "../lib/supabase/server"
import { redirect } from "next/navigation";


export async function submitComment(comment: Partial<Comment>): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) redirect("/error")

    const { error } = await supabase
        .from("comments")
        .insert([{ ...comment, user_id: user.id }]);

    if (error) {
        throw error
    }
    return error
}