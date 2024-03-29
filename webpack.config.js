'use strict';

var webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var colors = require('colors');
const isDevBuild = process.argv[1].indexOf('webpack-dev-server') !== -1;
const dhisAppUrl = isDevBuild ? '..' : '.';
const dhisUrlPrefix = isDevBuild ? '..' : '../../..';
const baseApiUrl = isDevBuild ? dhisUrlPrefix+"/api" : '../../../api';
const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config.json`;
let dhisConfig;

try {
    console.log(dhisConfigPath);
    dhisConfig = require(dhisConfigPath);
    console.log('\nLoaded DHIS config:');
} catch (e) {
    // Failed to load config file - use default config
    console.warn('\nWARNING! Failed to load DHIS config:', e.message);
    console.info('Using default config');
    dhisConfig = {
        baseUrl: 'http://localhost:8080/dhis',
        authorization: 'Basic YWRtaW46RGhha2ExMjMh' // admin:district
    };
}
console.log(JSON.stringify(dhisConfig, null, 2), '\n');

function bypass(req, res, opt) {
    req.headers.Authorization = dhisConfig.authorization;
}
function makeLinkTags(stylesheets) {
    return function (hash) {
        return stylesheets
            .map(([url, attributes]) => {
                const attributeMap = Object.assign({ media: 'screen' }, attributes);

                const attributesString = Object
                    .keys(attributeMap)
                    .map(key => `${key}="${attributeMap[key]}"`)
                    .join(' ');

                return `<link type="text/css" rel="stylesheet" href="${url}?_=${hash}" ${attributesString} />`;
            })
            .join(`\n`);
    };
}

module.exports = {
    context: __dirname,
    entry: './scripts/index.js',
    output: {
        path: path.join(__dirname, '/build'),
        filename: 'app-[hash].js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: [/(node_modules)/],
                loaders: ['ng-annotate-loader', 'babel-loader'],
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader',
            },
            {
                test: /\.(gif|png|jpg)$/,
                loader: 'file-loader'
            },
        ],
        noParse: /node_modules\/leaflet-control-geocoder\/dist\/Control.Geocoder.js/,
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'DEV_BUILD': JSON.stringify(isDevBuild)
              }
        }),
        new webpack.optimize.DedupePlugin(),
        new HTMLWebpackPlugin({
            template: './index.ejs',
            APPURL: `${dhisAppUrl}`,
            BASEURL: `${dhisUrlPrefix}`,
            BASEAPIURL: `${baseApiUrl}`,
            stylesheets: makeLinkTags([
                [`${dhisAppUrl}/vendor/dhis/light_blue/light_blue-b332a6918f.css`],
                [`${dhisAppUrl}/vendor/bootstrap/3.0.2/css/bootstrap.min.css`],
                [`${dhisAppUrl}/vendor/jquery.ui/1.11.4/themes/redmond/jquery-ui.css`],
                [`${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/ui-redmond.calendars.picker.css`],
                [`${dhisAppUrl}/vendor/fontawesome/4.7.0/css/font-awesome.min.css`, {media: 'screen'}],
                [`${dhisAppUrl}/vendor/dhis/css/widgets-2318061e45.css`, {media: 'screen'}],
                [`${dhisAppUrl}/vendor/dhis/css/print-5ebb8063eb.css`, {media: 'print'}],
                [`${dhisAppUrl}/vendor/angular.ui-select/0.12.0/select.min.css`, {media: 'screen'}],
                [`${dhisAppUrl}/vendor/angular-plugins/select2-3c4dc0b207.css`, {media: 'screen'}],
                [`${baseApiUrl}/files/style`],
                ['styles/style.css'],
                ['styles/print.css', { media: 'print' }]
            ]),
            vendorScripts: [
                `${dhisAppUrl}/vendor/jquery/3.2.0/dist/jquery.js`,
                `${dhisAppUrl}/vendor/jquery-migrate/3.0.0/dist/jquery-migrate.min.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widget.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/mouse.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/position.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/data.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/disable-selection.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/keycode.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/scroll-parent.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/unique-id.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/plugin.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/safe-active-element.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/autocomplete.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/menu.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/selectmenu.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/sortable.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/droppable.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/widgets/draggable.js`,

                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/effect.js`,
                `${dhisAppUrl}/vendor/jquery-ui/1.12.1/ui/effects/effect-slide.js`,

                `${dhisAppUrl}/vendor/jquery-plugin/jquery-719d66b53f.plugin.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.picker.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.plus.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.picker.ext.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.coptic.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.ethiopian.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.islamic.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.julian.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.nepali.min.js`,
                `${dhisAppUrl}/vendor/jquery.calendars.package-1.2.1/jquery.calendars.thai.min.js`,
                `${dhisAppUrl}/vendor/select2/3.4.5/select2.min.js`,
                `${dhisAppUrl}/vendor/bootstrap/3.0.2/js/bootstrap.min.js`,
                `${dhisAppUrl}/vendor/d3js/3.4.13/d3.min.js`,
                `${dhisAppUrl}/vendor/nvd3/1.1.15-beta/nv.d3.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-resource.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-route.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-cookies.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-animate.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-messages.min.js`,
                `${dhisAppUrl}/vendor/angularjs/1.3.15/angular-sanitize.min.js`,
                `${dhisAppUrl}/vendor/angular.bootstrap/0.13.0/ui-bootstrap.min.js`,
                `${dhisAppUrl}/vendor/angular.bootstrap/0.13.0/ui-bootstrap-tpls.js`,
                `${dhisAppUrl}/vendor/momentjs/2.5.0/moment-with-langs.min.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-util-fa6d031b83.js`,
                `${dhisAppUrl}/vendor/dhis/commons-147b38397f.js`,
                `${dhisAppUrl}/vendor/dhis/commons-ajax-e9bf10487b.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-availability-2831338dba.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-trigger-792850e798.js`,
                `${dhisAppUrl}/vendor/dhis/lists-6f427f0f11.js`,
                `${dhisAppUrl}/vendor/dhis/periodTypeNoDep-5809fc740b.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-validation-29192e93f8.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-period-ce7b1fc4ce.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-storage-ss-6da08511fb.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-storage-ls-1b9f647ef2.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-storage-idb-e5bdf19229.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-storage-memory-992eeb1c0e.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-storage-04afdd4f4c.js`,
                `${dhisAppUrl}/vendor/dhis/dhis2-contextmenu-67ed866cc1.js`,
                `${dhisAppUrl}/vendor/ouwt/ouwt.js`,
                `${dhisAppUrl}/vendor/angular-plugins/select-01349cd337.js`,
                `${dhisAppUrl}/vendor/angular-ui-select2/0.0.5/src/select2.js`,
                `${dhisAppUrl}/vendor/angularjs.nvd3-directives/v0.0.7/angularjs-nvd3-directives.min.js`,
                `${dhisAppUrl}/vendor/angular-plugins/angularLocalStorage-12a21d2dab.js`,
                `${dhisAppUrl}/vendor/angular.translate/2.7.0/angular-translate.min.js`,
                `${dhisAppUrl}/vendor/ng-infinite-scroll/ng-infinite-scroll.js`,
                `${dhisAppUrl}/vendor/angular-css/1.0.8/angular-css.min.js`,
                `${dhisAppUrl}/vendor/angular-leaflet-directive/0.10.0/dist/angular-leaflet-directive.js`,
                `${dhisAppUrl}/vendor/react/15.3.2/react-with-touch-tap-plugin.min.js`,
                `${dhisAppUrl}/vendor/rxjs/4.1.0/rx.lite.min.js`,
                `${dhisAppUrl}/vendor/lodash/4.15.0/lodash.min.js`,
                `${dhisAppUrl}/vendor/lodash-functional/1.0.1/lodash-functional.js`,
                `${dhisAppUrl}/vendor/babel-polyfill/6.20.0/dist/polyfill.min.js`,
                `${dhisAppUrl}/vendor/d2-ui/28.0.3/dist/header-bar.js`,
                'core/e-registry.js',
                `${dhisAppUrl}/vendor/main/main.js`,
                `${baseApiUrl}/files/script`,
            ]
            .map(script => {
                console.log(script);
                if (Array.isArray(script)) {
                    return (`<script ${script[1]} src="${script[0]}"></script>`);
                }
                return (`<script src="${script}"></script>`);
            })
            .join("\n")
        })
    ],
    devtool: ['sourcemap'],
    devServer: {
        contentBase: '.',
        progress: true,
        colors: true,
        port: 8081,
        inline: false,
        compress: false,
        proxy: [
                { path: '/api/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/dhis-web-commons-ajax-json/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/dhis-web-commons-stream/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/dhis-web-commons/**', target: dhisConfig.baseUrl, bypass:bypass, proxyTimeout: 1000 * 60 * 5 },
                { path: '/dhis-web-core-resource/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/icons/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/images/**', target: dhisConfig.baseUrl, bypass:bypass },
                { path: '/main.js', target: dhisConfig.baseUrl, bypass:bypass },
        ],
    },
};
