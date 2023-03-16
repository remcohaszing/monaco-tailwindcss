import { setMonaco } from 'monaco-languageserver-types';
import { registerMarkerDataProvider } from 'monaco-marker-data-provider';
import { MonacoTailwindcssOptions } from 'monaco-tailwindcss';
import { createWorkerManager } from 'monaco-worker-manager';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
  createMarkerDataProvider,
} from './languageFeatures.js';
import { TailwindcssWorker } from './tailwindcss.worker.js';

export const defaultLanguageSelector = ['css', 'javascript', 'html', 'mdx', 'typescript'] as const;

export { tailwindcssData } from './cssData.js';

export const configureMonacoTailwindcss: typeof import('monaco-tailwindcss').configureMonacoTailwindcss =
  (monaco, { languageSelector = defaultLanguageSelector, tailwindConfig } = {}) => {
    setMonaco(monaco);

    const workerManager = createWorkerManager<TailwindcssWorker, MonacoTailwindcssOptions>(monaco, {
      label: 'tailwindcss',
      moduleId: 'monaco-tailwindcss/tailwindcss.worker',
      createData: { tailwindConfig },
    });

    const disposables = [
      workerManager,
      monaco.languages.registerColorProvider(
        languageSelector,
        createColorProvider(monaco, workerManager.getWorker),
      ),
      monaco.languages.registerCompletionItemProvider(
        languageSelector,
        createCompletionItemProvider(workerManager.getWorker),
      ),
      monaco.languages.registerHoverProvider(
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
            monaco,
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

      async generateStylesFromContent(css, contents) {
        const client = await workerManager.getWorker();

        return client.generateStylesFromContent(
          css,
          contents.map((content) => (typeof content === 'string' ? { content } : content)),
        );
      },
    };
  };
