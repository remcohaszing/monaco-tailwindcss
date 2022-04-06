import { languages } from 'monaco-editor/esm/vs/editor/editor.api.js';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
} from './languageFeatures';
import { createWorkerManager } from './workerManager';

export const defaultLanguageSelector = ['javascript', 'html', 'mdx', 'typescript'] as const;

export const configureMonacoTailwindcss: typeof import('monaco-tailwindcss').configureMonacoTailwindcss =
  ({ config, languageSelector = defaultLanguageSelector } = {}) => {
    const getWorker = createWorkerManager({ config });

    const disposables = [
      languages.registerColorProvider(languageSelector, createColorProvider(getWorker)),
      languages.registerCompletionItemProvider(
        languageSelector,
        createCompletionItemProvider(getWorker),
      ),
      languages.registerHoverProvider(languageSelector, createHoverProvider(getWorker)),
    ];

    return {
      dispose() {
        disposables.map((disposable) => disposable.dispose());
      },
    };
  };
