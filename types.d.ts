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
  import { Container, Root } from 'postcss';
  import { TailwindConfig } from 'tailwindcss/tailwind-config';

  type ModifierFunction = (options: { className?: string; selector: string }) => string;

  interface Api {
    container: Container;
    separator: string;
    modifySelectors: (modifierFunction: ModifierFunction) => Root;
    format: (def: string) => void;
    wrap: (rule: Container) => void;
  }

  type VariantPreview = string;

  type VariantFn = [number, (api: Api) => VariantPreview | null];

  type VariantName = string;

  export interface JitContext {
    getClassList: () => string[];
    variantMap: Map<VariantName, VariantFn[]>;
  }

  export function createContext(config: TailwindConfig): JitContext;
}
