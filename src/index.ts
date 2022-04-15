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
  ({ tailwindConfig, languageSelector = defaultLanguageSelector } = {}) => {
    const workerManager = createWorkerManager<TailwindcssWorker, MonacoTailwindcssOptions>(
      { editor },
      {
        label: 'tailwindcss',
        moduleId: 'monaco-tailwindcss/tailwindcss.worker',
        createData: { tailwindConfig },
      },
    );

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

    // Monaco editor doesn’t provide a function to match language selectors, so let’s just support
    // strings here.
    for (const language of Array.isArray(languageSelector)
      ? languageSelector
      : [languageSelector]) {
      if (typeof language === 'string') {
        disposables.push(
          registerMarkerDataProvider(
            { editor },
            language,
            createMarkerDataProvider(workerManager.getWorker),
          ),
        );
      }
    }

    return {
      dispose() {
        for (const disposable of disposables) {
          disposable.dispose();
        }
      },

      setTailwindConfig(newTailwindConfig) {
        workerManager.updateCreateData({ tailwindConfig: newTailwindConfig });
      },

      async generateStylesFromContent(model) {
        const client = await workerManager.getWorker(model.uri);

        return client.generateStylesFromContent(String(model.uri));
      },
    };
  };
