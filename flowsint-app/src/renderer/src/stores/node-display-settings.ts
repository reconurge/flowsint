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
    individual: "#E07A7A",      // stronger pastel blue
    phone: "#5FC9B5",           // teal-green
    location: "#E57373",        // warm rose
    email: "#8E7CC3",           // lavender purple
    ip: "#F4A261",              // orange
    socialprofile: "#B569B9",   // purple pink
    organization: "#BCA18A",    // taupe
    vehicle: "#E1B84D",         // golden wheat
    car: "#BFAF7A",             // olive beige
    motorcycle: "#A78B6C",      // warm taupe
    boat: "#6FB1C5",            // blue teal
    plane: "#C1A78E",           // light brown
    website: "#D279A6",         // dusty rose
    domain: "#66A892",          // sage green
    subdomain: "#5AA1C8",       // sky blue
    document: "#8F9CA3",        // cool gray
    financial: "#E98973",       // coral
    event: "#6DBBA2",           // mint green
    device: "#E3A857",          // peach orange
    media: "#C97C73",           // terracotta
    education: "#6C8CBF",       // steel blue
    relationship: "#B18B84",    // mauve brown
    online_activity: "#7EAD6F", // sage green
    digital_footprint: "#B97777", // brick
    username: "#8B83C1",        // periwinkle purple
    credential: "#D4B030",      // gold
    biometric: "#7F868D",       // slate gray
    siret: "#7D8B99",           // blue-gray
    siren: "#687684",           // dark slate
    cryptowallet: "#D4B030",    // gold yellow
    cryptotransaction: "#BFA750", // warm yellow
    cryptonft: "#A5BF50",       // lime green
    asn: "#D97474",             // warm peach
    cidr: "#80BF80",            // mint green
    whois: "#9B6F9B",           // lavender violet
    gravatar: "#6CB7CA",        // pale cyan
    breach: "#CC7A7A",          // warm rose
    webtracker: "#C7BF50",      // warm yellow
    session: "#A8BF50",         // lime green
    dns: "#80BF9F",             // mint teal
    ssl: "#BFAF80",             // warm sand
    message: "#897FC9",         // lavender
    malware: "#4AA29E",         // teal
    weapon: "#E98973",          // coral brown
    script: "#A36FA3",          // dusty violet
    reputation: "#6FA8DC",      // steel blue
    risk: "#D97474",            // dusty rose
    file: "#8F9CA3",            // cool gray
    bank: "#D4B030",            // gold
    creditcard: "#285E8E",      // deep blue
    alias: "#A36FA3",           // violet
    affiliation: "#66A892",     // sage
    phrase: "#BFA77A"           // warm beige
};


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

