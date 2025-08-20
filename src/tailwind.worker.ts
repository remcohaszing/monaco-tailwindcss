/// <reference types="./monaco-uri.d.ts" />
import type * as m from 'monaco-editor';
import * as tailwindcss from 'tailwindcss';
import type { CssCompilerResult } from './TailwindHandler';
import { loadDesignSystem } from './designSystem';
import { getVariants } from './getVariants';
import {
  type AugmentedDiagnostic,
  EditorState,
  Settings,
  State,
  doCodeActions,
  doComplete,
  doHover,
  doValidate,
  getColor,
  getDocumentColors,
  resolveCompletionItem,
} from '@tailwindcss/language-service';
import { DesignSystem } from '@tailwindcss/language-service/dist/util/v4';
import { initialize } from 'monaco-worker-manager/worker';
// We no longer manually marshal mirror models / messages; rely on Monaco worker context.
import index from 'tailwindcss/index.css' with { type: 'text' };
import preflight from 'tailwindcss/preflight.css' with { type: 'text' };
import theme from 'tailwindcss/theme.css' with { type: 'text' };
import utilities from 'tailwindcss/utilities.css' with { type: 'text' };
import {
  type CodeAction,
  type ColorInformation,
  type CompletionContext,
  type CompletionList,
  type Hover,
  type Position,
  type Range,
  type CompletionItem as VSCompletionItem,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';

type CompletionItem = m.languages.CompletionItem;

// Utility types from the previous custom messaging layer are no longer needed.
// We keep a lightweight Promisified variant purely for the worker proxy typing.
// All worker methods return Promises directly (Monaco will await proxy calls), so no extra Promisified wrapper needed.

export interface TailwindcssWorker {
  doCodeActions: (
    uri: string,
    languageId: string,
    range: Range,
    context: m.languages.CodeActionContext,
  ) => Promise<CodeAction[] | undefined>;
  doComplete: (
    uri: string,
    languageId: string,
    position: Position,
    context: CompletionContext,
  ) => Promise<CompletionList | undefined>;
  doHover: (
    uri: string,
    languageId: string,
    position: Position,
  ) => Promise<Hover | undefined>;
  doValidate: (
    uri: string,
    languageId: string,
  ) => Promise<AugmentedDiagnostic[] | undefined>;
  buildCss: (
    css: string,
    files: Record<string, string>,
    classes: string[],
  ) => Promise<CssCompilerResult>;
  getDocumentColors: (
    uri: string,
    languageId: string,
  ) => Promise<ColorInformation[] | undefined>;
  resolveCompletionItem: (item: CompletionItem) => Promise<CompletionItem>;
}

export type RealTailwindcssWorker = TailwindcssWorker;

class TailwindcssWorkerImpl implements TailwindcssWorker {
  private ctx: m.worker.IWorkerContext | null = null;
  private cachedState: State | null = null;
  private cachedStateDS: DesignSystem | null = null;

  setContext(ctx: m.worker.IWorkerContext) {
    this.ctx = ctx;
  }

  getState(): State {
    if (!designSystem) {
      throw new Error('Design system is not initialized');
    }
    if (this.cachedState && this.cachedStateDS === designSystem) {
      return this.cachedState;
    }
    // From https://github.com/tailwindlabs/tailwindcss-intellisense/blob/main/packages/tailwindcss-language-server/src/projects.ts#L213
    const state: State = {
      enabled: true,
      v4: true,
      version: '4.0.0',
      editor: {
        userLanguages: {},
        capabilities: {
          configuration: true,
          diagnosticRelatedInformation: true,
          itemDefaults: [],
        },
        async getConfiguration(): Promise<Settings> {
          return {
            editor: { tabSize: 2 },
            // Default values are based on
            // https://github.com/tailwindlabs/tailwindcss-intellisense/blob/v0.9.1/packages/tailwindcss-language-server/src/server.ts#L259-L287
            tailwindCSS: {
              emmetCompletions: true,
              includeLanguages: {},
              classAttributes: ['className', 'class', 'ngClass'],
              suggestions: true,
              hovers: true,
              codeActions: true,
              validate: true,
              showPixelEquivalents: true,
              rootFontSize: 16,
              colorDecorators: true,
              lint: {
                cssConflict: 'warning',
                invalidApply: 'error',
                invalidScreen: 'error',
                invalidVariant: 'error',
                invalidConfigPath: 'error',
                invalidTailwindDirective: 'error',
                invalidSourceDirective: 'error',
                recommendedVariantOrder: 'warning',
                usedBlocklistedClass: 'warning',
              },
              experimental: {
                classRegex: [],
                configFile: {},
              },
              files: {
                exclude: [],
              },
              classFunctions: [],
              inspectPort: null,
              codeLens: false,
            },
          };
        },
        async getDocumentSymbols() {
          // Just needed so tailwind doesn't crash. We don't actually care about this.
          return [];
        },
        // This option takes some properties that we don’t have nor need.
      } as Partial<EditorState> as EditorState,
      features: [],
      designSystem,
      separator: ':',
      blocklist: [],
    };

    state.classList = designSystem.getClassList().map(className => [
      className[0],
      {
        ...className[1],
        color: getColor(state, className[0]),
      },
    ]);

    state.variants = getVariants(state);

    this.cachedState = state;
    this.cachedStateDS = designSystem;

    return state;
  }

  getDocument(
    uri: string,
    languageId: string,
    model: m.worker.IMirrorModel,
  ): TextDocument {
    return TextDocument.create(
      uri,
      languageId,
      model.version,
      model.getValue(),
    );
  }

  getModel(uri: string): m.worker.IMirrorModel | undefined {
    if (!this.ctx) throw new Error('Worker context is not set');
    return this.ctx.getMirrorModels().find(model => String(model.uri) === uri);
  }

  async doCodeActions(
    uri: string,
    languageId: string,
    range: Range,
    context: m.languages.CodeActionContext,
  ): Promise<CodeAction[] | undefined> {
    const textDocument = this.getDocument(uri, languageId, this.getModel(uri)!);
    return doCodeActions(
      this.getState(),
      {
        range,
        context: {
          ...context,
          only: context.only ? [context.only] : [],
          diagnostics: [],
        },
        textDocument,
      },
      textDocument,
    );
  }

  async doComplete(
    uri: string,
    languageId: string,
    position: Position,
    context: CompletionContext,
  ): Promise<CompletionList | undefined> {
    return doComplete(
      this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
      position,
      context,
    );
  }

  async doHover(
    uri: string,
    languageId: string,
    position: Position,
  ): Promise<Hover | undefined> {
    return doHover(
      this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
      position,
    );
  }

  async doValidate(uri: string, languageId: string) {
    return doValidate(
      this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
    );
  }

  async getDocumentColors(
    uri: string,
    languageId: string,
  ): Promise<ColorInformation[] | undefined> {
    return getDocumentColors(
      this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
    );
  }

  async resolveCompletionItem(item: CompletionItem): Promise<CompletionItem> {
    return resolveCompletionItem(
      this.getState(),
      item as unknown as VSCompletionItem,
    ).then(a => a) as Promise<CompletionItem>;
  }

  async buildCss(
    css: string,
    files: Record<string, string>,
    classes: string[],
  ) {
    console.log('Building CSS'); // For debugging purposes
    if (!compiler) {
      throw new Error('Tailwind CSS compiler is not initialized');
    }
    const compileOptions = makeCompileOptions(files);
    if (css !== previousCss) {
      compiler = await tailwindcss.compile(css, compileOptions);
      loadDesignSystem(css, compileOptions).then(ds => {
        designSystem = ds;
      });
      previousCss = css;
    }
    const builtCss = compiler.build(classes);
    if (designSystem) {
      const candidatesCss = designSystem.candidatesToCss(classes);
      const tailwindClasses = [];
      const notTailwindClasses = [];
      for (let i = 0; i < candidatesCss.length; i++) {
        if (candidatesCss[i] === null) {
          notTailwindClasses.push(classes[i]);
        } else {
          tailwindClasses.push({
            className: classes[i],
            css: candidatesCss[i]!,
          });
        }
      }
      return { css: builtCss, tailwindClasses, notTailwindClasses };
    }
    return { css: builtCss, tailwindClasses: [], notTailwindClasses: classes };
  }
}

let previousCss = '';
let compiler: Awaited<ReturnType<typeof tailwindcss.compile>> | null = null;
let designSystem: DesignSystem | null = null;
const workerImpl = new TailwindcssWorkerImpl();

async function ensureCoreInitialized() {
  if (compiler && designSystem) return;
  const compileOptions = makeCompileOptions({});
  compiler = await tailwindcss.compile(
    `@import 'tailwindcss';`,
    compileOptions,
  );
  designSystem = await loadDesignSystem(
    `@import 'tailwindcss';`,
    compileOptions,
  );
}

// Monaco calls this to instantiate the worker. Keep signature stable.
export function create(ctx: m.worker.IWorkerContext): TailwindcssWorker {
  workerImpl.setContext(ctx);
  // Fire and forget initialization (state getters await lazy loaded design system)
  ensureCoreInitialized();
  return workerImpl;
}

type CompileOptions = NonNullable<Parameters<typeof tailwindcss.compile>[1]>;

function createLoadStylesheet(
  files: Record<string, string>,
): CompileOptions['loadStylesheet'] {
  return async (id, base) => {
    switch (id) {
      case 'tailwindcss':
        return {
          path: 'tailwindcss',
          base,
          content: index,
        };
      case 'tailwindcss/preflight':
      case 'tailwindcss/preflight.css':
      case './preflight.css':
        return {
          path: 'tailwindcss/preflight',
          base,
          content: preflight,
        };
      case 'tailwindcss/theme':
      case 'tailwindcss/theme.css':
      case './theme.css':
        return {
          path: 'tailwindcss/theme',
          base,
          content: theme,
        };
      case 'tailwindcss/utilities':
      case 'tailwindcss/utilities.css':
      case './utilities.css':
        return {
          path: 'tailwindcss/utilities',
          base,
          content: utilities,
        };
      default: {
        /**
         * Assumes `path` is a fs-like path (i.e. starts with `/`, `./`, or `../`).
         */
        function getAbsoluteImportPath(base: string, path: string): string {
          // Check if the path is already absolute
          if (path.startsWith('/')) {
            return path;
          }

          // If the path is relative, resolve it against the importer's directory
          if (path.startsWith('./') || path.startsWith('../')) {
            return new URL(path, `file://${base}/`).pathname.substring(1);
          }
          // Otherwise, return the path as is
          return path;
        }

        const absolutePath = getAbsoluteImportPath(base, id);
        const file = files[absolutePath];
        if (file) {
          return {
            path: absolutePath,
            base,
            content: file,
          };
        } else {
          console.warn(
            `File not found: ${absolutePath}. Make sure to include it in the files object.`,
          );
          return {
            path: absolutePath,
            base,
            content: '',
          };
        }
      }
    }
  };
}

const loadModule: CompileOptions['loadModule'] = async () => {
  throw new Error('loadModule is not supported in the worker');
};

function makeCompileOptions(files: Record<string, string>): CompileOptions {
  return {
    base: '/',
    loadStylesheet: createLoadStylesheet(files),
    loadModule,
  };
}

initialize<TailwindcssWorker>((ctx: m.worker.IWorkerContext) => {
  return create(ctx);
});
