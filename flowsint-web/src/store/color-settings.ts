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

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: "#D45A3A",          // Bleu moyen
    phone: "#D45A3A",               // Vert/gris doux
    address: "#D45A3A",             // Vert forêt
    email: "#D45A3A",               // Rouge doux
    ip: "#D45A3A",                  // Orange chaud
    social_profile: "#D45A3A",      // Mauve gris
    organization: "#D45A3A",        // Brun/bronze
    vehicle: "#D45A3A",            // Jaune sable
    website: "#DAB6C4",             // Rose grisé
    domain: "#D45A3A",             // Bleu-vert foncé
    subdomain: "#D45A3A",          // Bleu clair
    document: "#D45A3A",           // Bleu pâle grisé
    financial: "#D45A3A",           // Rose saumon
    event: "#D45A3A",               // Bleu ciel
    device: "#D45A3A",              // Jaune doux
    media: "#D45A3A",              // Orange ocre
    education: "#D45A3A",           // Bleu acier
    relationship: "#D45A3A",        // Pêche
    online_activity: "#D45A3A",     // Vert herbe
    digital_footprint: "#D45A3A",   // Rouge terre
    username: "#D45A3A",           // Bleu lavande
    credential: "#D45A3A",        // Gris neutre
    biometric: "#D45A3A",        // Gris neutre
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
