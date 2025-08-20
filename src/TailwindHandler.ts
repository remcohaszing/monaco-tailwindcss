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
} from './tailwind.worker';
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

let worker: m.editor.MonacoWebWorker<RealTailwindcssWorker> | null = null;

export const defaultLanguageSelector = [
  'css',
  'javascript',
  'html',
  'mdx',
  'typescript',
] as const;

export async function getWorker(...resources: m.Uri[]) {
  if (!worker) {
    throw new Error('Monaco worker not initialized');
  }
  return worker.withSyncedResources(resources);
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

  public configureMonaco(monaco: typeof m) {
    const languages = defaultLanguageSelector;
    const ww = monaco.editor.createWebWorker<RealTailwindcssWorker>({
      label: 'tailwindcss',
      moduleId: '/tailwindcss/tailwind.worker',
    });

    worker = ww;

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
      ww,
      monaco.languages.registerCompletionItemProvider(
        languages,
        createCompletionItemProvider(),
      ),
      monaco.languages.registerColorProvider(
        languages,
        createColorProvider(monaco, getWorker),
      ),
      monaco.languages.registerHoverProvider(
        languages,
        createHoverProvider(getWorker),
      ),
      monaco.languages.registerCodeActionProvider(
        languages,
        createCodeActionProvider(getWorker),
      ),
    ];

    for (const language of languages) {
      disposables.push(
        registerMarkerDataProvider(
          monaco,
          language,
          createMarkerDataProvider(getWorker),
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
    files: Record<string, string>,
  ): Promise<CssCompilerResult> {
    if (
      this.previousCss === css &&
      classes.every(c => this.previousClasses.includes(c))
    ) {
      return this.previousBuildCss;
    }
    this.previousCss = css;
    this.previousClasses = classes;
    this.previousBuildCss = await (
      await getWorker()
    ).buildCss(css, files, classes);
    return this.previousBuildCss;
  }
}

function createCompletionItemProvider(): m.languages.CompletionItemProvider {
  return {
    async resolveCompletionItem(item) {
      return (await getWorker()).resolveCompletionItem(item);
    },

    async provideCompletionItems(model, position, context) {
      const completionList = await (
        await getWorker(model.uri)
      ).doComplete(
        model.uri.toString(),
        model.getLanguageId(),
        fromPosition(position),
        fromCompletionContext(context),
      );

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
