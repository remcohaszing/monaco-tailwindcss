import { createRequire } from 'module';

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import HtmlWebPackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';

const require = createRequire(import.meta.url);

export default {
  // Output: {
  //   filename: '[contenthash].js',
  // },
  externals: [{ 'vscode-emmet-helper-bundled': 'null' }],
  devtool: 'source-map',
  resolve: {
    extensions: ['.mjs', '.js', '.ts'],
    fallback: {
      path: require.resolve('path-browserify'),
      url: require.resolve('url/'),
      util: require.resolve('./src/util.cjs'),
      fs: require.resolve('./src/fs.cjs'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        // Monaco editor uses .ttf icons.
        test: /\.(svg|ttf)$/,
        type: 'asset/resource',
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: { transpileOnly: true },
      },
    ],
  },
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.DEBUG': 'undefined',
      'process.env.JEST_WORKER_ID': 'undefined',
      'process.env.TAILWIND_MODE': JSON.stringify('build'),
      'process.env.TAILWIND_DISABLE_TOUCH': 'true',
    }),
    new HtmlWebPackPlugin(),
    new MiniCssExtractPlugin({ filename: '[contenthash].css' }),
  ],
};
