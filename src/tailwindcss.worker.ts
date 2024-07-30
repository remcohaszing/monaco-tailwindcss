import {
  type AugmentedDiagnostic,
  doComplete,
  doHover,
  doValidate,
  type EditorState,
  getColor,
  getDocumentColors,
  resolveCompletionItem
} from '@tailwindcss/language-service'
import { type MonacoTailwindcssOptions, type TailwindConfig } from 'monaco-tailwindcss'
import { type TailwindWorkerOptions } from 'monaco-tailwindcss/tailwindcss.worker'
import { initialize as initializeWorker } from 'monaco-worker-manager/worker'
import postcss from 'postcss'
import postcssSelectorParser from 'postcss-selector-parser'
import { type Config } from 'tailwindcss'
import expandApplyAtRules from 'tailwindcss/src/lib/expandApplyAtRules.js'
import { generateRules } from 'tailwindcss/src/lib/generateRules.js'
import { type ChangedContent, createContext } from 'tailwindcss/src/lib/setupContextUtils.js'
import processTailwindFeatures from 'tailwindcss/src/processTailwindFeatures.js'
import resolveConfig from 'tailwindcss/src/public/resolve-config.js'
import {
  type ColorInformation,
  type CompletionContext,
  type CompletionItem,
  type CompletionList,
  type Hover,
  type Position
} from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'

import { type JitState } from './types.js'

export interface TailwindcssWorker {
  doComplete: (
    uri: string,
    languageId: string,
    position: Position,
    context: CompletionContext
  ) => CompletionList | undefined

  doHover: (uri: string, languageId: string, position: Position) => Hover | undefined

  doValidate: (uri: string, languageId: string) => AugmentedDiagnostic[] | undefined

  generateStylesFromContent: (css: string, content: ChangedContent[]) => string

  getDocumentColors: (uri: string, languageId: string) => ColorInformation[] | undefined

  resolveCompletionItem: (item: CompletionItem) => CompletionItem
}

async function stateFromConfig(
  configPromise: PromiseLike<TailwindConfig> | TailwindConfig
): Promise<JitState> {
  const preparedTailwindConfig = await configPromise
  const config = resolveConfig(preparedTailwindConfig)
  const jitContext = createContext(config)

  const state: JitState = {
    version: '3.0.0',
    blocklist: [],
    config,
    enabled: true,
    modules: {
      postcss: {
        module: postcss,
        version: ''
      },
      postcssSelectorParser: { module: postcssSelectorParser },
      jit: {
        createContext: { module: createContext },
        expandApplyAtRules: { module: expandApplyAtRules },
        generateRules: { module: generateRules }
      }
    },
    classNames: {
      classNames: {},
      context: {}
    },
    jit: true,
    jitContext,
    separator: config.separator,
    screens: config.theme?.screens ? Object.keys(config.theme.screens) : [],
    variants: jitContext.getVariants(),
    editor: {
      userLanguages: {},
      capabilities: {
        configuration: true,
        diagnosticRelatedInformation: true,
        itemDefaults: []
      },
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
              recommendedVariantOrder: 'warning'
            },
            showPixelEquivalents: true,
            includeLanguages: {},
            files: {
              // Upstream defines these values, but we don’t need them.
              exclude: []
            },
            experimental: {
              classRegex: [],
              // Upstream types are wrong
              configFile: {}
            }
          }
        }
      }
      // This option takes some properties that we don’t have nor need.
    } as Partial<EditorState> as EditorState
  }

  state.classList = jitContext
    .getClassList()
    .filter((className) => className !== '*')
    .map((className) => [className, { color: getColor(state, className) }])

  return state
}

export function initialize(tailwindWorkerOptions?: TailwindWorkerOptions): void {
  initializeWorker<TailwindcssWorker, MonacoTailwindcssOptions>((ctx, options) => {
    const preparedTailwindConfig =
      tailwindWorkerOptions?.prepareTailwindConfig?.(options.tailwindConfig) ??
      options.tailwindConfig ??
      ({} as Config)
    if (typeof preparedTailwindConfig !== 'object') {
      throw new TypeError(
        `Expected tailwindConfig to resolve to an object, but got: ${JSON.stringify(
          preparedTailwindConfig
        )}`
      )
    }

    const statePromise = stateFromConfig(preparedTailwindConfig)

    const withDocument =
      <A extends unknown[], R>(
        fn: (state: JitState, document: TextDocument, ...args: A) => Promise<R>
      ) =>
      (uri: string, languageId: string, ...args: A): Promise<R> | undefined => {
        const models = ctx.getMirrorModels()
        for (const model of models) {
          if (String(model.uri) === uri) {
            return statePromise.then((state) =>
              fn(
                state,
                TextDocument.create(uri, languageId, model.version, model.getValue()),
                ...args
              )
            )
          }
        }
      }

    return {
      doComplete: withDocument(doComplete),

      doHover: withDocument(doHover),

      doValidate: withDocument(doValidate),

      async generateStylesFromContent(css, content) {
        const { config } = await statePromise
        const tailwind = processTailwindFeatures(
          (processOptions) => () => processOptions.createContext(config, content)
        )

        const processor = postcss([tailwind])

        const result = await processor.process(css)
        return result.css
      },

      getDocumentColors: withDocument(getDocumentColors),

      async resolveCompletionItem(item) {
        return resolveCompletionItem(await statePromise, item)
      }
    }
  })
}

// Side effect initialization - but this function can be called more than once. Last applies.
initialize()
