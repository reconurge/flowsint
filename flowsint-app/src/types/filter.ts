export type TypeFilter = {
    type: string
    checked: boolean
}

export type RuleOperator = "is" | "not" | "like" | "startsWith" | "endsWith"
export type RuleKey = "label" | "domain" | "ip"

export type RuleFilter = {
    id: string
    key: RuleKey
    operator: RuleOperator
    matcher: string
}

export type Filters = {
    types: TypeFilter[]
    rules: RuleFilter[]
}