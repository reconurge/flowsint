import { createFileRoute, Link } from '@tanstack/react-router';
import { useRegister } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export const Route = createFileRoute('/register')({
    component: Register,
})

const registerSchema = z.object({
    username: z.string()
        .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
        .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères'),
    email: z.string()
        .email('Veuillez entrer une adresse email valide'),
    password: z.string()
        .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
});

// Type inféré à partir du schéma Zod
type RegisterFormValues = z.infer<typeof registerSchema>;

function Register() {
    // Initialisation de React Hook Form avec Zod
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        }
    });

    // Hook d'inscription
    const registerMutation = useRegister();

    // Gestion de la soumission du formulaire
    const onSubmit = async (data: RegisterFormValues) => {
        try {
            // Soumettre le formulaire d'inscription (sans confirmPassword)
            const { confirmPassword, ...registerData } = data;
            await registerMutation.mutateAsync(registerData);
            // La redirection est gérée dans le hook useRegister
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Créer un compte
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Affichage des erreurs de l'API */}
                    {registerMutation.error && (
                        <div className="p-3 mb-4 text-sm bg-red-100 border border-red-400 text-red-700 rounded">
                            {registerMutation.error instanceof Error
                                ? registerMutation.error.message
                                : 'Erreur lors de l\'inscription'}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm space-y-4">
                        {/* Champ username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Nom d'utilisateur
                            </label>
                            <input
                                id="username"
                                {...register('username')}
                                type="text"
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                disabled={registerMutation.isPending}
                            />
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Champ email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Adresse email
                            </label>
                            <input
                                id="email"
                                {...register('email')}
                                type="email"
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                disabled={registerMutation.isPending}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Champ mot de passe */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                {...register('password')}
                                type="password"
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                disabled={registerMutation.isPending}
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Champ confirmation de mot de passe */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirmer le mot de passe
                            </label>
                            <input
                                id="confirmPassword"
                                {...register('confirmPassword')}
                                type="password"
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                disabled={registerMutation.isPending}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Bouton de soumission */}
                    <div>
                        <button
                            type="submit"
                            disabled={registerMutation.isPending || isSubmitting}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {registerMutation.isPending || isSubmitting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Inscription en cours...
                                </span>
                            ) : 'S\'inscrire'}
                        </button>
                    </div>
                </form>

                {/* Lien vers la page de connexion */}
                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                        Vous avez déjà un compte?{' '}
                        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Se connecter
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;