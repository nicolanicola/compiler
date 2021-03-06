const browser                  = require('browser-sync');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const config                   = require('../config');
const fs                       = require('fs');
const gulp                     = require('gulp');
const path                     = require('path');
const shouldWatch              = require('../utilities/shouldWatch');
const url                      = require('url');
const webpack                  = require('webpack');
const webpackDevMiddleware     = require('webpack-dev-middleware');
const webpackHotMiddleware     = require('webpack-hot-middleware');

/**
 * HyperBolts ϟ (https://hyperbolts.io)
 *
 * Copyright © 2015-present Pace IT Systems Ltd.
 * All rights reserved.
 *
 * @author  Pace IT Systems Ltd
 * @license MIT
 */

gulp.task('bundle', cb => {
    const loaders = ['babel-loader?{"presets":[["latest",{"modules":false}],"react"]}'];
    const plugins = [new webpack.NoEmitOnErrorsPlugin(), new CaseSensitivePathsPlugin()];
    const paths   = [].concat(config.bundle);
    const entries = {};
    let triggered = false;
    let conf;

    // Build entry points
    for (conf of paths) {
        entries[conf.dest] = [path.resolve(conf.src)];

        // If we are watching for changes, add hot loading
        // files to entry point
        if (shouldWatch === true) {
            entries[conf.dest].unshift(
                'webpack/hot/dev-server',
                'webpack-hot-middleware/client'
            );
        }
    }

    // If we are watching for changes, update config
    // to support hot loading
    if (shouldWatch === true) {

        // Add additional loaders
        loaders.push('webpack-module-hot-accept');
        loaders.unshift('react-hot-loader');

        // Add hot replacement plugin
        plugins.push(new webpack.HotModuleReplacementPlugin());
    }

    // Create bundler instance
    const bundler = webpack({
        devtool: 'eval-inline-source-map',
        watch:   shouldWatch,
        entry:   entries,
        plugins,

        // Define rules
        module: {
            rules: [
                {
                    test:    /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    loaders
                }
            ]
        },

        // Define output
        output: {
            path:     path.resolve(config.base),
            filename: '[name]'
        }

        // Handle output
    }, (error, stats) => {

        // Skip if we have already triggered the callback
        if (triggered === true) {
            return;
        }

        // Set triggered flag
        triggered = true;

        // If we are watching for changes, launch browser with
        // support for hot loading
        if (shouldWatch === true) {
            browser({
                server: {
                    baseDir:    config.base,
                    middleware: [

                        // Add support for hot loading
                        webpackHotMiddleware(bundler.compiler),
                        webpackDevMiddleware(bundler.compiler, {
                            publicPath: '/',
                            stats:      {
                                chunks: false,
                                colors: true
                            }
                        }),

                        // Use root index file for any non-existant
                        // path. This allows react to take over and
                        // render the correct page client-side.
                        (request, response, next) => {
                            const parsed = url.parse(request.url);
                            const file   = `${process.cwd()}/${config.base}${parsed.pathname}`;

                            // If a matching file or folder does not
                            // exist, use root index file
                            if (fs.existsSync(file) === false) {
                                request.url = '/index.html';
                            }

                            return next();
                        }
                    ]
                }
            });
        }

        // If we aren't watching, output stats to console
        else {
            process.stdout.write(stats.toString({
                chunks: false,
                colors: true
            }));
        }

        // Trigger task completion
        cb();
    });
});
