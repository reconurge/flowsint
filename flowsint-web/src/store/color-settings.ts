"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ItemType =
    | "individual"
    | "phone"
    | "address"
    | "email"
    | "ip"
    | "social_profile"
    | "organization"
    | "vehicle"
    | "website"
    | "domain"
    | "subdomain"
    | "document"
    | "financial"
    | "event"
    | "device"
    | "media"
    | "education"
    | "relationship"
    | "online_activity"
    | "digital_footprint"
    | "biometric"
    | "credential"
    | "username"

export const ITEM_TYPES: ItemType[] = [
    "individual",
    "phone",
    "address",
    "email",
    "ip",
    "social_profile",
    "organization",
    "vehicle",
    "website",
    "domain",
    "subdomain",
    "document",
    "financial",
    "event",
    "device",
    "media",
    "education",
    "relationship",
    "online_activity",
    "digital_footprint",
    "biometric",
    "credential",
    "username"
]

const primary = '#009bc2'

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: primary,          // Bleu moyen
    phone: primary,               // Vert/gris doux
    address: primary,             // Vert forêt
    email: primary,               // Rouge doux
    ip: primary,                  // Orange chaud
    social_profile: primary,      // Mauve gris
    organization: primary,        // Brun/bronze
    vehicle: primary,            // Jaune sable
    website: primary,             // Rose grisé
    domain: primary,             // Bleu-vert foncé
    subdomain: primary,          // Bleu clair
    document: primary,           // Bleu pâle grisé
    financial: primary,           // Rose saumon
    event: primary,               // Bleu ciel
    device: primary,              // Jaune doux
    media: primary,              // Orange ocre
    education: primary,           // Bleu acier
    relationship: primary,        // Pêche
    online_activity: primary,     // Vert herbe
    digital_footprint: primary,   // Rouge terre
    username: primary,           // Bleu lavande
    credential: primary,        // Gris neutre
    biometric: primary,        // Gris neutre
}


interface ColorSettingsState {
    colors: Record<ItemType, string>
    setColor: (itemType: ItemType, color: string) => void
    resetColors: () => void
}

export const useColorSettings = create<ColorSettingsState>()(
    persist(
        (set) => ({
            colors: { ...DEFAULT_COLORS },
            setColor: (itemType, color) =>
                set((state) => ({
                    colors: {
                        ...state.colors,
                        [itemType]: color,
                    },
                })),
            resetColors: () => set({ colors: { ...DEFAULT_COLORS } }),
        }),
        {
            name: "color-settings",
        },
    ),
)
