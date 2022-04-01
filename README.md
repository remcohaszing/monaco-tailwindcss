# Monaco Tailwindcss

[Tailwindcss](https://tailwindcss.com) integration for
[Monaco editor](https://microsoft.github.io/monaco-editor). (Work in progress)

## Installation

```sh
npm install monaco-tailwindcss
```

## Usage

Import `monaco-tailwindcss` and configure it before an editor instance is created.

```typescript
import { editor } from 'monaco-editor';
import { configureMonacoTailwindcss } from 'monaco-tailwindcss';

configureMonacoTailwindcss();

editor.create(document.createElement('editor'), {
  language: 'yaml',
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

[MIT](https://github.com/remcohaszing/monaco-yaml/blob/main/LICENSE.md)
