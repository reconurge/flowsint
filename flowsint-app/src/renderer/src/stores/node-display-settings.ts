"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ItemType =
    | "individual"
    | "phone"
    | "location"
    | "email"
    | "ip"
    | "socialprofile"
    | "organization"
    | "vehicle"
    | "car"
    | "motorcycle"
    | "boat"
    | "plane"
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
    | "cryptotransaction"
    | "cryptonft"
    | "asn"
    | "cidr"
    | "whois"
    | "gravatar"
    | "breach"
    | "webtracker"
    | "session"
    | "dns"
    | "ssl"
    | "message"
    | "malware"
    | "weapon"
    | "script"
    | "reputation"
    | "risk"
    | "file"
    | "bank"
    | "creditcard"
    | "alias"
    | "affiliation"

export const ITEM_TYPES: ItemType[] = [
    "individual",
    "phone",
    "location",
    "email",
    "ip",
    "socialprofile",
    "organization",
    "vehicle",
    "car",
    "motorcycle",
    "boat",
    "plane",
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
    "cryptotransaction",
    "cryptonft",
    "asn",
    "cidr",
    "whois",
    "gravatar",
    "breach",
    "webtracker",
    "session",
    "dns",
    "ssl",
    "message",
    "malware",
    "weapon",
    "script",
    "reputation",
    "risk",
    "file",
    "bank",
    "creditcard",
    "alias",
    "affiliation"
]

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: "#A9CCF4",      // medium blue
    phone: "#A0D7CF",           // soft teal
    location: "#EAAFAF",        // dusty rose
    email: "#C4B9ED",           // lavender
    ip: "#F0C19E",              // pale orange
    socialprofile: "#D4A5D4",  // dusty violet
    organization: "#D1C0AF",    // taupe
    vehicle: "#E9CD89",         // wheat
    car: "#D4C4A8",             // warm beige
    motorcycle: "#C8B5A3",      // warm taupe
    boat: "#B8D4E3",            // soft blue
    plane: "#E2D1C3",           // light taupe
    website: "#E7B8D2",         // dusty rose
    domain: "#A6D0BF",          // sage
    subdomain: "#9DCBE4",       // sky blue
    document: "#C1C6CD",        // cool gray
    financial: "#F4B8A8",       // coral
    event: "#A2D4BF",           // mint
    device: "#EAC597",          // peach
    media: "#E4B1AD",           // terracotta
    education: "#ABC0DA",       // steel blue
    relationship: "#D9C2BC",    // dusty mauve
    online_activity: "#B5D1A9", // sage
    digital_footprint: "#D9B0B0", // brick
    username: "#C7BEE4",        // periwinkle
    credential: "#F7D154",      // medium gray
    biometric: "#AEB3B9",       // slate gray
    siret: "#ADB9C6",           // blue-gray
    siren: "#9FAAB8",           // dark slate
    cryptowallet: "#F7D154",    // gold
    cryptotransaction: "#E6D4A0", // warm yellow
    cryptonft: "#D4E6A0",       // soft lime
    asn: "#EAAFAF",             // warm peach
    cidr: "#B8E6B8",            // soft mint
    whois: "#D4B5D4",           // dusty lavender
    gravatar: "#A8D8E8",        // pale blue
    breach: "#E6B8B8",          // soft rose
    webtracker: "#F0E6A0",      // warm yellow
    session: "#D4E6A0",         // soft lime
    dns: "#B8E6B8",             // soft mint
    ssl: "#E6D4A0",             // warm yellow
    message: "#C4B9ED",         // lavender
    malware: "#1DA7A8",         // soft rose
    weapon: "#F4B8A8",          // coral
    script: "#D4A5D4",          // dusty violet
    reputation: "#A9CCF4",      // medium blue
    risk: "#EAAFAF",            // dusty rose
    file: "#C1C6CD",            // cool gray
    bank: "#F7D154",            // gold
    creditcard: "#0253A4",      // warm yellow
    alias: "#D4A5D4",           // dusty violet
    affiliation: "#A6D0BF"      // sage
}

// Définition des icônes par défaut pour chaque type d'élément
const DEFAULT_ICONS: Record<ItemType, string> = {
    individual: "👤",
    phone: "📞",
    location: "🏠",
    email: "✉️",
    ip: "🌐",
    socialprofile: "📱",
    organization: "🏢",
    vehicle: "🚗",
    car: "🚗",
    motorcycle: "🏍️",
    boat: "🚤",
    plane: "✈️",
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
    cryptotransaction: "💱",
    cryptonft: "🖼️",
    asn: "🌐",
    cidr: "📡",
    whois: "🌐",
    gravatar: "🖼️",
    breach: "🔓",
    webtracker: "🎯",
    session: "🔐",
    dns: "🌐",
    ssl: "🔒",
    message: "💬",
    malware: "🦠",
    weapon: "⚔️",
    script: "📜",
    reputation: "⭐",
    risk: "⚠️",
    file: "📁",
    bank: "🏦",
    creditcard: "💳",
    alias: "👤",
    affiliation: "🤝"
};

const DEFAULT_SIZES: Record<ItemType, number> = {
    individual: 10,
    phone: 8,
    location: 7,
    email: 7,
    ip: 7,
    socialprofile: 7,
    organization: 10,
    vehicle: 7,
    car: 7,
    motorcycle: 7,
    boat: 7,
    plane: 7,
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
    cryptotransaction: 7,
    cryptonft: 7,
    asn: 11,
    cidr: 10,
    whois: 6,
    gravatar: 7,
    breach: 8,
    webtracker: 7,
    session: 7,
    dns: 7,
    ssl: 7,
    message: 7,
    malware: 8,
    weapon: 8,
    script: 7,
    reputation: 7,
    risk: 8,
    file: 7,
    bank: 7,
    creditcard: 7,
    alias: 7,
    affiliation: 7
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

