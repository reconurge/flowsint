/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'src/**/*.{js,ts,jsx,tsx,mdx}',
    'src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-sans)'
        ],
        mono: [
          'var(--font-mono)'
        ]
      },
      colors: {
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      }
    }
  },
  safelist: [
    'bg-gradient-to-br',
    'from-slate-50', 'to-slate-100',
    'from-sky-50', 'to-sky-100',
    'from-amber-50', 'to-amber-100',
    'from-emerald-50', 'to-emerald-100',
    'from-pink-50', 'to-pink-100',
    'from-purple-50', 'to-purple-100',
    'from-blue-50', 'to-blue-100',
    'dark:from-slate-800', 'dark:to-slate-900',
    'dark:from-sky-800', 'dark:to-sky-900',
    'dark:from-amber-950', 'dark:to-amber-900',
    'dark:from-emerald-950', 'dark:to-emerald-900',
    'dark:from-pink-800', 'dark:to-pink-900',
    'dark:from-purple-950', 'dark:to-purple-900',
    'dark:from-blue-800', 'dark:to-blue-900',
    'border-slate-200', 'dark:border-slate-700',
    'border-sky-200', 'dark:border-sky-700',
    'border-amber-200', 'dark:border-amber-800',
    'border-emerald-200', 'dark:border-emerald-800',
    'border-pink-200', 'dark:border-pink-700',
    'border-purple-200', 'dark:border-purple-800',
    'border-blue-200', 'dark:border-blue-700',
    'shadow', 'shadow-sm',
    'dark:shadow-slate-900/30',
    'dark:shadow-sky-900/30',
    'dark:shadow-amber-900/30',
    'dark:shadow-emerald-900/30',
    'dark:shadow-pink-900/30',
    'dark:shadow-purple-900/30',
    'dark:shadow-blue-900/30',
    'bg-orange-100', 'text-orange-800', 'dark:bg-orange-900/30', 'dark:text-orange-300', 'dark:hover:bg-orange-900/40',
    'bg-purple-100', 'text-purple-800', 'dark:bg-purple-900/30', 'dark:text-purple-300', 'dark:hover:bg-purple-900/40',
    'bg-yellow-100', 'text-yellow-800', 'dark:bg-yellow-900/30', 'dark:text-yellow-300', 'dark:hover:bg-yellow-900/40',
    'bg-green-100', 'text-green-800', 'dark:bg-green-900/30', 'dark:text-green-300', 'dark:hover:bg-green-900/40',
    'bg-red-100', 'text-red-800', 'dark:bg-red-900/30', 'dark:text-red-300', 'dark:hover:bg-red-900/40',
    'bg-blue-100', 'text-blue-800', 'dark:bg-blue-900/30', 'dark:text-blue-300', 'dark:hover:bg-blue-900/40',
    'bg-fuchsia-100', 'text-fuchsia-800', 'dark:bg-fuchsia-900/30', 'dark:text-fuchsia-300', 'dark:hover:bg-fuchsia-900/40',
    'bg-teal-100', 'text-teal-800', 'dark:bg-teal-900/30', 'dark:text-teal-300', 'dark:hover:bg-teal-900/40',
    'bg-rose-100', 'text-rose-800', 'dark:bg-rose-900/30', 'dark:text-rose-300', 'dark:hover:bg-rose-900/40',
    'bg-indigo-100', 'text-indigo-800', 'dark:bg-indigo-900/30', 'dark:text-indigo-300', 'dark:hover:bg-indigo-900/40',
    'bg-lime-100', 'text-lime-800', 'dark:bg-lime-900/30', 'dark:text-lime-300', 'dark:hover:bg-lime-900/40',
    'bg-amber-100', 'text-amber-800', 'dark:bg-amber-900/30', 'dark:text-amber-300', 'dark:hover:bg-amber-900/40',
    'bg-gray-100', 'text-gray-800', 'dark:bg-gray-800/50', 'dark:text-gray-300', 'dark:hover:bg-gray-800/60',
  ],
  darkMode: ["class"],
}
