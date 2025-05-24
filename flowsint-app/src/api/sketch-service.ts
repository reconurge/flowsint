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
    getGraphDataById: async (sketchId: string): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/graph`, {
            method: 'GET',
        });
    },
    create: async (body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/create`, {
            method: 'POST',
            body: body
        });
    },
    addNode: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/nodes/add`, {
            method: 'POST',
            body: body
        });
    },
    addEdge: async (sketchId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/sketches/${sketchId}/edges/add`, {
            method: 'POST',
            body: body
        });
    },
};