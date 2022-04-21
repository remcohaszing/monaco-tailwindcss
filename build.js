import { readdir, readFile } from 'fs/promises';
import { parse, sep } from 'path';
import { fileURLToPath } from 'url';

import { build } from 'esbuild';

const [, , logLevel = 'info'] = process.argv;
const pkg = JSON.parse(await readFile(new URL('package.json', import.meta.url)));

await build({
  entryPoints: ['src/index.ts', 'src/tailwindcss.worker.ts'],
  bundle: true,
  external: Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }),
  logLevel,
  outdir: '.',
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  loader: { '.css': 'text' },
  define: {
    'process.env.DEBUG': 'undefined',
    'process.env.JEST_WORKER_ID': '1',
    __dirname: '"/"',
  },
  plugins: [
    {
      name: 'alias',
      async setup({ onLoad, onResolve, resolve }) {
        const stubFiles = await readdir('src/stubs', { withFileTypes: true });
        // These packages are imported, but can be stubbed.
        const stubNames = stubFiles
          .filter((file) => file.isFile())
          .map((file) => parse(file.name).name);
        onResolve({ filter: new RegExp(`^(${stubNames.join('|')})$`) }, ({ path }) => ({
          path: fileURLToPath(new URL(`src/stubs/${path}.ts`, import.meta.url)),
          sideEffects: false,
        }));

        // The tailwindcss main export exports CJS, but we can get better tree shaking if we import
        // from the ESM src directoy instead.
        onResolve({ filter: /^tailwindcss$/ }, ({ path, ...options }) =>
          resolve('tailwindcss/src', options),
        );
        onResolve({ filter: /^tailwindcss\/lib/ }, ({ path, ...options }) =>
          resolve(path.replace('lib', 'src'), options),
        );

        // The tailwindcss-language-service main export exports CJS by default, but we get better
        // tree shaking if we import the ESM variant.
        onResolve({ filter: /^tailwindcss-language-service$/ }, ({ path, ...options }) =>
          resolve('tailwindcss-language-service/dist/tailwindcss-language-service.esm.js', options),
        );

        // This file pulls in a number of dependencies, but we don’t really need it anyway.
        onResolve({ filter: /^\.+\/(util\/)?log$/, namespace: 'file' }, ({ path, ...options }) => {
          if (options.importer.includes(`${sep}tailwindcss${sep}`)) {
            return {
              path: fileURLToPath(new URL('src/stubs/tailwindcss/utils/log.ts', import.meta.url)),
              sideEffects: false,
            };
          }
          return resolve(path, {
            ...options,
            sideEffects: false,
            namespace: 'noRecurse',
          });
        });

        // The culori main export exports CJS by default, but we get better tree shaking if we
        // import the ESM variant.
        onResolve({ filter: /^culori$/ }, ({ path, ...options }) =>
          resolve('culori/build/culori.js', options),
        );

        // CJS doesn’t require extensions, but ESM does. Since our package uses ESM, but dependant
        // bundled packages don’t, we need to add it ourselves.
        onResolve({ filter: /^postcss-selector-parser\/.*\/\w+$/ }, ({ path, ...options }) =>
          resolve(`${path}.js`, options),
        );

        // None of our dependencies use side effects, but many packages don’t explicitly define
        // this.
        onResolve({ filter: /.*/ }, () => ({ sideEffects: false }));

        // Rewrite the tailwind stubs from CJS to ESM, so our bundle doesn’t need to include any CJS
        // related logic.
        onLoad({ filter: /\/tailwindcss\/stubs\/defaultConfig\.stub\.js$/ }, async ({ path }) => {
          const cjs = await readFile(path, 'utf8');
          const esm = cjs.replace('module.exports =', 'export default');
          return { contents: esm };
        });
      },
    },
  ],
});
