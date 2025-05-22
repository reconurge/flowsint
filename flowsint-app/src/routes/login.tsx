import { Link } from '@tanstack/react-router';
import { useLogin } from '@/hooks/use-auth';
import { FormProvider, useForm } from 'react-hook-form';
import FormField from '@/components/shared/form-field';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
    component: Login,
})

const loginSchema = z.object({
    username: z.string().min(1, 'Nom d\'utilisateur requis'),
    password: z.string().min(1, 'Mot de passe requis'),
    rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
    // Initialisation de React Hook Form
    const methods = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: '',
            rememberMe: false,
        }
    });
    const login = useLogin();
    const onSubmit = async (data: LoginFormValues) => {
        try {
            await login.mutateAsync({
                username: data.username,
                password: data.password
            });
        } catch (error) {
            console.error('Erreur login:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Connexion à votre compte
                    </h2>
                </div>

                <FormProvider {...methods}>
                    <form className="mt-8 space-y-6" onSubmit={methods.handleSubmit(onSubmit)}>
                        {/* Affichage des erreurs */}
                        {login.error && (
                            <div className="p-3 mb-4 text-sm bg-red-100 border border-red-400 text-red-700 rounded">
                                {login.error instanceof Error ? login.error.message : 'Erreur de connexion'}
                            </div>
                        )}

                        <div className="rounded-md shadow-sm space-y-4">
                            {/* Champ username */}
                            <FormField
                                name="username"
                                label="Nom d'utilisateur"
                                placeholder="Votre nom d'utilisateur"
                                disabled={login.isPending}
                            />

                            {/* Champ mot de passe */}
                            <FormField
                                name="password"
                                label="Mot de passe"
                                type="password"
                                placeholder="Votre mot de passe"
                                disabled={login.isPending}
                            />
                        </div>

                        {/* Options supplémentaires */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="rememberMe"
                                    {...methods.register('rememberMe')}
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                                    Se souvenir de moi
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Mot de passe oublié?
                                </a>
                            </div>
                        </div>

                        {/* Bouton de soumission */}
                        <div>
                            <button
                                type="submit"
                                disabled={login.isPending || methods.formState.isSubmitting}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                            >
                                {login.isPending || methods.formState.isSubmitting ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Connexion en cours...
                                    </span>
                                ) : 'Se connecter'}
                            </button>
                        </div>
                    </form>
                </FormProvider>

                {/* Lien vers la page d'inscription */}
                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        Vous n'avez pas de compte?{' '}
                        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;