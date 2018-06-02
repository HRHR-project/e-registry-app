/* global angular, eRegistry */
var eRegistry = angular.module('eRegistry');
eRegistry.controller('DataEntryController',
        function ($rootScope,
                $scope,
                $modal,
                $filter,
                $log,
                $http,
                $timeout,
                $translate,
                $window,
                CommonUtils,
                DateUtils,
                EventUtils,
                orderByFilter,
                dateFilter,
                SessionStorageService,
                EnrollmentService,
                ProgramStageFactory,
                DHIS2EventFactory,
                ModalService,
                DialogService,
                CurrentSelection,
                TrackerRulesExecutionService,
                CustomFormService,
                PeriodService,
                OptionSetService,
                TrackerRulesFactory,
                EventCreationService,
                SystemSettingsService,
                $q,$location,
                DHIS2BASEURL,
                AuthorityService) {
    $scope.DHIS2BASEURL = DHIS2BASEURL;
    $scope.printForm = false;
    $scope.printEmptyForm = false;
    $scope.eventPageSize = 20;
    $scope.maxOptionSize = 30;
    $scope.dashboardReady = false;
    $scope.eventPagingStart = 0;
    $scope.eventPagingEnd = $scope.eventPageSize;
    
    //Data entry form
    $scope.outerForm = {};
    $scope.displayCustomForm = false;
    $scope.currentElement = {};
    $scope.schedulingEnabled = false;
    $scope.eventPeriods = [];
    $scope.currentPeriod = [];
    $scope.filterEvents = false;
    $scope.showEventsAsTables = false;
    //variable is set while looping through the program stages later.
    $scope.stagesCanBeShownAsTable = false;
    $scope.showHelpText = {};
    $scope.hiddenFields = [];
    $scope.assignedFields = [];
    $scope.errorMessages = {};
    $scope.warningMessages = {};
    $scope.hiddenSections = {};
    $scope.tableMaxNumberOfDataElements = 15;
    $scope.xVisitScheduleDataElement = false;
    $scope.reSortStageEvents = true;
    $scope.eventsLoaded = false;
    $scope.dashBoardWidgetFirstRun = true;
    $scope.showSelf = true;
    $scope.eventFormSubmitted = [];
    $scope.userAuthority = AuthorityService.getUserAuthorities(SessionStorageService.get('USER_PROFILE'));


    //Placeholder till proper settings for time is implemented. Currently hard coded to 12h format.
    $scope.timeFormat = '12h';
    
    var eventLockHours = 744; //Number of hours before event is locked after completing. In this case 31 days.

    
    $scope.useMainMenu = CurrentSelection.get().pr.id === "WSGAb5XwJ3Y" ? true : false;
    $scope.mainMenuStages = [];
    $scope.useBottomLine = false; 
    
    //hideTopLineEventsForFormTypes is only used with main menu
    $scope.hideTopLineEventsForFormTypes = {TABLE: true, COMPARE: true};
    
    $scope.visibleWidgetsInMainMenu = {enrollment: true, dataentry: true, close_file: true};    
    $rootScope.$broadcast('DataEntryMainMenuVisibilitySet', {visible: $scope.useMainMenu, visibleItems: $scope.visibleWidgetsInMainMenu});
    

    var modalCompleteIncompleteActions = { complete: 'complete', completeAndExit: 'completeandexit', completeEnrollment: 'completeenrollment', edit: 'edit'};
    $rootScope.actionTypes = {complete: 1, incomplete: 2, delete: 3, skip: 4, unskip: 5 };

    //Labels
    $scope.dataElementLabel = $translate.instant('data_element');
    $scope.valueLabel = $translate.instant('value');
    $scope.providedElsewhereLabel = $translate.instant('provided_elsewhere');
    
    $scope.EVENTSTATUSCOMPLETELABEL = "COMPLETED";
    $scope.EVENTSTATUSSKIPPEDLABEL = "SKIPPED";
    $scope.EVENTSTATUSVISITEDLABEL = "VISITED";
    $scope.EVENTSTATUSACTIVELABEL = "ACTIVE";
    $scope.EVENTSTATUSSCHEDULELABEL = "SCHEDULE";
    $scope.validatedDateSetForEvent = {};
    $scope.eventCreationActions = EventCreationService.eventCreationActions;
    
    var userProfile = SessionStorageService.get('USER_PROFILE');
    var storedBy = userProfile && userProfile.username ? userProfile.username : '';

    var today = DateUtils.getToday();
    $scope.invalidDate = false;

    //note
    $scope.note = {};    
    
    $scope.eventStyles = [
        {color: 'custom-tracker-complete', description: 'completed', showInStageLegend: true, showInEventLegend: true},
        {color: 'alert-warning', description: 'executed', showInStageLegend: true, showInEventLegend: true},        
        {color: 'alert-success', description: 'ontime', showInStageLegend: true, showInEventLegend: true},
        {color: 'alert-danger', description: 'overdue', showInStageLegend: true, showInEventLegend: true},        
        {color: 'alert-default', description: 'skipped', showInStageLegend: false, showInEventLegend: true},
        {color: '', description: 'empty', showInStageLegend: true, showInEventLegend: false}
    ];
    $scope.showLegend = false;

    //Code for Bangladesh, is used in default-form.html to set the col size of data elements to 7.
    $scope.isBangladesh = false;
    SystemSettingsService.getCountry().then(function(response){
        if(response === 'bangladesh') {
            $scope.isBangladesh = true;
        } else {
            $scope.isBangladesh = false;
        }
    });
    
    $scope.filterLegend = function(){
        if($scope.mainMenuStageSelected()){
            return {showInEventLegend: true};
        }
        else {
            return {showInStageLegend: true};
        }
    }
    
    $scope.getLegendText = function(description){
        var useInStage = true;
        if($scope.mainMenuStageSelected()){
            useInStage = false;            
        }
        return $scope.getDescriptionTextForDescription(description, $scope.descriptionTypes.full, useInStage);
    };
    
    
    //listen for new events created
    $scope.$on('eventcreated', function (event, args) {
        //TODO: Sort this out:
        $scope.addNewEvent(args.event);
    });
    
    $scope.$on('teiupdated', function(event, args){
        var selections = CurrentSelection.get();        
        $scope.selectedTei = selections.tei;
        if($scope.currentEvent){
            $scope.executeRules();
        }
    });

    //listen for rule effect changes
    $scope.$on('ruleeffectsupdated', function (event, args) {
        if ($rootScope.ruleeffects[args.event]) {
            processRuleEffect(args.event);            
        }
    });

    $scope.showReferral = false;
    //Check if user is allowed to make referrals
    var roles = SessionStorageService.get('USER_PROFILE');
    if( roles && roles.userCredentials && roles.userCredentials.userRoles){
        var userRoles = roles.userCredentials.userRoles;
        for(var i=0; i<userRoles.length; i++){
            if(userRoles[i].authorities.indexOf('ALL') !== -1 || userRoles[i].authorities.indexOf('F_TRACKED_ENTITY_INSTANCE_SEARCH_IN_ALL_ORGUNITS') !== -1 ){
              $scope.showReferral = true;
              i=userRoles.length;
            }
        } 
    }
    $scope.model= {};
    
            
    $scope.print = function(divName) {
        
        $scope.printForm = true;
        $scope.printEmptyForm = true;
        
        var printContents = document.getElementById(divName).innerHTML;
        var popupWin = window.open('', '_blank', 'fullscreen=1');
        popupWin.document.open();
        popupWin.document.write('<html>\n\
                                        <head>\n\
                                                <link rel="stylesheet" type="text/css" href="'+DHIS2BASEURL+'/dhis-web-commons/bootstrap/css/bootstrap.min.css" />\n\
                                                <link type="text/css" rel="stylesheet" href="'+DHIS2BASEURL+'/dhis-web-commons/javascripts/angular/plugins/select.css">\n\
                                                <link type="text/css" rel="stylesheet" href="'+DHIS2BASEURL+'/dhis-web-commons/javascripts/angular/plugins/select2.css">\n\
                                                <link rel="stylesheet" type="text/css" href="styles/style.css" />\n\
                                                <link rel="stylesheet" type="text/css" href="styles/print.css" />\n\
                                        </head>\n\
                                        <body onload="window.print()">' + printContents + 
                                '</html>');
        popupWin.document.close();
        
        $scope.printForm = false;
        $scope.printEmptyForm = false;
        
    };
    
    var processRuleEffect = function(event){
        //Establish which event was affected:
        var affectedEvent = $scope.currentEvent;
        if (!affectedEvent || !affectedEvent.event) {
            //The data entry widget does not have an event selected.
            return;
        }
        else if(event === 'registration' || event === 'dataEntryInit') {
           //The data entry widget is associated with an event, 
           //and therefore we do not want to process rule effects from the registration form
           return;
        }

        if (event !== affectedEvent.event) {
            //if the current event is not the same as the affected event, 
            //the effecs should be disregarded in the current events controller instance.
            $log.warn("Event " + event + " was not found in the current scope.");
            return;
        }


        $scope.assignedFields[event] = [];
        $scope.hiddenSections[event] = [];
        $scope.warningMessages[event] = [];
        $scope.errorMessages[event] = [];
        $scope.hiddenFields[event] = [];
        
        angular.forEach($rootScope.ruleeffects[event], function (effect) {
            //in the data entry controller we only care about the "hidefield", showerror and showwarning actions
            if (effect.action === "HIDEFIELD") {                    
                if (effect.dataElement) {

                    if(affectedEvent.status !== 'SCHEDULE' &&
                        affectedEvent.status !== 'SKIPPED' &&
                        !affectedEvent.editingNotAllowed) {
                        if (effect.ineffect && affectedEvent[effect.dataElement.id]) {
                            //If a field is going to be hidden, but contains a value, we need to take action;
                            if (effect.content) {
                                //TODO: Alerts is going to be replaced with a proper display mecanism.
                                alert(effect.content);
                            }
                            else {
                                //TODO: Alerts is going to be replaced with a proper display mecanism.
                                alert($scope.prStDes[effect.dataElement.id].dataElement.displayFormName + " was blanked out and hidden by your last action");
                            }

                            //Blank out the value:
                            affectedEvent[effect.dataElement.id] = "";
                            $scope.saveDataValueForEvent($scope.prStDes[effect.dataElement.id], null, affectedEvent, true);
                        }
                    }

                    if(effect.ineffect) {
                        $scope.hiddenFields[event][effect.dataElement.id] = true;
                    } 
                    else if( !$scope.hiddenFields[event][effect.dataElement.id]) {
                        $scope.hiddenFields[event][effect.dataElement.id] = false;
                    }
                    
                }
                else {
                    if(!effect.trackedEntityAttribute) {
                        $log.warn("ProgramRuleAction " + effect.id + " is of type HIDEFIELD, bot does not have a field defined");                        
                    }
                }
            } else if (effect.action === "SHOWERROR" 
                    || effect.action === "ERRORONCOMPLETE") {
                if (effect.ineffect) {
                    var message = effect.content + (effect.data ? effect.data : "");
                        
                    if(effect.dataElement && $scope.prStDes[effect.dataElement.id]) {
                        if(effect.action === "SHOWERROR") {
                            //only SHOWERROR messages is going to be shown in the form as the user works
                            $scope.errorMessages[event][effect.dataElement.id] = message;
                        }
                        $scope.errorMessages[event].push($translate.instant($scope.prStDes[effect.dataElement.id].dataElement.displayName) + ": " + message);
                    }
                    else
                    {
                        $scope.errorMessages[event].push(message);
                    }
                }
            } else if (effect.action === "SHOWWARNING" 
                    || effect.action === "WARNINGONCOMPLETE") {
                if (effect.ineffect) {
                    var message = effect.content + (effect.data ? effect.data : "");
                        
                    if(effect.dataElement && $scope.prStDes[effect.dataElement.id]) {
                        if(effect.action === "SHOWWARNING") {
                            //only SHOWWARNING messages is going to show up in the form as the user works
                            $scope.warningMessages[event][effect.dataElement.id] = message;
                        }
                        $scope.warningMessages[event].push($translate.instant($scope.prStDes[effect.dataElement.id].dataElement.displayName) + ": " + message);
                    } else {
                        $scope.warningMessages[event].push(message);
                    }
                }
            } else if (effect.action === "HIDESECTION"){                    
                if(effect.programStageSection){
                    if(effect.ineffect){
                        $scope.hiddenSections[event][effect.programStageSection] = true;
                    } else if (!$scope.hiddenSections[event][effect.programStageSection]) {
                        $scope.hiddenSections[event][effect.programStageSection] = false;
                    }
                }
                else {
                    $log.warn("ProgramRuleAction " + effect.id + " is of type HIDESECTION, bot does not have a section defined");
                }
            } else if (effect.action === "ASSIGN") {
                if(affectedEvent.status !== 'SCHEDULE' &&
                        affectedEvent.status !== 'SKIPPED' &&
                        !affectedEvent.editingNotAllowed) {
                    if(effect.ineffect && effect.dataElement && $scope.prStDes[effect.dataElement.id]) {
                        //For "ASSIGN" actions where we have a dataelement, we save the calculated value to the dataelement:
                        //Blank out the value:
                        var processedValue = $filter('trimquotes')(effect.data);

                        if($scope.prStDes[effect.dataElement.id] && $scope.prStDes[effect.dataElement.id].dataElement.optionSet) {
                            processedValue = OptionSetService.getName(
                                    $scope.optionSets[$scope.prStDes[effect.dataElement.id].dataElement.optionSet.id].options, processedValue);
                        }

                        processedValue = processedValue === "true" ? true : processedValue;
                        processedValue = processedValue === "false" ? false : processedValue;

                        affectedEvent[effect.dataElement.id] = processedValue;
                        $scope.assignedFields[event][effect.dataElement.id] = true;
                        
                        $scope.saveDataValueForEvent($scope.prStDes[effect.dataElement.id], null, affectedEvent, true);
                    }
                }
            }
            else if (effect.action === "HIDEPROGRAMSTAGE") {
                if (effect.programStage) {
                    if($scope.stagesNotShowingInStageTasks[effect.programStage.id] !== effect.ineffect )
                    {
                        $scope.stagesNotShowingInStageTasks[effect.programStage.id] = effect.ineffect;
                    }
                }
                else {
                    $log.warn("ProgramRuleAction " + effect.id + " is of type HIDEPROGRAMSTAGE, bot does not have a stage defined");
                }
            }
        });
    };
    
    $scope.mainMenuStageSelected = function(){
        if(angular.isDefined($scope.selectedMainMenuStage) && !angular.equals({}, $scope.selectedMainMenuStage)){
            return true;
        }
        return false;
    };
    
    $scope.buildMainMenuStages = function(){
        $scope.mainMenuStages = [];
        angular.forEach($scope.programStages, function(stage){
            if((angular.isUndefined($scope.neverShowItems) || angular.isUndefined($scope.neverShowItems[stage.id]) || $scope.neverShowItems[stage.id] === false) &&
               (angular.isUndefined($scope.headerCombineStages) || angular.isUndefined($scope.headerCombineStages[stage.id]))){
                    $scope.mainMenuStages.push(stage);                    
               }
        });
    };
    
    $scope.openStageFromMenu = function(stage){    
        
        $scope.deSelectCurrentEvent();        
        $scope.selectedMainMenuStage = stage;
        var timelineFilter = stage.id;
        
        if(angular.isDefined($scope.headerCombineStages)){
            for(var key in $scope.headerCombineStages){
                if(key === stage.id){
                    timelineFilter += "," + $scope.headerCombineStages[key];
                }
                else if($scope.headerCombineStages[key] === stage.id){
                    timelineFilter += "," + key;
                }
            }
        }
        
        $scope.openStageEventFromMenu(stage, timelineFilter);
        
        $rootScope.$broadcast('DataEntryMainMenuItemSelected', {selected:stage.id});
        
        //Hardcoded palestine
        if(stage.id === 'HaOwL7bIdrs'){
            $rootScope.$broadcast('DataEntryMainMenuVisibilitySet', {visible: false, closingStage: true});
            return;
        }
        
        $rootScope.$broadcast('DataEntryMainMenuVisibilitySet', {visible: false});
    };
    
    $scope.$on('DashboardBackClicked', function(event){
        $scope.backToMainMenu();
    });
    
    
    $scope.backToMainMenu = function(){
        $scope.selectedMainMenuStage = {};
        $scope.deSelectCurrentEvent();
        $rootScope.$broadcast('DataEntryMainMenuVisibilitySet', {visible: true, visibleItems: $scope.visibleWidgetsInMainMenu});
    };

    SystemSettingsService.getMainMenuConfig().then(function(response){
        $scope.mainMenuConfig = response;

        if(!$scope.mainMenuConfig) {
            $scope.bottomLineItems = {BjNpOxjvEj5:true,PUZaKR0Jh2k:true,uD4lKVSbeyB:true,uUHQw5KrZAL:true};
            $scope.neverShowItems = {iXDSolqmauJ: true, tlzRiafqzgd: true, w9cPvMH5LaN: true,
                                    WPgz41MctSW:true, HaOwL7bIdrs: true, MO39jKgz2VA: true, E8Jetf3Q90U: true};
            $scope.topLineStageFilter = {};
            $scope.headerStages = [];
            SystemSettingsService.getCountry().then(function(response){
                if(response === 'bangladesh') {
                    $scope.isBangladesh = true;
                    $scope.headerCombineStages = {w0pwmNYugKX: "dqF3sxJKBls", piRv8jtcLQV: "IlSUGDq9QDc", w0pwmNYugKX: "dqF3sxJKBls", FRSZV43y35y: "fSE8JyGdsV6", WZbXY0S00lP: "edqlbukwRfQ"};
                } else {
                    $scope.isBangladesh = false;
                    $scope.headerCombineStages = {WZbXY0S00lP: "edqlbukwRfQ"};
                }
            });
        } else {
            $scope.bottomLineItems = $scope.mainMenuConfig.bottomLineItems;
            $scope.neverShowItems = $scope.mainMenuConfig.neverShowItems;
            $scope.topLineStageFilter = $scope.mainMenuConfig.topLineStageFilter;
            $scope.headerStages = $scope.mainMenuConfig.headerStages;
            $scope.headerCombineStages = $scope.mainMenuConfig.headerCombineStages;
        }
    });
    
    $scope.getHeaderStages = function(){
        angular.forEach($scope.programStages, function(stage){
            if((angular.isUndefined($scope.bottomLineItems) || angular.isUndefined($scope.bottomLineItems[stage.id]) || $scope.bottomLineItems[stage.id] === false) && 
               (angular.isUndefined($scope.neverShowItems) || angular.isUndefined($scope.neverShowItems[stage.id]) || $scope.neverShowItems[stage.id] === false) &&
               (angular.isUndefined($scope.headerCombineStages) || angular.isUndefined($scope.headerCombineStages[stage.id]))){
                    $scope.headerStages.push(stage);                    
               }
        });
    };
    
    $scope.headerStagesWithoutCurrent = function(){        
        if($scope.headerStages.length > 0){
            if(angular.isDefined($scope.selectedMainMenuStage)){                
                var withoutCurrent = [];
                var currentStage = $scope.selectedMainMenuStage;
                if(angular.isDefined($scope.headerCombineStages) && $scope.headerCombineStages[$scope.selectedMainMenuStage.id]){                    
                    currentStage = $scope.stagesById[$scope.headerCombineStages[$scope.selectedMainMenuStage.id]];
                }
                
                angular.forEach($scope.headerStages, function(headerStage){
                    if(headerStage.id !== currentStage.id){
                        withoutCurrent.push(headerStage);
                    }
                });
                return withoutCurrent;
            }
            else {
                return $scope.headerStages;
            }
        }        
    };
    
    $scope.headerCurrentStageName = function(){
        
        var name = "";
        if($scope.selectedMainMenuStage && angular.isDefined($scope.selectedMainMenuStage.displayName)){
            name = $scope.selectedMainMenuStage.displayName;
            if(angular.isDefined($scope.headerCombineStages) && $scope.headerCombineStages[$scope.selectedMainMenuStage.id]){
                var stageWithName = $scope.stagesById[$scope.headerCombineStages[$scope.selectedMainMenuStage.id]];
                if(angular.isDefined(stageWithName) && angular.isObject(stageWithName)){
                    name = stageWithName.displayName;
                }
            }
        }        
        return name;
    };
    
    $scope.displayEventInTopLine = function(item) {
        if($scope.neverShowItems[item.id]) {
            return false;
        }
        if($scope.bottomLineItems[item.id]) {
            return false;
        }
        return true;
    };
    
    $scope.displayEventInBottomLine = function(item) {
        if($scope.neverShowItems[item.id]) {
            return false;
        }
        if($scope.bottomLineItems[item.id]) {
            return true;
        }
        return false;
    };
    
    function topLineEventsIsFiltered(){               
        if((angular.isDefined($scope.neverShowItems) && !angular.equals({},$scope.neverShowItems)) ||
           (angular.isDefined($scope.bottomLineItems) && !angular.equals({}, $scope.bottomLineItems)) ||
           (angular.isDefined($scope.topLineStageFilter) && !angular.equals({}, $scope.topLineStageFilter))){
            return true;
        }
        return false;
    }
    
    $scope.topLineEvents = [];
    function getTopLineEvents(allEvents){              
        if(!topLineEventsIsFiltered()){
            $scope.topLineEvents = $scope.allEventsSorted;
            return $scope.topLineEvents;
        }        
        else {
            $scope.topLineEvents = [];
            
            if(angular.isDefined($scope.topLineStageFilter) && !angular.equals({}, $scope.topLineStageFilter)){
                
                var filterStages = [];
                for(var key in $scope.topLineStageFilter){
                    filterStages.push($scope.stagesById[key]);
                }
                filterStages.sort(function(a,b){
                    return a.sortOrder - b.sortOrder;
                });
                
                angular.forEach(filterStages, function(filterStage){
                    var stageEvents = $scope.eventsByStage[filterStage.id];                    
                    $scope.topLineEvents = $scope.topLineEvents.concat(stageEvents);                    
                });            
            }
            else {
                var hiddenStages = [];
                if(angular.isDefined($scope.neverShowItems) && angular.isDefined($scope.bottomLineItems)){
                    hiddenStages = angular.extend({}, $scope.neverShowItems, $scope.bottomLineItems);
                }
                else if(angular.isDefined($scope.neverShowItems)){
                    hiddenStages = $scope.neverShowItems;
                }
                else if(angular.isDefined($scope.bottomLineItems)){
                    hiddenStages = $scope.bottomLineItems;
                }

                angular.forEach($scope.allEventsSorted, function(event){
                    if(!hiddenStages[event.programStage]){
                        $scope.topLineEvents.push(event);
                    }                
                });
            }
            
            return $scope.topLineEvents;
        }        
    }
    
    $scope.getTopLineEventsPage = function(){
        
        if($scope.allEventsSorted && $scope.allEventsSorted.length > 0){            
            var topLineEvents = getTopLineEvents($scope.allEventsSorted);            
            $scope.getEventPageForEvent($scope.currentEvent);
            return topLineEvents.slice($scope.eventPagingStart, $scope.eventPagingEnd);
        }
        return [];
    };
    
    //check if field is hidden
    $scope.isHidden = function (id, event, type, options) {
        //In case the field contains a value, we cant hide it. 
        //If we hid a field with a value, it would falsely seem the user was aware that the value was entered in the UI.
        var EventToCheck = angular.isDefined(event) ? event : $scope.currentEvent;

        if(event === null) {
            EventToCheck = $scope.currentEvent;
        }
        
        if (EventToCheck[id]) {
            return false;
        } else {            
            if(angular.isDefined($scope.hiddenFields[EventToCheck.event])){
                //In the event a data element is a multi select group.
                if(type === 'MULTI_SELECT_GROUP' && options) {
                    var i = 0;
                    angular.forEach(options, function(option){
                        if(angular.isDefined($scope.hiddenFields[EventToCheck.event][option.dataElement.id]) && $scope.hiddenFields[EventToCheck.event][option.dataElement.id]) {
                            //If the option is in the hiddenFields array and it is true (hidden): i++. 
                            i++;
                        }
                    });
                    //i will be the same as the length of all options if all options are in the hiddenFields array and are true (hidden).
                    return options.length === i;
                }
                return $scope.hiddenFields[EventToCheck.event][id];
            }
            else {
                return false;
            }            
        }
    };
    
    //Contains an array of dataelements that should not be displayed in "Previous values".
    $scope.showPreviousValue = function (id) {
        //Hidden values for Bangladesh.
        var hiddenValues = ['OsaG5OsIJw9', 'Kb2LvjqXHfi', 'M4HEOoEFTAT', 'dyYdfamSY2Z', 'A4i1iD8Askw', 'ql1h1eXRbJ2', 'V454TVtRUVM', 'pHNanCbrioZ',
                            'achoX4owMl2', 'pthOcD3pgmH', 'YioY92h7fHk', 'sBk3iOdp5vS', 'mtQD6phlBwY', 'srTBtL6nbWM', 'DWGXGJ7dGZ7', 'x0hRYXnnmxP', 
                            'U5jDJTJUss0', 'J1oYUR8QvYo', 'DkK2EN7d526', 'oy6bZRZanZr', 'ciuVqP8Ag19', 'Cnq43Bere4w', 'ZLqKqxqjOaH', 'EiJ5aU0QWvK',
                            'l2YTYbF5d7v', 'A9GkQjPcFtd', 'oGDVvNyI7Ot', 'CaLpgtzBySB', 'lwleHI2dbvT', 'nBy3gXhHGZ9', 'm4ZCH1uGGh7', 'TAtUnu1BiUp',
                            'J6N7R7hpShG', 'BX0Y5BS757I', 'oFNziXTsM56', 'PSNI8yP2bQ6','dthg8E3NqCS' , 'UvPeKLdARcu', 'H9vEFl0W1EL', 'yakmemTH1Vz',
                            'koBfHoIgNcy', 'FdKZReGBvWN', 'LR4XATl5Wmd', 'RRWteHFKHCX', 'wpgZQxjAl5v', 'gaQRDpt9vHr', 'Z1uSMcd9ugj', 'e87QQTwrvYL',
                            'yprnwvYFFoA', 'XwdAiW8b1Fe', 'a1E5SbsPOZf', 'b9xA0ZD9B4S', 'WkIkkhN88Jo', 'aYnlkPFbUNx', 'ulNe9l82LIQ'];

        if(hiddenValues.indexOf(id) >= 0) {
            return false;
        }

        return true;
    };

    $scope.executeRules = function () {        
        //$scope.allEventsSorted cannot be used, as it is not reflecting updates that happened within the current session
        var allSorted = [];
        var eventsNotPersistedByStage = {};
        for(var ps = 0; ps < $scope.programStages.length; ps++ ) {
            eventsNotPersistedByStage[$scope.programStages[ps].id] = [];
            if($rootScope.eventsInProgramStageById[$scope.programStages[ps].id]){
                //Remove not persisted events from rootScope
                for(var e = $rootScope.eventsInProgramStageById[$scope.programStages[ps].id].length-1; e >= 0; e--) {
                    if($rootScope.eventsInProgramStageById[$scope.programStages[ps].id][e].notPersisted){
                        $rootScope.eventsInProgramStageById[$scope.programStages[ps].id].splice(e,1);
                    }
                }
            }
            for(var e = $scope.eventsByStage[$scope.programStages[ps].id].length-1; e >=0; e--) {
                if($scope.eventsByStage[$scope.programStages[ps].id][e].notPersisted){
                    var ev = $scope.eventsByStage[$scope.programStages[ps].id][e];
                    eventsNotPersistedByStage[$scope.programStages[ps].id].push(ev);
                    $scope.eventsByStage[$scope.programStages[ps].id].splice(e,1);
                }else{
                    allSorted.push($scope.eventsByStage[$scope.programStages[ps].id][e]);
                }
            }
        }
        allSorted = orderByFilter(allSorted, ['-sortingDate','-created']).reverse();
        
        var evs = {all: allSorted, byStage: $scope.eventsByStage, notPersistedByStage: [] };
        var flag = {debug: true, verbose: true};

        //If the events is displayed in a table, it is necessary to run the rules for all visible events.        
        if (angular.isDefined($scope.currentStage) && $scope.currentStage !== null && $scope.currentStage.displayEventsInTable && angular.isUndefined($scope.currentStage.rulesExecuted)){
            angular.forEach($scope.currentStageEvents, function (event) {
                TrackerRulesExecutionService.executeRules($scope.allProgramRules, event, evs, $scope.prStDes, $scope.attributesById, $scope.selectedTei, $scope.selectedEnrollment, $scope.optionSets, flag, $scope.stagesById);
                $scope.currentStage.rulesExecuted = true;
            });
        } else {
            TrackerRulesExecutionService.executeRules($scope.allProgramRules, $scope.currentEvent, evs, $scope.prStDes, $scope.attributesById, $scope.selectedTei, $scope.selectedEnrollment, $scope.optionSets, flag, $scope.stagesById);
        }
    };
    //listen for the selected items
    $scope.$on('dashboardWidgets', function () {
        $scope.dashboardReady = true;
        $scope.showDataEntryDiv = false;
        $scope.showEventCreationDiv = false;
        $scope.currentEvent = null;
        $scope.currentStage = null;
        $scope.currentStageEvents = null;
        $scope.totalEvents = 0;
        $scope.eventsLoaded = false;
        $scope.stageStyleLabels = [];
        $scope.eventStyleLabels = [];

        $scope.allowEventCreation = false;
        $scope.repeatableStages = [];
        $scope.eventsByStage = [];
        $scope.eventsByStageDesc = [];
        $scope.programStages = [];
        $rootScope.ruleeffects = {};
        $scope.prStDes = [];
        $scope.allProgramRules = [];
        $scope.allowProvidedElsewhereExists = [];
        $scope.allowFutureDateArray = [];
        
        var selections = CurrentSelection.get();
        $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU');
        $scope.selectedEntity = selections.tei;
        $scope.selectedProgram = selections.pr;
        $scope.selectedEnrollment = selections.selectedEnrollment;        
        
        $scope.showSelf = true;
        if(angular.isUndefined($scope.selectedEnrollment) || $scope.selectedEnrollment === null || ($scope.dashBoardWidgetFirstRun && $scope.selectedEnrollment.status === "COMPLETED")){
            //onOpenEnrollment
            $scope.showSelf = false;
        }
        
        $rootScope.$broadcast('BeforeOpenEnrollment', $scope.showSelf);
        $scope.dashBoardWidgetFirstRun = false;

        
        $scope.optionSets = selections.optionSets;

        $scope.stagesById = [];
        if ($scope.selectedOrgUnit && $scope.selectedProgram && $scope.selectedProgram.id && $scope.selectedEntity) {
            var stages = $scope.programStages = $scope.selectedProgram.programStages;                
            angular.forEach(stages, function (stage) {
                if (stage.openAfterEnrollment) {
                    $scope.currentStage = stage;
                }
                
                //for folkehelsa-------------------------------------------------------------------------------------------
                stage.onlyOneIncompleteEvent = false;
                if(stage.id === 'uUHQw5KrZAL' || stage.id === 'BjNpOxjvEj5' || stage.id === 'FRSZV43y35y'){
                    stage.onlyOneIncompleteEvent = true;
                }
                
                if(stage.id === 'iXDSolqmauJ' || stage.id === 'tlzRiafqzgd' || stage.id === 'WPgz41MctSW' || stage.id ==='w9cPvMH5LaN' || stage.id === 'MO39jKgz2VA' || stage.id === 'E8Jetf3Q90U'){
                    stage.dontPersistOnCreate = true;
                }
                
                /*if the stage should autocreate new events set it here
                if(stage.id === 'xxxxxxxxx')
                {
                    stage.autoCreateNewEvents = true;
                }*/
                //end for folkehelsa--------------------------------------------------------------------------------------------------------
                angular.forEach(stage.programStageDataElements, function (prStDe) {
                    $scope.prStDes[prStDe.dataElement.id] = prStDe;
                    if($scope.prStDes[prStDe.dataElement.id].allowFutureDate) {
                        $scope.allowFutureDateArray[prStDe.dataElement.id] = true;
                    }
                    if(prStDe.allowProvidedElsewhere){
                        $scope.allowProvidedElsewhereExists[stage.id] = true;
                    }
                });
                $scope.stagesById[stage.id] = stage;
                $scope.eventsByStage[stage.id] = [];

                //If one of the stages has less than $scope.tableMaxNumberOfDataElements data elements, allow sorting as table:
                if ($scope.stageCanBeShownAsTable(stage)) {
                    $scope.stagesCanBeShownAsTable = true;
                }
            });
            var s = dateFilter(new Date(), 'YYYY-MM-dd');
            $scope.programStages = orderByFilter($scope.programStages, '-sortOrder').reverse();
            if (!$scope.currentStage) {
                $scope.currentStage = $scope.programStages[0];
            }
            
            if($scope.useMainMenu){
                $scope.buildMainMenuStages();
            }
            
            $scope.setDisplayTypeForStages();
            $scope.getHeaderStages();
            
            TrackerRulesFactory.getRules($scope.selectedProgram.id).then(function(rules){                    
                $scope.allProgramRules = rules;
                if($scope.selectedEnrollment) {
                    $scope.getEvents();  
                    broadcastDataEntryControllerData();
                    executeRulesOnInit();
                }
            });           
        }
    });
    
    function executeRulesOnInit(){
        var flag = {debug: true, verbose: true};        
        TrackerRulesExecutionService.executeRules($scope.allProgramRules, 'dataEntryInit', null, $scope.prStDes,$scope.attributesById, $scope.selectedTei, $scope.selectedEnrollment,$scope.optionSets, flag);
    }
    
    
    
    $scope.openEventExternal = function(event){
        if($scope.useMainMenu){
            var stage = $scope.stagesById[event.programStage];
            $scope.openStageFromMenu(stage);
        }else{
            $scope.showDataEntry(event, true);
        }
    };
    
    $scope.deleteScheduleAndOverdueEvents = function(){
        var promises = [];
        for(var i = 0; i < $scope.programStages.length; i++ ) {
            for(var e = 0; e < $scope.eventsByStage[$scope.programStages[i].id].length; e++) {
                if($scope.eventsByStage[$scope.programStages[i].id][e].status ==='SCHEDULE' || $scope.eventsByStage[$scope.programStages[i].id][e].status ==='OVERDUE'){
                    promises.push(DHIS2EventFactory.delete($scope.eventsByStage[$scope.programStages[i].id][e]));
                }
            }
        }
        
        return $q.all(promises);
    };
    
    function broadcastDataEntryControllerData(){
        $rootScope.$broadcast('dataEntryControllerData', 
        {   programStages: $scope.programStages, 
            eventsByStage: $scope.eventsByStage, 
            addNewEvent: $scope.addNewEvent, 
            openEvent: $scope.openEventExternal, 
            deleteScheduleOverDueEvents: $scope.deleteScheduleAndOverdueEvents,
            persistEvent: $scope.persistEvent,
            removeEventWithIDFromArrays: $scope.removeEventWithIDFromArrays,
            executeRules: $scope.executeRules });
    }
    
    $scope.getEvents = function () {
        //custom code palestine
        $rootScope.$broadcast('closingStageEvent', {event:null});
        //
        
        $scope.allEventsSorted = [];
        var events = CurrentSelection.getSelectedTeiEvents();        
        events = $filter('filter')(events, {program: $scope.selectedProgram.id});
        if (angular.isObject(events)) {
            angular.forEach(events, function (dhis2Event) {                
                var multiSelectsFound = [];
                if ((dhis2Event.enrollment === $scope.selectedEnrollment.enrollment || dhis2Event.programStage ==='PUZaKR0Jh2k' || dhis2Event.programStage ==='uD4lKVSbeyB') && dhis2Event.orgUnit) {
                    if (dhis2Event.notes) {
                        dhis2Event.notes = orderByFilter(dhis2Event.notes, '-storedDate');
                        angular.forEach(dhis2Event.notes, function (note) {
                            note.displayDate = DateUtils.formatFromApiToUser(note.storedDate);
                            note.storedDate = DateUtils.formatToHrsMins(note.storedDate);
                        });
                    }
                    var eventStage = $scope.stagesById[dhis2Event.programStage];
                    if (angular.isObject(eventStage)) {
                        dhis2Event.displayName = eventStage.displayName;
                        dhis2Event.executionDateLabel = eventStage.executionDateLabel ? eventStage.executionDateLabel : $translate.instant('report_date');
                        dhis2Event.dueDate = DateUtils.formatFromApiToUser(dhis2Event.dueDate);
                        dhis2Event.sortingDate = dhis2Event.dueDate;

                        if (dhis2Event.eventDate) {                            
                            dhis2Event.eventDate = DateUtils.formatFromApiToUser(dhis2Event.eventDate);
                            dhis2Event.sortingDate = dhis2Event.eventDate;                            
                        }

                        dhis2Event.editingNotAllowed = setEventEditing(dhis2Event, eventStage);
                        
                        dhis2Event.statusColor = EventUtils.getEventStatusColor(dhis2Event);
                        dhis2Event = EventUtils.processEvent(dhis2Event, eventStage, $scope.optionSets, $scope.prStDes);
                        $scope.eventsByStage[dhis2Event.programStage].push(dhis2Event);
                        angular.forEach($scope.programStages, function(programStage) {
                            if(dhis2Event.programStage === programStage.id) {
                                angular.forEach(programStage.programStageDataElements, function(dataElement) {
                                    if(dataElement.dataElement.dataElementGroups && dataElement.dataElement.dataElementGroups.length > 0){
                                        angular.forEach(dataElement.dataElement.dataElementGroups, function(dataElementGroup){
                                            if(multiSelectsFound.indexOf(dataElementGroup.id)< 0) {
                                                dhis2Event[dataElementGroup.id] = {selections:[]};
                                                multiSelectsFound.push(dataElementGroup.id);
                                            }
                                            if(dhis2Event[dataElement.dataElement.id]){
                                            dhis2Event[dataElementGroup.id].selections.push(dataElement.dataElement);       
                                            }
                                        });
                                    } 
                                });
                            }
                        });
                        if ($scope.currentStage && $scope.currentStage.id === dhis2Event.programStage) {
                            $scope.currentEvent = dhis2Event;
                        }
                        
                        //Hardcode palestine
                        if(dhis2Event.programStage === 'HaOwL7bIdrs'){
                            $rootScope.$broadcast('closingStageEvent', {event:dhis2Event}); 
                        }
                        
                        
                    }
                    
                    $scope.allEventsSorted.push(dhis2Event);
                }
            });
            
            $scope.fileNames = CurrentSelection.getFileNames();            
            $scope.allEventsSorted = orderByFilter($scope.allEventsSorted, ['-sortingDate','-created']).reverse();
            sortEventsByStage(null);
            $scope.showDataEntry($scope.currentEvent, true);
            $scope.eventsLoaded = true;
        }
    };
    

    var setEventEditing = function (dhis2Event, stage) {
        return dhis2Event.editingNotAllowed = dhis2Event.orgUnit !== $scope.selectedOrgUnit.id && dhis2Event.eventDate || (stage.blockEntryForm && dhis2Event.status === 'COMPLETED') || $scope.selectedEntity.inactive;
    };

    $scope.enableRescheduling = function () {
        $scope.schedulingEnabled = !$scope.schedulingEnabled;
    };

    $scope.stageCanBeShownAsTable = function (stage) {
        if (stage.programStageDataElements 
                && stage.programStageDataElements.length <= $scope.tableMaxNumberOfDataElements
                && stage.repeatable) {
            return true;
        }
        return false;
    };

    $scope.toggleEventsTableDisplay = function () {       
        $scope.showEventsAsTables = !$scope.showEventsAsTables;                

        $scope.setDisplayTypeForStages();

        
        if ($scope.currentStage && $scope.stageCanBeShownAsTable($scope.currentStage)) {
            //If the current event was deselected, select the first event in the current Stage before showing data entry:
            if(!$scope.currentEvent.event 
                    && $scope.eventsByStage[$scope.currentStage.id]) {
                $scope.currentEvent = $scope.eventsByStage[$scope.currentStage.id][0];
            }
            
            $scope.getDataEntryForm();
        } 
    };
    
    $scope.setDisplayTypeForStages = function(){
        angular.forEach($scope.programStages, function (stage) {
            $scope.setDisplayTypeForStage(stage);
        });
    };
    
    $scope.setDisplayTypeForStage = function(stage){
        if ($scope.stageCanBeShownAsTable(stage)) {
            stage.displayEventsInTable = $scope.showEventsAsTables;
        }
    };
    
    $scope.stageNeedsEventErrors = {enrollment: 1, complete: 2, scheduleDisabled: 3, scheduledFound: 4, notRepeatable: 5};
    
    $scope.stageNeedsEventOfType = function (stage, type, completeRequired, errorResponseContainer) {
        
        if(type === $scope.eventCreationActions.schedule || type === $scope.eventCreationActions.referral){
            if(stage.hideDueDate === true){
                if(angular.isDefined(errorResponseContainer)){
                    errorResponseContainer.errorCode = $scope.stageNeedsEventErrors.scheduleDisabled;
                }                
                return false;
            }
        }
        
        return $scope.stageNeedsEvent(stage, completeRequired, errorResponseContainer);
    };
    
    $scope.stageNeedsEvent = function (stage, completeRequired, errorResponseContainer) {
        
        var calculatedCompleteRequired = (angular.isDefined(completeRequired) && completeRequired) || (angular.isDefined(stage.onlyOneIncompleteEvent) && stage.onlyOneIncompleteEvent);
        
        if($scope.selectedEnrollment && $scope.selectedEnrollment.status === 'ACTIVE'){
            if(!stage){
                if(!$scope.allEventsSorted || $scope.allEventsSorted.length === 0){
                    return true;
                }
                for(var key in $scope.eventsByStage){
                    stage = $scope.stagesById[key];
                    if(stage && stage.repeatable){
                        for (var j = 0; j < $scope.eventsByStage[stage.id].length; j++) {
                            if (!$scope.eventsByStage[stage.id][j].eventDate && $scope.eventsByStage[stage.id][j].status !== 'SKIPPED') {
                                return true;
                            }
                        }
                        return true;
                    }
                }
                return false;
            }

            //In case the event is a table, we sould always allow adding more events(rows)
            if (stage.displayEventsInTable) {
                return true;
            }
            
            if ($scope.eventsByStage[stage.id].length === 0) {
                return true;
            }
            
            if (stage.repeatable) {
                for (var j = 0; j < $scope.eventsByStage[stage.id].length; j++) {
                    if(angular.isDefined(calculatedCompleteRequired) && calculatedCompleteRequired === true){
                        var foundEvent = $scope.eventsByStage[stage.id][j];
                        if(foundEvent.status !== $scope.EVENTSTATUSCOMPLETELABEL && foundEvent.status !== $scope.EVENTSTATUSSKIPPEDLABEL){
                            if(angular.isDefined(errorResponseContainer)){
                                errorResponseContainer.errorCode = $scope.stageNeedsEventErrors.complete;
                            }
                            return false;
                        }                            
                    }
                    //folkehelsa, allowing more than one scheduled event
                    /*
                    else if (!$scope.eventsByStage[stage.id][j].eventDate && $scope.eventsByStage[stage.id][j].status !== 'SKIPPED') {
                        if(angular.isDefined(errorResponseContainer)){
                            errorResponseContainer.errorCode = $scope.stageNeedsEventErrors.scheduledFound;
                        }
                        return false;
                    }
                    */
                }
                return true;
            }
            else{
                if(angular.isDefined(errorResponseContainer)){
                    errorResponseContainer.errorCode = $scope.stageNeedsEventErrors.notRepeatable;
                }
                return false;
            }
        }
        
        if(angular.isDefined(errorResponseContainer)){
            errorResponseContainer.errorCode = $scope.stageNeedsEventErrors.enrollment;
        }
        return false;
    };
    
    $scope.creatableStagesExist = function(stageList) {
        if(stageList && stageList.length > 0) {
            return true;
        }
        
        return false;
    };
    
    $scope.getTopLineColumnStyle = function(colNr){
        if($scope.useMainMenu && ($scope.topLineEvents.length === 0 || $scope.hideTopLineEventsForFormTypes[$scope.displayCustomForm])){
            if(colNr === 1){
                return 'col-xs-12';
            }
            else {
                return '';
            }
        }
        else if($scope.showStageTasks){
            if(colNr === 1){
                return 'col-xs-6 col-sm-9';
            }
            else {
                return 'col-xs-6 col-sm-3';
            }
        }
        else {
            if(colNr === 1){
                return 'col-xs-10 col-sm-11';
            }
            else {
                return 'col-xs-2 col-sm-1';
            }
        }        
    };
    
    $scope.stagesNotShowingInStageTasks = angular.copy($scope.neverShowItems);  
    for(var key in $scope.bottomLineItems){
        $scope.stagesNotShowingInStageTasks[key] = $scope.bottomLineItems[key];
    };    
    
    $scope.displayStageTasksInTopLine = function(stage) {
        if($scope.stagesNotShowingInStageTasks[stage.id]){
            return false;
        }   
        
        return $scope.stageNeedsEvent(stage);
    };
    
    $scope.showStageTasks = false;
    $scope.toggleShowStageTasks = function(){
        $scope.showStageTasks = !$scope.showStageTasks;
    };
    
    $scope.addNewEvent = function(newEvent,setProgramStage) {
        //Have to make sure the event is preprocessed - this does not happen unless "Dashboardwidgets" is invoked.
        newEvent = EventUtils.processEvent(newEvent, $scope.stagesById[newEvent.programStage], $scope.optionSets, $scope.prStDes);
        if(setProgramStage) $scope.currentStage = $scope.stagesById[newEvent.programStage];
        $scope.eventsByStage[newEvent.programStage].push(newEvent);
        sortEventsByStage('ADD', newEvent);
        broadcastDataEntryControllerData();
    };
    
    function getApplicableStagesForStageTasks(){
        
        if(angular.isUndefined($scope.stagesNotShowingInStageTasks)){
            return $scope.programStages;
        }
        else {
            var applicableStages = [];
            angular.forEach($scope.programStages, function(stage){
                if(angular.isUndefined($scope.stagesNotShowingInStageTasks[stage.id])){
                    applicableStages.push(stage);
                }
            });
            return applicableStages;
        }
    }
    
    $scope.stageErrorInEventLayout = [];
    $scope.showCreateEventIfStageNeedsEvent = function(stage, eventCreationAction, requireStageEventsToBeCompleted, showModalOnNoEventsNeeded){
        //custom code for folkehelsa
        if(stage.id === 'edqlbukwRfQ'){
            //If stage WZbXY0S00lP exists and no event of stage WZbXY0S00lP exists
            if($scope.stagesById['WZbXY0S00lP'] && (angular.isUndefined($scope.eventsByStage['WZbXY0S00lP']) || $scope.eventsByStage['WZbXY0S00lP'].length === 0)){
                stage = $scope.stagesById['WZbXY0S00lP'];
            }
        } else if(stage.id === 'dqF3sxJKBls') {
            //If stage w0pwmNYugKX exists and no event of stage w0pwmNYugKX exists 
            if($scope.stagesById['w0pwmNYugKX'] && (angular.isUndefined($scope.eventsByStage['w0pwmNYugKX']) || $scope.eventsByStage['w0pwmNYugKX'].length === 0)){
                stage = $scope.stagesById['w0pwmNYugKX'];
            }
        } else if(stage.id === 'IlSUGDq9QDc') {
            //If stage piRv8jtcLQV exists and no event of stage piRv8jtcLQV exists 
            if($scope.stagesById['piRv8jtcLQV'] && (angular.isUndefined($scope.eventsByStage['piRv8jtcLQV']) || $scope.eventsByStage['piRv8jtcLQV'].length === 0)){
                stage = $scope.stagesById['piRv8jtcLQV'];
            }
        } else if(stage.id === 'fSE8JyGdsV6') {
            //If stage FRSZV43y35y exists and no event of stage FRSZV43y35y exists 
            if($scope.stagesById['FRSZV43y35y'] && (angular.isUndefined($scope.eventsByStage['FRSZV43y35y']) || $scope.eventsByStage['FRSZV43y35y'].length === 0)){
                stage = $scope.stagesById['FRSZV43y35y'];
            }
        }
        //-------------------------                
        
        showModalOnNoEventsNeeded = angular.isDefined(showModalOnNoEventsNeeded) && showModalOnNoEventsNeeded === true ? true : false;
        var errorResponseContainer = {};
        
        if($scope.stageNeedsEventOfType(stage, eventCreationAction, requireStageEventsToBeCompleted, errorResponseContainer)){
            if(!showModalOnNoEventsNeeded){
                $scope.stageErrorInEventLayout[stage.id] = "";
            }            
            $scope.showCreateEvent(stage, eventCreationAction);
        }
        else {
            if(showModalOnNoEventsNeeded){
                var errorMessage = "";
                if(angular.isDefined(errorResponseContainer.errorCode)){

                    switch(errorResponseContainer.errorCode){
                        case $scope.stageNeedsEventErrors.enrollment:
                            errorMessage = $translate.instant('enrollment_is_not_active');
                            break;
                        case $scope.stageNeedsEventErrors.complete:
                            errorMessage = $translate.instant('please_complete_all_visits_results');
                            break;                    
                        case $scope.stageNeedsEventErrors.scheduleDisabled:
                            errorMessage = $translate.instant('scheduling_disabled_for_programstage');
                            break;
                        case $scope.stageNeedsEventErrors.scheduledFound:
                            errorMessage = $translate.instant('visit_already_scheduled');
                            break;                    
                        case $scope.stageNeedsEventErrors.notRepeatable:
                            errorMessage = $translate.instant('programstage_multiple_events_disabled');
                            break;
                        default:
                            break;                    
                    }
                }
                var dialogOptions = {
                    headerText: $translate.instant('visit_cant_be_created'),
                    bodyText: errorMessage
                };
                    
                DialogService.showDialog({}, dialogOptions);
            }
            else {
                $scope.stageErrorInEventLayout[stage.id] = eventCreationAction;
            }
        }
    };
    
    $scope.showCreateEvent = function (stage, eventCreationAction, suggestedStage) {        
        
        var availableStages = [];
        if(!stage){
            
            //get applicable events
            var allApplicableEvents = [];
            if(!$scope.allEventsSorted || $scope.allEventsSorted.length === 0){
                
            }
            else if(angular.isUndefined($scope.stagesNotShowingInStageTasks)){
                allApplicableEvents = $scope.allEventsSorted.slice();
            }
            else {
                angular.forEach($scope.allEventsSorted, function(event){
                    if(angular.isUndefined($scope.stagesNotShowingInStageTasks[event.programStage])){
                        allApplicableEvents.push(event);
                    }
                }); 
            }         
            
            var applicableStages = getApplicableStagesForStageTasks();           
            
            if(allApplicableEvents.length === 0 && applicableStages.length > 0){                               
                availableStages = applicableStages;
            }
            else{
                angular.forEach(applicableStages, function(stage){
                    if($scope.stageNeedsEvent(stage)){
                        availableStages.push(stage);
                    }
                });
            }           
            if(availableStages.length === 0) {
                var dialogOptions = {
                    headerText: 'error',
                    bodyText: 'no_stages_available'
                };
                    
                DialogService.showDialog({}, dialogOptions);
                
                return;
            }
        }
        var autoCreate = !!(stage && stage.autoCreateNewEvents);
        EventCreationService.showModal($scope.eventsByStage, stage, availableStages, $scope.programStages, $scope.selectedEntity, $scope.selectedProgram, $scope.selectedOrgUnit, $scope.selectedEnrollment, autoCreate, eventCreationAction, allApplicableEvents,suggestedStage, $scope.currentEvent)
                .then(function (eventContainer) {
                    if(angular.isDefined(eventContainer)){                
                        var ev = eventContainer.ev;
                        var dummyEvent = eventContainer.dummyEvent;      

                        if (angular.isObject(ev) && angular.isObject(dummyEvent)) {

                            var newEvent = ev;
                            newEvent.orgUnitName = dummyEvent.orgUnitName;
                            newEvent.displayName = dummyEvent.displayName;
                            newEvent.executionDateLabel = dummyEvent.executionDateLabel;
                            newEvent.statusColor = EventUtils.getEventStatusColor(ev);
                            newEvent.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                            newEvent.dueDate = DateUtils.formatFromApiToUser(ev.dueDate);
                            newEvent.sortingDate = newEvent.eventDate ? newEvent.eventDate : newEvent.dueDate;
                            newEvent.enrollmentStatus = dummyEvent.enrollmentStatus;

                            if (dummyEvent.coordinate) {
                                newEvent.coordinate = {};
                            }

                            //get stage from created event

                            $scope.addNewEvent(newEvent,true);
                            

                            $scope.currentEvent = null;
                            $scope.showDataEntry(newEvent, true);

                            //custom code for folkehelsa. Open modal if event-stage is previous pregnancies and tableedit-mode is form only
                            if(($scope.currentEvent.programStage === 'PUZaKR0Jh2k' || $scope.currentEvent.programStage === 'uD4lKVSbeyB' || $scope.currentEvent.programStage === 'bO5aSsPeB4A'
                                    || $scope.currentEvent.programStage === 'uOGkguF3MCs') 
                                    && $scope.tableEditMode === $scope.tableEditModes.form){
                                $scope.openEventEditFormModal($scope.currentEvent);
                            }

                            //show page with event in event-layout
                            
                            //$scope.getEventPageForEvent(newEvent);
                        }
                    }
                }, function () {
            });
    };

    $scope.showDataEntry = function (event, suppressToggling) {
        if (event) {
            if ($scope.currentEvent && !suppressToggling && $scope.currentEvent.event === event.event) {
                //clicked on the same stage, do toggling
                $scope.deSelectCurrentEvent();
            }
            else {
                //$scope.currentElement = {};       //removing this to keep history even on event change         
                $scope.currentEvent = event;
                
                var index = -1;
                for (var i = 0; i < $scope.eventsByStage[event.programStage].length && index === -1; i++) {
                    if ($scope.eventsByStage[event.programStage][i].event === event.event) {
                        index = i;
                    }
                }                
                if(index !== -1){
                    $scope.currentEvent = $scope.eventsByStage[event.programStage][index];                    
                }
                
                $scope.showDataEntryDiv = true;
                $scope.showEventCreationDiv = false;

                if ($scope.currentEvent.notes) {
                    angular.forEach($scope.currentEvent.notes, function (note) {
                        note.displayDate = DateUtils.formatFromApiToUser(note.storedDate);
                        note.storedDate = DateUtils.formatToHrsMins(note.storedDate);
                    });

                    if ($scope.currentEvent.notes.length > 0) {
                        $scope.currentEvent.notes = orderByFilter($scope.currentEvent.notes, '-storedDate');
                    }
                }

                $scope.getDataEntryForm();
            }
        }
    };
    
    $scope.deSelectCurrentEvent = function(){
        $scope.currentStage = null;
        $scope.currentEvent = null;
        //$scope.currentElement = {id: '', saved: false}; //removing this to keep history even on event change
        $scope.showDataEntryDiv = !$scope.showDataEntryDiv;
    };
    
    $scope.tableRowIsEditable = function(eventRow){
        if( eventRow === $scope.currentEvent &&
            eventRow.status !== $scope.EVENTSTATUSCOMPLETELABEL &&
            eventRow.status !== $scope.EVENTSTATUSSKIPPEDLABEL &&
            $scope.tableEditMode !== $scope.tableEditModes.form){
            
            return true;
        }
        return false;
    };
    
    $scope.tableRowStatusButtonsEnabled = function(event){
        return event.orgUnit === $scope.selectedOrgUnit.id && $scope.selectedEntity.inactive === false && $scope.selectedEnrollment.status === 'ACTIVE';
    };
    
    $scope.tableEditModes = { form: 0, table: 1, tableAndForm: 2 };
    $scope.tableEditMode = $scope.tableEditModes.form;
    
    $scope.toggleTableEditMode = function(){        
        $scope.tableEditMode = $scope.tableEditMode === $scope.tableEditModes.tableAndForm ? $scope.tableEditModes.form : $scope.tableEditModes.tableAndForm;
    };
    
    $scope.eventRowChanged = false;
    $scope.eventRowClicked = function(event){        
        
        if($scope.currentEvent !== event){
            $scope.eventRowChanged = true;
            $scope.switchToEventRow(event);
        }
        else {
            $scope.eventRowChanged = false;
        }        
         
        if($scope.tableEditMode === $scope.tableEditModes.form){
            $scope.openEventEditFormModal(event);
        }
        
    };
    
    $scope.eventRowDblClicked = function(event){
                
        if($scope.currentEvent === event &&
           $scope.tableEditMode === $scope.tableEditModes.tableAndForm &&
           $scope.eventRowChanged === false){           
            $scope.openEventEditFormModal(event);
        }
    };
        
    $scope.openEventEditFormModal = function(event){
       
        //setEventEditing        
        setEventEditing(event, $scope.currentStage);     
        
        //palestine hardcoded
        if(event.programStage === "PUZaKR0Jh2k" || event.programStage === "uD4lKVSbeyB"){
            $scope.modalOptions = {hideSkipped: true};
        }
        var modalInstance;
        
        $scope.eventEditFormModalInstance = modalInstance = $modal.open({
            templateUrl: 'components/dataentry/modal-default-form.html',
            scope: $scope           
        });

        $scope.eventEditFormModalInstance.result.then(function (actionType) {                        
            //completed, deleted or skipped
            if(actionType === $rootScope.actionTypes.delete){
                $scope.currentEvent = {};
            }            
            $scope.executeRules();            
            
            //deselect current because it is either completed, deleted, or skipped
            $scope.currentEvent = {};                  
        }, function(){
            //closed          
            $scope.executeRules();
        });
    };
    
    $scope.switchToEventRowDeselected = function(event){
        if($scope.currentEvent !== event) {
            $scope.showDataEntry(event,false);
        }
        $scope.currentEvent = {};
    };
    
    $scope.switchToEventRow = function (event) {
        if($scope.currentEvent !== event) {
            $scope.reSortStageEvents = false;
            $scope.showDataEntry(event,false);
            $scope.reSortStageEvents = true;
        }
    };

    $scope.switchDataEntryForm = function () {
        $scope.displayCustomForm = !$scope.displayCustomForm;
    };
    
    $scope.buildOtherValuesLists = function () {
        var otherValues = {};
        //Only default forms need to build an other values list.
        if($scope.displayCustomForm === "DEFAULT" || $scope.displayCustomForm === false) {
            //Build a list of datavalues OUTSIDE the current event. 
            angular.forEach($scope.currentStage.programStageDataElements, function(programStageDataElement) {
                angular.forEach($scope.programStages, function(stage) {
                    for(var i = 0; i < $scope.eventsByStage[stage.id].length; i++) {
                        //We are not interested in the values from the current stage:
                        if($scope.eventsByStage[stage.id][i] !== $scope.currentEvent) {
                            var currentId = programStageDataElement.dataElement.id;
                            if ( $scope.eventsByStage[stage.id][i][currentId] ) {
                                //The current stage has a dataelement of the type in question

                                //Init the list if not already done:
                                if(!otherValues[currentId]) {
                                    otherValues[currentId] = [];
                                }
                                
                                //Decorate and push the alternate value to the list:
                                
                                var alternateValue = $scope.eventsByStage[stage.id][i][currentId];                                
                                alternateValue = CommonUtils.displayBooleanAsYesNo(alternateValue, programStageDataElement.dataElement);
                                
                                //hardcode special cases for now
                                if(currentId === "MWyRGEuDG4J" && alternateValue === "Yes"){
                                    if(angular.isDefined($scope.eventsByStage[stage.id][i]["nXFl3s7aVer"]) 
                                        && $scope.eventsByStage[stage.id][i]["nXFl3s7aVer"] !== ""){
                                        alternateValue += " - " + $scope.eventsByStage[stage.id][i]["nXFl3s7aVer"];
                                    }
                                }
                                
                                if($scope.eventsByStage[stage.id][i]['ddsm9jQqz8k']){
                                    //Decorate with designated visit if this is available:
                                    alternateValue = $scope.eventsByStage[stage.id][i]['ddsm9jQqz8k'] + ': ' + alternateValue;
                                }
                                else
                                {
                                    //Else decorate with the event date:
                                    alternateValue = $scope.eventsByStage[stage.id][i].eventDate + ': ' + alternateValue;
                                }
                                otherValues[currentId].push(alternateValue);
                            }
                        }
                    }
                });
            });
        }
        
        return otherValues;
    };
    
    $scope.getDataEntryForm = function () {
        $scope.currentFileNames = $scope.fileNames[$scope.currentEvent.event] ? $scope.fileNames[$scope.currentEvent.event] : [];
        $scope.currentStage = $scope.stagesById[$scope.currentEvent.programStage];
        $scope.currentStageEvents = $scope.eventsByStage[$scope.currentEvent.programStage];
        if(!$scope.currentStage.multiSelectGroups) {
            $scope.currentStage.multiSelectGroups = {};
        }
        //Custom code for folkehelsa - Find wether the specific dataelement for X-visit schedule is present in this programstage:
        var xVisitsFound = false;
        var indexesToRemove = [];
        
        for(var i = 0; i < $scope.currentStage.programStageDataElements.length;i++) {
            var s = $scope.currentStage.programStageDataElements[i].dataElement;
            if($scope.currentStage.programStageDataElements[i].dataElement.id === 'ddsm9jQqz8k') {
                $scope.xVisitScheduleDataElement = $scope.currentStage.programStageDataElements[i];
                xVisitsFound = true;
            }
            
            //If the datatype is a boolean, and there is a list of dataElementGropus, put the boolean into the group:
            var s = $scope.currentStage.programStageDataElements[i].dataElement;
            if($scope.currentStage.programStageDataElements[i].dataElement.dataElementGroups
                    && $scope.currentStage.programStageDataElements[i].dataElement.valueType === "TRUE_ONLY") {
                var groupsAdded = 0;
                angular.forEach($scope.currentStage.programStageDataElements[i].dataElement.dataElementGroups, function(dataElementGroup) {
                    //if the element it grouped, we only add a prStDe for the group element:
                    if( !$scope.currentStage.multiSelectGroups[dataElementGroup.id] ) {
                        $scope.currentStage.multiSelectGroups[dataElementGroup.id] = $scope.prStDes[dataElementGroup.id] =
                        {dataElement:{valueType:'MULTI_SELECT_GROUP',displayName:dataElementGroup.displayName,id:dataElementGroup.id}, dataElements: []};
                        
                        //for folkehelsa                        
                        if($scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.id === "z2OCjflFLxa") {
                            $scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.description = "Complications that occured during this particular pregnancy or delivery.";
                        } else if($scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.id === "XKV79R3LG5J") {
                            $scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.description = "Complications that occurred during this particular postpartum period.";
                        } else if($scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.id === "ET2aesZVpHo") {
                            $scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElement.description = "Any congenital defect, single or multiple, present at birth and are severe enough to impact an infant`s health, development and/or survival.";
                        }
                        
                        $scope.currentStage.programStageDataElements.splice(i+1+groupsAdded,0,$scope.currentStage.multiSelectGroups[dataElementGroup.id]);
                        groupsAdded++;
                    }                    
                    $scope.currentStage.multiSelectGroups[dataElementGroup.id].dataElements.push($scope.currentStage.programStageDataElements[i]);
                    if(indexesToRemove.indexOf(i) == -1) indexesToRemove.push(i);
                });
            }
        }
        for (var i = indexesToRemove.length -1; i >= 0; i--){
            $scope.currentStage.programStageDataElements.splice(indexesToRemove[i],1);
        }
        
        if(!xVisitsFound) {
            $scope.xVisitScheduleDataElement = false;
        }
        
        //Custom call for folkehelsa, to get the previous values for the datapoints that has other datavalues;
        //this need to be checked out, debugger
        //$scope.otherValuesLists = $scope.buildOtherValuesLists();

        var multiSelectGroupsAddedToSection = {};
        angular.forEach($scope.currentStage.programStageSections, function (section) {
            section.open = true;

            //Special case palestine, set section description
            if(section.id==='GweO3j7YA6a'){
                section.description = "Conditions in first degree relatives; parents, siblings, children";
            }
            var dataElementIndexesToRemove = [];

            for(var i =0; i< section.programStageDataElements.length; i++){
                var prStDe = $scope.prStDes[section.programStageDataElements[i].dataElement.id];

                if(prStDe && prStDe.dataElement.dataElementGroups && prStDe.dataElement.valueType === "TRUE_ONLY"){
                    var groupsAdded = 0;
                    angular.forEach(prStDe.dataElement.dataElementGroups, function(dataElementGroup) {
                        //if the element it grouped, we only add a prStDe for the group element:
                        if(!multiSelectGroupsAddedToSection[dataElementGroup.id]){
                            multiSelectGroupsAddedToSection[dataElementGroup.id] = { dataElements :[]};

                            section.programStageDataElements.splice(i+1+groupsAdded,0,{ dataElement: { id: dataElementGroup.id}});
                            groupsAdded++;
                        }
                        multiSelectGroupsAddedToSection[dataElementGroup.id].dataElements.push(prStDe);

                        if(dataElementIndexesToRemove.indexOf(i) == -1) dataElementIndexesToRemove.push(i);
                    });
                }
            }
            
            for (var i = dataElementIndexesToRemove.length -1; i >= 0; i--){
                section.programStageDataElements.splice(dataElementIndexesToRemove[i],1);
            }
        });

        if(multiSelectGroupsAddedToSection) {
            for(var k in multiSelectGroupsAddedToSection){
                if(multiSelectGroupsAddedToSection.hasOwnProperty(k) && $scope.currentStage.multiSelectGroups[k]){
                    $scope.currentStage.multiSelectGroups[k].dataElements = multiSelectGroupsAddedToSection[k].dataElements;
                }
            }
        }
            
        $scope.setDisplayTypeForStage($scope.currentStage);
        
        $scope.customForm = CustomFormService.getForProgramStage($scope.currentStage, $scope.prStDes);        
        
        if ($scope.customForm) {
            $scope.displayCustomForm = "CUSTOM";
        }
        else if($scope.currentStage.id === 'uUHQw5KrZAL' || $scope.currentStage.id === 'BjNpOxjvEj5' || $scope.currentStage.id === 'FRSZV43y35y' && !$scope.isBangladesh){ //custom code for folkehelsa            
            if($scope.displayCustomForm === "COMPARE"){
                $scope.readyCompareDisplayForm();
            }
            else {
                $scope.displayCustomForm = "COMPARE";  
            }
            
        }
        else if ($scope.currentStage.displayEventsInTable 
                 || $scope.currentStage.id === 'PUZaKR0Jh2k'
                 || $scope.currentStage.id === 'uD4lKVSbeyB'
                 || $scope.currentStage.id === 'bO5aSsPeB4A'
                 || $scope.currentStage.id === 'uOGkguF3MCs') {
            if($scope.reSortStageEvents === true){
                sortStageEvents($scope.currentStage);            
                if($scope.eventsByStage.hasOwnProperty($scope.currentStage.id)){
                    $scope.currentStageEvents = $scope.eventsByStage[$scope.currentStage.id];
                }            
            }
            $scope.currentStage.displayEventsInTable = true;
            $scope.displayCustomForm = "TABLE";
            
        }
        else {
            $scope.displayCustomForm = "DEFAULT";
        }


        $scope.currentEventOriginal = angular.copy($scope.currentEvent);

        $scope.currentStageEventsOriginal = angular.copy($scope.currentStageEvents);

        var period = {event: $scope.currentEvent.event, stage: $scope.currentEvent.programStage, displayName: $scope.currentEvent.sortingDate};
        $scope.currentPeriod[$scope.currentEvent.programStage] = period;        
        
        //Execute rules for the first time, to make the initial page appear correctly.
        //Subsequent calls will be made from the "saveDataValue" function.
        $scope.executeRules();
        if($scope.currentStage.id === 'edqlbukwRfQ'){
            $scope.setPreviousValuesTable('WZbXY0S00lP');          
        } else if($scope.currentStage.id === 'dqF3sxJKBls' && $scope.isBangladesh) {
            $scope.setPreviousValuesTable('w0pwmNYugKX');
        } else if($scope.currentStage.id === 'fSE8JyGdsV6' && $scope.isBangladesh) {
            $scope.setPreviousValuesTable('FRSZV43y35y');
        }

    };

    $scope.saveDatavalue = function (prStDe, field) {        
        $scope.saveDataValueForEvent(prStDe, field, $scope.currentEvent, false);
    };
    
    $scope.saveDataValueForRadio = function(prStDe, event, value){
        
        var def = $q.defer();
        
        event[prStDe.dataElement.id] = value;
        
        var saveReturn = $scope.saveDataValueForEvent(prStDe, null, event, false);
        if(angular.isDefined(saveReturn)){
            if(saveReturn === true){
                def.resolve("saved");                
            }
            else if(saveReturn === false){
                def.reject("error");
            }
            else{
                saveReturn.then(function(){
                    def.resolve("saved");
                }, function(){
                    def.reject("error");
                });
            }
        }
        else {
            def.resolve("notSaved");
        }

        
        return def.promise;
    };
    
    $scope.saveMultiSelectState = function (prStDe, eventToSave, currentElement, value) {
        //Called when a new option is added or removed from a multiselect list
        $scope.updateSuccess = false;

        $scope.currentElement = {id: currentElement.dataElement.id, event: eventToSave.event, saved: false};
        
        value = CommonUtils.formatDataValue(eventToSave.event, value, prStDe.dataElement, $scope.optionSets, 'API');
        var dataValue = {
            dataElement: prStDe.dataElement.id,
            value: value,
            providedElsewhere: false
        };
        
        var ev = {event: eventToSave.event,
            orgUnit: eventToSave.orgUnit,
            program: eventToSave.program,
            programStage: eventToSave.programStage,
            status: eventToSave.status,
            trackedEntityInstance: eventToSave.trackedEntityInstance,
            dataValues: [
                dataValue
            ]
        };
        DHIS2EventFactory.updateForSingleValue(ev).then(function (response) {

            $scope.currentElement.saved = true;
            if(value){
                $scope.currentEvent[dataValue.dataElement] = dataValue;                
            }else{
                $scope.currentEvent[dataValue.dataElement] = null;
            }
            $scope.currentEventOriginal = angular.copy($scope.currentEvent);
            $scope.currentStageEventsOriginal = angular.copy($scope.currentStageEvents);
            //Run rules on updated data:
            $scope.executeRules();
        });
    };
    
    $scope.initMultiSelect = function (eventRow) {
        if(!eventRow.multiSelectGroupSelection) {
            eventRow.multiSelectGroupSelection = {selections:[]};
        }
    };
    
    $scope.degub = function(item) {
        var i = item;
    };
    
    $scope.saveDataValueForEvent = function (prStDe, field, eventToSave, backgroundUpdate) {
        
        //Do not change the input notification variables for background updates
        if(!backgroundUpdate) {
            //Blank out the input-saved class on the last saved due date:
            $scope.eventDateSaved = false;

            //check for input validity
            $scope.updateSuccess = false;
        }
        if (field && field.$invalid && angular.isDefined(value) && value !== "") {
            $scope.currentElement = {id: prStDe.dataElement.id, saved: false, event: eventToSave.event};
            return false;
        }

        //input is valid
        var value = eventToSave[prStDe.dataElement.id];

        var oldValue = null;
        angular.forEach($scope.currentStageEventsOriginal, function (eventOriginal) {
            if (eventOriginal.event === eventToSave.event) {
                oldValue = eventOriginal[prStDe.dataElement.id];
            }
        });

        if (oldValue !== value) {
            
            value = CommonUtils.formatDataValue(eventToSave.event, value, prStDe.dataElement, $scope.optionSets, 'API');
            
            //Do not change the input notification variables for background updates
            if(!backgroundUpdate) {
                $scope.updateSuccess = false;
                $scope.currentElement = {id: prStDe.dataElement.id, event: eventToSave.event, saved: false, failed:false, pending:true, value: value};            
            }
            
            var ev = {event: eventToSave.event,
                orgUnit: eventToSave.orgUnit,
                program: eventToSave.program,
                programStage: eventToSave.programStage,
                status: eventToSave.status,
                trackedEntityInstance: eventToSave.trackedEntityInstance,
                dataValues: [
                    {
                        dataElement: prStDe.dataElement.id,
                        value: value,
                        providedElsewhere: eventToSave.providedElsewhere[prStDe.dataElement.id] ? true : false
                    }
                ]
            };
            
            //for folkehelsa
            if(($scope.currentStage.id === 'uUHQw5KrZAL' && prStDe.dataElement.id === 'gpKuJcONaoW') 
                    || ($scope.currentStage.id === 'FRSZV43y35y' && prStDe.dataElement.id === 'yakmemTH1Vz')){
                $scope.setOtherStageEvents();            
            }   
            //----
                
            return DHIS2EventFactory.updateForSingleValue(ev).then(function (response) {

                $scope.updateFileNames();
                
                if(!backgroundUpdate) {
                    $scope.currentElement.saved = true;
                    $scope.currentElement.pending = false;
                    $scope.currentElement.failed = false;
                }
                
                $scope.currentEventOriginal = angular.copy($scope.currentEvent);

                $scope.currentStageEventsOriginal = angular.copy($scope.currentStageEvents);

                //In some cases, the rules execution should be suppressed to avoid the 
                //possibility of infinite loops(rules updating datavalues, that triggers a new 
                //rule execution)
                if(!backgroundUpdate) {
                    //Run rules on updated data:
                    $scope.executeRules();
                }
            }, function(error) {
                //Do not change the input notification variables for background updates
                if(!backgroundUpdate) {
                    $scope.currentElement.saved = false;
                    $scope.currentElement.pending = false;
                    $scope.currentElement.failed = true;      
                } else {
                    $log.warn("Could not perform background update of " + prStDe.dataElement.id + " with value " +
                            value);
                }
            });

        }
    };

    $scope.saveDatavalueLocation = function (prStDe) {

        $scope.updateSuccess = false;

        if (!angular.isUndefined($scope.currentEvent.providedElsewhere[prStDe.dataElement.id])) {

            //currentEvent.providedElsewhere[prStDe.dataElement.id];
            var value = $scope.currentEvent[prStDe.dataElement.id];
            var ev = {event: $scope.currentEvent.event,
                orgUnit: $scope.currentEvent.orgUnit,
                program: $scope.currentEvent.program,
                programStage: $scope.currentEvent.programStage,
                status: $scope.currentEvent.status,
                trackedEntityInstance: $scope.currentEvent.trackedEntityInstance,
                dataValues: [
                    {
                        dataElement: prStDe.dataElement.id,
                        value: value,
                        providedElsewhere: $scope.currentEvent.providedElsewhere[prStDe.dataElement.id] ? true : false
                    }
                ]
            };
            DHIS2EventFactory.updateForSingleValue(ev).then(function (response) {
                $scope.updateSuccess = true;
            });
        }
    };

    $scope.saveEventDate = function (reOrder) {        
        $scope.saveEventDateForEvent($scope.currentEvent, reOrder);        
    };

    $scope.saveEventDateForEvent = function (eventToSave, reOrder) {
        $scope.eventDateSaved = false;
        
        if (angular.isUndefined(eventToSave.eventDate) || eventToSave.eventDate === '') {
            eventToSave.eventDate = '';
            $scope.invalidDate = eventToSave.event;
            $scope.validatedDateSetForEvent = {date: '', event: eventToSave};
            return false;
        }
        else{
            var rawDate = angular.copy(eventToSave.eventDate);
            var convertedDate = DateUtils.format(eventToSave.eventDate);

            if (rawDate !== convertedDate) {
                $scope.invalidDate = eventToSave.event;
                $scope.validatedDateSetForEvent = {date: '', event: eventToSave};
                $scope.currentElement = {id: "eventDate", saved: false};
                return false;
            }
        }
        
        $scope.currentElement = {id: "eventDate", event: eventToSave.event, saved: false};
        
        var e = {event: eventToSave.event,
            enrollment: eventToSave.enrollment,
            dueDate: DateUtils.formatFromUserToApi(eventToSave.dueDate),
            status: eventToSave.status === 'SCHEDULE' ? 'ACTIVE' : eventToSave.status,
            program: eventToSave.program,
            programStage: eventToSave.programStage,
            orgUnit: eventToSave.dataValues && eventToSave.dataValues.length > 0 ? eventToSave.orgUnit : $scope.selectedOrgUnit.id,
            eventDate: DateUtils.formatFromUserToApi(eventToSave.eventDate),
            trackedEntityInstance: eventToSave.trackedEntityInstance
        };
        
        if(angular.isUndefined(e.eventDate)){
            e.eventDate = '';
        }
        
        
        DHIS2EventFactory.updateForEventDate(e).then(function (data) {
            eventToSave.sortingDate = eventToSave.eventDate;
            
            if(eventToSave.eventDate !== ''){
                $scope.invalidDate = false;
                $scope.validatedDateSetForEvent = {date: eventToSave.eventDate, event: eventToSave};
            }            
            
            $scope.eventDateSaved = eventToSave.event;
            eventToSave.statusColor = EventUtils.getEventStatusColor(eventToSave); 
            
            if(angular.isUndefined($scope.currentStage.displayEventsInTable) || $scope.currentStage.displayEventsInTable === false || (angular.isDefined(reOrder) && reOrder === true)){
                sortEventsByStage('UPDATE');
            }
            $scope.validatedDateSetForEvent = {date: eventToSave.eventDate, event: eventToSave};
            
            $scope.currentElement = {id: "eventDate", event: eventToSave.event, saved: true};
            $scope.executeRules();
            //$scope.getEventPageForEvent($scope.currentEvent);
        }, function(error){
            
        });
    };

    $scope.saveDueDate = function () {

        $scope.dueDateSaved = false;

        if (angular.isUndefined($scope.currentEvent.dueDate) || $scope.currentEvent.dueDate === '') {
            $scope.currentEvent.dueDate = '';
            $scope.invalidDueDate = $scope.currentEvent.event;            
        }
        else {
            var rawDate = angular.copy($scope.currentEvent.dueDate);
            var convertedDate = DateUtils.format($scope.currentEvent.dueDate);

            if (rawDate !== convertedDate) {
                $scope.invalidDueDate = $scope.currentEvent.event;
                return false;
            }
        }

        var e = {event: $scope.currentEvent.event,
            enrollment: $scope.currentEvent.enrollment,
            dueDate: DateUtils.formatFromUserToApi($scope.currentEvent.dueDate),
            status: $scope.currentEvent.status,
            program: $scope.currentEvent.program,
            programStage: $scope.currentEvent.programStage,
            orgUnit: $scope.selectedOrgUnit.id,
            trackedEntityInstance: $scope.currentEvent.trackedEntityInstance
        };

        if ($scope.currentStage.periodType) {
            e.eventDate = e.dueDate;
        }

        if ($scope.currentEvent.coordinate) {
            e.coordinate = $scope.currentEvent.coordinate;
        }

        DHIS2EventFactory.update(e).then(function (data) {
            
            if($scope.currentEvent.dueDate !== ''){
                $scope.invalidDueDate = false;
            }
            
            $scope.dueDateSaved = true;

            if (e.eventDate && !$scope.currentEvent.eventDate && $scope.currentStage.periodType) {
                $scope.currentEvent.eventDate = $scope.currentEvent.dueDate;
            }
            
            $scope.currentEvent.sortingDate = $scope.currentEvent.dueDate;
            $scope.currentEvent.statusColor = EventUtils.getEventStatusColor($scope.currentEvent);
            $scope.schedulingEnabled = !$scope.schedulingEnabled;
            sortEventsByStage('UPDATE');
            //$scope.getEventPageForEvent($scope.currentEvent);
        });        
        
    };

    $scope.saveCoordinate = function (type) {

        if (type === 'LAT' || type === 'LATLNG') {
            $scope.latitudeSaved = false;
        }
        if (type === 'LAT' || type === 'LATLNG') {
            $scope.longitudeSaved = false;
        }

        if ((type === 'LAT' || type === 'LATLNG') && $scope.outerForm.latitude.$invalid ||
                (type === 'LNG' || type === 'LATLNG') && $scope.outerForm.longitude.$invalid) {//invalid coordinate            
            return;
        }

        if ((type === 'LAT' || type === 'LATLNG') && $scope.currentEvent.coordinate.latitude === $scope.currentEventOriginal.coordinate.latitude ||
                (type === 'LNG' || type === 'LATLNG') && $scope.currentEvent.coordinate.longitude === $scope.currentEventOriginal.coordinate.longitude) {//no change            
            return;
        }

        //valid coordinate(s), proceed with the saving
        var dhis2Event = $scope.makeDhis2EventToUpdate();

        DHIS2EventFactory.update(dhis2Event).then(function (response) {
            $scope.currentEventOriginal = angular.copy($scope.currentEvent);
            $scope.currentStageEventsOriginal = angular.copy($scope.currentStageEvents);

            if (type === 'LAT' || type === 'LATLNG') {
                $scope.latitudeSaved = true;
            }
            if (type === 'LAT' || type === 'LATLNG') {
                $scope.longitudeSaved = true;
            }
        });
    };

    $scope.addNote = function () {
        
        if(!$scope.note.value){
            var dialogOptions = {
                headerText: 'error',
                bodyText: 'please_add_some_text'
            };                

            DialogService.showDialog({}, dialogOptions);
            return;
        }
        var newNote = {value: $scope.note.value};
            
        if (angular.isUndefined($scope.currentEvent.notes)) {
            $scope.currentEvent.notes = [{value: newNote.value, storedDate: today, displayDate: today, storedBy: storedBy}];
        }
        else {
            $scope.currentEvent.notes.splice(0, 0, {value: newNote.value, storedDate: today, displayDate: today, storedBy: storedBy});
        }

        var e = {event: $scope.currentEvent.event,
            program: $scope.currentEvent.program,
            programStage: $scope.currentEvent.programStage,
            orgUnit: $scope.currentEvent.orgUnit,
            trackedEntityInstance: $scope.currentEvent.trackedEntityInstance,
            notes: [newNote]
        };

        DHIS2EventFactory.updateForNote(e).then(function (data) {

            $scope.note = {};
        });
    };
    
    $scope.notesModal = function(){
                
        var bodyList = [];

        if($scope.currentEvent.notes) {
            for(var i = 0; i < $scope.currentEvent.notes.length; i++){
                var currentNote = $scope.currentEvent.notes[i];            
                bodyList.push({value1: currentNote.storedDate, value2: currentNote.value});
            }
        }
        
        var dialogOptions = {
            closeButtonText: 'Close',            
            textAreaButtonText: 'Add',
            textAreaButtonShow: $scope.currentEvent.status === $scope.EVENTSTATUSSKIPPEDLABEL ? false : true,
            headerText: 'Notes',
            bodyTextAreas: [{model: 'note', placeholder: 'Add another note here', required: true, show: $scope.currentEvent.status === $scope.EVENTSTATUSSKIPPEDLABEL ? false : true}],
            bodyList: bodyList,
            currentEvent: $scope.currentEvent
        };        
        
        var dialogDefaults = {
            
            templateUrl: 'views/list-with-textarea-modal.html',
            controller: function ($scope, $modalInstance, DHIS2EventFactory, DateUtils) {                    
                    $scope.modalOptions = dialogOptions;
                    $scope.formSubmitted = false;
                    $scope.currentEvent = $scope.modalOptions.currentEvent;
                    $scope.textAreaValues = [];
                    
                    $scope.textAreaButtonClick = function(){                                               
                        if($scope.textAreaModalForm.$valid){                                
                            $scope.note = $scope.textAreaValues["note"];
                            $scope.addNote();
                            $scope.textAreaModalForm.$setUntouched();
                            $scope.formSubmitted = false;                            
                        }
                        else {
                            $scope.formSubmitted = true;
                        }
                    };                   

                                        
                    $scope.modalOptions.close = function(){                        
                        $modalInstance.close($scope.currentEvent);
                    };
                    
                    $scope.addNote = function(){
                                                
                        newNote = {value: $scope.note};
                        var date = DateUtils.formatToHrsMins(new Date());
                        var today = DateUtils.getToday();

                        var e = {event: $scope.currentEvent.event,
                                program: $scope.currentEvent.program,
                                programStage: $scope.currentEvent.programStage,
                                orgUnit: $scope.currentEvent.orgUnit,
                                trackedEntityInstance: $scope.currentEvent.trackedEntityInstance,
                                notes: [newNote]
                        };
                        DHIS2EventFactory.updateForNote(e).then(function (data) {
                            if (angular.isUndefined($scope.modalOptions.bodyList) || $scope.modalOptions.bodyList.length === 0) {
                                $scope.modalOptions.bodyList = [{value1: date, value2: newNote.value}];
                                $scope.modalOptions.currentEvent.notes = [{storedDate: date,displayDate: today, value: newNote.value}];
                            }
                            else {
                                $scope.modalOptions.bodyList.splice(0, 0, {value1: date, value2: newNote.value});
                                $scope.modalOptions.currentEvent.notes.splice(0,0,{storedDate: date,displayDate: today, value: newNote.value});
                            }
                                $scope.note = $scope.textAreaValues["note"] = "";
                            });

                    };                    
                }            
        };
        
        DialogService.showDialog(dialogDefaults, dialogOptions).then(function(e){

            $scope.currentEvent.notes = e.notes;
        });
        
    };

    $scope.clearNote = function () {
        $scope.note = {};
    };

    $scope.getInputDueDateClass = function (event) {
        if (event.event === $scope.eventDateSaved) {
            return 'input-success';
        }
        else {
            return '';
        }

    };
    
    $scope.getInputNotifcationClass = function(id, custom, event, value, isRadio){
        if(!event) {
            event = $scope.currentEvent;
        }
        
        var classNames = "";
        
        if($scope.errorMessages[event.event] && $scope.errorMessages[event.event][id] && $scope.printMode !== true && !isRadio){
            classNames = "form-element-error-message ";

        }
        else if($scope.errorMessages[event.event] && $scope.warningMessages[event.event][id] && $scope.printMode !== true && !isRadio){
            classNames = "form-element-warning-message ";
        }
        
        if($scope.currentElement.id && $scope.currentElement.id === id && $scope.currentElement.event && $scope.currentElement.event === event.event){
            
            if(angular.isUndefined(value) || value === $scope.currentElement.value){
                
                if($scope.currentElement.pending){
                    if(custom){
                        classNames += 'input-pending';
                    }
                    else if(isRadio){
                        classNames += 'input-pending-foreground';
                    }
                    else {
                        classNames += 'form-control input-pending';
                    }
                }
                else if($scope.currentElement.saved){
                    if(custom){
                        classNames += 'input-success';
                    }
                    else if(isRadio){
                        classNames += 'input-success-foreground';
                    }
                    else {
                        classNames += 'form-control input-success';
                    }
                }            
                else{
                    if(custom){
                        classNames += 'input-error';
                    }
                    else if(isRadio){
                        classNames += 'input-error-foreground';
                    }
                    else {
                        classNames += 'form-control input-error';
                    }
                }    
            }
            
            return classNames;
            
        }  
        
        if(custom || isRadio){
            return classNames;
        }        
        return classNames + 'form-control';
    };

    //Infinite Scroll
    $scope.infiniteScroll = {};
    $scope.infiniteScroll.optionsToAdd = 20;
    $scope.infiniteScroll.currentOptions = 20;

    $scope.resetInfScroll = function () {
        $scope.infiniteScroll.currentOptions = $scope.infiniteScroll.optionsToAdd;
    };

    $scope.addMoreOptions = function () {
        $scope.infiniteScroll.currentOptions += $scope.infiniteScroll.optionsToAdd;
    };



    var completeEnrollmentAllowed = function(ignoreEventId){
        for(var i = 0; i < $scope.programStages.length; i++ ) {
            for(var e = 0; e < $scope.eventsByStage[$scope.programStages[i].id].length; e++) {
                if($scope.eventsByStage[$scope.programStages[i].id][e].status ==='ACTIVE' && $scope.eventsByStage[$scope.programStages[i].id][e].event !== ignoreEventId){
                    //custom code folkehelsa
                    if($scope.programStages[i].id !== 'iXDSolqmauJ'
                            && $scope.programStages[i].id !== 'tlzRiafqzgd'
                            && $scope.programStages[i].id !== 'w9cPvMH5LaN'
                            && $scope.programStages[i].id !== 'WPgz41MctSW'
                            && $scope.programStages[i].id !== 'PUZaKR0Jh2k'
                            && $scope.programStages[i].id !== 'uD4lKVSbeyB'
                            && $scope.programStages[i].id !== 'E8Jetf3Q90U'
                            && $scope.programStages[i].id !== 'MO39jKgz2VA')
                    return false;
                }
            }
        }
        return true;
    };
    
    
    var completeEnrollment = function () {
        $scope.deleteScheduleAndOverdueEvents().then(function(result){
            EnrollmentService.completeIncomplete($scope.selectedEnrollment, 'completed').then(function (data) {
                $scope.selectedEnrollment.status = 'COMPLETED';
                selection.load();
                $location.path('/').search({program: $scope.selectedProgramId});
            });
        });


    };
    
    $scope.makeDhis2EventToUpdate = function(){
        var dhis2Event = EventUtils.reconstruct($scope.currentEvent, $scope.currentStage, $scope.optionSets);
        var dhis2EventToUpdate = angular.copy(dhis2Event);
        dhis2EventToUpdate.dataValues = [];
        
        if(dhis2Event.dataValues){
            angular.forEach(dhis2Event.dataValues, function(dataValue){
                if(dataValue.value && dataValue.value.selections){
                    angular.forEach(dataValue.value.selections, function(selection){
                        var dv = {
                            dataElement: selection.id,
                            value: true,
                            providedElsewhere: false
                        };
                        dhis2EventToUpdate.dataValues.push(dv);
                    });
                }else{
                    dhis2EventToUpdate.dataValues.push(dataValue);
                }
            });
        };
        return dhis2EventToUpdate;
    };
    
    $scope.completeIncompleteEvent = function (inTableView, outerForm) {
          
        var modalOptions;
        
        var modalDefaults = {};
        var dhis2Event = $scope.makeDhis2EventToUpdate();        
        
        if ($scope.currentEvent.status === 'COMPLETED') {//activiate event
            modalOptions = {
                closeButtonText: 'cancel',
                headerText: 'edit',
                bodyText: 'are_you_sure_to_incomplete_event'
            };
            modalOptions.actionButtons = [{ text: 'edit', action: modalCompleteIncompleteActions.edit, class: 'btn btn-primary'}];
            dhis2Event.status = 'ACTIVE';
        }
        else {//complete event            
            if(angular.isUndefined(inTableView) || inTableView === false || inTableView === null){
                
                $scope.setSubmitted($scope.currentEvent);
                
                if(!outerForm){
                    outerForm = $scope.outerForm;
                }
                
                if(outerForm.$invalid){
                    var dialogOptions = {
                        headerText: 'errors',
                        bodyText: 'please_fix_errors_before_completing_unspecified'
                    };                

                    DialogService.showDialog({}, dialogOptions);
                    return;
                }
            }
            
            if(angular.isDefined($scope.errorMessages[$scope.currentEvent.event]) && $scope.errorMessages[$scope.currentEvent.event].length > 0) {
                //There is unresolved program rule errors - show error message.
                var dialogOptions = {
                    headerText: 'errors',
                    bodyText: 'please_fix_errors_before_completing',
                    bodyList: $scope.errorMessages[$scope.currentEvent.event]
                };                
                
                DialogService.showDialog({}, dialogOptions);
                
                return;
            }
            else
            {
                modalOptions = {
                    closeButtonText: 'cancel',
                    headerText: 'complete',
                    bodyText: 'are_you_sure_to_complete_event'
                };
                modalOptions.actionButtons =[{ text: 'complete', action: modalCompleteIncompleteActions.complete, class: 'btn btn-primary'}];
                
                //Hardcode special case palestine. do not show complete and exit when stage is lab or ultrasound
                if($scope.currentStage.id!== 'uUHQw5KrZAL' && $scope.currentStage.id!== 'BjNpOxjvEj5'){
                    modalOptions.actionButtons.push({text: 'complete_and_exit', action: modalCompleteIncompleteActions.completeAndExit, class: 'btn btn-primary'});
                }
                
                
                if($scope.currentStage.remindCompleted){
                    modalOptions.bodyText = 'are_you_sure_to_complete_event_and_enrollment';
                    modalOptions.actionButtons = []; //In palestine, remove all other actions
                    
                    modalOptions.actionButtons.push({text: 'complete_event_and_enrollment', action: modalCompleteIncompleteActions.completeEnrollment, class: 'btn btn-primary'});
                }
                
                modalDefaults.templateUrl = 'components/dataentry/modal-complete-event.html';
                
                dhis2Event.status = 'COMPLETED';
            }
        }
        ModalService.showModal(modalDefaults, modalOptions).then(function (modalResult) {
            if(modalResult===modalCompleteIncompleteActions.completeEnrollment){
                if(!completeEnrollmentAllowed(dhis2Event.event)){
                    modalOptions = {
                        actionButtonText: 'OK',
                        headerText: 'complete_enrollment_failed',
                        bodyText: 'complete_active_events_before_completing_enrollment'
                    };
                    ModalService.showModal({},modalOptions);
                }else{
                    modalOptions = {
                        closeButtonText: 'cancel',
                        actionButtonText: 'complete',
                        headerText: 'complete_enrollment',
                        bodyText: 'are_you_sure_to_complete_enrollment_delete_schedule'
                    };
                    ModalService.showModal({},modalOptions).then(function(){
                        $scope.executeCompleteIncompleteEvent(dhis2Event,modalResult);
                    });
                }
            }else{
                $scope.executeCompleteIncompleteEvent(dhis2Event,modalResult).then(function(){
                    if(modalResult===modalCompleteIncompleteActions.complete){
                        if(angular.isUndefined(inTableView) || inTableView === false || inTableView === null){
                            $scope.setUnSubmitted($scope.currentEvent);
                        }                        
                    }
                });          
            }
        });           
    };
    
    $scope.executeCompleteIncompleteEvent = function(dhis2Event, modalResult){
        var modalOptions = {};
        if(eventIsLocked(dhis2Event)){
            modalOptions = {
                actionButtonText: 'OK',
                headerText: 'Event locked',
                bodyText: 'Event is locked. Contact system administrator to reopen'
            };
            return ModalService.showModal({},modalOptions);
        }
        
        return DHIS2EventFactory.update(dhis2Event).then(function (data) {
            
            if(modalResult === modalCompleteIncompleteActions.completeAndExit){
                selection.load();
                $location.path('/').search({program: $scope.selectedProgramId}); 
            }else{
                if ($scope.currentEvent.status === 'COMPLETED') {//activiate event                    
                    $scope.currentEvent.status = 'ACTIVE';
                }
                else {//complete event                    
                    $scope.currentEvent.status = 'COMPLETED';
                    //wipe currentElement if connected to this event
                    if($scope.currentElement.event === $scope.currentEvent.event){
                        $scope.currentElement = {};
                    }

                }
                
                //for folkehelsa
                $scope.resetStageErrorInEventLayout();                
                
                setStatusColor();

                setEventEditing($scope.currentEvent, $scope.currentStage);
                
                for(var i=0;i<$scope.allEventsSorted.length;i++){
                    if($scope.allEventsSorted[i].event === $scope.currentEvent.event){
                        $scope.allEventsSorted[i] = $scope.currentEvent;
                        i=$scope.allEventsSorted.length;
                    }
                }
                
                if ($scope.currentEvent.status === 'COMPLETED') {
                    
                    persistEvents().then(function(){
                        if (modalResult === modalCompleteIncompleteActions.completeEnrollment) {
                            completeEnrollment();
                        }
                        else {
                            if ($scope.currentStage.allowGenerateNextVisit) {
                                if($scope.currentStage.repeatable){
                                    $scope.showCreateEvent($scope.currentStage, $scope.eventCreationActions.schedule);
                                }
                                else{
                                    var index = -1, stage = null;
                                    for(var i=0; i<$scope.programStages.length && index===-1; i++){
                                        if($scope.currentStage.id === $scope.programStages[i].id){
                                            index = i;
                                            stage = $scope.programStages[i+1];
                                        }
                                    }
                                    if(stage ){
                                        if(!$scope.eventsByStage[stage.id] || $scope.eventsByStage[stage.id] && $scope.eventsByStage[stage.id].length === 0){
                                            $scope.showCreateEvent(stage, $scope.eventCreationActions.schedule);
                                        }
                                    }                                
                                }
                            }
                        }

                        if($scope.displayCustomForm !== "TABLE" && $scope.displayCustomForm !== "COMPARE") {
                            //Close the event when the event is completed, to make it 
                            //more clear that the completion went through.
                            $scope.showDataEntry($scope.currentEvent, false);
                        }

                        //for folkehelsa
                        if($scope.displayCustomForm === "COMPARE" && $scope.currentStage.id === 'uUHQw5KrZAL'){
                            $scope.buildFetusMenu();
                        }
                        
                         //for folkehelsa
                        if($scope.displayCustomForm === "COMPARE" && $scope.currentStage.id === 'FRSZV43y35y'){
                            $scope.buildChildMenu();
                        }
                        
                        
                        broadcastDataEntryControllerData();

                        //Hardcode palestine
                        if(dhis2Event.programStage === 'HaOwL7bIdrs'){
                            $rootScope.$broadcast('closingStageEvent', {event:dhis2Event}); 
                        }

                    });      
                    //------------
                }else{
                    broadcastDataEntryControllerData();

                    //Hardcode palestine
                    if(dhis2Event.programStage === 'HaOwL7bIdrs'){
                        $rootScope.$broadcast('closingStageEvent', {event:dhis2Event}); 
                    }
                }
            }
        });
    };

    function persistEvents(){
        var promises = [];
        for(var s = 0; s<$scope.programStages.length; s++){
            if($rootScope.eventsInProgramStageById[$scope.programStages[s].id]){
                for(var e=0; e<$rootScope.eventsInProgramStageById[$scope.programStages[s].id].length; e++){
                    if($rootScope.eventsInProgramStageById[$scope.programStages[s].id][e].notPersisted && $rootScope.eventsInProgramStageById[$scope.programStages[s].id][e].executingEvent===$scope.currentEvent.event){
                        promises.push($scope.persistEvent($rootScope.eventsInProgramStageById[$scope.programStages[s].id][e], $scope.programStages[s], $scope.optionSets));
                    }
                }              
            }

            
        }

            return $q.all(promises);

        
    }
    
    var eventIsLocked = function(){
        
        /* hardcode palestine */
        if($scope.currentEvent.programStage === 'PUZaKR0Jh2k' || $scope.currentEvent.programStage === 'uD4lKVSbeyB'){
            return false;
        }
        
        if(userRoles.some(function(role){return role.authorities ? 
            role.authorities.some( function(authority){return authority === 'ALL';}) :
            false;})) {
            return false;
        }
        
        if($scope.currentEvent.status === 'COMPLETED'){
            var now = moment();
            var completedDate = moment($scope.currentEvent.completedDate);
            var diff= now.diff(completedDate, 'hours');
            if(now.diff(completedDate, 'hours') > eventLockHours){
                return true;
            }
        }
        return false;
    };
    
    $scope.skipUnskipEvent = function () {
        var modalOptions;
        var dhis2Event = $scope.makeDhis2EventToUpdate();

        if ($scope.currentEvent.status === 'SKIPPED') {//unskip event
            modalOptions = {
                closeButtonText: 'cancel',
                actionButtonText: 'unskip',
                headerText: 'unskip',
                bodyText: 'are_you_sure_to_unskip_event'
            };
            dhis2Event.status = 'ACTIVE';
        }
        else {//skip event
            modalOptions = {
                closeButtonText: 'cancel',
                actionButtonText: 'skip',
                headerText: 'skip',
                bodyText: 'are_you_sure_to_skip_event'
            };
            dhis2Event.status = 'SKIPPED';
        }

        ModalService.showModal({}, modalOptions).then(function (result) {
            
            $scope.executeSkipUnskipEvent(dhis2Event);
            
        });
    };
    
    $scope.executeSkipUnskipEvent = function(dhis2Event){
        
        return DHIS2EventFactory.update(dhis2Event).then(function (data) {

                if ($scope.currentEvent.status === 'SKIPPED') {//activiate event                    
                    $scope.currentEvent.status = 'SCHEDULE';
                }
                else {//complete event                    
                    $scope.currentEvent.status = 'SKIPPED';
                }
                
                //for folkehelsa
                $scope.resetStageErrorInEventLayout();
                if(angular.isDefined($scope.bottomLineItems) && angular.isDefined($scope.bottomLineItems[$scope.currentEvent.programStage]) 
                        && $scope.currentEvent.programStage !== "PUZaKR0Jh2k"
                        && $scope.currentEvent.programStage !== "uD4lKVSbeyB" 
                        && $scope.currentEvent.programStage !== "bO5aSsPeB4A"
                        && $scope.currentEvent.programStage !== "uOGkguF3MCs"){
                    $scope.deSelectCurrentEvent();
                }
                //---

                setStatusColor();
                setEventEditing($scope.currentEvent, $scope.currentStage);
            });
        
    };
    

    var setStatusColor = function () {
        var statusColor = EventUtils.getEventStatusColor($scope.currentEvent);
        var continueLoop = true;
        for (var i = 0; i < $scope.eventsByStage[$scope.currentEvent.programStage].length && continueLoop; i++) {
            if ($scope.eventsByStage[$scope.currentEvent.programStage][i].event === $scope.currentEvent.event) {
                $scope.eventsByStage[$scope.currentEvent.programStage][i].statusColor = statusColor;
                $scope.currentEvent.statusColor = statusColor;
                continueLoop = false;
            }
        }
    };

    $scope.deleteEvent = function () {
        
        var modalOptions = {
            closeButtonText: 'cancel',
            actionButtonText: 'delete',
            headerText: 'delete',
            bodyText: 'are_you_sure_to_delete_event'
        };

        ModalService.showModal({}, modalOptions).then(function (result) {
            return $scope.executeDeleteEvent();
        })
        .then(function(){
            $scope.executeRules();
        });
        ;
    };
        
    $scope.executeDeleteEvent = function(){
        
        return DHIS2EventFactory.delete($scope.currentEvent).then(function (data) {

                var continueLoop = true, index = -1;
                for (var i = 0; i < $scope.eventsByStage[$scope.currentEvent.programStage].length && continueLoop; i++) {
                    if ($scope.eventsByStage[$scope.currentEvent.programStage][i].event === $scope.currentEvent.event) {
                        $scope.eventsByStage[$scope.currentEvent.programStage][i] = $scope.currentEvent;
                        continueLoop = false;
                        index = i;
                    }
                }
                               
                var programStageID = $scope.currentEvent.programStage;

                $scope.eventsByStage[programStageID].splice(index, 1);
                $scope.currentStageEvents = $scope.eventsByStage[programStageID];
                
                //if event is last event in allEventsSorted and only element on page, show previous page
                var GetPreviousEventPage = false;
                if($scope.allEventsSorted[$scope.allEventsSorted.length-1].event === $scope.currentEvent.event){
                    var index = $scope.allEventsSorted.length - 1;
                    if(index !== 0){
                        if(index % $scope.eventPageSize === 0){                            
                            GetPreviousEventPage = true;
                        }
                    }
                }                
                sortEventsByStage('REMOVE');                                          
                if(GetPreviousEventPage){
                    $scope.getEventPage("BACKWARD");
                }                
                
                //for folkehelsa
                $scope.resetStageErrorInEventLayout();
                
                if($scope.displayCustomForm === "TABLE"){
                    $scope.currentEvent = {};                
                }
                else if($scope.displayCustomForm === "COMPARE"){
                    $scope.openStagesEvent([$scope.currentStage.id], function(){
                        $scope.openEmptyStage($scope.currentStage.id);
                        }); 
                }
                else {
                    $scope.deSelectCurrentEvent();                    
                }
                
                broadcastDataEntryControllerData();
                
            }, function(error){   
                
                //temporarily error message because of new audit functionality
                var dialogOptions = {
                    headerText: 'error',
                    bodyText: 'delete_error_audit'                    
                };
                DialogService.showDialog({}, dialogOptions);
                
                return $q.reject(error);
            });        
    };

    $scope.toggleLegend = function () {
        $scope.showLegend = !$scope.showLegend;
    };

    $scope.getEventStyle = function (ev, skipCurrentEventStyle) {

        var style = EventUtils.getEventStatusColor(ev);
        $scope.eventStyleLabels[ev.event] = $scope.getDescriptionTextForEventStyle(style, $scope.descriptionTypes.label, false);
        
        if ($scope.currentEvent && $scope.currentEvent.event === ev.event && (angular.isUndefined(skipCurrentEventStyle) || skipCurrentEventStyle === false)) {
            style = style + ' ' + ' current-event';
        }
        return style;
    };

    $scope.getColumnWidth = function (weight) {
        var width = weight <= 1 ? 1 : weight;
        width = (width / $scope.totalEvents) * 100;
        return "width: " + width + '%';
    };

    $scope.sortEventsByDate = function (dhis2Event) {
        var d = dhis2Event.sortingDate;
        return DateUtils.getDate(d);
    };
    
    var sortStageEvents = function(stage){        
        var key = stage.id;
        if ($scope.eventsByStage.hasOwnProperty(key)){
            var sortedEvents = $filter('orderBy')($scope.eventsByStage[key], [function (event) {
                    if(angular.isDefined(stage.displayEventsInTable) && stage.displayEventsInTable === true){
                        return DateUtils.getDate(event.eventDate);
                    }
                    else{
                        return DateUtils.getDate(event.sortingDate);
                    }                    
                },function(event){
                    return event.created;
                }], false);
            $scope.eventsByStage[key] = sortedEvents;
            $scope.eventsByStageDesc[key] = [];
            
            //Reverse the order of events, but keep the objects within the array.
            //angular.copy and reverse did not work - this messed up databinding.
            angular.forEach(sortedEvents, function(sortedEvent) {
                $scope.eventsByStageDesc[key].splice(0,0,sortedEvent);
            });          
            
            if(angular.isDefined($scope.currentStage) && $scope.currentStage !== null && $scope.currentStage.id === stage.id){
                $scope.currentStageEvents = sortedEvents;
            }
            return sortedEvents;
        }        
    };

    var sortEventsByStage = function (operation, newEvent) {

        $scope.eventFilteringRequired = false;

        for (var key in $scope.eventsByStage) {

            var stage = $scope.stagesById[key];            
            var sortedEvents = sortStageEvents(stage);           
            if ($scope.eventsByStage.hasOwnProperty(key) && stage) {
           
                var periods = PeriodService.getPeriods(sortedEvents, stage, $scope.selectedEnrollment).occupiedPeriods;

                $scope.eventPeriods[key] = periods;
                $scope.currentPeriod[key] = periods.length > 0 ? periods[0] : null;
                $scope.eventFilteringRequired = $scope.eventFilteringRequired ? $scope.eventFilteringRequired : periods.length > 1;
            }
        }
        
        if (operation) {
            if (operation === 'ADD') {
                var ev = EventUtils.reconstruct(newEvent, $scope.currentStage, $scope.optionSets);                
                ev.enrollment = newEvent.enrollment;
                ev.visited = newEvent.visited;
                ev.orgUnitName = newEvent.orgUnitName;
                ev.displayName = newEvent.displayName;
                ev.sortingDate =newEvent.sortingDate;
                
                $scope.allEventsSorted.push(ev);
            }
            if (operation === 'UPDATE') {
                var ev = EventUtils.reconstruct($scope.currentEvent, $scope.currentStage, $scope.optionSets);
                ev.enrollment = $scope.currentEvent.enrollment;
                ev.visited = $scope.currentEvent.visited;
                ev.orgUnitName = $scope.currentEvent.orgUnitName;
                ev.displayName = $scope.currentEvent.displayName;
                ev.sortingDate = $scope.currentEvent.sortingDate;
                var index = -1;
                for (var i = 0; i < $scope.allEventsSorted.length && index === -1; i++) {
                    if ($scope.allEventsSorted[i].event === $scope.currentEvent.event) {
                        index = i;
                    }
                }
                if (index !== -1) {
                    $scope.allEventsSorted[index] = ev;
                }
            }
            if (operation === 'REMOVE') {
                var index = -1;
                for (var i = 0; i < $scope.allEventsSorted.length && index === -1; i++) {
                    if ($scope.allEventsSorted[i].event === $scope.currentEvent.event) {
                        index = i;
                    }
                }
                if (index !== -1) {
                    $scope.allEventsSorted.splice(index, 1);
                }
            }

            $timeout(function () {
                $rootScope.$broadcast('tei-report-widget', {});
            }, 200);
        }        
        $scope.allEventsSorted = orderByFilter($scope.allEventsSorted, ['-sortingDate','-created']).reverse();         
    };

    $scope.showLastEventInStage = function (stageId) {
        var ev = $scope.eventsByStage[stageId][$scope.eventsByStage[stageId].length - 1];
        $scope.showDataEntryForEvent(ev);
    };

    $scope.showDataEntryForEvent = function (event) {

        var period = {event: event.event, stage: event.programStage, displayName: event.sortingDate};
        $scope.currentPeriod[event.programStage] = period;

        var event = null;
        for (var i = 0; i < $scope.eventsByStage[period.stage].length; i++) {
            if ($scope.eventsByStage[period.stage][i].event === period.event) {
                event = $scope.eventsByStage[period.stage][i];
                break;
            }
        }

        if (event) {
            $scope.showDataEntry(event, false);
        }
        
    };

    $scope.showMap = function (event) {
        var modalInstance = $modal.open({
            templateUrl: DHIS2BASEURL+'/dhis-web-commons/angular-forms/map.html',
            controller: 'MapController',
            windowClass: 'modal-full-window',
            resolve: {
                location: function () {
                    return {lat: event.coordinate.latitude, lng: event.coordinate.longitude};
                }
            }
        });

        modalInstance.result.then(function (location) {
            if (angular.isObject(location)) {
                event.coordinate.latitude = location.lat;
                event.coordinate.longitude = location.lng;
                $scope.saveCoordinate('LATLNG');
            }
        }, function () {
        });
    };
    
    $scope.interacted = function (field, event) {        
        
        var fieldIsDirty = false;
        if (angular.isDefined(field) && angular.isDefined(field.isDirty)) {
            fieldIsDirty = field.isDirty;
        }
        return (fieldIsDirty || $scope.isSubmitted(event));
    };
    
    $scope.setSubmitted = function(event){
        $scope.setSubmittedStatusInternal(event, true);
    }
    
    $scope.setUnSubmitted = function(event){        
        $scope.setSubmittedStatusInternal(event, false);
    }
    
    $scope.setSubmittedStatusInternal = function(event, status){
        
        $scope.eventFormSubmitted[$scope.getEventKey(event)] = status;
        
    }
    
    $scope.getEventKey = function(event){        
        var eventKey;
        
        if(angular.isObject(event)){
            eventKey = event.event;
        }
        else{
            eventKey = event;
        }        
        return eventKey;
    }
    
    $scope.isSubmitted = function(event){   
        var eventKey = $scope.getEventKey(event);
        return (angular.isDefined($scope.eventFormSubmitted[eventKey]) && $scope.eventFormSubmitted[eventKey] === true);
    }

    $scope.getEventPage = function(direction){
        if(direction === 'FORWARD'){
            $scope.eventPagingStart += $scope.eventPageSize;
            $scope.eventPagingEnd += $scope.eventPageSize;            
        }
        
        if(direction === 'BACKWARD'){
            $scope.eventPagingStart -= $scope.eventPageSize;
            $scope.eventPagingEnd -= $scope.eventPageSize;
        }
        
        $scope.showDataEntry($scope.topLineEvents[$scope.eventPagingStart], false);
    };   
    
    $scope.getEventPageForEvent = function(event){
        if(angular.isDefined(event) && angular.isObject(event) && angular.isDefined($scope.topLineEvents)){
            
            var index = -1;
            for(var i = 0; i < $scope.topLineEvents.length; i++){
                if(event.event === $scope.topLineEvents[i].event){
                    index = i;
                    break;
                }
            }

            if(index !== -1){
                var page = Math.floor(index / $scope.eventPageSize);
                $scope.eventPagingStart = page * $scope.eventPageSize;
                $scope.eventPagingEnd = $scope.eventPagingStart + $scope.eventPageSize;
            }
        }        
    };

    $scope.deselectCurrent = function(id){        
        
        if($scope.currentEvent && $scope.currentEvent.event === id){
            $scope.currentEvent = {};            
            sortStageEvents($scope.currentStage);
            $scope.currentStageEvents = $scope.eventsByStage[$scope.currentStage.id];
        }        
    };
    
    $scope.showCompleteErrorMessageInModal = function(message, fieldName, isWarning){
        var messages = [message];
        var headerPrefix = angular.isDefined(isWarning) && isWarning === true ? "Warning in " : "Error in ";
        
        var dialogOptions = {
                    headerText: headerPrefix + fieldName,
                    bodyText: '',
                    bodyList: messages
                };                
                
                DialogService.showDialog({}, dialogOptions);        
    };
    
    //for compare-mode
    $scope.compareModeColDefs = {header: 1, otherEvent: 2, currentEvent: 3, otherEvents: 4, providedElsewhere: 5};
    $scope.getCompareModeColSize = function(colId){                
        
        var otherEventsCnt = $scope.otherStageEvents.length;                
        
        switch(colId){
            case $scope.compareModeColDefs.header:
                if(otherEventsCnt > 4){
                    if($scope.allowProvidedElsewhereExists[$scope.currentStage.id]){
                        return 'col-xs-1';
                    }
                    return 'col-xs-2';
                }
                else if(otherEventsCnt === 4){
                    if($scope.allowProvidedElsewhereExists[$scope.currentStage.id]){
                        return 'col-xs-1';
                    }
                    return 'col-xs-2';
                }
                else if(otherEventsCnt >= 2){
                    return 'col-xs-3';
                }
                else if(otherEventsCnt === 1) {
                    return 'col-xs-4';
                }
                else {
                    return 'col-xs-5';
                }
                break;
            case $scope.compareModeColDefs.otherEvent: 
                if(otherEventsCnt > 4){
                    return '';
                }
                else if(otherEventsCnt === 4){
                    return 'col-xs-3';
                }
                else if(otherEventsCnt === 3){
                    return 'col-xs-4';
                }
                else if(otherEventsCnt === 2){
                    return 'col-xs-6';
                }
                else if(otherEventsCnt === 1){
                    return 'col-xs-12';
                }
                else{
                    return '';
                }                
                break;
            case $scope.compareModeColDefs.currentEvent:
                if(otherEventsCnt > 4){
                    return 'col-xs-2';
                }
                else if(otherEventsCnt === 4){
                    return 'col-xs-2';
                }
                else if(otherEventsCnt >= 2){
                    if($scope.allowProvidedElsewhereExists[$scope.currentStage.id]){
                        return 'col-xs-2';
                    }
                    return 'col-xs-3';
                }
                else if(otherEventsCnt === 1){
                    if($scope.allowProvidedElsewhereExists[$scope.currentStage.id]){
                        return 'col-xs-3';
                    }
                    return 'col-xs-4';
                }
                else{
                    if($scope.allowProvidedElsewhereExists[$scope.currentStage.id]){
                        return 'col-xs-6';
                    }
                    return 'col-xs-7';
                }
                break;
            case $scope.compareModeColDefs.otherEvents:
                if(otherEventsCnt > 4){
                    return 'col-xs-8';
                }
                else if(otherEventsCnt === 4){
                    return 'col-xs-8';
                }
                else if(otherEventsCnt >= 2){
                    return 'col-xs-6';
                }
                else if(otherEventsCnt === 1){
                    return 'col-xs-4';
                }
                else {
                    return '';
                }
                break;
            case $scope.compareModeColDefs.providedElsewhere:
                return 'col-xs-1';
                break;
        }
    };
    
    $scope.maxCompareItemsInCompareView = 4;
    $scope.setOtherStageEvents = function(){
        
        $scope.otherStageEventIndexes = [];
        $scope.otherStageEvents = [];
        $scope.stageEventsExcludedSkipped = [];
        
        if(angular.isUndefined($scope.currentStageEvents) || $scope.currentStageEvents.length <= 1){
            return;
        }        
        else {            
            
            angular.forEach($scope.currentStageEvents, function(event){
                if(event.status !== $scope.EVENTSTATUSSKIPPEDLABEL || event.event === $scope.currentEvent.event){
                    //for folkehelsa                    
                    if($scope.currentStage.id === 'uUHQw5KrZAL'){
                        var currentEventFetus = angular.isUndefined($scope.currentEvent['gpKuJcONaoW']) ? "" : $scope.currentEvent['gpKuJcONaoW'];
                        var iteratedEventFetus = angular.isUndefined(event['gpKuJcONaoW']) ? "" : event['gpKuJcONaoW'];
                        if(currentEventFetus === iteratedEventFetus){
                            $scope.stageEventsExcludedSkipped.push(event);
                        }
                    }
                    else if($scope.currentStage.id === 'FRSZV43y35y'){
                        var currentEventFetus = angular.isUndefined($scope.currentEvent['yakmemTH1Vz']) ? "" : $scope.currentEvent['yakmemTH1Vz'];
                        var iteratedEventFetus = angular.isUndefined(event['yakmemTH1Vz']) ? "" : event['yakmemTH1Vz'];
                        if(currentEventFetus === iteratedEventFetus){
                            $scope.stageEventsExcludedSkipped.push(event);
                        }
                    }
                    else{
                        //---
                        $scope.stageEventsExcludedSkipped.push(event);
                    }
                }
            });
            
            
            var indexOfCurrent = -1;
            for(var i = 0; i < $scope.stageEventsExcludedSkipped.length; i++){
                var stageEvent = $scope.stageEventsExcludedSkipped[i];
                if(stageEvent.event === $scope.currentEvent.event){
                    indexOfCurrent = i;
                    break;
                }                    
            }            

            for(var j = 0; j < $scope.maxCompareItemsInCompareView; j++){
                var position = indexOfCurrent - 1 - j;
                if(position < 0){
                    break;
                }
                
                var relative = - j - 1;
                $scope.otherStageEventIndexes.unshift({relative: relative, position: position});
            }

            angular.forEach($scope.otherStageEventIndexes, function(indexContainer){
                $scope.otherStageEvents.push($scope.stageEventsExcludedSkipped[indexContainer.position]);
            });                        
        }
    };
    
    $scope.navigateOtherStageEvents = function(direction){
        
        angular.forEach($scope.otherStageEventIndexes, function(indexContainer){
            var change;
            if(direction < 0){
                change = -1;
                if(indexContainer.relative - 1 === 0){
                    change = -2;
                }                
            }
            else{
                change = 1;
                if(indexContainer.relative + 1 === 0){
                    change = 2;
                }                
            }
            
            indexContainer.relative += change;
            indexContainer.position += change;
        });
        
        $scope.otherStageEvents = [];
        angular.forEach($scope.otherStageEventIndexes, function(indexContainer){
            $scope.otherStageEvents.push($scope.stageEventsExcludedSkipped[indexContainer.position]);
        });
    };
    
    $scope.readyCompareDisplayForm = function(){    
        
        $scope.setOtherStageEvents();
        
        //for folkehelsa
        if($scope.currentStage.id === 'uUHQw5KrZAL'){
            $scope.buildFetusMenu();
        }    
        if($scope.currentStage.id === 'FRSZV43y35y'){
            $scope.buildChildMenu();
        } 
        //------------
        if($scope.displayCustomForm !== "COMPARE"){
            $scope.displayCustomForm = "COMPARE";
        }                 
    };
    
    $scope.$watch("displayCustomForm", function(newValue, oldValue){        
        if(newValue === "COMPARE"){
            $scope.readyCompareDisplayForm();
        }
    });
    
    $scope.buttonType = {back: 1, forward: 2};
    $scope.showOtherEventsNavigationButtonInCompareForm = function(type){        
        if(type === $scope.buttonType.back){
            if($scope.otherStageEventIndexes.length > 0){
                var firstEventPosition = $scope.otherStageEventIndexes[0].position;
                if(firstEventPosition > 0){
                    return true;
                }
            }
            return false;
        }
        else{
            if($scope.otherStageEventIndexes.length > 0){
                var lastEventRelativePosition = $scope.otherStageEventIndexes[$scope.otherStageEventIndexes.length - 1].relative;
                if(lastEventRelativePosition < -1){
                    return true;
                }
            }
            return false;
        }
    };
    
    $scope.currentStageEventNumber = function(){
        for(var i = 0; i < $scope.stageEventsExcludedSkipped.length; i++){
            if($scope.currentEvent.event === $scope.stageEventsExcludedSkipped[i].event){
                return i+1;
            }
        }
        return;
    };
    
    //for folkehelsa
    $scope.getStageStyle = function(stage){
        
       var eventToFetch = $scope.getEventForStage(stage);
        
        if(eventToFetch >= 0){
            var stageStyle = $scope.getEventStyle($scope.eventsByStage[stage.id][eventToFetch]);
            if($scope.currentStage && $scope.currentStage.id === stage.id){
                stageStyle += " current-stage";
            }
            return stageStyle;
        }
        else {
            return '';
        }
    };
    
    $scope.getMainMenuItemStyle = function(stage){
        
        if($scope.eventsLoaded){                
            $scope.stageStyleLabels[stage.id] = "";
            var stages = [stage.id];
        
            if(angular.isDefined($scope.headerCombineStages)){
                for(var key in $scope.headerCombineStages){
                    if(key === stage.id){
                        stages.push($scope.headerCombineStages[key]);
                    }
                    else if($scope.headerCombineStages[key] === stage.id){
                        stages.push(key);
                    }
                }
            }

            var event = $scope.getEventForStages(stages);

            if(angular.isDefined(event)){
                var style = $scope.getEventStyle(event, true);
                $scope.stageStyleLabels[stage.id] = $scope.getDescriptionTextForEventStyle(style, $scope.descriptionTypes.label, true);
                return style;
            }
        }
        
        return '';                      
    };
    
    $scope.descriptionTypes = {full: 1, label: 2};
    $scope.getDescriptionTextForEventStyle = function(style, descriptionType, useInStage){
        
        if(angular.isDefined(style) && style !== ""){
            var eventStyles = $filter('filter')($scope.eventStyles, {color: style},true);
            if(angular.isDefined(eventStyles) && eventStyles.length === 1){            
                 return $scope.getDescriptionTextForDescription(eventStyles[0].description, descriptionType, useInStage);
            }
        }        
        return "";
    };
    
    $scope.getDescriptionTextForDescription = function(description, descriptionType, useInStage){
        
        var translateText = "";
            
        if(useInStage){
            translateText = "stage_";
        }
        translateText += description;

        if(descriptionType === $scope.descriptionTypes.label){
            translateText += "_label";                
        }            
        return $translate.instant(translateText);        
    };
    
    $scope.getStageStyleLabel = function(stage){
        if($scope.stageStyleLabels[stage.id]){
            return "(" + $scope.stageStyleLabels[stage.id] + ")";
        }
        return "(" + $translate.instant("stage_empty_label") + ")";
    };
    
    $scope.getEventStyleLabel = function(event){
        if($scope.eventStyleLabels[event.event]){
            return "(" + $scope.eventStyleLabels[event.event] + ")";
        }
        return '';
    };
    
    $scope.getEventForStage = function(stage){
        //get first incomplete not skipped. If none, get latest nok skipped         
        var lastComplete = -1;
        var firstOpen = -1;  
        
        if(angular.isDefined($scope.eventsByStage[stage.id]) && $scope.eventsByStage[stage.id].length > 0){
            var stageEvents = $scope.eventsByStage[stage.id];
            for(var i = 0; i < stageEvents.length; i++){
                var itiratedEvent = stageEvents[i];
                if(itiratedEvent.status !== $scope.EVENTSTATUSSKIPPEDLABEL && itiratedEvent.status !== $scope.EVENTSTATUSCOMPLETELABEL){
                    firstOpen = i;
                    break;
                }
                else if(itiratedEvent.status === $scope.EVENTSTATUSCOMPLETELABEL){
                    lastComplete = i;
                }
            }
        }
        
        var eventToFetch = -1;
        if(firstOpen >= 0){
            eventToFetch = firstOpen;
        }
        else if(lastComplete >= 0){
            eventToFetch = lastComplete;
        }
        return eventToFetch;
    };
    
    $scope.getEventForStages = function(stagesInputArray){
        var stages = [];
        if(angular.isString(stagesInputArray[0])){
            //getstages
            angular.forEach(stagesInputArray, function(stageString){
                stages.push($scope.stagesById[stageString]);
            });
        }
        else{
            stages = stagesInputArray;
        }
        
        stages.sort(function(a,b){
            return a.sortOrder - b.sortOrder;
        });
        
        var eventsForStages = [];
        angular.forEach(stages, function(stage){
            eventsForStages = eventsForStages.concat($scope.eventsByStage[stage.id]);
        });
        
        return $scope.getEventFromEventCollection(eventsForStages);
    };
    
    $scope.getEventFromEventCollection = function(eventCollection){
        //get first incomplete not skipped. If none, get latest nok skipped         
        var lastComplete = -1;
        var firstOpen = -1;  
        
        var stageEvents = eventCollection;
        for(var i = 0; i < stageEvents.length; i++){
            var itiratedEvent = stageEvents[i];
            if(itiratedEvent.status !== $scope.EVENTSTATUSSKIPPEDLABEL && itiratedEvent.status !== $scope.EVENTSTATUSCOMPLETELABEL){
                firstOpen = i;
                break;
            }
            else if(itiratedEvent.status === $scope.EVENTSTATUSCOMPLETELABEL){
                lastComplete = i;
            }
        }
        
        
        var eventToFetch = -1;
        if(firstOpen >= 0){
            eventToFetch = firstOpen;
        }
        else if(lastComplete >= 0){
            eventToFetch = lastComplete;
        }
        
        if(eventToFetch !== -1){
            return stageEvents[eventToFetch];
        }
        return; 
    };
    
    $scope.openStageFormFromEventLayout = function(stage){                
        
        if($scope.currentStage && $scope.currentStage.id === stage.id){
            $scope.deSelectCurrentEvent();
        }
        else {
            $scope.openStageEvent(stage, function(){
                if($scope.stageOpenInEventLayout === stage.id){
                    $scope.stageOpenInEventLayout = "";
                }
                else {
                    $scope.stageOpenInEventLayout = stage.id;
                 }
            });
        }
    };
    
    $scope.openStageEventFromMenu = function(stage, timelineFilter){
        
        var stages = [stage.id];
        //set timeLineFilter if present
        if(angular.isDefined(timelineFilter)){
            var timelineFilterArr = timelineFilter.split(",");
            $scope.topLineStageFilter = {};
            angular.forEach(timelineFilterArr, function(filter){
                $scope.topLineStageFilter[filter] = true;
                if(stage.id !== filter){
                    stages.push(filter);
                }
            });
        }
        
        $scope.openStagesEvent(stages, function(){
            $scope.openEmptyStage(stage);
        });        
    };
    
    $scope.openStagesEvent = function(stages, noEventFoundFunc){
        var event = $scope.getEventForStages(stages);
        
        if(angular.isDefined(event)){ 
            $scope.getEventFromStageSelection(event);            
        }
        else {
            noEventFoundFunc();
        }
    };
    
    $scope.openStageEvent = function(stage, noEventFoundFunc){
        
        var latest = $scope.getEventForStage(stage);
        
        if(latest >= 0){
            $scope.getEventFromStageSelection($scope.eventsByStage[stage.id][latest]);
        }
        else {
            noEventFoundFunc();
        }
    };
    
    $scope.getEventFromStageSelection = function(event){
        
        $scope.showDataEntryForEvent(event);
        
        if(angular.isDefined($scope.currentStage) && $scope.currentStage !== null && angular.isDefined($scope.currentStage.displayEventsInTable) && $scope.currentStage.displayEventsInTable === true){
            $scope.currentEvent = {};
        }
    };
    
    $scope.openEmptyStage = function(stage){
        $scope.deSelectCurrentEvent();
        $scope.currentStage = stage;        
    };
    
    $scope.getStageEventCnt = function(stage){                
        
        var cnt = -1;
        
        if($scope.eventsLoaded){            
            cnt = 0;
            if(angular.isDefined($scope.eventsByStage[stage.id])){
                cnt = $scope.eventsByStage[stage.id].length;
            }

            if(angular.isDefined($scope.headerCombineStages)){
                for(var key in $scope.headerCombineStages){
                    if(stage.id === key){
                        if(angular.isDefined($scope.eventsByStage[$scope.headerCombineStages[key]])){
                            cnt += $scope.eventsByStage[$scope.headerCombineStages[key]].length;
                        }
                    }
                    else if(stage.id === $scope.headerCombineStages[key]){
                        if(angular.isDefined($scope.eventsByStage[key])){
                            cnt += $scope.eventsByStage[key].length;
                        }
                    }
                }
            }
        }
        
        return cnt > -1 ? cnt : "";        
    };
    
    $scope.$watch("currentEvent", function(newValue, oldValue){
        if(angular.isDefined(newValue)){
            $scope.stageOpenInEventLayout = "";            
        }
    });
    
    $scope.getValueTitleCompareForm = function(event){        
        if(angular.isDefined(event['Kb2LvjqXHfi'])){
            return "Gest.age " + event['Kb2LvjqXHfi'];
        }
    };
    
    $scope.getGestAgeForANCEventContainer = function(event){        
        if(event.programStage === 'edqlbukwRfQ' || event.programStage === 'WZbXY0S00lP'){
            if(angular.isDefined(event['Kb2LvjqXHfi'])){
                return "(GA " + event['Kb2LvjqXHfi'] + ")";
            }
        }
        return '';
    };
    
    $scope.getStageErrorMessageInEventLayout = function(stage){
        if(angular.isDefined($scope.stageErrorInEventLayout[stage.id])){
            switch($scope.stageErrorInEventLayout[stage.id]){
                case $scope.eventCreationActions.add:                    
                    return $translate.instant('please_complete_all_results_before_add');
                    break;
                case $scope.eventCreationActions.schedule:
                    return $translate.instant('please_complete_all_results_before_schedule');
                    break;
                case $scope.eventCreationActions.referral:
                    return $translate.instant('please_complete_all_results_before_referral');
                    break;                
            }
        }
    };
    
    $scope.resetStageErrorInEventLayout = function(){
        if(angular.isDefined($scope.stageErrorInEventLayout[$scope.currentEvent.programStage]) && $scope.stageErrorInEventLayout[$scope.currentEvent.programStage] !== ""){
                    $scope.stageErrorInEventLayout[$scope.currentEvent.programStage] = "";
                }
    };
    
    $scope.buildFetusMenu = function(){
        if($scope.currentStage.id === 'uUHQw5KrZAL'){            
            $scope.fetusMenu = {};
            var registeredFetuses = [];

            var currentFetus = angular.isUndefined($scope.currentEvent['gpKuJcONaoW']) ? "" : $scope.currentEvent['gpKuJcONaoW'];
            
            if(angular.isDefined($scope.currentStageEvents) && $scope.currentStageEvents.length > 0){
                angular.forEach($scope.currentStageEvents, function(event){
                var fetus = angular.isUndefined(event['gpKuJcONaoW']) ? "" : event['gpKuJcONaoW'];                
                    if(registeredFetuses.indexOf(fetus) === -1 && currentFetus !== fetus){
                        registeredFetuses.push(fetus);
                    }
                });
            }            
            
            if(registeredFetuses.length < 1){
                registeredFetuses = [];
                $scope.fetusMenu.display = false;
            }
            else {
                $scope.fetusMenu.display = true;
                var indexOfBlank = registeredFetuses.indexOf("");
                var allowClear = indexOfBlank !== -1;
                if(allowClear){
                    registeredFetuses.splice(indexOfBlank, 1);
                }
                
                $scope.fetusMenu.allowClear = allowClear;                
                registeredFetuses.sort();
                
                if(angular.isDefined($scope.currentEvent['gpKuJcONaoW'])){
                    if($scope.currentEvent['gpKuJcONaoW'] !== ""){                                            
                        $scope.fetusMenu.selected = $scope.currentEvent['gpKuJcONaoW'];
                    }
                }
            }
            
            $scope.fetusMenu.fetusOptions = registeredFetuses;
        }
    };
    
    $scope.buildChildMenu = function(){
        if($scope.currentStage.id === 'FRSZV43y35y'){            
            $scope.fetusMenu = {};
            var registeredFetuses = [];

            var currentFetus = angular.isUndefined($scope.currentEvent['yakmemTH1Vz']) ? "" : $scope.currentEvent['yakmemTH1Vz'];
            
            if(angular.isDefined($scope.currentStageEvents) && $scope.currentStageEvents.length > 0){
                angular.forEach($scope.currentStageEvents, function(event){
                var fetus = angular.isUndefined(event['yakmemTH1Vz']) ? "" : event['yakmemTH1Vz'];                
                    if(registeredFetuses.indexOf(fetus) === -1 && currentFetus !== fetus){
                        registeredFetuses.push(fetus);
                    }
                });
            }            
            
            if(registeredFetuses.length < 1){
                registeredFetuses = [];
                $scope.fetusMenu.display = false;
            }
            else {
                $scope.fetusMenu.display = true;
                var indexOfBlank = registeredFetuses.indexOf("");
                var allowClear = indexOfBlank !== -1;
                if(allowClear){
                    registeredFetuses.splice(indexOfBlank, 1);
                }
                
                $scope.fetusMenu.allowClear = allowClear;                
                registeredFetuses.sort();
                
                if(angular.isDefined($scope.currentEvent['yakmemTH1Vz'])){
                    if($scope.currentEvent['yakmemTH1Vz'] !== ""){                                            
                        $scope.fetusMenu.selected = $scope.currentEvent['yakmemTH1Vz'];
                    }
                }
            }
            
            $scope.fetusMenu.fetusOptions = registeredFetuses;
        }
    };
    
    $scope.changeEventBasedOnFetusFilter = function(){
        
        var filterValue = angular.isUndefined($scope.fetusMenu.selected) ? "" : $scope.fetusMenu.selected;
        var allEvents = $scope.eventsByStage[$scope.currentStage.id];
        var foundEvent;
        
        var dataElementId = $scope.currentStage.id === 'uUHQw5KrZAL' ? 'gpKuJcONaoW' : 'yakmemTH1Vz';
        
        for(var i = allEvents.length-1; i >= 0; i--){
            var event = allEvents[i];
            var eventFetusValue = angular.isUndefined(event[dataElementId]) ? "" : event[dataElementId];
            if(eventFetusValue === filterValue && event.status === $scope.EVENTSTATUSCOMPLETELABEL){
                foundEvent = event;
                break;
            }
        }
        
        if(angular.isDefined(foundEvent)){
            $scope.showDataEntryForEvent(foundEvent);
        }        
    };
    
    $scope.EventProperties = {executionDate: 1};
    $scope.DescriptionTextForEventProperty = function(event, eventProperty){       

        if(angular.isDefined(event)){
            if(eventProperty === $scope.EventProperties.executionDate){
                if(angular.isDefined(event.executionDateLabel) && event.executionDateLabel.toUpperCase() === "DOb/Ab".toUpperCase()){
                    event.executionDateLabelDescription = "Date of birth/Date of Abortion";
                    return event.executionDateLabelDescription;
                }
            }
        }        
        return "";
    };
    
    //hardcoded palestine
    $scope.setPreviousValuesTable = function(id){
        $scope.previousEvents = {
            first: {},
            other: []
        };
        var firstStageEvents = $scope.eventsByStage[id];
        if(firstStageEvents && firstStageEvents.length >0){
            $scope.previousEvents.first = firstStageEvents[0];
        }
        
        
        $scope.previousEvents.other = $filter('filter')($scope.currentStageEvents, function(event){
            if(event.event !== $scope.currentEvent.event && event.eventDate && event.eventDate <= $scope.currentEvent.eventDate){
                return true;
            }
        });
    };    

    $scope.downloadFile = function(eventUid, dataElementUid, e) {
        eventUid = eventUid ? eventUid : $scope.currentEvent.event ? $scope.currentEvent.event : null;        
        if( !eventUid || !dataElementUid){
            
            var dialogOptions = {
                headerText: 'error',
                bodyText: 'missing_file_identifier'
            };

            DialogService.showDialog({}, dialogOptions);
            return;
        }
        
        $window.open(BASEAPIURL+'/events/files?eventUid=' + eventUid +'&dataElementUid=' + dataElementUid, '_blank', '');
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
    };
    
    $scope.deleteFile = function(ev, dataElement){
        
        if( !dataElement ){            
            var dialogOptions = {
                headerText: 'error',
                bodyText: 'missing_file_identifier'
            };
            DialogService.showDialog({}, dialogOptions);
            return;
        }
        
        var modalOptions = {
            closeButtonText: 'cancel',
            actionButtonText: 'remove',
            headerText: 'remove',
            bodyText: 'are_you_sure_to_remove'
        };

        ModalService.showModal({}, modalOptions).then(function(result){            
            $scope.fileNames[$scope.currentEvent.event][dataElement] = null;
            $scope.currentEvent[dataElement] = null;
            ev[dataElement] = null;
            $scope.saveDatavalue($scope.prStDes[dataElement], null);
            //$scope.updateEventDataValue($scope.currentEvent, dataElement);
        });
    };
    
    $scope.updateFileNames = function(){        
        for(var dataElement in $scope.currentFileNames){
            if($scope.currentFileNames[dataElement]){
                if(!$scope.fileNames[$scope.currentEvent.event]){
                    $scope.fileNames[$scope.currentEvent.event] = [];
                }                 
                $scope.fileNames[$scope.currentEvent.event][dataElement] = $scope.currentFileNames[dataElement];
            }
        }
    };
    
    $scope.persistEvent = function(event, stage, optionSets, runExecuteRules){        
        
        var newEvent = EventUtils.reconstruct(event, stage, optionSets);
                
        return DHIS2EventFactory.create(newEvent).then(function(result){
            event.notPersisted = false;
            if(angular.isDefined(runExecuteRules) && runExecuteRules === true){
                $scope.executeRules();
            }            
            return "saved";
        });                
    };
    
    $scope.removeEventWithIDFromArrays = function(eventId, stageId, runExecuteRules){
        
        //remove from allEventsSorted, eventsByStage, eventsByStageDesc        
        var eventPropertyName = "event";
        
        var indexAllEventsSorted = $scope.getIndexInArray($scope.allEventsSorted, eventId, eventPropertyName);
        if(indexAllEventsSorted !== -1){
            $scope.allEventsSorted.splice(indexAllEventsSorted,1);
        }
        var indexEventsByStage = $scope.getIndexInArray($scope.eventsByStage[stageId], eventId, eventPropertyName);
        if(indexEventsByStage !== -1){
            $scope.eventsByStage[stageId].splice(indexEventsByStage, 1);
        }
        var indexEventsByStageDesc = $scope.getIndexInArray($scope.eventsByStageDesc[stageId], eventId, eventPropertyName);
        if(indexEventsByStageDesc !== -1){
            $scope.eventsByStageDesc[stageId].splice(indexEventsByStageDesc, 1);
        }        
        
        if(angular.isDefined(runExecuteRules) && runExecuteRules === true){
            $scope.executeRules();
        }
    };
    
    $scope.getIndexInArray = function(array, idToFind, idPropertyName){        
        for(var i = 0; i < array.length; i++){
            if(array[i][idPropertyName] === idToFind){
                return i;
            }
        }        
        return -1;
    };


    $scope.dataElementEditable = function(prStDe){
        if($scope.eventEditable()){
            if($scope.assignedFields[$scope.currentEvent.event] && $scope.assignedFields[$scope.currentEvent.event][prStDe.dataElement.id]) return false;
            return true;
        }
        return false;
    }

    $scope.eventEditable = function(){
        if(!$scope.currentStage || !$scope.currentStage.access.data.write) return false;
        if($scope.selectedOrgUnit.closedStatus || $scope.selectedEnrollment.status !== 'ACTIVE' || $scope.currentEvent.editingNotAllowed) return false;
        if($scope.currentEvent.expired && !$scope.userAuthority.canEditExpiredStuff) return false;
        return true;
    }
    
})
.controller('EventOptionsInTableController', function($scope, $translate){
    
    var COMPLETE = "Complete";
    var INCOMPLETE = "Incomplete";
    var VALIDATE = "Validate";
    var DELETE = "Delete";    
    var SKIP = "Skip";
    var UNSKIP = "Unskip";
    var NOTE = "Note";
    

    $scope.completeIncompleteEventFromTable = function(){
                        
        if ($scope.currentEvent.status !== 'COMPLETED'){
            $scope.currentEvent.submitted = true;           
            var formData = $scope.$eval('eventRowForm' + $scope.eventRow.event);                    
            if(formData.$valid){
                $scope.completeIncompleteEvent(true);
            }
        }
        else{
            $scope.completeIncompleteEvent(true);
        }
    };
    
    
    $scope.eventTableOptions = {};    
    $scope.eventTableOptions[COMPLETE] = {text: "Complete", tooltip: 'Complete', icon: "<span class='glyphicon glyphicon-check'></span>", value: COMPLETE, onClick: $scope.completeIncompleteEventFromTable, sort: 0};
    $scope.eventTableOptions[INCOMPLETE] = {text: "Reopen", tooltip: 'Reopen', icon: "<span class='glyphicon glyphicon-pencil'></span>", value: INCOMPLETE, onClick: $scope.completeIncompleteEventFromTable, sort: 1};
    //$scope.eventTableOptions[VALIDATE] = {text: "Validate", tooltip: 'Validate', icon: "<span class='glyphicon glyphicon-cog'></span>", value: VALIDATE, onClick: $scope.validateEvent, sort: 6};    
    $scope.eventTableOptions[DELETE] = {text: "Delete", tooltip: 'Delete', icon: "<span class='glyphicon glyphicon-floppy-remove'></span>", value: DELETE, onClick: $scope.deleteEvent, sort: 2};
    $scope.eventTableOptions[SKIP] = {text: "Skip", tooltip: 'Skip', icon: "<span class='glyphicon glyphicon-step-forward'></span>", value: SKIP, onClick: $scope.skipUnskipEvent, sort: 3};
    $scope.eventTableOptions[UNSKIP] = {text: "Schedule back", tooltip: 'Schedule back', icon: "<span class='glyphicon glyphicon-step-backward'></span>", value: UNSKIP, onClick: $scope.skipUnskipEvent, sort: 4};
    //$scope.eventTableOptions[NOTE] = {text: "Notes", tooltip: 'Show notes', icon: "<span class='glyphicon glyphicon-list-alt'></span>", value: NOTE, onClick: $scope.notesModal, sort: 5};    
    
    $scope.eventRow.validatedEventDate = $scope.eventRow.eventDate;
    updateEventTableOptions();
    
    $scope.$watch("eventRow.status", function(newValue, oldValue){
        if(newValue !== oldValue){
            updateEventTableOptions();
        }    
        
    });
    
    $scope.$watch("validatedDateSetForEvent", function(newValue, oldValue){                        
        if(angular.isDefined(newValue)){
            if(!angular.equals(newValue, {})){
                var updatedEvent = newValue.event;
                if(updatedEvent === $scope.eventRow){                    
                        $scope.eventRow.validatedEventDate = newValue.date; 
                        updateEventTableOptions();                    
                }
            }
        }        
        
    });
    
    function updateEventTableOptions(){
        
        var eventRow = $scope.eventRow;        
        
        for(var key in $scope.eventTableOptions){
            $scope.eventTableOptions[key].show = true;
            $scope.eventTableOptions[key].disabled = false;
        }
        
        $scope.eventTableOptions[UNSKIP].show = false;        
        
        switch(eventRow.status){
            case $scope.EVENTSTATUSCOMPLETELABEL:
                $scope.eventTableOptions[COMPLETE].show = false;
                $scope.eventTableOptions[SKIP].show = false; 
                $scope.eventTableOptions[DELETE].show = false;
                //$scope.eventTableOptions[VALIDATE].show = false;                
                $scope.defaultOption = $scope.eventTableOptions[INCOMPLETE];
                break;
            case $scope.EVENTSTATUSSKIPPEDLABEL:
                $scope.eventTableOptions[COMPLETE].show = false;
                $scope.eventTableOptions[INCOMPLETE].show = false;
                //$scope.eventTableOptions[VALIDATE].show = false;                
                $scope.eventTableOptions[SKIP].show = false;
                
                $scope.eventTableOptions[UNSKIP].show = true;
                $scope.defaultOption = $scope.eventTableOptions[UNSKIP];
                break;            
            default:                 
                if(eventRow.validatedEventDate){
                    $scope.eventTableOptions[INCOMPLETE].show = false;
                    $scope.eventTableOptions[SKIP].show = false;
                    $scope.defaultOption = $scope.eventTableOptions[COMPLETE];
                }
                else {
                    $scope.eventTableOptions[INCOMPLETE].show = false;                    
                    //$scope.eventTableOptions[VALIDATE].show = false;
                    $scope.eventTableOptions[COMPLETE].disabled = true;
                    $scope.defaultOption = $scope.eventTableOptions[COMPLETE];
                }                          
                break;
        }
        
        createOptionsArray();
    }
    
    function createOptionsArray(){
        
        $scope.eventTableOptionsArr = [];        
        
        for(var key in $scope.eventTableOptions){
            $scope.eventTableOptionsArr[$scope.eventTableOptions[key].sort] = $scope.eventTableOptions[key];
        }
    }
})
.filter('hideSummaryTableColumns', function () {
    //Custom function for hiding table columns in bangladesh:
    var hiddenSummaryTableColumns = ['aEJoLljIb1y', 'bHVKBPptXae', 'sw0XvIjlcjM', 'S8Yeg0x8Vpy', 'CfIy79NnUSY',
    'XKV79R3LG5J', 'vjMvkCTew8A', 'PUZaKR0Jh2k', 'uD4lKVSbeyB', 'ENbZrRzZgnh', 'z2OCjflFLxa', 'ET2aesZVpHo'];
    
    return function (items) {
        var filtered = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (!item.dataElement || 
                  hiddenSummaryTableColumns.indexOf(item.dataElement.id) === -1) {
            filtered.push(item);
          }
        }
        return filtered;
    };
});
