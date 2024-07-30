declare module '*.css' {
  const css: string
  export default css
}

declare module 'tailwindcss/src/lib/expandApplyAtRules.js' {
  export default function expandApplyAtRules(): void
}

declare module 'tailwindcss/src/lib/generateRules.js' {
  export function generateRules(): void
}

declare module 'tailwindcss/src/lib/setupContextUtils.js' {
  import { type Variant } from '@tailwindcss/language-service'
  import { type Config } from 'tailwindcss'

  interface ChangedContent {
    content: string
    extension?: string
  }

  export interface JitContext {
    changedContent: ChangedContent[]
    getClassList: () => string[]
    getVariants: () => Variant[] | undefined
    tailwindConfig: Config
  }

  export function createContext(config: Config, changedContent?: ChangedContent[]): JitContext
}

declare module 'tailwindcss/src/processTailwindFeatures.js' {
  import { type AtRule, type Plugin, type Result, type Root } from 'postcss'
  import { type createContext, type JitContext } from 'tailwindcss/src/lib/setupContextUtils.js'

  type SetupContext = (root: Root, result: Result) => JitContext

  interface ProcessTailwindFeaturesCallbackOptions {
    applyDirectives: Set<AtRule>
    createContext: typeof createContext
    registerDependency: () => unknown
    tailwindDirectives: Set<string>
  }

  export default function processTailwindFeatures(
    callback: (options: ProcessTailwindFeaturesCallbackOptions) => SetupContext
  ): Plugin
}

declare module 'tailwindcss/src/public/resolve-config.js' {
  import { type TailwindConfig } from 'monaco-tailwindcss'
  import { type Config } from 'tailwindcss'

  export default function resolveConfig(tailwindConfig: TailwindConfig): Config
}
