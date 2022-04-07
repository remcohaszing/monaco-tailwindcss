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
  import { TailwindConfig } from 'tailwindcss/tailwind-config';

  type Variant = [sort: string, fn: (any: any) => any];

  type VariantFnOrFns = Variant | [Variant];

  export interface JitContext {
    getClassList: () => string[];
    variantMap: Map<string, VariantFnOrFns>;
  }

  export function createContext(config: TailwindConfig): JitContext;
}
