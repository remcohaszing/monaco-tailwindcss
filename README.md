# Monaco Tailwindcss

[![ci workflow](https://github.com/remcohaszing/monaco-tailwindcss/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-tailwindcss/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/monaco-tailwindcss)](https://www.npmjs.com/package/monaco-tailwindcss)
[![prettier code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)
[![demo](https://img.shields.io/badge/demo-monaco--tailwindcss.js.org-61ffcf.svg)](https://monaco-tailwindcss.js.org)
[![netlify Status](https://api.netlify.com/api/v1/badges/d56b5f9b-3adc-4c22-a355-761e72c774ab/deploy-status)](https://app.netlify.com/sites/monaco-tailwindcss/deploys)

[Tailwindcss](https://tailwindcss.com) integration for
[Monaco editor](https://microsoft.github.io/monaco-editor).

## Installation

```sh
npm install monaco-tailwindcss
```

## Usage

Import `monaco-tailwindcss` and configure it before an editor instance is created.

```typescript
import { editor, languages } from 'monaco-editor';
import { configureMonacoTailwindcss, tailwindcssData } from 'monaco-tailwindcss';

languages.css.cssDefaults.setOptions({
  data: {
    dataProviders: {
      tailwind: tailwindcssData,
    },
  },
});

configureMonacoTailwindcss();

editor.create(document.createElement('editor'), {
  language: 'html',
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
});
```

Also make sure to register the web worker. When using Webpack 5, this looks like the code below.
Other bundlers may use a different syntax, but the idea is the same. Languages you don’t used can be
omitted.

```js
window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
      case 'css':
      case 'less':
      case 'scss':
        return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url));
      case 'handlebars':
      case 'html':
      case 'razor':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url),
        );
      case 'json':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url),
        );
      case 'javascript':
      case 'typescript':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url),
        );
      case 'tailwindcss':
        return new Worker(new URL('monaco-tailwindcss/tailwindcss.worker', import.meta.url));
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};
```

## License

[MIT](https://github.com/remcohaszing/monaco-tailwindcss/blob/main/LICENSE.md)
