/* eslint-disable import/no-extraneous-dependencies */
// import react from "eslint-plugin-react";
// import reactHooks from "eslint-plugin-react-hooks";
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
// import { fixupPluginRules } from "@eslint/compat";
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
  baseDirectory: dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const config = [
  {
    ignores: ['./native/*', '.next', 'node_modules'],
  },
  ...compat.extends(
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'next/core-web-vitals',
    'prettier',
  ),
  {
    plugins: {
      // react: fixupPluginRules(react),
      // "react-hooks": fixupPluginRules(reactHooks),
      '@typescript-eslint': typescriptEslint,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },
    },

    rules: {
      'react/require-default-props': 'off',

      'jsx-a11y/label-has-associated-control': [
        2,
        {
          assert: 'either',
        },
      ],

      'no-underscore-dangle': [
        'error',
        {
          allow: ['__TAURI__'],
        },
      ],
    },
  },
];

export default config;
