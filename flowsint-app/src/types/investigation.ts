import { type Sketch } from './sketch'
import { type Profile } from './profile'
import { type Analysis } from './analysis'

export interface Investigation {
  id: string
  name: string
  description: string
  sketches: Sketch[]
  analyses: Analysis[]
  created_at: string
  last_updated_at: string
  owner: Profile
  owner_id: string
  status: string
}
