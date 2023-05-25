var path = require('path')

const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

var webpackConfig = {
  mode: 'development',
  entry: {
    org_chart: './src/org_chart.ts',
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
  },
  devServer: {
    https: true,
    compress: true,
    port: 9000,
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      { test: /\.js$/, loader: 'babel-loader' },
      { test: /\.ts$/, loader: 'ts-loader' },
    ],
  },
  plugins: [new UglifyJSPlugin()],
}

module.exports = webpackConfig
