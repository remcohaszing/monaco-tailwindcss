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
  import { TailwindConfig } from 'tailwindcss/tailwind-config';

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
    getClassList: () => string[];
    tailwindConfig: TailwindConfig;
    variantMap: Map<VariantName, VariantFn[]>;
  }

  export function createContext(config: TailwindConfig): JitContext;
}

declare module 'tailwindcss/src/public/resolve-config.js' {
  export { default } from 'tailwindcss/resolveConfig';
}
