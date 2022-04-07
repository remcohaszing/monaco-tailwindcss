import { MonacoTailwindcssOptions } from 'monaco-tailwindcss';
import { initialize } from 'monaco-worker-manager/worker';
import postcss from 'postcss';
import postcssSelectorParser from 'postcss-selector-parser';
import {
  // CompletionsFromClassList,
  doComplete,
  doHover,
  // DoValidate,
  getColor,
  getDocumentColors,
  resolveCompletionItem,
} from 'tailwindcss-language-service';
import resolveConfig from 'tailwindcss/resolveConfig.js';
import expandApplyAtRules from 'tailwindcss/src/lib/expandApplyAtRules.js';
import { generateRules } from 'tailwindcss/src/lib/generateRules.js';
import { createContext } from 'tailwindcss/src/lib/setupContextUtils.js';
import { TailwindConfig } from 'tailwindcss/tailwind-config';
import { CompletionContext } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  ColorInformation,
  CompletionItem,
  CompletionList,
  Hover,
  Position,
} from 'vscode-languageserver-types';

import { JitState } from '..';
import getVariants from './getVariants.js';

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value != null;
}

export interface TailwindcssWorker {
  doComplete: (
    uri: string,
    languageId: string,
    position: Position,
    context: CompletionContext,
  ) => CompletionList | undefined;

  getDocumentColors: (uri: string, languageId: string) => ColorInformation[];

  doHover: (uri: string, languageId: string, position: Position) => Hover | undefined;

  resolveCompletionItem: (item: CompletionItem) => CompletionItem;
}

initialize<TailwindcssWorker, MonacoTailwindcssOptions>((ctx, options) => {
  const config = resolveConfig(options.config ?? ({} as Partial<TailwindConfig> as TailwindConfig));

  // Const lspRoot = await postcss([
  //   tailwindcss({ ...config, mode: 'aot', purge: false, variants: [] }),
  // ]).process();

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
    // ClassNames: extractClasses(lspRoot),

    jit: true,
    jitContext,
    separator: ':',
    screens: isObject(config.theme.screens) ? Object.keys(config.theme.screens) : [],
    editor: {
      userLanguages: {},
      // @ts-expect-error this is poorly typed
      // eslint-disable-next-line require-await
      async getConfiguration() {
        return {
          editor: { tabSize: 2 },
          tailwindCSS: {
            validate: true,
            classAttributes: ['class', 'className'],
            lint: {
              cssConflict: 'warning',
              invalidApply: 'error',
              invalidScreen: 'error',
              invalidVariant: 'error',
              invalidConfigPath: 'error',
              invalidTailwindDirective: 'error',
              recommendedVariantOrder: 'warning',
            },
          },
        };
      },
    },
  };

  state.variants = getVariants(state);

  state.classList = jitContext
    .getClassList()
    .filter((className) => className !== '*')
    .map((className) => [className, { color: getColor(state, className) }]);

  const getTextDocument = (uri: string, languageId: string): TextDocument | undefined => {
    const models = ctx.getMirrorModels();
    for (const model of models) {
      if (String(model.uri) === uri) {
        return TextDocument.create(uri, languageId, model.version, model.getValue());
      }
    }
  };

  return {
    doComplete(uri, languageId, position, context) {
      const textDocument = getTextDocument(uri, languageId);

      if (!textDocument) {
        return;
      }

      return doComplete(state, textDocument, position, context);
    },

    doHover(uri, languageId, position) {
      const textDocument = getTextDocument(uri, languageId);

      if (!textDocument) {
        return;
      }

      return doHover(state, textDocument, position);
    },

    getDocumentColors(uri, languageId) {
      const textDocument = getTextDocument(uri, languageId);

      if (!textDocument) {
        return [];
      }

      return getDocumentColors(state, textDocument);
    },

    resolveCompletionItem(item) {
      return resolveCompletionItem(state, item);
    },
  };
});
