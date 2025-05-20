"use server"
import { redirect } from "next/navigation"
import { NodeData } from "@/types"
import { auth } from "@/auth"
import { serverFetch } from "../server-fetch"

export const createNewSketch = async (formData: FormData, investigation_id: string) => {
    const session = auth()
    if (!session) {
        redirect('/login')
    }
    const data = {
        title: formData.get("title"),
        description: formData.get("description"),
        investigation_id: investigation_id,
    }
    try {
        const url = `${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketches/create`;
        const body = JSON.stringify(data)
        const created = await serverFetch(url, {
            method: "POST",
            body: body
        })
        return { success: true, id: created.id }
    } catch (error) {
        return { success: false, error: "Failed to create new sketch." }
    }
}

type AddNodeSchema = {
    node: any
    sketch_id: string | string[]
}

export async function saveNode(schema: AddNodeSchema) {
    try {
        const { node, sketch_id } = schema
        if (!sketch_id) {
            return { success: false, error: "Missing sketch ID" }
        }
        const created = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketches/${sketch_id}/nodes/add`, {
            method: "POST",
            body: JSON.stringify(node)
        })
        return {
            success: true,
            data: created,
            timestamp: new Date().toISOString()
        }
    } catch (error) {
        return {
            success: false,
            error: "Unexpected error during schema save"
        }
    }
}


export type AddEdgeSchema = {
    source: NodeData,
    target: NodeData,
    type: string,
    label: string,
    sketch_id: string | string[]
}


export const saveEdge = async (schema: AddEdgeSchema) => {
    const body = {
        source: schema.source,
        target: schema.target,
        type: schema.type,
        label: schema.label,
    };
    try {
        const { sketch_id } = schema
        if (!sketch_id) {
            return { success: false, error: "Missing sketch ID" }
        }
        const created = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketch/${sketch_id}/relations/add`, {
            method: "POST",
            body: JSON.stringify(body)
        })
        return {
            success: true,
            data: created,
            timestamp: new Date().toISOString()
        }
    } catch (error) {
        throw Error("Failed to create new relation.")
    }
};
