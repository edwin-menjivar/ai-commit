import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The CLI deliberately leaves unused catch bindings out (`catch {}`), and
      // prefixing an underscore is the conventional way to mark an intentionally
      // unused argument.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['__tests__/**/*.ts'],
    rules: {
      // Tests cast mocks freely; being strict about `any` there buys nothing.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
);
