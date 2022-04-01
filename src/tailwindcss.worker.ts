// @ts-expect-error XXX
import { initialize } from 'monaco-editor/esm/vs/editor/editor.worker.js';

import { createTailwindcssWorker } from './tailwindcssWorker';

self.onmessage = () => {
  // @ts-expect-error XXX
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
  initialize((ctx, createData) => Object.create(createTailwindcssWorker(ctx, createData)));
};
