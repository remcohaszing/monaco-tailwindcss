import { editor, languages, Uri } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { registerMarkerDataProvider } from 'monaco-marker-data-provider';
import { ModelLike, MonacoTailwindcssOptions } from 'monaco-tailwindcss';
import { createWorkerManager } from 'monaco-worker-manager';
import { ChangedContent } from 'tailwindcss/src/lib/setupContextUtils.js';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
  createMarkerDataProvider,
} from './languageFeatures';
import { TailwindcssWorker } from './tailwindcss.worker';

export const defaultLanguageSelector = ['css', 'javascript', 'html', 'mdx', 'typescript'] as const;

export { tailwindcssData } from './cssData';

function parseModelLike(value: ModelLike): ChangedContent {
  const modelOrString = Uri.isUri(value) ? editor.getModel(value) : value;
  if (!modelOrString) {
    return { content: '' };
  }
  if (typeof modelOrString === 'string') {
    return { content: modelOrString };
  }
  return {
    content: modelOrString.getValue(),
    extension: modelOrString.getLanguageId(),
  };
}

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

      async generateStylesFromContent(css, content) {
        const client = await workerManager.getWorker();

        return client.generateStylesFromContent(
          parseModelLike(css).content,
          content.map(parseModelLike),
        );
      },
    };
  };
