import { type languages } from 'monaco-types';

// Taken directly from
// https://github.com/tailwindlabs/tailwindcss.com/blob/248a97ed1b96d646b55161582cae03c9b7bbb957/src/docs/functions-and-directives.mdx

function createTailwindDirective(
  name: string,
  value: string,
): languages.css.IAtDirectiveData {
  return {
    name: `@${name}`,
    description: { kind: 'markdown', value },
    references: [
      {
        name: `@${name} documentation`,
        url: `https://tailwindcss.com/docs/functions-and-directives#${name}-directive`,
      },
    ],
  };
}

const themeDirective = createTailwindDirective(
  'theme',
  `\
Use the \`@theme\` directive to define your project's custom design tokens, like fonts, colors, and breakpoints:

\`\`\`css
@theme {
  --font-display: "Satoshi", "sans-serif";

  --breakpoint-3xl: 1920px;

  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);

  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  /* ... */
}
\`\`\`

Learn more about customizing your theme in the [theme variables documentation](https://tailwindcss.com/docs/theme).
`,
);

const sourceDirective = createTailwindDirective(
  'source',
  `\
Use the \`@source\` directive to explicitly specify source files that aren't picked up by Tailwind's automatic content detection:

\`\`\`
@source "../node_modules/@my-company/ui-lib";
\`\`\`

Learn more about automatic content detection in the [detecting classes in source files documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files).
`,
);

const utilityDirective = createTailwindDirective(
  'utility',
  `\
Use the \`@utility\` directive to add custom utilities to your project that work with variants like \`hover\`, \`focus\` and \`lg\`:

\`\`\`css
@utility tab-4 {
  tab-size: 4;
}
\`\`\`

Learn more about registering custom utilities in the [adding custom utilities documentation](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities).
`,
);

const variantDirective = createTailwindDirective(
  'variant',
  `\
Use the \`@variant\` directive to apply a Tailwind variant to styles in your CSS:

\`\`\`css
.my-element {
  background: white;

  @variant dark {
    background: black;
  }
}
\`\`\`

If you need to apply multiple variants at the same time, use nesting:

\`\`\`css
.my-element {
  background: white;

  @variant dark {
    @variant hover {
      background: black;
    }
  }
}
\`\`\`

Learn more about variants in the [hover, focus, and other states documentation](https://tailwindcss.com/docs/hover-focus-and-other-states).
`,
);

const customVariantDirective = createTailwindDirective(
  'custom-variant',
  `\
Use the \`@custom-variant\` directive to add a custom variant in your project:

\`\`\`css
@custom-variant pointer-coarse (@media (pointer: coarse));
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
\`\`\`

This lets you write utilities like \`pointer-coarse:size-48\` and \`theme-midnight:bg-slate-900\`.

Learn more about adding custom variants in the [registering a custom variant documentation](/docs/hover-focus-and-other-states#registering-a-custom-variant).
`,
);

const applyDirective = createTailwindDirective(
  'apply',
  `\
Use the \`@apply\` directive to inline any existing utility classes into your own custom CSS:

\`\`\`css
.select2-dropdown {
  @apply rounded-b-lg shadow-md;
}

.select2-search {
  @apply rounded border border-gray-300;
}

.select2-results__group {
  @apply text-lg font-bold text-gray-900;
}
\`\`\`

This is useful when you need to write custom CSS (like to override the styles in a third-party library) but still want to work with your design tokens and use the same syntax you’re used to using in your HTML.
`,
);

const referenceDirective = createTailwindDirective(
  'reference',
  `\
If you want to use \`@apply\` or \`@variant\` in the \`<style>\` block of a Vue or Svelte component, or within CSS modules, you will need to import your theme configuration to make those values available in that context.

To do this without duplicating the CSS variables in your CSS output, use the \`@reference\` directive instead of the \`@import\` directive when importing your theme:

\`\`\`html
<!-- [!code filename:HTML] -->
<template>
  <h1>Hello world!</h1>
</template>

<style>
  /* [!code highlight:2] */
  @reference "../../my-theme.css";

  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
\`\`\`

If you’re just using the default theme, you can import \`tailwindcss/theme\` directly:

\`\`\`html
<!-- [!code filename:HTML] -->
<template>
  <h1>Hello world!</h1>
</template>

<style>
  /* [!code highlight:2] */
  @reference "tailwindcss/theme";

  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
\`\`\`
`,
);

export const tailwindcssData: languages.css.CSSDataV1 = {
  version: 1.1,
  atDirectives: [
    themeDirective,
    sourceDirective,
    utilityDirective,
    variantDirective,
    customVariantDirective,
    applyDirective,
    referenceDirective,
  ],
};
