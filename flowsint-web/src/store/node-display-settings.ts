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
    "username",
]

const primary = "#f59e0b"

const DEFAULT_COLORS: Record<ItemType, string> = {
    individual: primary, // Bleu moyen
    phone: primary, // Vert/gris doux
    address: primary, // Vert forêt
    email: primary, // Rouge doux
    ip: primary, // Orange chaud
    social_profile: primary, // Mauve gris
    organization: primary, // Brun/bronze
    vehicle: primary, // Jaune sable
    website: primary, // Rose grisé
    domain: primary, // Bleu-vert foncé
    subdomain: primary, // Bleu clair
    document: primary, // Bleu pâle grisé
    financial: primary, // Rose saumon
    event: primary, // Bleu ciel
    device: primary, // Jaune doux
    media: primary, // Orange ocre
    education: primary, // Bleu acier
    relationship: primary, // Pêche
    online_activity: primary, // Vert herbe
    digital_footprint: primary, // Rouge terre
    username: primary, // Bleu lavande
    credential: primary, // Gris neutre
    biometric: primary, // Gris neutre
}

// Définition des icônes par défaut pour chaque type d'élément
const DEFAULT_ICONS: Record<ItemType, string> = {
    individual: "/person.svg",
    phone: "/phone.svg",
    address: "/address.svg",
    email: "/email.svg",
    ip: "/ip.svg",
    social_profile: "/socials.svg",
    organization: "/organization.svg",
    vehicle: "/car.svg",
    website: "/website.svg",
    domain: "/website.svg",
    subdomain: "/subdomain.svg",
    document: "/file-text.svg",
    financial: "/credit-card.svg",
    event: "/calendar.svg",
    device: "/smartphone.svg",
    media: "/image.svg",
    education: "/book.svg",
    relationship: "/users.svg",
    online_activity: "/activity.svg",
    digital_footprint: "/footprints.svg",
    biometric: "/fingerprint.svg",
    credential: "/key.svg",
    username: "/username.svg",
}

interface NodesDisplaySettingsState {
    colors: Record<ItemType, string>
    icons: Record<ItemType, string>
    setColor: (itemType: ItemType, color: string) => void
    setIcon: (itemType: ItemType, iconPath: string) => void
    resetColors: () => void
    resetIcons: () => void
    resetAll: () => void
    getIcon: (itemType: ItemType) => HTMLImageElement
}

export const useNodesDisplaySettings = create<NodesDisplaySettingsState>()(
    persist(
        (set, get) => ({
            colors: { ...DEFAULT_COLORS },
            icons: { ...DEFAULT_ICONS },
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
                }),
            getIcon: (itemType) => {
                const img = new Image()
                img.src = get().icons[itemType]
                img.crossOrigin = "anonymous"
                return img
            },
        }),
        {
            name: "nodes-display-settings",
        },
    ),
)
