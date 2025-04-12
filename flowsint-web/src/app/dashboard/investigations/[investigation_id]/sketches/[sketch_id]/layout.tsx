import { SketchProvider } from '@/components/contexts/sketch-provider';
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SketchNavigation } from '@/components/sketches/sketch-navigation';
import { ScanDrawer } from '@/components/sketches/scan-drawer';
import { Sketch } from '@/types/sketch';
const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string, sketch_id: string }>
}) => {
    const supabase = await createClient()
    const { investigation_id, sketch_id } = await params
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
        redirect('/login')
    }
    const { data: sketch, error } = await supabase.from("sketches").select("id, owner_id, members:sketches_profiles(profile:profiles(id, first_name, last_name), role)").eq("id", sketch_id).single()
    if (!sketch || error) {
        return notFound()
    }
    return (
        <SketchProvider>
            <div className="sticky z-40 bg-background w-full hidden md:flex top-[48px] border-b">
                <SketchNavigation user_id={data?.user?.id} investigation_id={investigation_id} sketch_id={sketch_id} sketch={sketch as Sketch} />
            </div>
            {children}
            <ScanDrawer />
        </SketchProvider>
    )
}

export default DashboardLayout