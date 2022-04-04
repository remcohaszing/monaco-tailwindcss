import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

import { build } from 'esbuild';

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
    'process.env.JEST_WORKER_ID': 'undefined',
    'process.env.TAILWIND_MODE': JSON.stringify('build'),
    'process.env.TAILWIND_DISABLE_TOUCH': 'true',
    '__dirname': '"/"',
    '__filename': '"/index.js"',
  },
  plugins: [
    {
      name: 'alias',
      setup({ onResolve, resolve }) {
        onResolve({ filter: /^fs$/ }, () => ({
          path: fileURLToPath(new URL('src/stubs/fs.cjs', import.meta.url)),
          sideEffects: false,
        }));
        onResolve({ filter: /^util$/ }, () => ({
          path: fileURLToPath(new URL('src/stubs/util.cjs', import.meta.url)),
          sideEffects: false,
        }));
        onResolve({ filter: /^vscode-emmet-helper-bundled$/ }, () => ({
          path: fileURLToPath(new URL('src/stubs/noop.cjs', import.meta.url)),
          sideEffects: false,
        }));

        // will be external depending on `external` above
        onResolve({ filter: /^path$/ }, ({ path, ...options }) =>
          resolve('path-browserify', options)
        );
        onResolve({ filter: /^url$/ }, ({ path, ...options }) =>
          resolve('url/', options)
        );

        // Todo
        // // The main prettier entry point contains all of Prettier.
        // // The standalone bundle is smaller and works fine for us.
        // onResolve({ filter: /^prettier/ }, ({ path }) => ({
        //   path: path === 'prettier' ? 'prettier/standalone.js' : `${path}.js`,
        //   external: true,
        //   sideEffects: false,
        // }));

        // Todo keep this?
        // The language server dependencies tend to write both ESM and UMD output alongside each
        // other, then use UMD for imports. We prefer ESM.
        onResolve({ filter: /\/umd\// }, ({ path, ...options }) =>
          resolve(path.replace(/\/umd\//, '/esm/'), options),
        );
        onResolve({ filter: /.*/ }, () => ({ sideEffects: false }));
      },
    },
  ],
});
