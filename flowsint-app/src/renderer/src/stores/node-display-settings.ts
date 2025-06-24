"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ItemType =
    | "individual"
    | "phone"
    | "location"
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
    | "siret"
    | "siren"
    | "cryptowallet"
    | "asn"
    | "cidr"
    | "whois"

export const ITEM_TYPES: ItemType[] = [
    "individual",
    "phone",
    "location",
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
    "username",
    "siret",
    "siren",
    "cryptowallet",
    "asn",
    "cidr",
    "whois"
]

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: "#A9CCF4",      // Notion medium blue
    phone: "#A0D7CF",           // Notion soft teal
    location: "#EAAFAF",         // Notion dusty blue
    email: "#C4B9ED",           // Notion lavender
    ip: "#F0C19E",              // Notion pale orange
    social_profile: "#B8AFE6",  // Notion muted purple
    organization: "#D1C0AF",    // Notion taupe
    vehicle: "#E9CD89",         // Notion wheat
    website: "#E7B8D2",         // Notion dusty rose
    domain: "#A6D0BF",          // Notion sage
    subdomain: "#9DCBE4",       // Notion sky blue
    document: "#C1C6CD",        // Notion cool gray
    financial: "#EAAFAF",       // Notion salmon
    event: "#A2D4BF",           // Notion mint
    device: "#EAC597",          // Notion peach
    media: "#E4B1AD",           // Notion terracotta
    education: "#ABC0DA",       // Notion steel blue
    relationship: "#E2C3BD",    // Notion dusty rose
    online_activity: "#B5D1A9", // Notion sage
    digital_footprint: "#D9B0B0", // Notion brick
    username: "#C7BEE4",        // Notion periwinkle
    credential: "#BDC4CA",      // Notion medium gray
    biometric: "#AEB3B9",       // Notion slate gray
    siret: "#ADB9C6",           // Notion blue-gray
    siren: "#9FAAB8",           // Notion dark slate
    cryptowallet: "#F7D154",    // Notion gold
    asn: "#F7D154",
    cidr: "#A2D4BF",
    whois: "#EAAFAF"
}

// Définition des icônes par défaut pour chaque type d'élément
const DEFAULT_ICONS: Record<ItemType, string> = {
    individual: "👤",
    phone: "📞",
    location: "🏠",
    email: "✉️",
    ip: "🌐",
    social_profile: "📱",
    organization: "🏢",
    vehicle: "🚗",
    website: "🔗",
    domain: "🌍",
    subdomain: "🧩",
    document: "📄",
    financial: "💳",
    event: "📅",
    device: "📱",
    media: "🖼️",
    education: "📚",
    relationship: "👥",
    online_activity: "💻",
    digital_footprint: "👣",
    biometric: "🧬",
    credential: "🔑",
    username: "🧑‍💻",
    siret: "ℹ️",
    siren: "ℹ️",
    cryptowallet: "₿",
    asn: "🌐",
    cidr: "📡",
    whois: "🌐"
};

const DEFAULT_SIZES: Record<ItemType, number> = {
    individual: 10,
    phone: 8,
    location: 7,
    email: 7,
    ip: 7,
    social_profile: 7,
    organization: 10,
    vehicle: 7,
    website: 7,
    domain: 8,
    subdomain: 7,
    document: 7,
    financial: 7,
    event: 7,
    device: 7,
    media: 7,
    education: 7,
    relationship: 7,
    online_activity: 7,
    digital_footprint: 7,
    biometric: 7,
    credential: 7,
    username: 8,
    siret: 5,
    siren: 5,
    cryptowallet: 7,
    asn: 12,    
    cidr: 10,
    whois: 6
}

interface NodesDisplaySettingsState {
    colors: Record<ItemType, string>
    icons: Record<ItemType, string>
    sizes: Record<ItemType, number>
    setColor: (itemType: ItemType, color: string) => void
    setIcon: (itemType: ItemType, iconPath: string) => void
    resetColors: () => void
    resetIcons: () => void
    resetAll: () => void
    getIcon: (itemType: ItemType) => string
    getSize: (itemType: ItemType) => number
}

export const useNodesDisplaySettings = create<NodesDisplaySettingsState>()(
    persist(
        (set, get) => ({
            colors: { ...DEFAULT_COLORS },
            icons: { ...DEFAULT_ICONS },
            sizes: { ...DEFAULT_SIZES },
            setColor: (itemType, color) =>
                set((state) => ({
                    colors: {
                        ...state.colors,
                        [itemType]: color,
                    },
                })),
            setIcon: (itemType, iconPath) =>
                set((state) => ({
                    icons: {
                        ...state.icons,
                        [itemType]: iconPath,
                    },
                })),
            resetColors: () => set({ colors: { ...DEFAULT_COLORS } }),
            resetIcons: () => set({ icons: { ...DEFAULT_ICONS } }),
            resetAll: () =>
                set({
                    colors: { ...DEFAULT_COLORS },
                    icons: { ...DEFAULT_ICONS },
                    sizes: { ...DEFAULT_SIZES }
                }),
            getIcon: (itemType) => {
                return get().icons[itemType] || ""
            },
            getSize: (itemType) => {
                return get().sizes[itemType]
            }
        }),
        {
            name: "nodes-display-settings",
        },
    ),
)

