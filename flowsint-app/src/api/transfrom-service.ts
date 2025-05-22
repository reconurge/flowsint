import { fetchWithAuth } from './api';


export const transformService = {
    get: async (): Promise<any> => {
        return fetchWithAuth('/api/transforms', {
            method: 'GET',
        });
    },
    getById: async (transformId: string): Promise<any> => {
        return fetchWithAuth(`/api/transforms/${transformId}`, {
            method: 'GET',
        });
    },
    create: async (body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/transforms/create`, {
            method: 'POST',
            body: body
        });
    },
    update: async (transformId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/transforms/${transformId}`, {
            method: 'PUT',
            body: body
        });
    },
    compute: async (transformId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/transforms/${transformId}/compute`, {
            method: 'POST',
            body: body
        });
    },
    launch: async (transformId: string, body: BodyInit): Promise<any> => {
        return fetchWithAuth(`/api/transforms/${transformId}/launch`, {
            method: 'POST',
            body: body
        });
    },
    getRawMaterial: async (): Promise<any> => {
        return fetchWithAuth(`/api/transforms/raw_material`, {
            method: 'GET',
        });
    },
};