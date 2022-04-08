import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { registerMarkerDataProvider } from 'monaco-marker-data-provider';
import { MonacoTailwindcssOptions } from 'monaco-tailwindcss';
import { createWorkerManager } from 'monaco-worker-manager';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
  createMarkerDataProvider,
} from './languageFeatures';
import { TailwindcssWorker } from './tailwindcss.worker';

export const defaultLanguageSelector = ['css', 'javascript', 'html', 'mdx', 'typescript'] as const;

export { tailwindcssData } from './cssData';

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
      registerMarkerDataProvider(
        { editor },
        'html',
        createMarkerDataProvider(workerManager.getWorker),
      ),
    ];

    // Monaco editor doesn’t provide a function to match language selectors, so let’s just support
    // strings here.
    for (const language of Array.isArray(languageSelector)
      ? languageSelector
      : [languageSelector]) {
      if (typeof language === 'string') {
        registerMarkerDataProvider(
          { editor },
          language,
          createMarkerDataProvider(workerManager.getWorker),
        );
      }
    }

    return {
      dispose() {
        while (disposables.length) {
          disposables.pop()?.dispose();
        }
      },

      setConfig(tailwindConfig) {
        workerManager.updateCreateData({ config: tailwindConfig });
      },
    };
  };
