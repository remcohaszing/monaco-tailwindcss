declare module '*.css' {
  const css: string;
  export default css;
}

declare module 'culori' {
  export type Color = unknown;
}

declare module 'tailwindcss/src/lib/expandApplyAtRules.js' {
  export default function expandApplyAtRules(): void;
}

declare module 'tailwindcss/src/lib/generateRules.js' {
  export function generateRules(): void;
}

declare module 'tailwindcss/src/lib/setupContextUtils.js' {
  import { Container } from 'postcss';
  import { Config } from 'tailwindcss';

  interface ChangedContent {
    content: string;
    extension?: string;
  }

  interface Api {
    container: Container;
    separator: string;
    format: (def: string) => void;
    wrap: (rule: Container) => void;
  }

  type VariantPreview = string;

  type VariantFn = [number, (api: Api) => VariantPreview | undefined];

  type VariantName = string;

  export interface JitContext {
    changedContent: ChangedContent[];
    getClassList: () => string[];
    tailwindConfig: Config;
    variantMap: Map<VariantName, VariantFn[]>;
  }

  export function createContext(config: Config, changedContent?: ChangedContent[]): JitContext;
}

declare module 'tailwindcss/src/processTailwindFeatures.js' {
  import { AtRule, Plugin, Result, Root } from 'postcss';
  import { Config } from 'tailwindcss';
  import { ChangedContent, JitContext } from 'tailwindcss/src/lib/setupContextUtils.js';

  type SetupContext = (root: Root, result: Result) => JitContext;

  interface ProcessTailwindFeaturesCallbackOptions {
    applyDirectives: Set<AtRule>;
    createContext: (config: Config, changedContent: ChangedContent[]) => JitContext;
    registerDependency: () => unknown;
    tailwindDirectives: Set<string>;
  }

  export default function processTailwindFeatures(
    callback: (options: ProcessTailwindFeaturesCallbackOptions) => SetupContext,
  ): Plugin;
}

declare module 'tailwindcss/src/public/resolve-config.js' {
  import { Config } from 'tailwindcss';

  export default function resolveConfig(tailwindConfig: Config): Config;
}
