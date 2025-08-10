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
    description: string
}

export function findActionItemByKey(key: string, actionItems: ActionItem[] | undefined): ActionItem | undefined {
    if (!actionItems) return
    for (const item of actionItems) {
        if (item.key === key) return item
        if (item.children) {
            const found = item.children.find(child => child.key === key)
            if (found) return found
        }
    }
    return undefined;
}