import { Investigation } from "./investigation"

export interface Project {
    id: string
    name: string
    description: string
    investigations: Investigation[]
    created_at: string
    last_updated_at: string
    owner: any
    members?: any[]
}