/* global angular */

'use strict';

/* Controllers */
var eRegistry = angular.module('eRegistry');

//Controller for settings page
eRegistry.controller('SelectionController',
        function($rootScope,
                $scope,
                $modal,
                $location,
                $filter,
                $timeout,
                $translate,
                Paginator,
                SessionStorageService,
                MetaDataFactory,
                DateUtils,
                OrgUnitFactory,
                OperatorFactory,
                ProgramFactory,
                AttributesFactory,
                EntityQueryFactory,
                CurrentSelection,
                TEIGridService,
                TEIService,
                EventReportService,
                SystemSettingsService,
                ModalService,$q,
                DHIS2BASEURL,
                DialogService) 
                 {
    $scope.DHIS2BASEURL = DHIS2BASEURL;
    $scope.maxOptionSize = 30;
    $scope.base = {};


    $scope.contentViews = [
        { view: "find",title: "search_register_patient", value: "find", type: "search", icon: "fa-search", index: 3, template: "components/search/search.html"},
        { view: "eventScheduled",title: "events_today_scheduled", value: ["SCHEDULE"], type: "event", icon: "fa-calendar-o", index:0, template: "views/tei.html"},
        { view: "eventOpened",title: "events_today_current_open", value: ["ACTIVE", "VISITED"], type: "event", icon: "fa-folder-open-o",index: 1, template: "views/tei.html"},
        { view: "eventCompleted",title: "events_today_files_completed", value: ["COMPLETED"], type: "event", icon: "fa-check", index: 2, template: "views/tei.html"},
        /*{ view: "enrollmentAll", title: "all_enrollment", value: "ALL", type: "enrollment", index: 0, icon: "fa-list", template:"views/tei.html"},
        { view: "enrollmentActive",title: "active_enrollment", value: "ACTIVE", type: "enrollment",index: 1, icon: "fa-list", template: "views/tei.html"},
        { view: "enrollmentCompleted",title: "completed_enrollment", value: "COMPLETED", type: "enrollment",index: 2, icon: "fa-list", template: "views/tei.html"},
        { view: "enrollmentCancelled",title: "cancelled_enrollment", value: "CANCELLED", type: "enrollment",index: 3, icon: "fa-list", template: "views/tei.html"}*/
    ];
    
    $scope.links = [
        { title: "upcoming_events", icon: "fa-clock-o", index:0, url: "/upcoming-events"},
        { title: "overdue_events", icon: "fa-bell-o", index: 1, url: "/overdue-events"},
    ];
    
    $scope.selectedContentView = $scope.contentViews[1];
    
    var hiddenFindAttributes = ["orgUnitName"];
    $scope.availablePrograms = {};

    $scope.model = {};

    //Selection
    $scope.pageReady = false;
    $scope.ouModes = [{displayName: 'SELECTED'}, {displayName: 'CHILDREN'}, {displayName: 'DESCENDANTS'}, {displayName: 'ACCESSIBLE'}];         
    $scope.selectedOuMode = $scope.ouModes[2];    
    $scope.dashboardProgramId = ($location.search()).program;
    $scope.selectedOrgUnitId = ($location.search()).ou;
    $scope.treeLoaded = false;
    $scope.searchOuTree = {open: true};
    $scope.teiListMode = {onlyActive: false};

    SystemSettingsService.getCountry().then(function(response){
        if(response === 'bangladesh') {
            $scope.isBangladesh = true;
            OrgUnitFactory.getAll().then(function(allOrgUnits) {
                var temp = {};
                angular.forEach(allOrgUnits.organisationUnits, function(orgUnit){
                    temp[orgUnit.id] = orgUnit;
                });
    
                $scope.pageReady = true;
                $scope.allOrgUnits = temp;
            });
        } else {
            $scope.isBangladesh = false;
            $scope.pageReady = true;
        }
    });
    
    //Paging
    $scope.pager = {pageSize: 50, page: 1, toolBarDisplay: 5};   
    
    //EntityList
    $scope.showTrackedEntityDiv = false;
    
    //Searching
    $scope.showSearchDiv = false;
    $scope.searchText = null;
    $scope.searchFilterExists = false;   
    $scope.defaultOperators = OperatorFactory.defaultOperators;
    $scope.boolOperators = OperatorFactory.boolOperators;
    $scope.enrollment = {programStartDate: '', programEndDate: '', operator: $scope.defaultOperators[0]};
    $scope.searchMode = { listAll: 'LIST_ALL', freeText: 'FREE_TEXT', attributeBased: 'ATTRIBUTE_BASED' };    
    $scope.optionSets = null;
    $scope.doSearch = true;
    $scope.programStagesById ={};
    $scope.eventsTodayProgramStageFilter = ["BjNpOxjvEj5","FRSZV43y35y","WZbXY0S00lP","dqF3sxJKBls","edqlbukwRfQ","uUHQw5KrZAL"];
    $scope.showProgramStageInEventsToday = true;
       
    function resetParams(goToPage){
        $scope.trackedEntityList = null;
        $scope.sortColumn = {};
        $scope.emptySearchText = false;
        $scope.emptySearchAttribute = false;
        $scope.showRegistrationDiv = false;  
        $scope.showTrackedEntityDiv = false;        
        $scope.teiFetched = false;
        $scope.teiFound = false;
        $scope.queryUrl = null;
        $scope.programUrl = null;
        $scope.attributeUrl = {url: null, hasValue: false};
        if(!goToPage){
            $scope.pager = {pageSize: 50, page: 1, toolBarDisplay: 5};           
        }
        $scope.programStagesById ={};

    }
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            loadOrgUnit().then(function(){
                $scope.doSearch = true;
                $scope.searchingOrgUnit = $scope.selectedOrgUnit;
                SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
                
                $scope.trackedEntityList = null;            
                $scope.searchText = null;
                
                $scope.optionSets = CurrentSelection.getOptionSets();
                
                $scope.base.attributesById  = CurrentSelection.getAttributesById();
                
                if(!$scope.base.attributesById){
                    $scope.base.attributesById = [];
                    MetaDataFactory.getAll('attributes').then(function(atts){                    
                        angular.forEach(atts, function(att){
                            $scope.base.attributesById[att.id] = att;
                        });
                        CurrentSelection.setAttributesById($scope.base.attributesById);
                    });
                }
                
                if(!$scope.optionSets){
                    $scope.optionSets = [];
                    MetaDataFactory.getAll('optionSets').then(function(optionSets){
                        angular.forEach(optionSets, function(optionSet){  
                            $scope.optionSets[optionSet.id] = optionSet;
                        });
                        CurrentSelection.setOptionSets($scope.optionSets);
                    });                
                }
                
                //Labels
                $scope.eRegistryLabel = $scope.selectedOrgUnit.displayName;
                $scope.orgUnitLabel = $translate.instant('org_unit');
                $scope.listAllLabel = $translate.instant('list_all');
                $scope.registerLabel = $translate.instant('register');
                $scope.searchOusLabel = $translate.instant('locate_organisation_unit_by_name');
                $scope.printLabel = $translate.instant('print');
                $scope.searchLabel = $translate.instant('search');
                $scope.findLabel = $translate.instant('find');    
                $scope.advancedSearchLabel = $translate.instant('advanced_search');
                $scope.searchCriteriaLabel = $translate.instant('type_your_search_criteria_here');
                $scope.programSelectLabel = $translate.instant('please_select_a_program');
                $scope.settingsLabel = $translate.instant('settings');
                $scope.showHideLabel = $translate.instant('show_hide_columns');
                $scope.listProgramsLabel = $translate.instant('list_programs');
                $scope.settingsLabel = $translate.instant('settings');
                $scope.findPersonLabel = $translate.instant('search_register_patient');
                $scope.todayLabel = $translate.instant('events_today_persons');
                angular.forEach($scope.eventsTodayFilters, function(filter){
                   filter.displayName = $translate.instant(filter.displayName); 
                });
                $scope.displayModeLabel = $translate.instant('display_mode');
                
                angular.forEach($scope.contentViews, function(view){
                    view.title =$translate.instant(view.title);
                });
                
                angular.forEach($scope.links, function(link){
                    link.title = $translate.instant(link.title);
                });
                
                resetParams();
                //$scope.doSearch = true;
                $scope.loadPrograms($scope.selectedOrgUnit);
                if(!$scope.orgUnits){
                    $scope.getOrgUnits();
                }
            }); 
            
        }
    });

    var loadOrgUnit = function(){
        if($scope.selectedOrgUnit && !$scope.selectedOrgUnit.loaded){
            return OrgUnitFactory.getShort($scope.selectedOrgUnit.id).then(function(orgUnit){
                $scope.selectedOrgUnit = orgUnit;
                $scope.selectedOrgUnit.loaded = true;
            });
        }
        return resolvedEmptyPromise();
    }
    var resolvedEmptyPromise = function(){
        var deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
    }
    
    //watch for changes in ou mode - mode could be selected without notifcation to grid column generator
    $scope.$watch('selectedOuMode.displayName', function() {
        if( $scope.selectedOuMode.displayName && angular.isObject($scope.gridColumns)){
            var continueLoop = true;
            for(var i=0; i<$scope.gridColumns.length && continueLoop; i++){
                if($scope.gridColumns[i].id === 'orgUnitName' && $scope.selectedOuMode.displayName !== 'SELECTED'){
                    $scope.gridColumns[i].show = true;
                    continueLoop = false;
                }
            }           
        }
    });    
    
    //watch for program feedback (this is when coming back from dashboard)
    /*if($scope.dashboardProgramId && $scope.dashboardProgramId !== 'null'){        
        ProgramFactory.get($scope.dashboardProgramId).then(function(program){
            $scope.selectedProgram = program;        
        });
    }*/
    
    //load programs associated with the selected org unit.
    $scope.loadPrograms = function(orgUnit) {
        $scope.selectedOrgUnit = orgUnit;
        
        if (angular.isObject($scope.selectedOrgUnit)) {   
            
            ProgramFactory.getProgramsByOu($scope.selectedOrgUnit,true, $scope.selectedProgram).then(function(response){
                $scope.programs = response.programs;
                angular.forEach($scope.programs, function(program){
                    if(program.id === 'ZBIqxwVixn8' && $scope.isBangladesh) {
                        $scope.selectedProgram = program;
                    }
                });

                $scope.selectedProgram = $scope.selectedProgram ? $scope.selectedProgram : response.selectedProgram;
                if($scope.selectedProgram && $scope.selectedProgram.programStages){
                    angular.forEach($scope.selectedProgram.programStages, function(stage){
                        $scope.programStagesById[stage.id] = stage;
                    });
                }
                $scope.model.selectedProgram = $scope.selectedProgram;
                $scope.trackedEntityList = null;
                $scope.selectedSearchMode = $scope.searchMode.listAll;
                $scope.processAttributes();
            });
        }        
    };
    
    $scope.getProgramAttributes = function(program){ 
        resetParams();
        $scope.selectedProgram = program;
        if($scope.selectedProgram && $scope.selectedProgram.programStages){
            angular.forEach($scope.selectedProgram.programStages, function(stage){
                $scope.programStagesById[stage.id] = stage;
            });
        }
        $scope.trackedEntityList = null;
        $scope.searchText = null;
        $scope.processAttributes();              
    };
    
    $scope.processAttributes = function(){
        $scope.sortColumn = {};
        AttributesFactory.getByProgram($scope.selectedProgram).then(function(atts){
            $scope.attributes = AttributesFactory.generateAttributeFilters(atts);
            var grid = TEIGridService.generateGridColumns($scope.attributes, $scope.selectedOuMode.displayName); 
            $scope.base.gridColumns = $scope.gridColumns = grid.columns;
            
            if($scope.showRegistrationDiv){

                $scope.doSearch = false;
            }
            if($scope.selectedProgram){
              $scope.setContentView($scope.selectedContentView);              
            }
        });
    };
    
    //sortGrid
    $scope.sortGrid = function(gridHeader){
        
        if ($scope.sortColumn && $scope.sortColumn.id === gridHeader.id){
            $scope.reverse = !$scope.reverse;
            return;
        }        
        $scope.sortColumn = gridHeader;
        if($scope.sortColumn.valueType === 'date'){
            $scope.reverse = true;
        }
        else{
            $scope.reverse = false;    
        }
    };
    
    $scope.d2Sort = function(tei){
        if($scope.sortColumn && $scope.sortColumn.valueType === 'date'){            
            var d = tei[$scope.sortColumn.id];         
            return DateUtils.getDate(d);
        }
        return tei[$scope.sortColumn.id];
    };

    $scope.convertDate = function(date){
        var temp = DateUtils.formatFromApiToUser(date);
        return temp;
    };

    //$scope.searchParam = {bools: []};
    $scope.search = function(mode,goToPage){
        resetParams(goToPage);
        var grid = TEIGridService.generateGridColumns($scope.attributes, $scope.selectedOuMode.displayName, true);
        $scope.gridColumns = grid.columns;
            
        $scope.selectedSearchMode = mode;        
    
        if($scope.selectedProgram){
            $scope.programUrl = 'program=' + $scope.selectedProgram.id;
        }        

        //check search mode
        if( $scope.selectedSearchMode === $scope.searchMode.freeText ){
            
            if($scope.searchText){
                $scope.queryUrl = 'query=LIKE:' + $scope.searchText;
            }
            else{
                if(!$scope.selectedProgram || !$scope.selectedProgram.displayFrontPageList){
                    $scope.emptySearchText = true;
                    $scope.teiFetched = false;
                    return;
                }
            }            
            
            $scope.attributes = EntityQueryFactory.resetAttributesQuery($scope.attributes, $scope.enrollment);
            $scope.searchingOrgUnit = $scope.selectedSearchingOrgUnit && $scope.selectedSearchingOrgUnit.id ? $scope.selectedSearchingOrgUnit : $scope.selectedOrgUnit;
        }
        
        if( $scope.selectedSearchMode === $scope.searchMode.attributeBased ){
            
            $scope.searchText = null;
            
            $scope.attributeUrl = EntityQueryFactory.getAttributesQuery($scope.attributes, $scope.enrollment);
            
            if(!$scope.attributeUrl.hasValue){
                $scope.emptySearchAttribute = true;
                $scope.teiFetched = false;
                return;
            }
            
            $scope.searchingOrgUnit = $scope.selectedSearchingOrgUnit && $scope.selectedSearchingOrgUnit.id ? $scope.selectedSearchingOrgUnit : $scope.selectedOrgUnit;
        }
        
        if( $scope.selectedSearchMode === $scope.searchMode.listAll ){
            $scope.searchText = null;            
            $scope.attributes = EntityQueryFactory.resetAttributesQuery($scope.attributes, $scope.enrollment);
            $scope.searchingOrgUnit = $scope.selectedSearchingOrgUnit && $scope.selectedSearchingOrgUnit.id ? $scope.selectedSearchingOrgUnit : $scope.selectedOrgUnit;
        }
        
        $scope.doSearch = false;

        $scope.fetchTeis();
    };
    $scope.fetchTeisEventsToday = function(statuses){
        $scope.teiFetched = false;
        $scope.trackedEntityList = null;
        var today = DateUtils.getToday();
        //Covert to API format, otherwise in some cases (when user format is dd-mm-yyyy) the API request fails.
        today = DateUtils.formatFromUserToApi(today);
        var promises = [];
        
        if(!statuses){
            promises.push(EventReportService.getEventReport($scope.searchingOrgUnit.id,$scope.selectedOuMode.displayName, $scope.selectedProgram.id,today,today,null,null,$scope.pager));
        }else{
            angular.forEach(statuses, function(status){
                promises.push(EventReportService.getEventReport($scope.searchingOrgUnit.id,$scope.selectedOuMode.displayName, $scope.selectedProgram.id,today,today,null,status,$scope.pager));
            });            
        }
        $q.all(promises).then(function(data){
            $scope.trackedEntityList = { rows: {own:[]}};
            var trackedEntitiesById = {};
            var ids =[];
            angular.forEach(data, function(result){
                if(result.eventRows){
                    if($scope.showProgramStageInEventsToday){
                        angular.forEach(result.eventRows, function(eventRow){
                            if($scope.eventsTodayProgramStageFilter.indexOf(eventRow.programStage) > -1){
                                var programStage = $scope.programStagesById[eventRow.programStage].displayName;
                                if(trackedEntitiesById[eventRow.trackedEntityInstance] && trackedEntitiesById[eventRow.trackedEntityInstance].programStages.indexOf(programStage) === -1){
                                    trackedEntitiesById[eventRow.trackedEntityInstance].programStages.push(programStage);
                                }else if(!trackedEntitiesById[eventRow.trackedEntityInstance]){
                                    var row = { 
                                        id: eventRow.trackedEntityInstance,
                                        created: DateUtils.formatFromApiToUser(eventRow.trackedEntityInstanceCreated),
                                        orgUnit: eventRow.trackedEntityInstanceOrgUnit,
                                        orgUnitName: eventRow.trackedEntityInstanceOrgUnitName,
                                        inactive: eventRow.trackedEntityInstanceInactive,
                                        followUp: eventRow.followup,
                                        programStages: [$scope.programStagesById[eventRow.programStage].displayName]
                                        };

                                    angular.forEach(eventRow.attributes, function(attr){
                                        row[attr.attribute] = attr.value;                            
                                    });
                                    $scope.trackedEntityList.rows.own.push(row);
                                    trackedEntitiesById[row.id] = row;
                                }
                            }
                        });
                    }else{
                        angular.forEach(result.eventRows, function(eventRow){
                            if(ids.indexOf(eventRow) === -1){                   
                                var row = { 
                                    id: eventRow.trackedEntityInstance,
                                    created: DateUtils.formatFromApiToUser(eventRow.trackedEntityInstanceCreated),
                                    orgUnit: eventRow.trackedEntityInstanceOrgUnit,
                                    orgUnitName: eventRow.trackedEntityInstanceOrgUnitName,
                                    inactive: eventRow.trackedEntityInstanceInactive,
                                    followUp: eventRow.followup,
                                    programStages: [$scope.programStagesById[eventRow.programStage].displayName]
                                    };

                                angular.forEach(eventRow.attributes, function(attr){
                                    row[attr.attribute] = attr.value;                            
                                });
                                ids.push(row);
                                $scope.trackedEntityList.rows.own.push(row); 
                            }
                        });
                    }
                }
            });
            $scope.trackedEntityList.length = $scope.trackedEntityList.rows.own.length;
            $scope.teiFetched = true;
        });
    };
    
    $scope.fetchTeis = function(){
        $scope.teiFetched = false;
        $scope.trackedEntityList = null;
        $scope.showTrackedEntityDiv = true;
        $scope.eventsToday = false;
        //get events for the specified parameters
        if($scope.enrollmentStatus==='TODAY'){
            $scope.fetchTeisEventsToday($scope.selectedEventsTodayFilter);        
        }else{
            TEIService.search($scope.searchingOrgUnit.id, 
                                                $scope.selectedOuMode.displayName,
                                                $scope.queryUrl,
                                                $scope.programUrl,
                                                $scope.attributeUrl.url,
                                                $scope.pager,
                                                true).then(function(data){            
                if( data && data.metaData && data.metaData.pager ){
                    $scope.pager = data.metaData.pager;
                    $scope.pager.toolBarDisplay = 5;

                    Paginator.setPage($scope.pager.page);
                    Paginator.setPageCount($scope.pager.pageCount);
                    Paginator.setPageSize($scope.pager.pageSize);
                    Paginator.setItemCount($scope.pager.total);                    
                }

                //process tei grid
                $scope.trackedEntityList = TEIGridService.format(data,false, $scope.optionSets, null);
                $scope.showSearchDiv = false;
                $scope.teiFetched = true;  
                $scope.doSearch = true;

                if(!$scope.sortColumn.id){                                      
                    $scope.sortGrid({id: 'created', displayName: 'registration_date', valueType: 'date', displayInListNoProgram: false, showFilter: false, show: false});
                }
            });         
            
        }
    };
    
    $scope.jumpToPage = function(){
        if($scope.pager && $scope.pager.page && $scope.pager.pageCount && $scope.pager.page > $scope.pager.pageCount){
            $scope.pager.page = $scope.pager.pageCount;
        }
        $scope.search(null,true);
    };
    
    $scope.resetPageSize = function(){
        $scope.pager.page = 1;        
        $scope.search(null,true);
    };
    
    $scope.getPage = function(page){    
        $scope.pager.page = page;
        $scope.search(null,true);
    };
    
    $scope.clearEntities = function(){
        $scope.trackedEntityList = null;
    };
    
    $scope.showRegistration = function(){
        $scope.showRegistrationDiv = !$scope.showRegistrationDiv;        
        if($scope.showRegistrationDiv){
            $scope.showTrackedEntityDiv = false;
            $scope.showSearchDiv = false;
            $timeout(function() { 
                $rootScope.$broadcast('registrationWidget', {registrationMode: 'REGISTRATION'});
            }, 200);
        }
    };    
    
    $scope.showDisplayMode = function(){        
        
        var modalInstance = $modal.open({
            templateUrl: 'views/display-mode-modal.html',
            controller: 'DisplayModeController',
            resolve: {
                programs: function(){
                    return $scope.programs;
                }                
            }
        });

        modalInstance.result.then(function () {           
        }, function () {});
    };
    
    $scope.showHideColumns = function(){
        $scope.hiddenGridColumns = 0;
        
        angular.forEach($scope.gridColumns, function(gridColumn){
            if(!gridColumn.show){
                $scope.hiddenGridColumns++;
            }
        });
        
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.gridColumns;
                },
                hiddenGridColumns: function(){
                    return $scope.hiddenGridColumns;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {
            $scope.gridColumns = gridColumns;
        }, function () {
        });
    };

    $scope.showDashboard = function(currentEntity){
        var sortedTei = $filter('orderBy')($scope.trackedEntityList.rows, function(tei) {
            return $scope.d2Sort(tei);
        }, $scope.reverse);
        
        var sortedTeiIds = [];
        angular.forEach(sortedTei, function(tei){
            sortedTeiIds.push(tei.id);
        });
        
        CurrentSelection.setSortedTeiIds(sortedTeiIds);
        $rootScope.contentView = $scope.contentView;
        $rootScope.enrollmentStatus = $scope.enrollmentStatus;
        $location.path('/dashboard').search({tei: currentEntity.id,                                            
                                            program: $scope.selectedProgram ? $scope.selectedProgram.id: null});                                    
    };
       
    $scope.getHelpContent = function(){
    };   

    var mapOrgUnitToId = function(orgUnit, obj){
        if(orgUnit){
            obj[orgUnit.id] = orgUnit;
            if(orgUnit.children && orgUnit.children.length > 0){
                angular.forEach(orgUnit.children, function(child){
                    mapOrgUnitToId(child, obj);
                });
            }
        }
    }
    
    //Get orgunits for the logged in user
    OrgUnitFactory.getSearchTreeRoot().then(function(response) {  
        $scope.orgUnits = response.organisationUnits;
        $scope.base.orgUnitsById = {};
        angular.forEach($scope.orgUnits, function(ou){
            mapOrgUnitToId(ou, $scope.base.orgUnitsById);
            ou.show = true;
            angular.forEach(ou.children, function(o){                    
                o.hasChildren = o.children && o.children.length > 0 ? true : false;
            });            
        });
        $scope.selectedSearchingOrgUnit = $scope.orgUnits[0] ? $scope.orgUnits[0] : null; 
    });
    
    //expand/collapse of search orgunit tree
    $scope.expandCollapse = function(orgUnit) {
        if( orgUnit.hasChildren ){            
            //Get children for the selected orgUnit
            OrgUnitFactory.get(orgUnit.id).then(function(ou) {                
                orgUnit.show = !orgUnit.show;
                orgUnit.hasChildren = false;
                orgUnit.children = ou.organisationUnits[0].children;                
                angular.forEach(orgUnit.children, function(ou){                    
                    ou.hasChildren = ou.children && ou.children.length > 0 ? true : false;
                });                
            });           
        }
        else{
            orgUnit.show = !orgUnit.show;   
        }        
    };
    
    $scope.setContentView = function(view){
        $scope.selectedContentView = view;
        if(view.type==='search'){
            $scope.trackedEntityList = null;
            $scope.teiFound = false;
        }else if(view.type==="event"){
            $scope.fetchTeisEventsToday(view.value);
        }else if(view.type==="enrollment"){
            $scope.filterByEnrollmentStatus(view.value);
        }
    }
    
    $scope.goToLink = function(link){
        selection.load();
        $location.path(link.url).search();
    }
    
    $scope.filterByEnrollmentStatus = function(status){
        if(status !== $scope.enrollmentStatus){            
            $scope.enrollmentStatus = status;
            if($scope.enrollmentStatus === 'ALL'){
                 $scope.programUrl = 'program=' + $scope.selectedProgram.id;                
            }
            else{
                $scope.programUrl = 'program=' + $scope.selectedProgram.id + '&programStatus=' + $scope.enrollmentStatus;
            }             
            $scope.fetchTeis();
        }
    };

    $scope.findTei = function(){
        if($scope.selectedProgram){
            $scope.programUrl = 'program=' + $scope.selectedProgram.id;
        }
        $scope.findAttributeUrl = EntityQueryFactory.getAttributesQuery($scope.findAttributes, $scope.enrollment);
        if(!$scope.findAttributeUrl.hasValue){
            $scope.emptyFindAttribute = true;
            return;
        }
        TEIService.search($scope.selectedOrgUnit.id,$scope.selectedOuMode.displayName,null,$scope.programUrl,$scope.findAttributeUrl.url,null,false).then(function(data){            
            if( data && data.metaData){
                 SystemSettingsService.getCountry().then(function(response){
                    //Determins how many results to display. Should be === 1 for Palestine and <= 5 for Bangladesh.
                    var numToDisplay = response === 'bangladesh' ? 5 : 1;
                    if (!$scope.allOrgUnits && response === 'bangladesh') {
                        return OrgUnitFactory.getAll().then(function(allOrgUnits) {
                            var temp = {};
                            angular.forEach(allOrgUnits.organisationUnits, function(orgUnit){
                                temp[orgUnit.id] = orgUnit;
                            });
                            $scope.allOrgUnits = temp;
                            return numToDisplay;
                        });
                    }
                    return numToDisplay;
                }).then(function(numToDisplay) {
                    if(data.rows.length <= numToDisplay && data.rows.length !== 0){
                        var newProgramUrl = $scope.programUrl +'&followUp=true';
                        TEIService.search($scope.selectedOrgUnit.id,$scope.selectedOuMode.displayName,null,newProgramUrl,$scope.findAttributeUrl.url,null,false).then(function(followUpData){
                            var followUp = false;
                            if(followUpData && followUpData.metaData && followUpData.rows.length ===1){
                                followUp = true;
                            }
                            var formattedData = TEIGridService.format(data,false, $scope.optionSets, null,followUp);
                            $scope.teiFetched = $scope.teiFound = true;
                            $scope.trackedEntityList = formattedData;
                            $scope.findWarning = false;

                        });
                    } else if(data.rows.length === 0) {
                        TEIService.search($scope.selectedOrgUnit.id,'ACCESSIBLE',null,$scope.programUrl,$scope.findAttributeUrl.url,null,false).then(function(data){
                            if(data && data.metaData){
                                if(data.rows.length===1){
                                    var newProgramUrl = $scope.programUrl +'&followUp=true';
                                    TEIService.search($scope.selectedOrgUnit.id,'ALL',null,newProgramUrl,$scope.findAttributeUrl.url,null,false).then(function(followUpData){                                            
                                        var followUp = false;
                                        if(followUpData && followUpData.metaData && followUpData.rows.length ===1){
                                            followUp = true;
                                        }
                                        $scope.showFoundInOtherOrgUnitModal(data,followUp);
                                        $scope.findWarning = false;

                                    });


                                }else if(data.rows.length===0){
                                    $scope.showNotFoundModal(data);   
                                    $scope.findWarning = false;
                                }else{
                                    $scope.findWarning = true;
                                }
                            }

                        });
                    }else{
                        $scope.findWarning = true;
                    }
                });
            }   
        });
    };
    
    $scope.showNotFoundModal =  function(data){
        if(!$scope.canRegister()){
            var dialogOptions = {
                headerText: "no_record_found",
                bodyText: "no_record_found"
            };
            return DialogService.showDialog({}, dialogOptions);
        }

        var modalOptions = {
            headerText: "no_record_found",
            bodyText: "no_record_found_create",
            closeButtonText: "no",
            actionButtonText: "yes"
        };
        
        ModalService.showModal({},modalOptions).then(function(){
            $rootScope.findAttributes = $scope.findAttributes; 
            $scope.showRegistration();
        });
    };
    
    $scope.showFoundInOtherOrgUnitModal = function(data,followUp){
        var modalOptions = {
            headerText: "found_other_part_of_system",
            bodyText: "found_other_part_of_system_add",
            closeButtonText: "cancel",
            actionButtonText: "open_patient_file",
            textAreaPlaceholder: "add_justification",
            textAreaRequired: true,
            reasons: [
                { name: "change_place_of_residence", id: 1},
                { name: "visiting_family", id: 2},
                { name: "urgent_case", id: 3},
                { name: "desire_to_change_the_place_of_receiving_care", id: 4},
                { name: "specify_other", id: 5}
            ],
            textAreaReasonID: 5
                
        };
        var modalDefaults ={
            templateUrl: "views/modal-audit.html",
            controller: function($scope, $modalInstance){
                $scope.modalOptions = modalOptions;
                angular.forEach($scope.modalOptions.reasons,function(r){
                   r.displayName = $translate.instant(r.name);
                });
                $scope.modalOptions.ok = function (reason, text) {
                    if($scope.form && $scope.form.$invalid){
                        $scope.form.$submitted = true;
                    }else{
                        $modalInstance.close({reason: reason.name, text: text});
                    }
                };
                $scope.modalOptions.close = function (result) {
                    $modalInstance.dismiss('cancel');
                };
            }
        };
        
        ModalService.showModal(modalDefaults,modalOptions).then(function(result){
            var formattedTEIList = TEIGridService.format(data,false, $scope.optionSets, null,followUp);
            if(formattedTEIList.rows.other && formattedTEIList.rows.other[0] && formattedTEIList.rows.other[0].id){
                TEIService.addAuditMessage(formattedTEIList.rows.other[0].id, result.reason).then(function(response){
                    $scope.trackedEntityList = formattedTEIList;
                    $scope.teiFetched = $scope.teiFound = true;
                    $scope.findWarning = false;
                },function(response){
                });
            }

        });
    };
    
    //load programs for the selected orgunit (from tree)
    $scope.setSelectedSearchingOrgUnit = function(orgUnit){    
        if(orgUnit === $scope.selectedSearchingOrgUnit) {
            $scope.selectedSearchingOrgUnit = null;
        } else {
            $scope.selectedSearchingOrgUnit = orgUnit;            
        }
    };

    $scope.getBangladeshOrgUnits = function(){
        OrgUnitFactory.getSearchTreeRootBangladesh().then(function(response) {  
            $scope.orgUnits = response.organisationUnits;
            var hideOrgUnits = ['J0sGEmtFtWx', 'YzvydYMRQhN', 'eExam925GfS'];
            
            var temp = [];
            angular.forEach($scope.orgUnits, function(ou){                    
                if(hideOrgUnits.indexOf(ou.id) === -1) {
                    temp.push(ou);
                }
            });
            $scope.orgUnits = temp;

            angular.forEach($scope.orgUnits, function(ou, index){
                ou.show = true;
                angular.forEach(ou.children, function(o){                    
                    o.hasChildren = false;
                });            
            });
        });
    };
    
    function setFindAttributes(){
        $scope.findAttributes = angular.copy($scope.gridColumns);
        angular.forEach($scope.findAttributes, function(col){
            if(hiddenFindAttributes.indexOf(col.id) > -1){
                col.show = false;
            }
        });
    };
    $scope.canRegister = function(){
        return $scope.selectedProgram && $scope.selectedProgram.access.data.write;
    }

    $scope.$watch('selectedProgram', function(selectedProgram){
        $scope.base.selectedProgram = selectedProgram;
    })

    $scope.goToRegistrationWithData = function(registrationPrefill){
        $rootScope.findAttributes = registrationPrefill;
        $scope.showRegistration();
    }
});