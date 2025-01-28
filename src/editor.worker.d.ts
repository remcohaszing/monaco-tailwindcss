declare module 'monaco-editor/esm/vs/editor/editor.worker.js' {
  import type * as m from 'monaco-editor';
  // Add the necessary type declarations here
  export function initialize<T>(cb: (ctx: m.worker.IWorkerContext, data: T) => void): void;
  // Add other exports if needed
}
