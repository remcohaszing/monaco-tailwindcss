// Based off of:
// https://github.com/tailwindlabs/tailwindcss-intellisense/
import * as tailwindcss from 'tailwindcss';
import { DesignSystem } from '@tailwindcss/language-service/dist/util/v4';
import postcss from 'postcss';

type TWDesignSystem = Awaited<
  ReturnType<typeof tailwindcss.__unstable__loadDesignSystem>
>;

type CompileOptions = NonNullable<Parameters<typeof tailwindcss.compile>[1]>;

export async function loadDesignSystem(
  css: string,
  compileOptions: CompileOptions,
): Promise<DesignSystem | null> {
  // This isn't a v4 project
  if (!tailwindcss.__unstable__loadDesignSystem) return null;

  const dependencies = new Set<string>();

  // Step 3: Take the resolved CSS and pass it to v4's `loadDesignSystem`
  const design: TWDesignSystem = await tailwindcss.__unstable__loadDesignSystem(
    css,
    compileOptions,
  );

  // Step 4: Augment the design system with some additional APIs that the LSP needs
  return {
    ...design,

    dependencies: () => dependencies,

    // @ts-expect-error postcss stuff idk
    compile(classes: string[]): postcss.Root[] {
      const css = design.candidatesToCss(classes);
      const errors: unknown[] = [];

      const roots = css.map(str => {
        if (str === null) return postcss.root();

        try {
          return postcss.parse(str.trimEnd());
        } catch (err) {
          errors.push(err);
          return postcss.root();
        }
      });

      if (errors.length > 0) {
        console.error(JSON.stringify(errors));
      }

      return roots;
    },

    // @ts-expect-error postcss stuff idk
    toCss(nodes: postcss.Root | postcss.Node[]): string {
      return Array.isArray(nodes)
        ? postcss.root({ nodes }).toString().trim()
        : nodes.toString().trim();
    },
  };
}
