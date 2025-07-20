import { fetchWithAuth } from './api';


export const sketchService = {
    get: async (): Promise<any> => {
        return fetchWithAuth('/api/sketches', {
            method: 'GET',
        });
    },
    getById: async (sketchId: string): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}`, {
            method: 'GET',
        });
    },
    getGraphDataById: async (sketchId: string, inline: boolean = false): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/graph?format=${inline ? 'inline' : ''}`, {
            method: 'GET',
        });
    },
    create: async (body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/create`, {
            method: 'POST',
            body: body
        });
    },
    delete: async (sketchId: string): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}`, {
            method: 'DELETE',
        });
    },
    addNode: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/nodes/add`, {
            method: 'POST',
            body: body
        });
    },
    addEdge: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/relations/add`, {
            method: 'POST',
            body: body
        });
    },
    deleteNodes: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/nodes`, {
            method: 'DELETE',
            body: body
        });
    },
    updateNode: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/nodes/edit`, {
            method: 'PUT',
            body: body
        });
    },
    getNodeNeighbors: async (sketchId: string, nodeId: string): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/nodes/${nodeId}`, {
            method: 'GET'
        });
    },
    types: async (): Promise<any> => {
        return fetchWithAuth(`/api/types`, {
            method: 'GET'
        });
    },
};