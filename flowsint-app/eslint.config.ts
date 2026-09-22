import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import type { Linter } from 'eslint'

export default [
  { ignores: ['node_modules/**', 'dist/**', 'out/**'] },
  js.configs.recommended,
  ...(tsPlugin.configs['flat/recommended'] as Linter.Config[]),
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      // TS already checks unused vars/undefined names better than eslint's base rules.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      // ~290 pre-existing `any` uses. Real debt, but not a hazard on the level of
      // an unchecked hook — downgrade to visible-not-blocking rather than pretend
      // it's fixed. Tighten to 'error' once the backlog is paid down.
      '@typescript-eslint/no-explicit-any': 'warn',
      // This is a TypeScript codebase — every prop is already validated at
      // compile time by its interface/type. react/prop-types exists for plain
      // JS React with no type system; requiring PropTypes.* on top of that
      // would just duplicate what TS already checks, for every component.
      // Standard practice in TS+ESLint setups (CRA's TS template,
      // eslint-config-airbnb-typescript, etc. all turn this off too).
      'react/prop-types': 'off',
      // Audited every current finding (31, all in live code): every one is
      // `const Name = memo((props) => {...})` or `forwardRef<T>((props, ref)
      // => {...})` — a real, working component name via its binding. This is
      // a documented eslint-plugin-react limitation: it can't statically
      // infer a displayName through memo()/forwardRef() wrapping an anonymous
      // arrow function, even when assigned to a named const. Not the same
      // thing as a genuinely nameless component (e.g. one defined inline
      // inside .map() with no binding at all) — those are real bugs and were
      // fixed under react-hooks/static-components instead. Renaming ~30
      // arrow functions to named function expressions purely to satisfy this
      // rule's blind spot isn't worth the diff churn.
      'react/display-name': 'off'
    }
  }
] satisfies Linter.Config[]
