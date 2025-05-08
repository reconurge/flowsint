import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ItemType =
    | "individual"
    | "phone"
    | "address"
    | "email"
    | "ip"
    | "social"
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

export const ITEM_TYPES: ItemType[] = [
    "individual",
    "phone",
    "address",
    "email",
    "ip",
    "social",
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
]

// Default colors for each item type
const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: "#ff5733",
    phone: "#33ff57",
    address: "#3357ff",
    email: "#f3ff33",
    ip: "#ff33f3",
    social: "#33fff3",
    organization: "#ff8c33",
    vehicle: "#338cff",
    website: "#8c33ff",
    domain: "#ff338c",
    subdomain: "#8cff33",
    document: "#33ff8c",
    financial: "#c733ff",
    event: "#ffc733",
    device: "#33c7ff",
    media: "#ff33c7",
    education: "#c7ff33",
    relationship: "#33ffc7",
    online_activity: "#ff5733",
    digital_footprint: "#33ff57",
    biometric: "#3357ff",
    credential: "#f3ff33",
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
