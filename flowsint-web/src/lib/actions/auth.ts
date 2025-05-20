'use server'

import { redirect } from 'next/navigation'
import { encodedRedirect } from '../utils'
import { signIn, signOut } from '@/auth'
export async function login(formData: FormData) {
    try {
        await signIn("credentials", formData)
        redirect('/')
    } catch (error) {
        if (error) {
            return encodedRedirect("error", "/login", "Error signing up." + error);
        }
        return encodedRedirect("error", "/login", "Error signing up.");
    }
}

export async function register(formData: FormData) {
    const body = JSON.stringify({ email: formData.get('email') as string, password: formData.get('password') as string })
    const res = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
    })
    if (res.ok) {

    } else {
        return encodedRedirect("error", "/login", "An error occurred while signing up.");

    }
}

export async function logout() {
    try {
        await signOut()
        redirect('/login')
    } catch (error) {
        if (error) {
            return encodedRedirect("error", "/login", "Error logging out.");
        }
        return encodedRedirect("error", "/login", "Error logging out.");
    }
}