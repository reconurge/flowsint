import {
    AtSign,
    Bike,
    Building2,
    Car,
    Facebook,
    Ghost,
    Github,
    Globe,
    Instagram,
    Linkedin,
    Locate,
    MapPin,
    MessageCircle,
    MessageCircleDashed,
    MessageSquare,
    Phone,
    Plane,
    Sailboat,
    Send,
    Twitch,
    Twitter,
    User,
    Video,
    type LucideIcon,
} from "lucide-react"


export type FieldType = "text" | "date" | "email" | "number" | "select" | "textarea" | "hidden" | "tel" | "url" | "metadata"

export interface SelectOption {
    label: string
    value: string
}

export interface FormField {
    name: string
    label: string
    type: FieldType
    required: boolean
    options?: SelectOption[]
    placeholder?: string
    description?: string
}
export interface ActionItem {
    id: number
    type: string
    table: string
    key: string
    icon: LucideIcon
    label: string
    color?: string
    fields: FormField[]
    size?: string
    disabled?: boolean
    comingSoon?: boolean
    children?: ActionItem[]
}

const countries = [
    { label: "France", value: "france" },
    { label: "United States", value: "usa" },
    { label: "United Kingdom", value: "uk" },
    { label: "Germany", value: "germany" },
    { label: "Japan", value: "japan" },
    { label: "Canada", value: "canada" },
    { label: "Australia", value: "australia" },
]
export const actionItems: ActionItem[] = [
    {
        id: 24,
        type: "organization",
        table: "organizations",
        key: "organizations",
        icon: Building2,
        label: "Organization",
        fields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "founding_date", label: "Founding date", type: "date", required: false },
            {
                name: "country",
                label: "Country",
                type: "select",
                required: false,
                options: countries,
            },
            {
                name: "metadata",
                label: "Metadata",
                type: "metadata",
                required: false,
                description: "Add additional information under the format key:value"
            }
        ],
        size: "h-8 w-8",
    },
    {
        id: 1,
        type: "individual",
        table: "individuals",
        key: "individuals",
        icon: User,
        label: "New individual",
        fields: [{ name: "first_name", label: "Firstname", type: "text", required: true },
        { name: "last_name", label: "Lastname", type: "text", required: true },
        { name: "birth_date", label: "Birth date", type: "date", required: false },
        {
            name: "gender",
            label: "Gender",
            type: "select",
            required: false,
            options: [
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
                { label: "Non-binary", value: "non-binary" },
                { label: "Prefer not to say", value: "not_specified" },
            ],
        },
        ],
        size: "h-7 w-7",
    },
    {
        id: 2,
        type: "phone",
        table: "phones",
        key: "phones",
        icon: Phone,
        label: "Phone number",
        fields: [{ name: "number", label: "Phone number", type: "tel", required: true },
        {
            name: "country",
            label: "Country",
            type: "select",
            required: false,
            options: countries,
        },
        { name: "carrier", label: "Carrier", type: "text", required: false }
        ],
        size: "h-5 w-5",
    },
    {
        id: 3,
        type: "address",
        table: "addresses",
        key: "addresses",
        icon: MapPin,
        label: "Physical address",
        fields: [
            { name: "address", label: "Address", type: "text", required: true },
            { name: "city", label: "City", type: "text", required: true },
            { name: "country", label: "Country", type: "text", required: true },
            { name: "zip", label: "ZIP/Postal code", type: "text", required: false },
            { name: "latitude", label: "Latitude", type: "text", required: false },
            { name: "longitude", label: "Longitude", type: "text", required: false },
        ],
        size: "h-5 w-5",
    },
    {
        id: 4,
        type: "email",
        table: "emails",
        key: "emails",
        icon: AtSign,
        label: "Email address",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
        size: "h-5 w-5",
    },
    {
        id: 25,
        type: "domain",
        table: "domains",
        key: "domain",
        icon: Locate,
        label: "Domain",
        fields: [{ name: "domain", label: "Domain", type: "text", required: true }],
        size: "h-5 w-5",
    },
    {
        id: 5,
        type: "ip",
        table: "ips",
        key: "ips",
        icon: Locate,
        label: "IP address",
        fields: [{ name: "address", label: "IP address", type: "text", required: true }],
        size: "h-5 w-5",
    },
    {
        id: 6,
        type: "social",
        size: "h-5 w-5",
        table: "",
        key: "social_account",
        icon: Send,
        label: "Social account",
        fields: [],
        children: [
            {
                id: 7,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_facebook",
                icon: Facebook,
                color: "#1d4ed8",
                label: "Facebook",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 8,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_instagram",
                icon: Instagram,
                color: "#db2777",
                label: "Instagram",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 9,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_telegram",
                icon: Send,
                color: "#0369a1",
                label: "Telegram",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 10,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_signal",
                icon: MessageCircleDashed,
                color: "#3B45FC",
                label: "Signal",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 11,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_snapchat",
                color: "#FEFC00",
                icon: Ghost,
                label: "Snapchat",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 12,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_github",
                icon: Github,
                label: "Github",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 13,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_coco",
                icon: Send,
                label: "Coco",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                disabled: true,
                comingSoon: true,
                size: "h-5 w-5",
            },
            {
                id: 18,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_linkedin",
                color: "#116AC9",
                icon: Linkedin,
                label: "LinkedIn",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 19,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_twitter",
                icon: Twitter,
                label: "Twitter",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 20,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_tiktok",
                icon: Video,
                label: "TikTok",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 21,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_reddit",
                icon: MessageSquare,
                color: "#FF4B13",
                label: "Reddit",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 22,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_discord",
                icon: MessageCircle,
                color: "#525FEE",
                label: "Discord",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 2343,
                type: "social",
                table: "social_accounts",
                key: "social_accounts_twitch",
                icon: Twitch,
                color: "#A96FFF",
                label: "Twitch",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 14,
        type: "vehicle",
        table: "",
        icon: Car,
        label: "Vehicle",
        key: "vehicle",
        fields: [],
        children: [
            {
                id: 15,
                type: "vehicle",
                table: "vehicles",
                key: "vehicles_car",
                icon: Car,
                label: "Car",
                fields: [
                    { name: "plate", label: "License plate", type: "text", required: true },
                    { name: "model", label: "Model", type: "text", required: false },
                    { name: "brand", label: "Brand", type: "text", required: false },
                    { name: "year", label: "Year", type: "number", required: false },
                    { name: "type", label: "Type", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 16,
                type: "vehicle",
                table: "vehicles",
                key: "vehicles_motorcycle",
                icon: Bike,
                label: "Motorcycle",
                fields: [
                    { name: "plate", label: "License plate", type: "text", required: true },
                    { name: "model", label: "Model", type: "text", required: false },
                    { name: "brand", label: "Brand", type: "text", required: false },
                    { name: "year", label: "Year", type: "number", required: false },
                    { name: "type", label: "Type", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 17,
                type: "vehicle",
                table: "vehicles",
                key: "vehicles_boat",
                icon: Sailboat,
                label: "Boat",
                fields: [
                    { name: "plate", label: "Registration number", type: "text", required: true },
                    { name: "model", label: "Model", type: "text", required: false },
                    { name: "brand", label: "Brand", type: "text", required: false },
                    { name: "year", label: "Year", type: "number", required: false },
                    { name: "type", label: "Type", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 23,
                type: "vehicle",
                table: "vehicles",
                key: "vehicles_aircraft",
                icon: Plane,
                label: "Aircraft",
                fields: [
                    { name: "registration", label: "Registration", type: "text", required: true },
                    { name: "model", label: "Model", type: "text", required: false },
                    { name: "manufacturer", label: "Manufacturer", type: "text", required: false },
                    { name: "year", label: "Year", type: "number", required: false },
                    { name: "type", label: "Type", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 25,
        type: "website",
        table: "websites",
        key: "websites",
        icon: Globe,
        label: "Website",
        fields: [
            { name: "url", label: "URL", type: "url", required: true },
            { name: "registration_date", label: "Registration date", type: "date", required: false },
            { name: "registrar", label: "Registrar", type: "text", required: false },
            { name: "address", label: "IP address", type: "text", required: false },
        ],
        size: "h-5 w-5",
    },
]


