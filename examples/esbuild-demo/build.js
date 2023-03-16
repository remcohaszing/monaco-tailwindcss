const { join } = require('node:path');

const esbuild = require('esbuild');

const outputDir = join(__dirname, 'dist');

/**
 * @param {import ('esbuild').BuildOptions} opts esbuild options
 */
function build(opts) {
  esbuild.build(opts).then((result) => {
    if (result.errors.length > 0) {
      console.error(result.errors);
    }
    if (result.warnings.length > 0) {
      console.error(result.warnings);
    }
    console.info('build done');
  });
}

/**
 * Todo or implement something like https://github.com/evanw/esbuild/issues/802#issuecomment-955776480
 *
 * @param {import ('esbuild').BuildOptions} opts esbuild options
 */
function serve(opts) {
  esbuild
    .serve(
      {
        servedir: __dirname,
        host: '127.0.0.1',
      },
      opts,
    )
    .then((result) => {
      const { host, port } = result;
      console.info('serve done');
      console.log(`open: http://${host}:${port}`);
    });
}

// Build the workers
build({
  entryPoints: Object.fromEntries(
    Object.entries({
      'json.worker': 'monaco-editor/esm/vs/language/json/json.worker.js',
      'css.worker': 'monaco-editor/esm/vs/language/css/css.worker.js',
      'html.worker': 'monaco-editor/esm/vs/language/html/html.worker.js',
      'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
      'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
      'tailwindcss.worker': 'monaco-tailwindcss/tailwindcss.worker.js',
    }).map(([outfile, entry]) => [outfile, require.resolve(entry)]),
  ),
  outdir: outputDir,
  format: 'iife',
  bundle: true,
  minify: true,
});

// Change this to `build()` for building.
serve({
  minify: true,
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  // Format: 'iife', // then we must use document.currentScript.src instead of import.meta.src
  // splitting: true, // optional and only works for esm
  outdir: outputDir,
  loader: {
    '.ttf': 'file',
  },
});
