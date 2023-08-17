import { parse } from 'jsonc-parser';
import * as monaco from 'monaco-editor';
import {
  configureMonacoTailwindcss,
  type TailwindConfig,
  tailwindcssData,
} from 'monaco-tailwindcss';

import './index.css';

const tailwindConfig: TailwindConfig = {
  theme: {
    extend: {
      screens: {
        television: '90000px',
      },
      spacing: {
        '128': '32rem',
      },
      colors: {
        // https://icolorpalette.com/color/molten-lava
        lava: '#b5332e',
        // Taken from https://icolorpalette.com/color/ocean-blue
        ocean: {
          50: '#f2fcff',
          100: '#c1f2fe',
          200: '#90e9ff',
          300: '#5fdfff',
          400: '#2ed5ff',
          500: '#00cafc',
          600: '#00a3cc',
          700: '#007c9b',
          800: '#00546a',
          900: '#002d39',
        },
      },
    },
  },
};

const monacoTailwindcss = configureMonacoTailwindcss(monaco, { tailwindConfig });

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
      case 'json':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        );
      case 'tailwindcss':
        // We are using a custom worker instead of the default
        // 'monaco-tailwindcss/tailwindcss.worker.js'
        // This way we can enable custom plugins
        return new Worker(new URL('tailwindcssplugin.worker.js', import.meta.url));
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};

monaco.languages.css.cssDefaults.setOptions({
  data: {
    dataProviders: {
      tailwind: tailwindcssData,
    },
  },
});

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  allowComments: true,
  trailingCommas: 'ignore',
});

const tailwindrcModel = monaco.editor.createModel(
  `${JSON.stringify(tailwindConfig, undefined, 2)}\n`,
  'json',
  monaco.Uri.parse('file:///.tailwindrc.json'),
);
const cssModel = monaco.editor.createModel(
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
const htmlModel = monaco.editor.createModel(
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div class="w-6 h-6 text-gray-600 bg-[#ff8888] hover:text-sky-600 ring-gray-900/5"></div>

    <p class="text-ocean-500 bg-lava">
      Custom colors are supported too!
    </p>

    <button class="btn-blue"></button>
  </body>
</html>
`,
  'html',
);
const mdxModel = monaco.editor.createModel(
  `import { MyComponent } from './MyComponent'

# Hello MDX

<MyComponent className="text-green-700">

  This is **also** markdown.

</MyComponent>
`,
  'mdx',
);

function getModel(): monaco.editor.ITextModel {
  switch (window.location.hash) {
    case '#tailwindrc':
      return tailwindrcModel;
    case '#css':
      return cssModel;
    case '#mdx':
      return mdxModel;
    default:
      window.location.hash = '#html';
      return htmlModel;
  }
}

monaco.languages.register({
  id: 'mdx',
  extensions: ['.mdx'],
  aliases: ['MDX', 'mdx'],
});

const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light';
const ed = monaco.editor.create(document.getElementById('editor')!, {
  automaticLayout: true,
  theme,
  colorDecorators: true,
  model: getModel(),
  wordBasedSuggestions: false,
});

const outputPane = document.getElementById('output')!;
const problemsPane = document.getElementById('problems')!;
const outputButton = document.getElementById('output-button')!;
const problemsButton = document.getElementById('problems-button')!;

problemsButton.addEventListener('click', () => {
  outputPane.hidden = true;
  problemsPane.hidden = false;
});

outputButton.addEventListener('click', () => {
  problemsPane.hidden = true;
  outputPane.hidden = false;
});

async function generateOutput(): Promise<void> {
  const content = await monacoTailwindcss.generateStylesFromContent(cssModel.getValue(), [
    { content: htmlModel.getValue(), extension: htmlModel.getLanguageId() },
    { content: mdxModel.getValue(), extension: mdxModel.getLanguageId() },
  ]);
  outputPane.textContent = content;
  monaco.editor.colorizeElement(outputPane, { mimeType: 'css', theme });
}

// eslint-disable-next-line unicorn/prefer-top-level-await
generateOutput();
cssModel.onDidChangeContent(generateOutput);
htmlModel.onDidChangeContent(generateOutput);
mdxModel.onDidChangeContent(generateOutput);

function updateMarkers(resource: monaco.Uri): void {
  const problems = document.getElementById('problems')!;
  const markers = monaco.editor.getModelMarkers({ resource });
  while (problems.lastChild) {
    problems.lastChild.remove();
  }
  for (const marker of markers) {
    if (marker.severity === monaco.MarkerSeverity.Hint) {
      continue;
    }
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'button');
    const codicon = document.createElement('div');
    const text = document.createElement('div');
    wrapper.classList.add('problem');
    codicon.classList.add(
      'codicon',
      marker.severity === monaco.MarkerSeverity.Warning ? 'codicon-warning' : 'codicon-error',
    );
    text.classList.add('problem-text');
    text.textContent = marker.message;
    wrapper.append(codicon, text);
    wrapper.addEventListener('click', () => {
      ed.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
      ed.focus();
    });
    problems.append(wrapper);
  }
}

window.addEventListener('hashchange', () => {
  const model = getModel();
  ed.setModel(model);
  updateMarkers(model.uri);
});

tailwindrcModel.onDidChangeContent(() => {
  let newConfig: unknown;
  try {
    newConfig = parse(tailwindrcModel.getValue());
  } catch {
    return;
  }
  if (typeof newConfig !== 'object') {
    return;
  }
  if (newConfig == null) {
    return;
  }
  monacoTailwindcss.setTailwindConfig(newConfig as TailwindConfig);
  generateOutput();
});

monaco.editor.onDidChangeMarkers(([resource]) => {
  if (String(resource) === String(getModel().uri)) {
    updateMarkers(resource);
  }
});
