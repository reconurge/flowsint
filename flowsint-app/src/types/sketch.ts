import { type Profile } from './profile'
import { type Investigation } from './investigation'

export interface Sketch {
  id: string
  title: string
  description: string
  status?: string
  priority?: string
  created_at: string
  last_updated_at: string
  owner: Profile
  owner_id: string
  relations?: any[]
  individuals?: any[]
  investigation?: Investigation
  investigation_id: string
  members?: { profile: Profile }[]
}
