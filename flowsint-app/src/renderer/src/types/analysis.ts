export interface Analysis {
  id: string // UUID
  title: string
  description?: string | null
  content?: any // JSONB, so can be any type
  created_at: string // ISO date string
  last_updated_at: string // ISO date string
  owner_id?: string | null // UUID
  investigation_id?: string | null // UUID
}
