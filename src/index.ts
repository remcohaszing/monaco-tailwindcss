import { languages } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { MonacoTailwindcssOptions } from 'monaco-tailwindcss';
import { createWorkerManager } from 'monaco-worker-manager';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
} from './languageFeatures';
import { TailwindcssWorker } from './tailwindcss.worker';

export const defaultLanguageSelector = ['javascript', 'html', 'mdx', 'typescript'] as const;

export const configureMonacoTailwindcss: typeof import('monaco-tailwindcss').configureMonacoTailwindcss =
  ({ config, languageSelector = defaultLanguageSelector } = {}) => {
    const workerManager = createWorkerManager<TailwindcssWorker, MonacoTailwindcssOptions>({
      label: 'tailwindcss',
      moduleId: 'monaco-tailwindcss/tailwindcss.worker',
      createData: { config },
    });

    const disposables = [
      workerManager,
      languages.registerColorProvider(
        languageSelector,
        createColorProvider(workerManager.getWorker),
      ),
      languages.registerCompletionItemProvider(
        languageSelector,
        createCompletionItemProvider(workerManager.getWorker),
      ),
      languages.registerHoverProvider(
        languageSelector,
        createHoverProvider(workerManager.getWorker),
      ),
    ];

    return {
      dispose() {
        while (disposables.length) {
          disposables.pop()?.dispose();
        }
      },
    };
  };
