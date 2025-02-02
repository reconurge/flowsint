"use server"
import { Project } from "@/types/project"
import { createClient } from "../lib/supabase/server"
import { redirect } from "next/navigation"
import { Organization } from "@/types/organization"
import { Task } from "@/types/kanban"

export async function getProject(project_id: string): Promise<Project> {
    const supabase = await createClient()
    let { data: project, error } = await supabase
        .from('projects')
        .select(`
        *,
        org:organizations(name, id),
        members:project_members(
            users(id, user_name, avatar_url)
        )
    `)
        .eq('id', project_id)
        .single();

    if (error) {
        return redirect("/404")
    }
    project.members = project.members.map(({ users }: any) => users)


    return project as Project
}

export async function getProjects(): Promise<Project[]> {
    const supabase = await createClient()
    let { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, description')

    if (error) {
        throw error
    }
    return projects as Project[]
}

export async function getTasks(project_id: string): Promise<Partial<Task>[]> {
    const supabase = await createClient()
    let tasks = await supabase
        .from('tasks')
        .select('id, title, description, priority,column_id, column:columns!column_id(id, name), project:projects!project_id(id, name), comments(id), user:users!user_id(id, user_name, email, avatar_url), tags:task_tags(tags(id, name, color))')
        .eq("project_id", project_id)
        .then(({ data, error }) => {
            if (error) {
                throw error
            }
            //@ts-ignore
            return data.map((task => ({ ...task, status: task.column.name })))
        })
        //@ts-ignore
    return tasks as Partial<Task>[]
}

export async function getOrgsAndProjects(): Promise<Organization[]> {
    const supabase = await createClient()
    let { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, created_at, name, description, projects!inner(id, name, description, columns(id, tasks(id)))')
        .limit(4, { foreignTable: 'projects.columns' })
        .limit(6, { foreignTable: 'projects.columns.tasks' })
        .order('created_at', { ascending: true })
    if (error) {
        throw error
    }
    return orgs as Organization[]
}

export async function createProject(values: { name: string, description: string, org_id: string }): Promise<Partial<Project>> {
    const supabase = await createClient()
    let { data: project, error } = await supabase
        .from('projects')
        .insert({ name: values.name, description: values.description, org_id: values.org_id }).select("id").single()

    if (error) {
        throw error
    }
    if (!project) redirect("/error")
    return project
}

