import path from 'path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import CopyPlugin from "copy-webpack-plugin"
import dotenv from "dotenv"


dotenv.config({ path: '../.env' })

/**
 * @type import('webpack').Configuration
 */
export default {
  mode: "development",
  watch: false,
  // context: './', // to automatically find tsconfig.json
  devtool: 'eval-cheap-module-source-map',
  entry: {
    theme: './src/assignThemeSync.ts',
    main: './src/index.ts',
  },
  // optimization: {
  //   runtimeChunk: true,
  // },
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            // happyPackMode: true,
            transpileOnly: true, // Set to true if you are using fork-ts-checker-webpack-plugin
            projectReferences: true
          }
        }
      }
    ]
  },
  resolve: {
    modules: [
      "node_modules",
      path.resolve('.')
    ],
    extensions: [".ts", '.js'],
    fallback: {
      // '@walletconnect/encoding': require.resolve("@walletconnect/encoding"),
      // ethers: false,
      process: false,
      // events: require.resolve("eventemitter3"),
      buffer: false
      // buffer: require.resolve("buffer/")
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "assets", to: 'assets' },
      ]
    }),
  ],
  // node: { crypto: true, stream: true },
  devServer: {
    port: 3000,
    https: true,
    proxy: {
      '/api': 'http://localhost:5555',
      '/api-ws': {
        target: 'ws://localhost:5555',
        ws: true
      },
    },
    historyApiFallback: true
  },
  output: {
    clean: true,
    filename: '[name].[contenthash].js',
    path: path.resolve('./.dist')
  }
}