import { createClient } from "@/lib/supabase/server"
import { formatFileSize } from "@/lib/utils";
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ project_id: string }> }) {
    const { project_id } = await params
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: project, error: projectError } = await supabase.from("projects")
            .select("id")
            .eq("id", project_id)
            .single()
        if (!project || projectError) return NextResponse.json({ error: "Project doesn't exist." }, { status: 404 })
        const { data, error } = await supabase
            .storage
            .from("documents")
            .list(`${project_id}`, {
                sortBy: { column: "created_at", order: "desc" }
            })
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        // Filtrer le fichier .emptyFolderPlaceholder
        const filteredData = data?.filter((file) => file.name !== ".emptyFolderPlaceholder") || []

        // Récupérer les URLs publiques pour chaque fichier
        const filesWithUrls = await Promise.all(
            filteredData.map(async (file) => {
                const { data: urlData } = await supabase.storage.from("documents").createSignedUrl(`${project_id}/${file.name}`, 3600)
                return {
                    id: file.id,
                    name: file.name,
                    type: file.metadata.mimetype,
                    size: formatFileSize(file.metadata.size),
                    created_at: file.created_at,
                    last_updated_at: file.updated_at || file.created_at,
                    url: urlData?.signedUrl,
                    owner: {
                        first_name: "System",
                        last_name: "User",
                    },
                }
            }),
        )
        return NextResponse.json(filesWithUrls)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ project_id: string }> }) {
    const { project_id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("fileName")
    if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }
    try {
        const supabase = await createClient()
        const { error } = await supabase.storage.from("documents").remove([`${projectId}/${fileName}`])
        if (error) {
            throw error
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting document:", error)
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }
}