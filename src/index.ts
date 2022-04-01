import { IDisposable, languages } from 'monaco-editor/esm/vs/editor/editor.api.js';

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
} from './languageFeatures';
import { createWorkerManager, MonacoTailwindcssOptions } from './workerManager';

export const defaultLanguageSelector = ['javascript', 'html', 'mdx', 'typescript'] as const;

export function configureMonacoTailwindcss({
  config,
  languageSelector = defaultLanguageSelector,
}: MonacoTailwindcssOptions = {}): IDisposable {
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
      while (disposables.length) {
        disposables.pop()?.dispose();
      }
    },
  };
}
