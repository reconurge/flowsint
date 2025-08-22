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
    "phrase",
]

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: "#4C8EDA",      // bleu moyen
    phone: "#4CB5AE",           // teal doux
    location: "#E57373",        // rouge rosé
    email: "#8E7CC3",           // violet pastel
    ip: "#F4A261",              // orange chaud
    socialprofile: "#A76DAA",   // mauve
    organization: "#BCA18A",    // taupe clair
    vehicle: "#E1B84D",         // jaune doux
    car: "#BFAF7A",             // olive beige
    motorcycle: "#A78B6C",      // brun taupe
    boat: "#6FB1C5",            // bleu teal
    plane: "#C1A78E",           // brun clair
    website: "#D279A6",         // rose pastel
    domain: "#66A892",          // vert sauge
    subdomain: "#5AA1C8",       // bleu ciel
    document: "#8F9CA3",        // gris bleuté
    financial: "#E98973",       // corail doux
    event: "#6DBBA2",           // vert menthe
    device: "#E3A857",          // orange sable
    media: "#C97C73",           // terracotta
    education: "#6C8CBF",       // bleu acier
    relationship: "#B18B84",    // brun rosé
    online_activity: "#7EAD6F", // vert sauge
    digital_footprint: "#B97777", // brique
    username: "#8B83C1",        // pervenche
    credential: "#D4B030",      // doré doux
    biometric: "#7F868D",       // gris ardoise
    siret: "#7D8B99",           // gris bleu
    siren: "#687684",           // gris foncé
    cryptowallet: "#D4B030",    // or clair
    cryptotransaction: "#BFA750", // or chaud
    cryptonft: "#A5BF50",       // vert lime doux
    asn: "#D97474",             // pêche rosée
    cidr: "#80BF80",            // vert menthe
    whois: "#9B6F9B",           // violet doux
    gravatar: "#6CB7CA",        // cyan clair
    breach: "#CC7A7A",          // rose chaud
    webtracker: "#C7BF50",      // jaune doux
    session: "#A8BF50",         // lime atténué
    dns: "#80BF9F",             // vert teal clair
    ssl: "#BFAF80",             // sable chaud
    message: "#897FC9",         // violet lavande
    malware: "#4AA29E",         // teal saturé
    weapon: "#E98973",          // corail brun
    script: "#A36FA3",          // violet doux
    reputation: "#6FA8DC",      // bleu clair
    risk: "#D97474",            // rouge doux
    file: "#8F9CA3",            // gris bleuté
    bank: "#D4B030",            // or clair
    creditcard: "#285E8E",      // bleu profond
    alias: "#A36FA3",           // violet
    affiliation: "#66A892",     // vert sauge
    phrase: "#BFA77A",          // beige chaud
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
    phrase: "��",
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
    phrase: 10,             // Small
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

