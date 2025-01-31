import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { string } from 'rollup-plugin-string';
import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').InputOptions} */
const inputOptions = {
  input: './index.ts',
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.app.json',
      declaration: true,
      declarationDir: './dist',
    }),
    string({
      include: '**/*.css',
    }),
  ],
};

/** @type {import('rollup').OutputOptions} */
const outputOptions = {
  file: 'dist/bundle.js',
  format: 'es',
};

async function build() {
  const bundle = await rollup(inputOptions);
  await bundle.write(outputOptions);
}

build();