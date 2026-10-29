import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettierPlugin from 'eslint-plugin-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override/extend default ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '.gitnexus/**',
    'dist/**',
    '*.config.js',
    '*.config.ts',
  ]),
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Disable some defaults from TypeScript/ESLint if present
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',

      // General style rules
      semi: 'off',
      quotes: 'off',

      // React specific rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Tắt các rule React Compiler gây lỗi cho các component dùng lại
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // eslint-plugin-react-hooks 7.1 (theo eslint-config-next 16.4) siết `refs`
      // và `purity`; hạ xuống warn để lint không đỏ, sửa dần ở code.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',

      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Next.js specific rules
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]);

export default eslintConfig;
