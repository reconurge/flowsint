// src/routes/register.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRegister } from '@/hooks/use-auth'
import { useForm, FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import FormField from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/register')({
  component: Register
})

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
      .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères"),
    email: z.string().email('Veuillez entrer une adresse email valide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword']
  })

type RegisterFormValues = z.infer<typeof registerSchema>

function Register() {
  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const registerMutation = useRegister()

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const { confirmPassword, ...registerData } = data
      await registerMutation.mutateAsync(registerData)
    } catch (error) {
      console.error("Erreur d'inscription:", error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">Create an account</h2>
        </div>

        <FormProvider {...methods}>
          <form className="mt-8 space-y-6" onSubmit={methods.handleSubmit(onSubmit)}>
            {registerMutation.error && (
              <div className="p-3 mb-4 text-sm bg-red-100 border border-red-400 text-red-700 rounded">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : 'An error occurred registering.'}
              </div>
            )}

            <div className="space-y-4">
              <FormField name="username" label="Username" />
              <FormField name="email" label="Email" type="email" />
              <FormField name="password" label="Password" type="password" />
              <FormField name="confirmPassword" label="Confirm password" type="password" />
            </div>

            <div>
              <Button
                type="submit"
                disabled={registerMutation.isPending || methods.formState.isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                {registerMutation.isPending || methods.formState.isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                           5.291A7.962 7.962 0 014 12H0c0 
                           3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Register'
                )}
              </Button>
            </div>
          </form>
        </FormProvider>

        <div className="text-center mt-4">
          <p className="text-sm">
            Already have an account ?{' '}
            <Link to="/login" className="font-medium text-primary underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
