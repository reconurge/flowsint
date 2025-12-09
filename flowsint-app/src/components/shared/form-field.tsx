// src/components/FormField.tsx
import React, { type InputHTMLAttributes } from 'react'
import { useFormContext, type RegisterOptions, type FieldError } from 'react-hook-form'
import { Input } from '../ui/input'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  registerOptions?: RegisterOptions
  error?: FieldError
  type?: string
  placeholder?: string
  className?: string
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  registerOptions,
  error,
  type = 'text',
  placeholder = '',
  className = '',
  ...rest
}) => {
  // Si utilisé dans un FormProvider, on peut récupérer le registre ici
  const formContext = useFormContext()

  // Détermine si on utilise le contexte ou des props directes
  const register = formContext ? formContext.register : undefined
  const fieldError = error || (formContext ? formContext.formState.errors[name] : undefined)

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>

      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        className={`mt-1 block w-full px-3 py-2 border ${fieldError ? 'border-red-300' : 'border-border'
          } rounded-md placeholder-gray-400 focus:outline-none sm:text-sm`}
        {...(register ? register(name, registerOptions) : {})}
        {...rest}
      />

      {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError.message as string}</p>}
    </div>
  )
}

export default FormField

// Exemple d'utilisation avec FormProvider:
/*
import { FormProvider, useForm } from 'react-hook-form';

const MyForm = () => {
  const methods = useForm();

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <FormField
          name="username"
          label="Nom d'utilisateur"
          registerOptions={{ required: 'Ce champ is required' }}
        />
        <button type="submit">Envoyer</button>
      </form>
    </FormProvider>
  );
};
*/

// Exemple d'utilisation sans FormProvider:
/*
import { useForm } from 'react-hook-form';

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        name="username"
        label="Nom d'utilisateur"
        {...register("username", { required: 'Ce champ is required' })}
        error={errors.username}
      />
      <button type="submit">Envoyer</button>
    </form>
  );
};
*/
