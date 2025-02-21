export interface Investigation {
    id: string
    title: string
    description: string
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