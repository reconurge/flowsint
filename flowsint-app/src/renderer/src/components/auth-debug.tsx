import { useAuthStore } from '@/stores/auth-store';
import { isAuthenticated } from '@/lib/auth-utils';

export function AuthDebug() {
    const authState = useAuthStore();
    
    return (
        <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg shadow-lg z-50">
            <h3 className="font-bold mb-2">Auth State Debug</h3>
            <div className="space-y-1 text-sm">
                <p>Is Authenticated: {isAuthenticated() ? '✅' : '❌'}</p>
                <p>Has Token: {authState.token ? '✅' : '❌'}</p>
                <p>User: {authState.user ? authState.user.username : 'None'}</p>
            </div>
        </div>
    );
} 