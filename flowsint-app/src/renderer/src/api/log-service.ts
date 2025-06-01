import { fetchWithAuth } from './api';


export const logService = {
    get: async (): Promise<any> => {
        return fetchWithAuth('/api/logs', {
            method: 'GET',
        });
    },
    delete: async (): Promise<any> => {
        return fetchWithAuth(`/api/logs`, {
            method: 'DELETE',
        });
    },
};