import { IDisposable, languages } from 'monaco-editor';
import { TailwindConfig } from 'tailwindcss/tailwind-config';

export interface MonacoTailwindcssOptions {
  /**
   * @default defaultLanguageSelector
   */
  languageSelector?: languages.LanguageSelector;

  tailwindConfig?: TailwindConfig | string;
}

export interface MonacoTailwindcss extends IDisposable {
  setTailwindConfig: (tailwindConfig: TailwindConfig) => void;
}

export function configureMonacoTailwindcss(options?: MonacoTailwindcssOptions): MonacoTailwindcss;

/**
 * This data can be used with the default Monaco CSS support to support tailwind directives.
 *
 * It will provider hover information from the Tailwindcss documentation, including a link.
 */
export const tailwindcssData: languages.css.CSSDataV1;
