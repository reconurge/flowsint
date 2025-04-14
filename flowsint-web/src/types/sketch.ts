import { Profile } from "."
import { Investigation } from "./investigation"

export interface Sketch {
    id: string
    title: string
    description: string
    status?: string
    priority?: string
    created_at: string
    last_updated_at: string
    owner: Profile
    owner_id: string,
    relations?: any[]
    individuals?: any[]
    investigation?: Investigation
    investigation_id: string
    members?: { profile: Profile }[]
}
export interface Individual {
    id: string
    full_name: string
}

export interface Email {
    id: string
    email: string
}

export interface Phone {
    id: string,
    phone_number: string
}

export interface Social {
    id: string
    profile_url: string
    username: string
    platform: string
}

export interface IP {
    id: string
    ip_address: string
}

export interface Address {
    id: string
    address: string
    city: string
    country: string
    zip: string
}

export interface Relation {
    id: string
}