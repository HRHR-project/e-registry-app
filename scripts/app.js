import './eRegistryModule';

// Tracker core
import 'd2-tracker/lib/dhis2.angular.services.js';
import 'd2-tracker/lib/dhis2.angular.directives.js';
import 'd2-tracker/lib/dhis2.angular.validations.js';
import 'd2-tracker/lib/dhis2.angular.filters.js';
import 'd2-tracker/lib/dhis2.angular.templates.js';

// App files
import '../scripts/dhis2.angular.services.js';
import '../scripts/services.js';
import '../scripts/filters.js';
import '../scripts/directives.js';
import '../scripts/controllers.js';
import '../scripts/leftbar-menu-controller.js';
import '../scripts/report-types-controller.js';
import '../scripts/display-mode-controller.js';
import '../scripts/sticky.min.js';
import '../components/dashboard/dashboard-controller.js';
import '../components/dashboard/dashboard-widgets-controller.js';
import '../components/registration/registration-controller.js';
import '../components/enrollment/enrollment-controller.js';
import '../components/dataentry/dataentry-controller.js';
import '../components/dataentry/referral-controller.js';
import '../components/dataentry/modal-default-form-controller.js';
import '../components/dataentry/new-event-controller.js';
import '../components/eventoverview/eventoverview-controller.js';
import '../components/eventoperations/eventoperations-controller.js';
import '../components/report/tei-report-controller.js';
import '../components/report/program-summary-controller.js';
import '../components/report/program-statistics-controller.js';
import '../components/report/overdue-events-controller.js';
import '../components/report/upcoming-events-controller.js';
import '../components/selected/selected-controller.js';
import '../components/relationship/relationship-controller.js';
import '../components/teiadd/tei-add-controller.js';
import '../components/profile/profile-controller.js';
import '../components/notes/notes-controller.js';
import '../components/rulebound/rulebound-controller.js';
import '../components/search/search-controller.js';

import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
import 'leaflet-contextmenu';
import 'd2-tracker/lib/Google.js';

import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.js';

import 'leaflet/dist/leaflet.css';
import 'leaflet-contextmenu/dist/leaflet.contextmenu.css';


angular.module('eRegistry')

.value('DHIS2URL', BASEAPIURL)
.value('DHIS2BASEURL', BASEURL)

.value('DHIS2COORDINATESIZE', 6)

.config(function($httpProvider, $routeProvider, $translateProvider) {    
            
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    
    $routeProvider.when('/', {
        templateUrl:'views/home.html',
        controller: 'SelectionController'
    }).when('/dashboard',{
        templateUrl:'components/dashboard/dashboard.html',
        controller: 'DashboardController'
    }).when('/report-types',{
        templateUrl:'views/report-types.html',
        controller: 'ReportTypesController'
    }).when('/program-summary',{
        templateUrl:'components/report/program-summary.html',
        controller: 'ProgramSummaryController'
    }).when('/program-statistics',{
        templateUrl:'components/report/program-statistics.html',
        controller: 'ProgramStatisticsController'
    }).when('/overdue-events',{
        templateUrl:'components/report/overdue-events.html',
        controller: 'OverdueEventsController'
    }).when('/upcoming-events',{
        templateUrl:'components/report/upcoming-events.html',
        controller: 'UpcomingEventsController'
    }).otherwise({
        redirectTo : '/dhis-web-commons/security/login.action'
    });  
    
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useLoader('i18nLoader');
    
})

.run(function($templateCache, $http){    
    $http.get('components/dataentry/inner-form.html').then(function(page){        
        $templateCache.put('components/dataentry/inner-form.html', page.data);
    });
    $http.get('components/dataentry/section-inner-form.html').then(function(page){        
        $templateCache.put('components/dataentry/section-inner-form.html', page.data);
    });
});

/* App Module */

/*var eRegistry = angular.module('eRegistry',
        ['ui.bootstrap', 
         'ngRoute', 
         'ngCookies',
         'ngSanitize',
         'ngMessages',
         'eRegistryServices',
         'eRegistryFilters',
         'eRegistryDirectives', 
         'eRegistryControllers',
         'd2Directives',
         'd2Filters',
         'd2Services',
         'd2Controllers',
         'angularLocalStorage',
         'ui.select',
         'ui.select2',
         'infinite-scroll',
         'd2HeaderBar',
         'ngCsv',
         'sticky',
         'nvd3ChartDirectives',
         'pascalprecht.translate'])
              
.value('DHIS2URL', '..')*/
