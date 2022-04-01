declare module 'culori' {
  export type Color = unknown;
}

declare module 'tailwindcss/lib/lib/expandApplyAtRules.js' {
  export default function expandApplyAtRules(): void;
}

declare module 'tailwindcss/lib/lib/generateRules.js' {
  export function generateRules(): void;
}

declare module 'tailwindcss/lib/lib/setupContextUtils.js' {
  import { TailwindConfig } from 'tailwindcss/tailwind-config';

  export interface JitContext {
    getClassList: () => string[];
  }

  export function createContext(config: TailwindConfig): JitContext;
}
