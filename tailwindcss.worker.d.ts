import { TailwindConfig } from 'tailwindcss/tailwind-config';

export interface TailwindWorkerOptions {
  /**
   * Hook that will run before the tailwind config is used.
   */
  prepareTailwindConfig?: (
    tailwindConfig?: TailwindConfig | string,
  ) => PromiseLike<TailwindConfig> | TailwindConfig;
}

export function initialize(tailwindWorkerOptions?: TailwindWorkerOptions): void;
