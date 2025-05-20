'use server'

import { serverFetch } from "../server-fetch";

export async function performTransform(values: string[], transform_id: string, sketch_id: string | null) {
    const url = `${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/${transform_id}/launch`;
    const body = JSON.stringify({
        values: values,
        sketch_id: sketch_id
    })
    const response = await serverFetch(url, {
        method: "POST",
        body: body
    })
    return { ...response, status: response.status };
}