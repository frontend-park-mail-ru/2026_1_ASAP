/** Транспиляция JS после ts-loader: синтаксис под browserslist из package.json */
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                modules: false,
                bugfixes: true,
            },
        ],
    ],
};
