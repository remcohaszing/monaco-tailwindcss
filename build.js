import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import { sep } from 'path';
import { fileURLToPath } from 'url';

import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', import.meta.url)));

await build({
  entryPoints: ['src/index.ts', 'src/tailwindcss.worker.ts'],
  bundle: true,
  external: Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }),
  logLevel: 'info',
  outdir: '.',
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  define: {
    'process.env.DEBUG': 'undefined',
    'process.env.NODE_DEBUG': 'undefined',
    'process.env.JEST_WORKER_ID': '123',
    'process.env.TAILWIND_MODE': JSON.stringify('build'),
    'process.env.TAILWIND_DISABLE_TOUCH': 'true',
    __dirname: '"/"',
    __filename: '"/index.js"',
  },
  plugins: [
    {
      name: 'alias',
      setup({ onResolve, resolve }) {
        // These packages are imported, but can be stubbed.
        onResolve(
          {
            filter:
              /^(detect-indent|chalk|fs|path|util|util-deprecate|vscode-emmet-helper-bundled)$/,
          },
          ({ path }) => ({
            path: fileURLToPath(new URL(`src/stubs/${path}.ts`, import.meta.url)),
            sideEffects: false,
          }),
        );

        // The tailwindcss main export exports CJS, but we can get better tree shaking if we import
        // from the ESM src directoy instead.
        onResolve({ filter: /^tailwindcss$/ }, ({ path, ...options }) =>
          resolve('tailwindcss/src', options),
        );
        onResolve({ filter: /^tailwindcss($|\/lib)/ }, ({ path, ...options }) =>
          resolve(path.replace('lib', 'src'), options),
        );

        // The tailwindcss-language-service main export exports CJS by default, but we get better
        // tree shaking if we import the ESM variant.
        onResolve({ filter: /^tailwindcss-language-service$/ }, ({ path, ...options }) =>
          resolve('tailwindcss-language-service/dist/tailwindcss-language-service.esm.js', options),
        );

        // This file pulls in a number of dependencies, but we don’t really need it anyway.
        onResolve({ filter: /^\.+\/(util\/)?log$/ }, ({ path, ...options }) =>
          options.importer.includes(`${sep}tailwindcss${sep}`)
            ? {
                path: fileURLToPath(new URL('src/stubs/tailwindcss/utils/log.ts', import.meta.url)),
                sideEffects: false,
              }
            : resolve(path, options),
        );

        // The culori main export exports CJS by default, but we get better tree shaking if we
        // import the ESM variant.
        onResolve({ filter: /^culori$/ }, ({ path, ...options }) =>
          resolve('culori/build/culori.js', options),
        );

        // Some dependencies depend on very specific versions of postcss-selector-parser, but they
        // don’t need this specific version. As a result this package would be included twice. This
        // matters, because it’s a big dependency.
        onResolve({ filter: /^postcss-selector-parser/ }, ({ path }) => ({
          path: require.resolve(path),
          sideEffects: false,
        }));

        // None of our dependencies use side effects, but many packages don’t explicitly define
        // this.
        onResolve({ filter: /.*/ }, () => ({ sideEffects: false }));
      },
    },
  ],
});
