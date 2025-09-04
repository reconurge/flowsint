

export function deepObjectDiff(obj1, obj2) {
    let diffObject = {}
    // We want object 2 to be compared against object 1
    if (typeof obj1 != "object" || typeof obj2 != "object") throw Error("Items to compare mustr be objects.")
    // We map over the obj2 key:value duos
    Object.entries(obj2).forEach(([key, value]) => {
        // We check for additional keys
        if (!obj1.hasOwnProperty(key))
            diffObject = { ...diffObject, [key]: { value, new: true } }
        else {
            diffObject = { ...diffObject, [key]: { value, new: false, oldValue: obj1[key] ?? null, newValue: obj2[key] ?? null, identical: obj2[key] === obj1[key] } }
        }
    })
    return diffObject

}

const diffObject = deepObjectDiff({ key1: "value1", key2: "value2" }, { key1: "value1", key2: "value3", key3: "value4" })
console.log(diffObject)