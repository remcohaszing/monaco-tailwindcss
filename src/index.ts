export { tailwindcssData } from "./cssData";
import { TailwindHandler } from "./TailwindHandler";
export { defaultLanguageSelector } from "./TailwindHandler";

export function configureMonacoTailwindcss(
  monaco: typeof import("monaco-editor")
) {
  const handler = new TailwindHandler();
  handler.configureMonaco(monaco);
  return handler;
}
