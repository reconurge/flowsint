import { fetchWithAuth } from './api';


export const logService = {
    get: async (sketch_id: string): Promise<any> => {
        return fetchWithAuth(`/api/logs/sketch/${sketch_id}`, {
            method: 'GET',
        });
    },
    delete: async (sketch_id: string): Promise<any> => {
        return fetchWithAuth(`/api/logs/sketch/${sketch_id}`, {
            method: 'DELETE',
        });
    },
};