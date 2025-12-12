const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { minify: htmlMinifier } = require('html-minifier-terser');
const postcss = require('postcss');
const cssnano = require('cssnano');

module.exports = {
    mode: 'production',
    devtool: false,
    entry: {
        background: path.join(__dirname, 'src', 'background.js'),
        popup: path.join(__dirname, 'src', 'popup.js'),
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: '',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.(png|svg|jpg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[name][ext]'
                }
            },
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    ecma: 2018,
                    compress: {
                        drop_console: true,
                        passes: 2,
                    },
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
        splitChunks: false,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: '**/*',
                    context: path.resolve(__dirname, 'public'),
                    to: '.',
                    transform: async (content, absolutePath) => {
                        const ext = path.extname(absolutePath).toLowerCase();

                        if (ext === '.html') {
                            return htmlMinifier(content.toString(), {
                                collapseWhitespace: true,
                                removeComments: true,
                                minifyCSS: true,
                                minifyJS: true,
                                keepClosingSlash: true,
                            });
                        }

                        if (ext === '.css') {
                            const result = await postcss([cssnano({ preset: 'default' })]).process(content.toString(), { from: undefined });
                            return result.css;
                        }

                        return content;
                    },
                },
                {
                    from: '_locales',
                    to: '_locales'
                }
            ],
        }),
    ],
};
