// lib/fetcherWithSession.ts
import { getSession } from "next-auth/react"
import { redirect } from "next/navigation"

export async function clientFetch(
    url: string,
    {
        method = "GET",
        body,
        ...customOptions
    }: RequestInit & { body?: any } = {}
) {
    const session = await getSession()
    if (!session) {
        throw new Error("Unauthorized")
    }
    const token = session.user?.accessToken
    if (!token) {
        throw new Error("No access token found")
    }
    const headers = new Headers(customOptions.headers || {})
    headers.set("Authorization", `Bearer ${token}`)
    const options: RequestInit = {
        method,
        headers,
        ...customOptions,
    }
    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
        headers.set("Content-Type", "application/json")
        options.body = typeof body === "string" ? body : JSON.stringify(body)
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
