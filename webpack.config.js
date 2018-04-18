'use strict';

var webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var colors = require('colors');
const isDevBuild = process.argv[1].indexOf('webpack-dev-server') !== -1;
const dhisUrlPrefix =  isDevBuild ? '..' : '../../..';
const baseApiUrl = dhisUrlPrefix+"/api/29";
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
        ],
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
            BASEURL: `${dhisUrlPrefix}`,
            BASEAPIURL: `${baseApiUrl}`,
            stylesheets: makeLinkTags([
                [`${dhisUrlPrefix}/dhis-web-core-resource/dhis/light_blue/light_blue-b332a6918f.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/bootstrap/3.0.2/css/bootstrap.min.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/jquery.ui/1.11.4/themes/redmond/jquery-ui.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/ui-redmond.calendars.picker.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/leaflet/0.7.7/leaflet.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/leaflet-geocoder-mapzen/1.4.1/dist/leaflet-geocoder-mapzen.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/leaflet-contextmenu/1.1.0/dist/leaflet.contextmenu.css`],
                [`${dhisUrlPrefix}/dhis-web-core-resource/fontawesome/4.7.0/css/font-awesome.min.css`, {media: 'screen'}],
                [`${dhisUrlPrefix}/dhis-web-core-resource/dhis/css/widgets-2318061e45.css`, {media: 'screen'}],
                [`${dhisUrlPrefix}/dhis-web-core-resource/dhis/css/print-5ebb8063eb.css`, {media: 'print'}],
                [`${dhisUrlPrefix}/dhis-web-core-resource/angular.ui-select/0.12.0/select.min.css`, {media: 'screen'}],
                [`${dhisUrlPrefix}/dhis-web-core-resource/angular-plugins/select2-3c4dc0b207.css`, {media: 'screen'}],
                [`${dhisUrlPrefix}/api/files/style`],
                ['styles/style.css'],
                ['styles/print.css', { media: 'print' }]
            ]),
            vendorScripts: [
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery/3.2.0/dist/jquery.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-migrate/3.0.0/dist/jquery-migrate.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widget.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/mouse.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/position.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/data.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/disable-selection.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/keycode.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/scroll-parent.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/unique-id.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/plugin.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/safe-active-element.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/autocomplete.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/menu.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/selectmenu.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/sortable.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/droppable.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-ui/1.12.1/ui/widgets/draggable.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery-plugin/jquery-719d66b53f.plugin.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.picker.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.plus.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.picker.ext.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.coptic.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.ethiopian.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.islamic.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.julian.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.nepali.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/jquery.calendars.package-1.2.1/jquery.calendars.thai.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/select2/3.4.5/select2.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/bootstrap/3.0.2/js/bootstrap.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/d3js/3.4.13/d3.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/nvd3/1.1.15-beta/nv.d3.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-resource.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-route.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-cookies.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-animate.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-messages.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs/1.3.15/angular-sanitize.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular.bootstrap/0.13.0/ui-bootstrap.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular.bootstrap/0.13.0/ui-bootstrap-tpls.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/momentjs/2.5.0/moment-with-langs.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-util-fa6d031b83.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/commons-147b38397f.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/commons-ajax-e9bf10487b.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-availability-2831338dba.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-trigger-792850e798.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/lists-6f427f0f11.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/periodTypeNoDep-5809fc740b.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-validation-29192e93f8.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-period-ce7b1fc4ce.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-storage-ss-6da08511fb.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-storage-ls-1b9f647ef2.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-storage-idb-e5bdf19229.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-storage-memory-992eeb1c0e.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-storage-04afdd4f4c.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-contextmenu-67ed866cc1.js`,
                `${dhisUrlPrefix}/dhis-web-commons/ouwt/ouwt.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/dhis/dhis2-tracker-metadata-01fa829255.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular-plugins/select-01349cd337.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular-ui-select2/0.0.5/src/select2.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angularjs.nvd3-directives/v0.0.7/angularjs-nvd3-directives.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular-plugins/angularLocalStorage-12a21d2dab.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular.translate/2.7.0/angular-translate.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/ng-infinite-scroll/1.0.0/build/ng-infinite-scroll.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular-css/1.0.8/angular-css.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/angular-leaflet-directive/0.10.0/dist/angular-leaflet-directive.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/react/15.3.2/react-with-touch-tap-plugin.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/rxjs/4.1.0/rx.lite.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/lodash/4.15.0/lodash.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/lodash-functional/1.0.1/lodash-functional.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/babel-polyfill/6.20.0/dist/polyfill.min.js`,
                `${dhisUrlPrefix}/dhis-web-core-resource/d2-ui/25.5.4/dist/header-bar.js`,
                'core/e-registry.js',
                `${dhisUrlPrefix}/api/files/script`,
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
