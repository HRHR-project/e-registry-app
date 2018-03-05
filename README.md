# e-registry-app

## How to use the e-registry-app:
There are two ways the app can be used:
- For both cases first run the command: __yarn install__
1. If you have an instance of dhis-core running locally, you can run the app with __yarn start__. You might have to change some setting in the __webpack.config.js__ file if you do not have a DHIS-config saved.

2. You can also run the __yarn build__ command to get a zip file of the app that can be installed in DHIS2 through the __App Managment__ app. When you run the __yarn build__ command the zip file will end up in a folder called: __buildzip__.
