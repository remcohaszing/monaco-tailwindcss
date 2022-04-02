const esbuild = require('esbuild');
const path = require('path');

const outputDir = path.join(__dirname, './dist')

const workerEntryPoints = [
  'language/json/json.worker.js',
  'language/css/css.worker.js',
  'language/html/html.worker.js',
  'language/typescript/ts.worker.js',
  'editor/editor.worker.js'
];

build({
  entryPoints: workerEntryPoints.map(entry => require.resolve(`monaco-editor/esm/vs/${entry}`)),
  outdir: outputDir,
  bundle: true,
  format: 'iife',
  minify: true
});

build({
  watch: true,
  entryPoints: [require.resolve('monaco-tailwindcss/src/tailwindcss.worker.ts')],
  outfile: path.join(outputDir, 'monaco-tailwindcss/tailwindcss.worker.js'),
  bundle: true,
  sourcemap: 'inline',
  format: 'iife',
  minify: false,
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
      setup({ onResolve }) {
        const replace = {
          'path': require.resolve('path-browserify'),
          'fs': require.resolve('./src/mocked/fs.cjs'),
          'util': require.resolve('./src/mocked/util.cjs'),
          'url': require.resolve('url/'),
          'vscode-emmet-helper-bundled': require.resolve('./src/mocked/noop.cjs')
        }
        const filter = RegExp(`^(${Object.keys(replace).join('|')})$`);
        onResolve({ filter }, ({ path }) => ({
          path: replace[path],
        }));
      },
    }
  ],
});

// change this to `build()` for building.
serve({
  minify: true,
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  // format: 'iife', // then we must use document.currentScript.src instead of import.meta.src
  // splitting: true, // optional and only works for esm
  banner: {
    // dirtily injects the style.css - todo find a better way.
    js: `
        (function () {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = (new URL('index.css', import.meta.url)).pathname
            document.head.append(link)
        })();
    `,
  },
  outdir: outputDir,
  loader: {
    '.ttf': 'file'
  }
});

/**
 * @param {import ('esbuild').BuildOptions} opts
 */
function build(opts) {
  esbuild.build(opts).then((result) => {
    if (result.errors.length > 0) {
      console.error(result.errors);
    }
    if (result.warnings.length > 0) {
      console.error(result.warnings);
    }
    console.info('build done')
  });
}

/**
 * todo or implement something like https://github.com/evanw/esbuild/issues/802#issuecomment-955776480
 * @param {import ('esbuild').BuildOptions} opts
 */
function serve(opts) {
  esbuild.serve({
    servedir: __dirname,
    host: '127.0.0.1'
  },opts).then((result) => {
    const {host, port} = result;
    console.info('serve done')
    console.log(`open: http://${host}:${port}`)
  });
}
