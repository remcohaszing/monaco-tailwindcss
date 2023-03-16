import { TailwindConfig } from 'monaco-tailwindcss';
import { Config } from 'tailwindcss';

export interface TailwindWorkerOptions {
  /**
   * Hook that will run before the tailwind config is used.
   *
   * @param tailwindConfig The Tailwind configuration passed from the main thread.
   * @returns A valid Tailwind configuration.
   */
  prepareTailwindConfig?: (
    tailwindConfig?: TailwindConfig | string,
  ) => Config | PromiseLike<Config>;
}

/**
 * Setup the Tailwindcss worker using a customized configuration.
 */
export function initialize(options?: TailwindWorkerOptions): void;
