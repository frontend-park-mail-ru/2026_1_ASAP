import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { GenerateSW } from 'workbox-webpack-plugin';

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
        new GenerateSW({
            mode: 'development',
            swDest: 'service-worker.js',
            clientsClaim: true,
            skipWaiting: true,
            cleanupOutdatedCaches: true,
            disableDevLogs: true,
            navigateFallback: '/index.html',
            runtimeCaching: [
                {
                    urlPattern: ({ request }) => request.destination === 'image',
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'images-cache',
                        expiration: {
                            maxEntries: 200,
                            maxAgeSeconds: 60 * 60 * 24 * 30,
                        },
                    },
                },
                {
                    urlPattern: ({ request }) => request.destination === 'style' || request.destination === 'script',
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'static-resources-cache',
                    },
                },
                {
                    urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
                    handler: 'NetworkOnly',
                },
            ],
        }),
    ],

    resolve: {
        extensions: ['.ts', '.js'],
        fullySpecified: false,
    },
}