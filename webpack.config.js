const fs = require('fs');
const path = require('path');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const dotenv = require('dotenv');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

class EnvToPhpConfigPlugin {
  constructor(options = {}) {
    this.options = {
      envPath: '.env',
      outputFileName: 'config.php',
      ...options,
    };
  }

  apply(compiler) {
    // Run after the compilation is done but before assets are emitted
    compiler.hooks.afterEmit.tap('EnvToPhpConfigPlugin', (compilation) => {
      const envPath = path.resolve(this.options.envPath);
      const outputPath = path.resolve(compilation.outputOptions.path, this.options.outputFileName);

      // Parse the .env file
      const envConfig = dotenv.config({ path: envPath }).parsed || {};

      // Create the PHP config content
      const phpConfigContent = `<?php
// Auto-generated configuration file from environment variables - do not edit manually
return [
${Object.entries(envConfig)
  .map(([key, value]) => `  '${key}' => '${value}'`)
  .join(',\n')}
];
`;

      // Ensure the output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write the PHP config file
      fs.writeFileSync(outputPath, phpConfigContent);
    });
  }
}

module.exports = (env, argv) => {
  const isProduction = argv.configuration === 'production';
  const pluginPath = path.resolve(__dirname);
  const distPath = path.resolve(__dirname, '../../dist/apps/wordpress');

  // Probably come back to this at some point and make docker get the files from the dist folder but for now this is fine
  const dockerDistPath = path.resolve(__dirname, 'dist/my-wordpress-plugin');
  const getOutputPath = () => (isProduction ? distPath : dockerDistPath);

  return {
    ...env,
    mode: isProduction ? 'production' : 'development',
    entry: {
      admin: path.resolve(pluginPath, 'src/admin/index.tsx'),
      public: path.resolve(pluginPath, 'src/assets/js/public.js'),
      // style: path.resolve(pluginPath, 'src/assets/css/style.scss'),
    },
    output: {
      filename: 'admin/js/[name].js',
      path: getOutputPath(),
      clean: true,
    },
    optimization: {
      runtimeChunk: 'single',
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, './tsconfig.json'),
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'string-replace-loader',
              options: {
                search: /:first-child/g,
                replace: ':first-of-type',
                flags: 'g',
              },
            },
          ],
        },
        {
          test: /\.scss$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
        {
          test: /\.js$/,
          exclude: [/node_modules/, /src\/php\/vendor/],
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              // configFile: path.resolve(__dirname, './tsconfig.json'),
            },
          },
        },
      ],
    },
    resolve: {
      ...env.resolve,
      extensions: ['.tsx', '.ts', '.js', '.php', '.d.ts'],
    },
    plugins: [
      new Dotenv({ path: 'apps/wordpress/.env' }),
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: 'css/styles.css',
      }),
      new CopyPlugin({
        patterns: [
          // Copy PHP source files
          {
            from: path.resolve(__dirname, 'src/php/src'),
            to: path.resolve(getOutputPath()),
            globOptions: {
              dot: true,
              gitignore: true,
            },
          },
          // copy readme.md
          {
            from: path.resolve(pluginPath, 'src/php/readme.md'),
            to: path.resolve(getOutputPath(), 'readme.md'),
          },
          {
            from: path.resolve(pluginPath, 'src/languages'),
            to: path.resolve(getOutputPath(), 'languages'),
          },
          // Ensure CSS is copied to the correct location
        ],
      }),
      new EnvToPhpConfigPlugin({
        envPath: path.resolve(pluginPath, '.env'),
        outputFileName: 'config.php',
      }),
    ],
    devtool: isProduction ? false : 'source-map',
    devServer: {
      hot: true,
      port: 8890,
      host: '0.0.0.0',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
};
