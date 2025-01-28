import type * as m from 'monaco-editor';
import { tailwindcssData } from './cssData';
import {
  createCodeActionProvider,
  createColorProvider,
  createHoverProvider,
  createMarkerDataProvider,
} from './providers';
import type {
  RealTailwindcssWorker,
  TailwindcssWorker,
  TailwindcssWorkerWithMirrorModel,
} from './tailwind.worker';
import TailwindWorker from './tailwind.worker?worker';
import {
  fromCompletionContext,
  fromPosition,
  toCompletionList,
} from 'monaco-languageserver-types';
import { registerMarkerDataProvider } from 'monaco-marker-data-provider';

export type CssCompilerResult = {
  css: string;
  tailwindClasses: {
    className: string;
    css: string;
  }[];
  notTailwindClasses: string[];
  errors?: string[];
  warnings?: string[];
};

let worker: Worker | null = null;

const defaultLanguageSelector = [
  'css',
  'javascript',
  'html',
  'mdx',
  'typescript',
] as const;

function getWorker() {
  if (!worker) {
    worker = new TailwindWorker();
    // @ts-expect-error 'name' is a custom property just so I know what worker is running
    worker.name = 'tailwindcss';
  }
  return worker;
}

// FIXME: Figure out why getMonacoWorker is not working
// function getMonacoWorker(...resources: m.Uri[]) {
//   if (!monacoWorker) {
//     throw new Error('Monaco worker not initialized');
//   }

//   if (resources.length === 0) {
//     return monacoWorker.getProxy();
//   }

//   return monacoWorker.withSyncedResources(resources);
// }

export { getWorker as getTailwindWorker };

export async function callWorker<
  T extends keyof TailwindcssWorkerWithMirrorModel,
>(
  type: T,
  {
    signal,
    ...payload
  }: Parameters<TailwindcssWorkerWithMirrorModel[T]>[0] & {
    signal?: AbortSignal;
  },
): Promise<ReturnType<TailwindcssWorkerWithMirrorModel[T]>> {
  return new Promise<ReturnType<TailwindcssWorkerWithMirrorModel[T]>>(
    resolve => {
      const worker = getWorker();
      worker.addEventListener(
        'message',
        function doStuff(event) {
          if (event.data.type === type) {
            resolve(event.data.result);
            worker.removeEventListener('message', doStuff);
          }
        },
        {
          signal,
        },
      );
      worker.postMessage({
        type,
        ...payload,
      });
    },
  );
}

export class TailwindHandler {
  private previousCss = '';
  private previousClasses: string[] = [];
  private previousBuildCss: Awaited<ReturnType<TailwindcssWorker['buildCss']>> =
    {
      css: '',
      tailwindClasses: [],
      notTailwindClasses: [],
    };

  constructor() {
    getWorker();
  }

  public configureMonaco(monaco: typeof m) {
    const languages = defaultLanguageSelector;

    monaco.editor.createWebWorker<RealTailwindcssWorker>({
      label: 'tailwindcss',
      moduleId: '/tailwindcss/tailwind.worker',
    });

    const options = monaco.languages.css.cssDefaults.options;
    monaco.languages.css.cssDefaults.setOptions({
      ...options,
      data: {
        ...options.data,
        dataProviders: {
          ...options.data?.dataProviders,
          tailwindcss: tailwindcssData,
        },
      },
    });

    const disposables: m.IDisposable[] = [
      monaco.languages.registerCompletionItemProvider(
        languages,
        createCompletionItemProvider(),
      ),
      monaco.languages.registerColorProvider(
        languages,
        createColorProvider(monaco, callWorker),
      ),
      monaco.languages.registerHoverProvider(
        languages,
        createHoverProvider(callWorker),
      ),
      monaco.languages.registerCodeActionProvider(
        languages,
        createCodeActionProvider(callWorker),
      ),
    ];

    for (const language of languages) {
      disposables.push(
        registerMarkerDataProvider(
          monaco,
          language,
          createMarkerDataProvider(callWorker),
        ),
      );
    }

    return {
      dispose() {
        disposables.forEach(d => d.dispose());
      },
    };
  }

  public async buildCss(
    css: string,
    classes: string[],
    signal?: AbortSignal,
  ): Promise<CssCompilerResult> {
    if (
      this.previousCss === css &&
      classes.every(c => this.previousClasses.includes(c))
    ) {
      return this.previousBuildCss;
    }
    this.previousCss = css;
    this.previousClasses = classes;
    this.previousBuildCss = await callWorker('buildCss', {
      css,
      classes,
      signal,
    });
    return this.previousBuildCss;
  }
}

function createCompletionItemProvider(): m.languages.CompletionItemProvider {
  return {
    async resolveCompletionItem(item) {
      return callWorker('resolveCompletionItem', { item });
    },

    async provideCompletionItems(model, position, context) {
      const completionList = await callWorker('doComplete', {
        uri: model.uri.toString(),
        languageId: model.getLanguageId(),
        position: fromPosition(position),
        context: fromCompletionContext(context),
        mirrorModels: [
          {
            uri: model.uri.toJSON(),
            version: model.getVersionId(),
            value: model.getValue(),
          },
        ],
      });

      if (!completionList) {
        return;
      }

      const wordInfo = model.getWordUntilPosition(position);

      return toCompletionList(completionList, {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn,
        },
      });
    },
  };
}
