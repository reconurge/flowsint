import React from 'react'
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }
    return (
        <div>
            <div className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">{children}</div>
        </div>
    )
}

export default DashboardLayout