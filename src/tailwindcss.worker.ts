import { MonacoTailwindcssOptions, TailwindConfig } from 'monaco-tailwindcss';
import { TailwindWorkerOptions } from 'monaco-tailwindcss/tailwindcss.worker';
import { initialize as initializeWorker } from 'monaco-worker-manager/worker';
import postcss from 'postcss';
import postcssSelectorParser from 'postcss-selector-parser';
import { Config } from 'tailwindcss';
import {
  AugmentedDiagnostic,
  doComplete,
  doHover,
  doValidate,
  EditorState,
  getColor,
  getDocumentColors,
  resolveCompletionItem,
} from 'tailwindcss-language-service';
import expandApplyAtRules from 'tailwindcss/src/lib/expandApplyAtRules.js';
import { generateRules } from 'tailwindcss/src/lib/generateRules.js';
import { ChangedContent, createContext } from 'tailwindcss/src/lib/setupContextUtils.js';
import processTailwindFeatures from 'tailwindcss/src/processTailwindFeatures.js';
import resolveConfig from 'tailwindcss/src/public/resolve-config.js';
import { CompletionContext } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  ColorInformation,
  CompletionItem,
  CompletionList,
  Hover,
  Position,
} from 'vscode-languageserver-types';

import { JitState } from './types.js';

export interface TailwindcssWorker {
  doComplete: (
    uri: string,
    languageId: string,
    position: Position,
    context: CompletionContext,
  ) => CompletionList | undefined;

  doHover: (uri: string, languageId: string, position: Position) => Hover | undefined;

  doValidate: (uri: string, languageId: string) => AugmentedDiagnostic[];

  generateStylesFromContent: (css: string, content: ChangedContent[]) => string;

  getDocumentColors: (uri: string, languageId: string) => ColorInformation[];

  resolveCompletionItem: (item: CompletionItem) => CompletionItem;
}

async function stateFromConfig(
  configPromise: PromiseLike<TailwindConfig> | TailwindConfig,
): Promise<JitState> {
  const preparedTailwindConfig = await configPromise;
  const config = resolveConfig(preparedTailwindConfig);
  const jitContext = createContext(config);

  const state: JitState = {
    version: '3.0.0',
    config,
    enabled: true,
    modules: {
      postcss: { module: postcss, version: '' },
      postcssSelectorParser: { module: postcssSelectorParser },
      jit: {
        createContext: { module: createContext },
        expandApplyAtRules: { module: expandApplyAtRules },
        generateRules: { module: generateRules },
      },
    },
    classNames: {
      classNames: {},
      context: {},
    },
    jit: true,
    jitContext,
    separator: config.separator,
    screens: config.theme?.screens ? Object.keys(config.theme.screens) : [],
    variants: jitContext.getVariants(),
    editor: {
      userLanguages: {},
      // eslint-disable-next-line require-await
      async getConfiguration() {
        return {
          editor: { tabSize: 2 },
          // Default values are based on
          // https://github.com/tailwindlabs/tailwindcss-intellisense/blob/v0.9.1/packages/tailwindcss-language-server/src/server.ts#L259-L287
          tailwindCSS: {
            emmetCompletions: false,
            classAttributes: ['class', 'className', 'ngClass'],
            codeActions: true,
            hovers: true,
            suggestions: true,
            validate: true,
            colorDecorators: true,
            rootFontSize: 16,
            lint: {
              cssConflict: 'warning',
              invalidApply: 'error',
              invalidScreen: 'error',
              invalidVariant: 'error',
              invalidConfigPath: 'error',
              invalidTailwindDirective: 'error',
              recommendedVariantOrder: 'warning',
            },
            showPixelEquivalents: true,
            includeLanguages: {},
            files: {
              // Upstream defines these values, but we don’t need them.
              exclude: [],
            },
            experimental: {
              classRegex: [],
              // Upstream types are wrong
              configFile: {},
            },
          },
        };
      },
      // This option takes some properties that we don’t have nor need.
    } as Partial<EditorState> as EditorState,
  };

  state.classList = jitContext
    .getClassList()
    .filter((className) => className !== '*')
    .map((className) => [className, { color: getColor(state, className) }]);

  return state;
}

export function initialize(tailwindWorkerOptions?: TailwindWorkerOptions): void {
  initializeWorker<TailwindcssWorker, MonacoTailwindcssOptions>((ctx, options) => {
    const preparedTailwindConfig =
      tailwindWorkerOptions?.prepareTailwindConfig?.(options.tailwindConfig) ??
      options.tailwindConfig ??
      ({} as Config);
    if (typeof preparedTailwindConfig !== 'object') {
      throw new TypeError(
        `Expected tailwindConfig to resolve to an object, but got: ${JSON.stringify(
          preparedTailwindConfig,
        )}`,
      );
    }

    const statePromise = stateFromConfig(preparedTailwindConfig);

    const getTextDocument = (uri: string, languageId: string): TextDocument | undefined => {
      const models = ctx.getMirrorModels();
      for (const model of models) {
        if (String(model.uri) === uri) {
          return TextDocument.create(uri, languageId, model.version, model.getValue());
        }
      }
    };

    return {
      async doComplete(uri, languageId, position, context) {
        const textDocument = getTextDocument(uri, languageId);

        if (!textDocument) {
          return;
        }

        return doComplete(await statePromise, textDocument, position, context);
      },

      async doHover(uri, languageId, position) {
        const textDocument = getTextDocument(uri, languageId);

        if (!textDocument) {
          return;
        }

        return doHover(await statePromise, textDocument, position);
      },

      async doValidate(uri, languageId) {
        const textDocument = getTextDocument(uri, languageId);

        if (!textDocument) {
          return [];
        }

        return doValidate(await statePromise, textDocument);
      },

      async generateStylesFromContent(css, content) {
        const { config } = await statePromise;
        const tailwind = processTailwindFeatures(
          (processOptions) => () => processOptions.createContext(config, content),
        );
        const processor = postcss([tailwind]);

        const result = await processor.process(css);
        return result.css;
      },

      async getDocumentColors(uri, languageId) {
        const textDocument = getTextDocument(uri, languageId);

        if (!textDocument) {
          return [];
        }

        return getDocumentColors(await statePromise, textDocument);
      },

      async resolveCompletionItem(item) {
        return resolveCompletionItem(await statePromise, item);
      },
    };
  });
}

// Side effect initialization - but this function can be called more than once. Last applies.
initialize();
