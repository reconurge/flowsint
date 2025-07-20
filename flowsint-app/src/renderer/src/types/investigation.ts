import { type Sketch } from "./sketch"
import { type Profile } from "./profile"

export interface Investigation {
    id: string
    name: string
    description: string
    sketches: Sketch[]
    created_at: string
    last_updated_at: string
    owner: Profile
    owner_id: string,
    status: string
}