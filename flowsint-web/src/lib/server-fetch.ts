import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function serverFetch(
    url: string,
    {
        method = "GET",
        body,
        ...customOptions
    }: RequestInit & { method?: string; body?: any } = {}
) {
    const session = await auth()
    if (!session || !session.user?.accessToken) {
        redirect("/login")
    }

    const token = session.user.accessToken
    const headers = new Headers(customOptions.headers || {})
    headers.set("Authorization", `Bearer ${token}`)

    const upperMethod = method.toUpperCase()
    const options: RequestInit = {
        method: upperMethod,
        headers,
        ...customOptions,
    }

    if (body && !["GET", "HEAD"].includes(upperMethod)) {
        headers.set("Content-Type", "application/json")
        options.body = typeof body === "string" ? body : JSON.stringify(body)
    } else {
        // Pour éviter de passer body inutilement dans un GET/HEAD
        delete options.body
    }

    const res = await fetch(url, options)

    if (!res.ok) {
        if (res.status === 404) {
            redirect("/not-found")
        } else {
            redirect("/error")
        }
    }

    return res.json()
}
