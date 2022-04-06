import { IDisposable, languages } from 'monaco-editor';
import { TailwindConfig } from 'tailwindcss/tailwind-config';

export interface MonacoTailwindcssOptions {
  /**
   * @default defaultLanguageSelector
   */
  languageSelector?: languages.LanguageSelector;

  config?: TailwindConfig;
}

export function configureMonacoTailwindcss(options?: MonacoTailwindcssOptions): IDisposable;
