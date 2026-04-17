import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { InjectManifest } from 'workbox-webpack-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'production',
    optimization: {
        minimize: false,
    },
    entry: './src/index.ts',
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
        clean: true,
        publicPath: '/',
    },

    module: {
        rules: [
            {
                test: /\.s?css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                loadPaths: [resolve(__dirname, 'src/styles')],
                            },
                        },
                    },
                ],
            },
            {
                test: /\.hbs$/,
                use: 'handlebars-loader',
            },
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'babel-loader',
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    },
                ],
                exclude: /node_modules/,
            },
        ]
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: 'bundle.css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'src/assets', to: 'assets'},
            ]
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new InjectManifest({
            swSrc: resolve(__dirname, 'src/service-worker.ts'),
            swDest: 'service-worker.js',
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        }),
    ],

    resolve: {
        extensions: ['.ts', '.js'],
        fullySpecified: false,
    },
}