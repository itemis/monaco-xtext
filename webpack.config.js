var path = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/monaco.contribution.ts',
    output: {
        filename: '/bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    node:
        {
            "child_process": "empty",
            "net": "empty"
        },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                loader: "source-map-loader"
            },
            {
                enforce: 'pre',
                test: /\.tsx?$/,
                use: "source-map-loader"
            },

            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    context: path.join(__dirname, '.'),

    plugins: [
        new CopyWebpackPlugin([
            // Copy directory contents to {output}/to/directory/
            { from: 'node_modules/monaco-editor-core/dev/vs', to: 'vs' },
        ], {
            // By default, we only copy modified files during
            // a watch or webpack-dev-server build. Setting this
            // to `true` copies all files.
            copyUnmodified: true
        })
    ]
};
