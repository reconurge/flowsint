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
    | "phrase"

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
    "affiliation",
    "phrase"
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
    affiliation: "#A6D0BF",     // sage
    phrase: "#D4A5D4"           // warm beige
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
    affiliation: "🤝",
    phrase: "��"
};

const DEFAULT_SIZES: Record<ItemType, number> = {
    individual: 24,        // Large - key entities
    phone: 16,             // Medium-large
    location: 14,          // Medium
    email: 14,             // Medium
    ip: 16,                // Medium-large
    socialprofile: 14,     // Medium
    organization: 28,      // Very large - important entities
    vehicle: 12,           // Small-medium
    car: 12,               // Small-medium
    motorcycle: 12,        // Small-medium
    boat: 12,              // Small-medium
    plane: 12,             // Small-medium
    website: 14,           // Medium
    domain: 20,            // Large
    subdomain: 16,         // Medium-large
    document: 12,          // Small-medium
    financial: 18,         // Medium-large
    event: 12,             // Small-medium
    device: 12,            // Small-medium
    media: 12,             // Small-medium
    education: 12,         // Small-medium
    relationship: 10,      // Small
    online_activity: 10,   // Small
    digital_footprint: 10, // Small
    biometric: 14,         // Medium
    credential: 16,        // Medium-large
    username: 14,          // Medium
    siret: 8,              // Very small
    siren: 8,              // Very small
    cryptowallet: 18,      // Medium-large
    cryptotransaction: 14, // Medium
    cryptonft: 14,         // Medium
    asn: 32,               // Largest - network infrastructure
    cidr: 28,              // Very large - network ranges
    whois: 10,             // Small
    gravatar: 10,          // Small
    breach: 20,            // Large - security important
    webtracker: 12,        // Small-medium
    session: 10,           // Small
    dns: 16,               // Medium-large
    ssl: 16,               // Medium-large
    message: 12,           // Small-medium
    malware: 24,           // Large - security critical
    weapon: 22,            // Large - high importance
    script: 12,            // Small-medium
    reputation: 14,        // Medium
    risk: 20,              // Large - important for analysis
    file: 12,              // Small-medium
    bank: 22,              // Large - financial importance
    creditcard: 18,        // Medium-large
    alias: 12,             // Small-medium
    affiliation: 14,       // Medium
    phrase: 10             // Small
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
                return get().sizes[itemType] * 0.4
            }
        }),
        {
            name: "nodes-display-settings",
        },
    ),
)

