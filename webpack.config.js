import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'development',
    entry: './src/index.ts',
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'bundle.[contenthash].js',
    },

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.hbs$/,
                use: 'handlebars-loader',
            },
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    }
                },
                exclude:  /node_modules/
            }
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
        })
    ],

    resolve: {
        extensions: ['.ts', '.js'],
    },
}