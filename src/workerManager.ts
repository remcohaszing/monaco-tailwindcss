import { editor, languages, Uri } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { TailwindConfig } from 'tailwindcss/tailwind-config';

import { TailwindcssWorker } from './tailwindcssWorker';

export type WorkerAccessor = (...more: Uri[]) => PromiseLike<TailwindcssWorker>;

export interface MonacoTailwindcssOptions {
  /**
   * @default defaultLanguageSelector
   */
  languageSelector?: languages.LanguageSelector;

  config?: TailwindConfig;
}

// 2min
const STOP_WHEN_IDLE_FOR = 2 * 60 * 1000;

export function createWorkerManager(createData: MonacoTailwindcssOptions): WorkerAccessor {
  let worker: editor.MonacoWebWorker<TailwindcssWorker> | undefined;
  let client: Promise<TailwindcssWorker> | undefined;
  let lastUsedTime = 0;

  const stopWorker = (): void => {
    if (worker) {
      worker.dispose();
      worker = undefined;
    }
    client = undefined;
  };

  setInterval(() => {
    if (!worker) {
      return;
    }
    const timePassedSinceLastUsed = Date.now() - lastUsedTime;
    if (timePassedSinceLastUsed > STOP_WHEN_IDLE_FOR) {
      stopWorker();
    }
  }, 30 * 1000);

  // This is necessary to have updated language options take effect (e.g. schema changes)
  // defaults.onDidChange(() => stopWorker());

  return async (...resources) => {
    lastUsedTime = Date.now();

    if (!client) {
      worker = editor.createWebWorker<TailwindcssWorker>({
        moduleId: 'monaco-tailwindcss',
        label: 'tailwindcss',
        createData,
      });

      client = worker.getProxy();
    }

    await worker!.withSyncedResources(resources);
    return client;
  };
}
