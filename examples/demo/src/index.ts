import './index.css';
import { editor, Environment, languages } from 'monaco-editor';
import { configureMonacoTailwindcss, tailwindcssData } from 'monaco-tailwindcss';

declare global {
  interface Window {
    MonacoEnvironment: Environment;
  }
}

configureMonacoTailwindcss();

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url));
      case 'css':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        );
      case 'html':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        );
      case 'tailwindcss':
        return new Worker(new URL('monaco-tailwindcss/tailwindcss.worker.js', import.meta.url));
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};

languages.css.cssDefaults.setOptions({
  data: {
    dataProviders: {
      tailwind: tailwindcssData,
    },
  },
});

const cssModel = editor.createModel(
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  h1 {
    @apply text-2xl;
  }
  h2 {
    @apply text-xl;
  }
}

@layer components {
  .btn-blue {
    @apply bg-blue-500 hover:bg-blue-700 text-white font-bold font-bold py-2 px-4 rounded;
  }
}

@layer utilities {
  .filter-none {
    filter: none;
  }
  .filter-grayscale {
    filter: grayscale(100%);
  }
}

.select2-dropdown {
  @apply rounded-b-lg shadow-md;
}

.select2-search {
  @apply border border-gray-300 rounded;
}

.select2-results__group {
  @apply text-lg font-bold text-gray-900;
}
`,
  'css',
);
const htmlModel = editor.createModel(
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div class="w-6 h-6 text-gray-600 bg-[#ff8888] hover:text-sky-600 ring-gray-900/5"></div>
  </body>
</html>
`,
  'html',
);
const mdxModel = editor.createModel(
  `import { MyComponent } from './MyComponent'

# Hello MDX

<MyComponent className="text-gray-600">

  This is **also** markdown.

</MyComponent>
`,
  'mdx',
);

function getModel(): editor.ITextModel {
  switch (window.location.hash) {
    case '#css':
      return cssModel;
    case '#mdx':
      return mdxModel;
    default:
      window.location.hash = '#html';
      return htmlModel;
  }
}

languages.register({
  id: 'mdx',
  extensions: ['.mdx'],
  aliases: ['MDX', 'mdx'],
});

const ed = editor.create(document.getElementById('editor')!, {
  automaticLayout: true,
  theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light',
  colorDecorators: true,
  model: getModel(),
});

window.addEventListener('hashchange', () => {
  ed.setModel(getModel());
});
