import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { InjectManifest } from 'workbox-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ImageMinimizerPlugin from 'image-minimizer-webpack-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COMPRESS_THRESHOLD = 1024;
const COMPRESSIBLE = /\.(js|css|html|svg|json|map|txt|xml|webmanifest)$/;

export default {
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [
            '...',
            new CssMinimizerPlugin(),
            new ImageMinimizerPlugin({
                test: /\.svg$/i,
                minimizer: {
                    implementation: ImageMinimizerPlugin.svgoMinify,
                    options: {
                        encodeOptions: {
                            multipass: true,
                            plugins: ['preset-default'],
                        },
                    },
                },
            }),
        ],
    },
    entry: {
        main: './src/index.ts',
        support: './src/support.ts',
    },
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'bundle.[name].[contenthash].js',
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
        new webpack.DefinePlugin({
            __LOCAL_API__: JSON.stringify(process.env.LOCAL_API === 'true'),
        }),
        new MiniCssExtractPlugin({
            filename: 'bundle.[name].[contenthash].css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'src/assets', to: 'assets'},
                {from: 'src/manifest.json', to: 'manifest.json'},
            ]
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['main'],
        }),
        new HtmlWebpackPlugin({
            template: './src/support.html',
            filename: 'support.html',
            chunks: ['support'],
        }),
        new InjectManifest({
            swSrc: resolve(__dirname, 'src/service-worker.ts'),
            swDest: 'service-worker.js',
            exclude: [/index\.html$/, /support\.html$/],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        }),
        new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: COMPRESSIBLE,
            threshold: COMPRESS_THRESHOLD,
            minRatio: 0.9,
            deleteOriginalAssets: false,
        }),
        new CompressionPlugin({
            filename: '[path][base].br',
            algorithm: 'brotliCompress',
            test: COMPRESSIBLE,
            compressionOptions: {
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                },
            },
            threshold: COMPRESS_THRESHOLD,
            minRatio: 0.9,
            deleteOriginalAssets: false,
        }),
    ],

    resolve: {
        extensions: ['.ts', '.js'],
        fullySpecified: false,
    },
}
