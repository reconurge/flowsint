"use server"
import { createClient } from "../supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Edge, Node } from "@xyflow/react"
import { flattenObj } from "../utils"

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

type Schema = {
    nodes: Node[]
    edges: Edge[]
    sketch_id: string
}

export async function saveSchemaToNeo4j(schema: Schema) {
    try {
        const { nodes, edges, sketch_id } = schema
        if (!sketch_id) {
            return { success: false, error: "Missing sketch ID" }
        }
        const supabase = await createClient()
        await supabase.auth.refreshSession()
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        const response = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketch/${sketch_id}/save`, {
            method: "POST",
            body: JSON.stringify({ nodes, edges }),
            headers: {
                'Authorization': `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                error: errorData.message || "Failed to save schema to Neo4j"
            }
        }
        return {
            success: true,
            timestamp: new Date().toISOString()
        }
    } catch (error) {
        return {
            success: false,
            error: "Unexpected error during schema save"
        }
    }
}