const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        background: path.join(__dirname, 'src', 'background.js'),
        popup: path.join(__dirname, 'src', 'popup.js'),
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: "",
        chunkFilename: '[name].[contenthash].js'
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
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader',
                ],
            },
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'public', to: '' } // Copies static assets (including manifest.json & popup.html) to dist
            ],
        }),
    ]
};
