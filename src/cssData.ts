import { languages } from 'monaco-types';

function createTailwindDirective(name: string, value: string): languages.css.IAtDirectiveData {
  return {
    name: `@${name}`,
    description: { kind: 'markdown', value },
    references: [
      {
        name: `@${name} documentation`,
        url: `https://tailwindcss.com/docs/functions-and-directives#${name}`,
      },
    ],
  };
}

// The descriptions have been taken from
// https://github.com/tailwindlabs/tailwindcss.com/blob/master/src/pages/docs/functions-and-directives.mdx

const tailwindDirective = createTailwindDirective(
  'tailwind',
  `Use the \`@tailwind\` directive to insert Tailwind's \`base\`, \`components\`, \`utilities\` and \`variants\` styles into your CSS.

\`\`\`css
/**
 * This injects Tailwind's base styles and any base styles registered by
 * plugins.
 */
@tailwind base;

/**
 * This injects Tailwind's component classes and any component classes
 * registered by plugins.
 */
@tailwind components;

/**
 * This injects Tailwind's utility classes and any utility classes registered
 * by plugins.
 */
@tailwind utilities;

/**
 * Use this directive to control where Tailwind injects the hover, focus,
 * responsive, dark mode, and other variants of each class.
 *
 * If omitted, Tailwind will append these classes to the very end of
 * your stylesheet by default.
 */
@tailwind variants;
\`\`\``,
);

const layerDirective = createTailwindDirective(
  'layer',
  `Use the \`@layer\` directive to tell Tailwind which "bucket" a set of custom styles belong to. Valid layers are \`base\`, \`components\`, and \`utilities\`.

\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  h1 {
    @apply text-2xl;
  }
  h2 {
    @apply text-xl;
  }
}

@layer components {
  .btn-blue {
    @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }
}

@layer utilities {
  .filter-none {
    filter: none;
  }
  .filter-grayscale {
    filter: grayscale(100%);
  }
}
\`\`\`

Tailwind will automatically move any CSS within a \`@layer\` directive to the same place as the corresponding \`@tailwind\` rule, so you don't have to worry about authoring your CSS in a specific order to avoid specificity issues.

Any custom CSS added to a layer will only be included in the final build if that CSS is actually used in your HTML, just like all of the classes built in to Tailwind by default.

Wrapping any custom CSS in a \`@layer\` directive also makes it possible to use modifiers with those rules, like \`hover:\` and \`focus:\` or responsive modifiers like \`md:\` and \`lg:\`.`,
);

const applyDirective = createTailwindDirective(
  'apply',
  `Use \`@apply\` to inline any existing utility classes into your own custom CSS.

This is useful when you need to write custom CSS (like to override the styles in a third-party library) but still want to work with your design tokens and use the same syntax you're used to using in your HTML.

\`\`\`css
.select2-dropdown {
  @apply rounded-b-lg shadow-md;
}
.select2-search {
  @apply border border-gray-300 rounded;
}
.select2-results__group {
  @apply text-lg font-bold text-gray-900;
}
\`\`\`

Any rules inlined with \`@apply\` will have \`!important\` **removed** by default to avoid specificity issues:

\`\`\`css
/* Input */
.foo {
  color: blue !important;
}

.bar {
  @apply foo;
}

/* Output */
.foo {
  color: blue !important;
}

.bar {
  color: blue;
}
\`\`\`

If you'd like to \`@apply\` an existing class and make it \`!important\`, simply add \`!important\` to the end of the declaration:

\`\`\`css
/* Input */
.btn {
  @apply font-bold py-2 px-4 rounded !important;
}

/* Output */
.btn {
  font-weight: 700 !important;
  padding-top: .5rem !important;
  padding-bottom: .5rem !important;
  padding-right: 1rem !important;
  padding-left: 1rem !important;
  border-radius: .25rem !important;
}
\`\`\`

Note that if you're using Sass/SCSS, you'll need to use Sass' interpolation feature to get this to work:

\`\`\`css
.btn {
  @apply font-bold py-2 px-4 rounded #{!important};
}
\`\`\``,
);

const configDirective = createTailwindDirective(
  'config',
  `Use the \`@config\` directive to specify which config file Tailwind should use when compiling CSS file. This is useful for projects that need to use different configuration files for different CSS entry points.

\`\`\`css
@config "./tailwind.site.config.js";
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

\`\`\`css
@config "./tailwind.admin.config.js";
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

The path you provide to the \`@config\` directive is relative to that CSS file, and will take precedence over a path defined in your PostCSS configuration or in the Tailwind CLI.`,
);

export const tailwindcssData: languages.css.CSSDataV1 = {
  version: 1.1,
  atDirectives: [tailwindDirective, layerDirective, applyDirective, configDirective],
};
