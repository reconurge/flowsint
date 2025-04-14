import { Profile } from "."
import { Sketch } from "./sketch"

export interface Investigation {
    id: string
    name: string
    description: string
    sketches: Sketch[]
    created_at: string
    last_updated_at: string
    owner: any
    owner_id: string,
    members?: { profile: Profile }[]
    status: string
}