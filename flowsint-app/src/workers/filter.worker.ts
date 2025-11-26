import { Filters, GraphNode } from "@/types"

const operators = {
    is: (value: string, pattern: string) => value === pattern,
    not: (value: string, pattern: string) => value !== pattern,
    contains: (value: string, pattern: string) => value?.includes(pattern),
    startsWith: (value: string, pattern: string) => value?.startsWith(pattern),
    endsWith: (value: string, pattern: string) => value?.endsWith(pattern),
};

export const computeFilteredNodes = (nodes: GraphNode[], filters: Filters): GraphNode[] => {
    const areAllToggled = Object.keys(filters).every((key: string) => filters[key].checked)
    const areNoneToggled = Object.keys(filters).every((key: string) => !filters[key].checked)
    if (areNoneToggled || areAllToggled) return nodes
    // first filter on the actual node types
    const types = Object.keys(filters).filter((key: string) => !filters[key].checked).map((key: string) => filters[key].type)
    return nodes.filter((node) => !types.includes(node.data.type))
}


// Pour chaque catégorie c:
//   Pour chaque field activé:
//     Comparer la valeur du node[field.name]
//     Avec operator/pattern
// Si tous les critères matchent → node visible
// Sinon → node filtré