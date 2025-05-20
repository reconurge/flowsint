"use server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { serverFetch } from "../server-fetch"

export const createNewInvestigation = async (formData: FormData) => {
    const session = auth()
    if (!session) {
        redirect('/login')
    }
    const data = {
        name: formData.get("name"),
        description: formData.get("description"),
    }
    try {
        const url = `${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/investigations/create`;
        const body = JSON.stringify(data)
        const created = await serverFetch(url, {
            method: "POST",
            body: body
        })
        return { success: true, id: created.id }
    } catch (error) {
        return { success: false, error: "Failed to create new investigation." }
    }
}