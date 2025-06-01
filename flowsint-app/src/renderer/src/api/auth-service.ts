import { useAuthStore } from '@/stores/auth-store';
import { fetchWithAuth } from './api';
import { useBoundStore } from '@/stores/useBoundStore';

interface RegisterData {
    username: string;
    email: string;
    password: string;
}

interface LoginData {
    username: string;
    password: string;
}

interface AuthResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

export const authService = {
    register: async (data: RegisterData): Promise<AuthResponse> => {
        return fetchWithAuth('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    login: async (data: LoginData): Promise<AuthResponse> => {
        // Création d'un FormData ou URLSearchParams pour la requête d'authentification
        const formData = new URLSearchParams();
        formData.append('username', data.username);
        formData.append('password', data.password);

        return fetchWithAuth('/api/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });
    },
    logout: () => {
        useBoundStore.getState().tabs.clearTabs()
        useAuthStore.getState().logout()
    },

    getCurrentUser: async () => {
        return fetchWithAuth('/api/users/me');
    }
};