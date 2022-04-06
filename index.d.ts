import { IDisposable, languages } from 'monaco-editor';
import { TailwindConfig } from 'tailwindcss/tailwind-config';
import { State } from 'tailwindcss-language-service';
import type { Postcss } from 'postcss';
import parse from 'postcss-selector-parser';

export interface MonacoTailwindcssOptions {
  /**
   * @default defaultLanguageSelector
   */
  languageSelector?: languages.LanguageSelector;

  config?: TailwindConfig;
}

export interface JitState extends State {
  config: object;
  separator: string;
  screens: string[];
  variants: Record<string, string | null>;
  jit: true;
  jitContext: any;
  modules: {
    tailwindcss?: {
      version: string;
      module: any;
    };
    postcss: {
      version: string;
      module: Postcss;
    };
    postcssSelectorParser: {
      module: typeof parse;
    };
    jit: {
      generateRules: {
        module: any;
      };
      createContext: {
        module: any;
      };
      expandApplyAtRules: {
        module: any;
      };
    };
  };
}

export function configureMonacoTailwindcss(options?: MonacoTailwindcssOptions): IDisposable;
