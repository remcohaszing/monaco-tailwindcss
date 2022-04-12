import { editor } from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import { configureMonacoTailwindcss } from 'monaco-tailwindcss';
import TailwindcssWorker from 'monaco-tailwindcss/tailwindcss.worker.js?worker';

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new EditorWorker();
      case 'tailwindcss':
        return new TailwindcssWorker();
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};

configureMonacoTailwindcss({});

editor.create(document.getElementById('editor'), {
  automaticLayout: true,
  language: 'html',
  value: `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
    </head>
    <body>
      <div class="w-6 w-6 h-6 text-gray-600 bg-[#ff8888] hover:text-sky-600 ring-gray-900/5"></div>
    </body>
  </html>
  `,
});
