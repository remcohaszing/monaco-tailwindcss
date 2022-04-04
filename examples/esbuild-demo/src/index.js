import * as monaco from 'monaco-editor';
import { configureMonacoTailwindcss } from 'monaco-tailwindcss';

configureMonacoTailwindcss();

// Required Js to initiate the workers created above.
window.MonacoEnvironment = {
    getWorkerUrl: (moduleId, label) => {
        switch (label) {
            case 'json':
                return new URL('language/json/json.worker.js', import.meta.url).pathname
            case 'css':
            case 'scss':
            case 'less':
                return new URL('language/css/css.worker.js', import.meta.url).pathname
            case 'html':
            case 'handlebars':
            case 'razor':
                return new URL('language/html/html.worker.js', import.meta.url).pathname
            case 'typescript':
            case 'javascript':
                return new URL('language/typescript/ts.worker.js', import.meta.url).pathname
            case 'editorWorkerService':
              return new URL('editor/editor.worker.js', import.meta.url).pathname

            case 'tailwindcss':
              return new URL('monaco-tailwindcss/tailwindcss.worker.js', import.meta.url).pathname
            default:
              throw new Error(`Unknown label ${label}`);
        }
    }
};

const mount = document.getElementById('editor')

monaco.editor.create(mount, {
  value: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div class="w-6 h-6 text-gray-600 bg-[#ff8888] hover:text-sky-600 ring-gray-900/5"></div>
  </body>
</html>
`,
  language: 'html',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  theme: 'vs-dark'
});
