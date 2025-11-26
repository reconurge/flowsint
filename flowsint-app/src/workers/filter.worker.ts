import { Filters, GraphNode } from "@/types"
type OperatorFn = (value: any, pattern: any) => boolean;

const operatorMap: Record<string, OperatorFn> = {
    is: (v, p) => v === p,
    contains: (v, p) => typeof v === "string" && v.includes(p),
    startsWith: (v, p) => typeof v === "string" && v.startsWith(p),
    endsWith: (v, p) => typeof v === "string" && v.endsWith(p),
    // ajoute les tiens si besoin
};

export const computeFilteredNodes = (nodes: GraphNode[], filters: Filters): GraphNode[] => {
    const filterKeys = Object.keys(filters);
    // if "regular", not advanced, case where "fields" key is undefined
    if (filterKeys.every(key => !filters[key].fields)) {
        const areAllToggled = filterKeys.every(key => filters[key].checked);
        const areNoneToggled = filterKeys.every(key => !filters[key].checked);
        if (areAllToggled || areNoneToggled) return nodes;
    }
    // Step 1 — filtrer les types désactivés (catégories)
    const disabledTypes = filterKeys
        .filter(key => !filters[key].checked)
        .map(key => filters[key].type);

    let result = nodes.filter(node => !disabledTypes.includes(node.data.type));

    // Step 2 — filtrer les nodes selon les fields des types activés
    result = result.filter(node => {
        const type = node.data.type;
        const filterDef = filters[type];
        if (!filterDef) return true; // pas de filtre pour ce type

        const activeFields = filterDef?.fields?.filter(f => f.checked);
        for (const field of activeFields) {
            if (!field.operator) throw Error(`Missing operator for checked field ${field.name}`)
            const opFn = operatorMap[field.operator];
            if (!opFn) continue;

            const nodeValue = node.data[field.name];
            const match = opFn(nodeValue, field.pattern);

            if (!match) return false; // un seul field non match → node exclu
        }

        return true;
    });

    return result;
};
