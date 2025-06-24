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
    icon: string
    label: string
    color?: string
    fields: FormField[]
    size?: string
    label_key: string
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
        id: 100,
        type: "person",
        table: "",
        key: "person",
        icon: "individual",
        label: "Person",
        label_key: "name",
        fields: [],
        children: [
            {
                id: 1,
                type: "Individual",
                table: "individuals",
                key: "individual",
                label_key: "first_name",
                icon: "individual",
                label: "Individual",
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
                id: 512932,
                type: "Username",
                table: "usernames",
                key: "username",
                icon: "username",
                label: "Username",
                label_key: "username",
                fields: [{ name: "username", label: "Username", type: "text", required: true }],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 101,
        type: "organization",
        table: "",
        key: "organization_category",
        icon: "organization",
        label: "Organization",
        label_key: "name",
        fields: [],
        children: [
            {
                id: 24,
                type: "Organization",
                table: "organizations",
                key: "organization",
                icon: "organization",
                label: "Organization",
                label_key: "name",
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
        ],
    },
    {
        id: 102,
        type: "contact",
        table: "",
        key: "contact",
        icon: "phone",
        label: "Contact",
        label_key: "value",
        fields: [],
        children: [
            {
                id: 2,
                type: "Phone",
                table: "phones",
                key: "phone",
                label_key: "number",
                icon: "phone",
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
                id: 4,
                type: "Email",
                table: "emails",
                key: "email",
                icon: "email",
                label_key: "email",
                label: "Email address",
                fields: [{ name: "email", label: "Email", type: "email", required: true }],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 103,
        type: "digital",
        table: "",
        key: "digital",
        icon: "website",
        label: "Digital",
        label_key: "value",
        fields: [],
        children: [
            {
                id: 25,
                type: "Website",
                table: "websites",
                key: "website",
                label_key: "url",
                icon: "website",
                label: "Website",
                fields: [
                    { name: "url", label: "URL", type: "url", required: true },
                    { name: "registration_date", label: "Registration date", type: "date", required: false },
                    { name: "registrar", label: "Registrar", type: "text", required: false },
                    { name: "address", label: "IP address", type: "text", required: false },
                ],
                size: "h-5 w-5",
            },
            {
                id: 259,
                type: "Domain",
                table: "domains",
                key: "domain",
                icon: "domain",
                label_key: "domain",
                label: "Domain",
                fields: [{ name: "domain", label: "Domain", type: "text", required: true }],
                size: "h-5 w-5",
            },
            {
                id: 2588,
                type: "Subdomain",
                table: "subdomains",
                key: "subdomain",
                label_key: "subomain",
                icon: "subdomain",
                label: "Subdomain",
                fields: [{ name: "subomain", label: "subdomain", type: "text", required: true }, { name: "root", label: "root domain", type: "text", required: true }],
                size: "h-5 w-5",
            },
            {
                id: 5,
                type: "Ip",
                table: "ips",
                key: "ip",
                icon: "ip",
                label: "IP address",
                label_key: "address",
                fields: [{ name: "address", label: "IP address", type: "text", required: true }],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 104,
        type: "finance",
        table: "",
        key: "finance",
        icon: "cryptowallet",
        label: "Finance",
        label_key: "value",
        fields: [],
        children: [
            {
                id: 215,
                type: "CryptoWallet",
                table: "wallets",
                key: "wallet",
                label_key: "wallet",
                icon: "cryptowallet",
                label: "Crypto wallet",
                fields: [
                    { name: "wallet", label: "Wallet", type: "text", required: true },
                    {
                        name: "type",
                        label: "Wallet type",
                        type: "select",
                        required: true,
                        options: [
                            { label: "ETH", value: "eth" },
                            { label: "BTC", value: "btc" },
                            { label: "TRC", value: "trc" },],
                    },
                ],
                size: "h-5 w-5",
            },
        ],
    },
    {
        id: 105,
        type: "location",
        table: "",
        key: "location",
        icon: "location",
        label: "Location",
        label_key: "address",
        fields: [],
        children: [
            {
                id: 3,
                type: "Location",
                table: "addresses",
                label_key: "address",
                key: "address",
                icon: "location",
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
        ],
    },
    {
        id: 6,
        type: "Socials",
        size: "h-5 w-5",
        table: "",
        key: "social_profile",
        icon: "social_profile",
        label: "Social account",
        label_key: "username",
        fields: [],
        children: [
            {
                id: 7,
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_facebook",
                label_key: "username",
                icon: "facebook",
                color: "#0765FF",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_instagram",
                label_key: "username",
                icon: "instagram",
                color: "#FE0979",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_telegram",
                label_key: "username",
                icon: "telegram",
                color: "#32A9DF",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_signal",
                label_key: "username",
                icon: "signal",
                color: "#3976F0",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_snapchat",
                label_key: "username",
                color: "#FEFC00",
                icon: "snapchat",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_github",
                label_key: "username",
                color: "#B8B8BD",
                icon: "github",
                label: "Github",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: false },
                    { name: "username", label: "Username", type: "text", required: true },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            // {
            //     id: 13,
            //     type: "SocialProfile",
            //     table: "social_profiles",
            //     key: "social_profiles_coco",
            //     label_key: "username",
            //     icon: "social_profile",
            //     label: "Coco",
            //     fields: [
            //         { name: "profile_url", label: "Profile URL", type: "url", required: true },
            //         { name: "username", label: "Username", type: "text", required: false },
            //         { name: "platform", label: "Platform", type: "hidden", required: true },
            //     ],
            //     disabled: true,
            //     comingSoon: true,
            //     size: "h-5 w-5",
            // },
            {
                id: 18,
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_linkedin",
                label_key: "username",
                color: "#007EBB",
                icon: "linkedin",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_twitter",
                label_key: "username",
                icon: "x",
                color: "#1C9BEF",
                label: "X (Twitter)",
                fields: [
                    { name: "profile_url", label: "Profile URL", type: "url", required: true },
                    { name: "username", label: "Username", type: "text", required: false },
                    { name: "platform", label: "Platform", type: "hidden", required: true },
                ],
                size: "h-5 w-5",
            },
            {
                id: 20,
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_tiktok",
                label_key: "username",
                color: "#6C2B53",
                icon: "tiktok",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_reddit",
                label_key: "username",
                icon: "reddit",
                color: "#FF5701",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_discord",
                label_key: "username",
                icon: "discord",
                color: "#5765F2",
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
                type: "SocialProfile",
                table: "social_profiles",
                key: "social_profiles_twitch",
                label_key: "username",
                icon: "twitch",
                color: "#9046FF",
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
        icon: "car",
        label: "Vehicle",
        label_key: "plate",
        key: "vehicle",
        fields: [],
        children: [
            {
                id: 15,
                type: "Vehicle",
                table: "vehicles",
                key: "vehicles_car",
                icon: "car",
                label: "Car",
                label_key: "plate",
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
                type: "Vehicle",
                table: "vehicles",
                key: "vehicles_motorcycle",
                label_key: "plate",
                icon: "motorcycle",
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
                type: "Vehicle",
                table: "vehicles",
                key: "vehicles_boat",
                label_key: "plate",
                icon: "boat",
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
                type: "Vehicle",
                table: "vehicles",
                key: "vehicles_aircraft",
                icon: "plane",
                label_key: "plate",
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
]

export function findActionItemByKey(key: string): ActionItem | undefined {
    for (const item of actionItems) {
        if (item.key === key) return item
        if (item.children) {
            const found = item.children.find(child => child.key === key)
            if (found) return found
        }
    }
    return undefined;
}