import { FieldType, SelectOption } from "@/lib/action-items";

export type Filter = {
    type: string;
    checked: boolean;
    fields?: FilterField[]
};

export type FilterField = {
    name: string
    type: FieldType,
    pattern: string,
    operator: 'is' | "not" | "isLike" | "startsWith" | "endsWith" | null,
    checked: boolean
    // options in case of a select
    options?: SelectOption[]
}

export type Filters = {
    [key: string]: Filter
}