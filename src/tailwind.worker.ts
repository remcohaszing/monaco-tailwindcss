/// <reference types="vite/client" />
/// <reference types="./monaco-uri.d.ts" />
import type * as m from 'monaco-editor';
import * as tailwindcss from 'tailwindcss';
import type { CssCompilerResult } from './TailwindHandler';
import { loadDesignSystem } from './designSystem';
import { getVariants } from './getVariants';
import {
  type AugmentedDiagnostic,
  EditorState,
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
import { URI } from 'monaco-editor/esm/vs/base/common/uri.js';
import index from 'tailwindcss/index.css?raw';
import preflight from 'tailwindcss/preflight.css?raw';
import theme from 'tailwindcss/theme.css?raw';
import utilities from 'tailwindcss/utilities.css?raw';
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

type MirrorModelThing = {
  uri: m.UriComponents;
  version: number;
  value: string;
};

type Promisified<T> = {
  [P in keyof T]: T[P] extends (arg: infer A) => infer R
    ? (arg: A) => Promise<R>
    : T[P];
};

type WithMirrorModelArg<T> = {
  [P in keyof T]: T[P] extends (arg: infer A) => infer R
    ? (
        arg: A & { mirrorModels?: MirrorModelThing[] },
      ) => R extends Promise<unknown> ? R : Promise<R>
    : T[P];
};

export interface TailwindcssWorker {
  doCodeActions: (a: {
    uri: string;
    languageId: string;
    range: Range;
    context: m.languages.CodeActionContext;
  }) => CodeAction[] | undefined;

  doComplete: (a: {
    uri: string;
    languageId: string;
    position: Position;
    context: CompletionContext;
  }) => CompletionList | undefined;

  doHover: (a: {
    uri: string;
    languageId: string;
    position: Position;
  }) => Hover | undefined;

  doValidate: (a: {
    uri: string;
    languageId: string;
  }) => AugmentedDiagnostic[] | undefined;

  buildCss: (a: { css: string; classes: string[] }) => CssCompilerResult;

  getDocumentColors: (a: {
    uri: string;
    languageId: string;
  }) => ColorInformation[] | undefined;

  resolveCompletionItem: (a: { item: CompletionItem }) => CompletionItem;
}

export type TailwindcssWorkerWithMirrorModel =
  WithMirrorModelArg<TailwindcssWorker>;

export type RealTailwindcssWorker = Promisified<
  WithMirrorModelArg<TailwindcssWorker>
>;

class TailwindcssWorkerImpl implements Promisified<TailwindcssWorker> {
  // public ctx: m.worker.IWorkerContext | null = null;
  public mirrorModels: m.worker.IMirrorModel[] = [];
  private cachedState: State | null = null;
  private cachedStateDS: DesignSystem | null = null;

  setMirrorModels(models: m.worker.IMirrorModel[]): void {
    this.mirrorModels = models;
  }

  async getState(): Promise<State> {
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
        async getConfiguration() {
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
              },
              experimental: {
                classRegex: [],
                configFile: {},
              },
              files: {
                exclude: [],
              },
            },
          };
        },
        async getDocumentSymbols() {
          // Just needed so tailwind doesn't crash. We don't actually care about this.
          return [];
        },
        // This option takes some properties that we don’t have nor need.
      } as Partial<EditorState> as EditorState,
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
    if (this.mirrorModels.length === 0) {
      throw new Error('Mirror models are not initialized');
    }
    return this.mirrorModels.find(model => String(model.uri) === uri);
    //   if (!this.ctx) {
    //     throw new Error('Worker context is not initialized');
    //   }
    //   return this.ctx
    //     .getMirrorModels()
    //     .find(model => String(model.uri) === uri) as m.worker.IMirrorModel;
  }

  async doCodeActions({
    uri,
    languageId,
    range,
    context,
  }: {
    uri: string;
    languageId: string;
    range: Range;
    context: m.languages.CodeActionContext;
  }): Promise<CodeAction[] | undefined> {
    const textDocument = this.getDocument(uri, languageId, this.getModel(uri)!);
    return doCodeActions(
      await this.getState(),
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

  async doComplete({
    uri,
    languageId,
    position,
    context,
  }: {
    uri: string;
    languageId: string;
    position: Position;
    context: CompletionContext;
  }): Promise<CompletionList | undefined> {
    return doComplete(
      await this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
      position,
      context,
    );
  }

  async doHover({
    uri,
    languageId,
    position,
  }: {
    uri: string;
    languageId: string;
    position: Position;
  }) {
    return doHover(
      await this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
      position,
    );
  }

  async doValidate({ uri, languageId }: { uri: string; languageId: string }) {
    return doValidate(
      await this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
    );
  }

  async getDocumentColors({
    uri,
    languageId,
  }: {
    uri: string;
    languageId: string;
  }): Promise<ColorInformation[] | undefined> {
    return getDocumentColors(
      await this.getState(),
      this.getDocument(uri, languageId, this.getModel(uri)!),
    );
  }

  async resolveCompletionItem({
    item,
  }: {
    item: CompletionItem;
  }): Promise<CompletionItem> {
    return resolveCompletionItem(
      await this.getState(),
      item as VSCompletionItem,
    ) as Promise<CompletionItem>;
  }

  async buildCss({ css, classes }: { css: string; classes: string[] }) {
    if (!compiler) {
      throw new Error('Tailwind CSS compiler is not initialized');
    }
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
let initialized = false;

async function init() {
  if (initialized) {
    return workerImpl;
  }
  initialized = true;
  console.log('Initializing Tailwind CSS worker');

  compiler = await tailwindcss.compile(
    `@import 'tailwindcss';`,
    compileOptions,
  );

  designSystem = await loadDesignSystem(
    `@import 'tailwindcss';`,
    compileOptions,
  );

  self.addEventListener<'message'>('message', async event => {
    const { type, mirrorModels, ...payload } = event.data;
    if (!type) {
      console.log('Unknown payload:', payload);
      return;
    }
    if (!(type in workerImpl)) {
      throw new Error(`Unknown message type: ${type}`);
    }

    if (mirrorModels && Array.isArray(mirrorModels)) {
      workerImpl.setMirrorModels(
        (mirrorModels as MirrorModelThing[]).map(m => ({
          uri: URI.from(m.uri),
          version: m.version,
          getValue: () => m.value,
        })),
      );
    }

    console.log('Received message', type, event.data);
    const result = await workerImpl[type as keyof TailwindcssWorker](payload);
    console.log('Sending result', type, result);
    self.postMessage({ type, result });
  });

  return workerImpl;
}

type CompileOptions = NonNullable<Parameters<typeof tailwindcss.compile>[1]>;

const loadStylesheet: CompileOptions['loadStylesheet'] = async (id, base) => {
  switch (id) {
    case 'tailwindcss':
      return {
        base,
        content: index,
      };
    case 'tailwindcss/preflight':
    case 'tailwindcss/preflight.css':
    case './preflight.css':
      return {
        base,
        content: preflight,
      };
    case 'tailwindcss/theme':
    case 'tailwindcss/theme.css':
    case './theme.css':
      return {
        base,
        content: theme,
      };
    case 'tailwindcss/utilities':
    case 'tailwindcss/utilities.css':
    case './utilities.css':
      return {
        base,
        content: utilities,
      };
    default:
      throw new Error(`Unexpected stylesheet request: ${id}`);
  }
};

const loadModule: CompileOptions['loadModule'] = async () => {
  throw new Error('loadModule is not supported in the worker');
};

const compileOptions: CompileOptions = {
  base: '/',
  loadStylesheet,
  loadModule,
};

init();
