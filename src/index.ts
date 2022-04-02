import { IDisposable } from 'monaco-editor/esm/vs/editor/editor.api.js';
import type * as Monaco from 'monaco-editor'

declare global {
  interface Window {
    monaco?: typeof Monaco
  }
}

import {
  createColorProvider,
  createCompletionItemProvider,
  createHoverProvider,
} from './languageFeatures';
import { createWorkerManager, MonacoTailwindcssOptions } from './workerManager';

export const defaultLanguageSelector = ['javascript', 'html', 'mdx', 'typescript'] as const;

export function configureMonacoTailwindcss(monaco: typeof Monaco | undefined = window.monaco, {config, languageSelector = defaultLanguageSelector,}: MonacoTailwindcssOptions = {}): IDisposable | void {
  if (!monaco) {
    console.error("monaco not defined");
    return;
  }

  const getWorker = createWorkerManager(monaco, { config });

  const disposables = [
    monaco.languages.registerColorProvider(languageSelector, createColorProvider(getWorker)),
    monaco.languages.registerCompletionItemProvider(
      languageSelector,
      createCompletionItemProvider(getWorker),
    ),
    monaco.languages.registerHoverProvider(languageSelector, createHoverProvider(getWorker)),
  ];

  return {
    dispose() {
      while (disposables.length) {
        disposables.pop()?.dispose();
      }
    },
  };
}
