/* global eRegistry, angular */
var eRegistry = angular.module('eRegistry');
//Controller for dashboard
eRegistry.controller('DashboardController',
        function($rootScope,
                $scope,
                $location,
                $modal,
                $window,
                $timeout,
                $filter,
                $translate,
                TCStorageService,
                orderByFilter,
                SessionStorageService,
                TEIService, 
                TEService,
                MetaDataFactory,
                EnrollmentService,
                ProgramFactory,
                DHIS2EventFactory,
                DashboardLayoutService,
                DialogService,
                AttributesFactory,
                CurrentSelection,
                ModalService,
                AuthorityService) {
    //selections
    $scope.selectedTeiId = ($location.search()).tei; 
    $scope.selectedProgramId = ($location.search()).program; 
    $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU');
    $scope.userAuthority = AuthorityService.getUserAuthorities(SessionStorageService.get('USER_PROFILE'));
    $scope.sortedTeiIds = CurrentSelection.getSortedTeiIds();
    
    $scope.showSettingsButton = false;
    $scope.topbarClass = $scope.showSettingsButton ? "dashboard-info-box-sm" : "dashboard-info-box-lg";
    $scope.topbarRightSizeClass = $scope.showSettingsButton ? "dashboard-info-btn-right-two-buttons" : "dashboard-info-btn-right-one-button";
    
    //Labels
    $scope.removeLabel = $translate.instant('remove');
    $scope.expandLabel = $translate.instant('expand');
    $scope.collapseLabel = $translate.instant('collapse');
    $scope.noDataReportLabel = $translate.instant('no_data_report');
    $scope.noRelationshipLabel = $translate.instant('no_relationship');
    $scope.settingsLabel = $translate.instant('settings');
    $scope.showHideWidgetsLabel = $translate.instant('show_hide_widgets');
    $scope.notEnrolledLabel = $translate.instant('not_yet_enrolled_data_entry');
    $scope.stickLabel = $translate.instant('stick_right_widgets');
    $scope.unstickLabel = $translate.instant('unstick_right_widgets');
    
    $scope.stickyDisabled = false;
    $scope.previousTeiExists = false;
    $scope.nextTeiExists = false;
    
    $scope.temporaryHideWidgets = [];
    $scope.temporaryShowWidgets = [];
    
    $rootScope.eventsInProgramStageById = {};
    
    if($scope.sortedTeiIds && $scope.sortedTeiIds.length > 0){
        var current = $scope.sortedTeiIds.indexOf($scope.selectedTeiId);
        
        if(current !== -1){
            if($scope.sortedTeiIds.length-1 > current){
                $scope.nextTeiExists = true;
            }
            
            if(current > 0){
                $scope.previousTeiExists = true;
            }
        }
    }
    $scope.selectedProgram;    
    $scope.selectedTei;
    
    //get ouLevels
    TCStorageService.currentStore.open().done(function(){
        TCStorageService.currentStore.getAll('ouLevels').done(function(response){
            var ouLevels = angular.isObject(response) ? orderByFilter(response, '-level').reverse() : [];
            CurrentSelection.setOuLevels(orderByFilter(ouLevels, '-level').reverse());
        });
    });
    
    //dashboard items   
    var getDashboardLayout = function(){        
        $rootScope.dashboardWidgets = [];    
        $scope.widgetsChanged = [];
        $scope.dashboardStatus = [];
        $scope.dashboardWidgetsOrder = {biggerWidgets: [], smallerWidgets: []};
        $scope.orderChanged = false;        
        
        DashboardLayoutService.get().then(function(response){
            $scope.dashboardLayouts = response;            
            var defaultLayout = $scope.dashboardLayouts.defaultLayout['DEFAULT'];
            var selectedLayout = null;
            if($scope.selectedProgram && $scope.selectedProgram.id){                
                selectedLayout = $scope.dashboardLayouts.customLayout && $scope.dashboardLayouts.customLayout[$scope.selectedProgram.id] ? $scope.dashboardLayouts.customLayout[$scope.selectedProgram.id] : $scope.dashboardLayouts.defaultLayout[$scope.selectedProgram.id];
            }            
            selectedLayout = !selectedLayout ?  defaultLayout : selectedLayout;
            

            //Added the following line to get around a bug in default dashboard
            //layouts:
            selectedLayout = defaultLayout;
            selectedLayout.stickRightSide = false;
            $scope.stickyDisabled = selectedLayout.stickRightSide ? !selectedLayout.stickRightSide : true;

            angular.forEach(selectedLayout.widgets, function(widget){
                if(widget.title !== "activePrograms"){
                    $rootScope[widget.title +'Widget'] = widget;
                    $rootScope.dashboardWidgets.push( $rootScope[widget.title +'Widget'] );
                    $scope.dashboardStatus[widget.title] = angular.copy(widget);
                }                
            });
            
            $scope.hasBigger = false;
            angular.forEach(orderByFilter($filter('filter')($scope.dashboardWidgets, {parent: "biggerWidget"}), 'order'), function(w){
                if(w.show){
                    $scope.hasBigger = true;
                }
                $scope.dashboardWidgetsOrder.biggerWidgets.push(w.title);
            });

            $scope.hasSmaller = false;
            angular.forEach(orderByFilter($filter('filter')($scope.dashboardWidgets, {parent: "smallerWidget"}), 'order'), function(w){
                if(w.show){
                    $scope.hasSmaller = true;
                }
                $scope.dashboardWidgetsOrder.smallerWidgets.push(w.title);
            });
            
            setWidgetsSize();
            $scope.broadCastSelections();            
        });        
    };    
    
    var setWidgetsSize = function(){        
        
        $scope.widgetSize = {smaller: "col-sm-6 col-md-4", bigger: "col-sm-6 col-md-8"};
        
        if(!$scope.hasSmaller){
            $scope.widgetSize = {smaller: "col-sm-1", bigger: "col-sm-11"};
        }

        if(!$scope.hasBigger){
            $scope.widgetSize = {smaller: "col-sm-11", bigger: "col-sm-1"};
        }
    };
    
    var setInactiveMessage = function(){
        if($scope.selectedTei.inactive){
            setHeaderDelayMessage($translate.instant('tei_inactive_only_read'));
        }
    };
    
    if($scope.selectedTeiId){
        
        //get option sets
        $scope.optionSets = [];     
        MetaDataFactory.getAll('optionSets').then(function(optionSets){            
            angular.forEach(optionSets, function(optionSet){
                $scope.optionSets[optionSet.id] = optionSet;
            });
            
            AttributesFactory.getAll().then(function(atts){
                
                $scope.attributesById = [];
                angular.forEach(atts, function(att){
                    $scope.attributesById[att.id] = att;
                });

                CurrentSelection.setAttributesById($scope.attributesById);
            
                //Fetch the selected entity
                TEIService.get($scope.selectedTeiId, $scope.optionSets, $scope.attributesById).then(function(response){
                    if(response) {
                        $scope.selectedTei = response;

                        setInactiveMessage();                   

                        //get the entity type
                        TEService.get($scope.selectedTei.trackedEntityType).then(function(tet){                    
                            $scope.trackedEntityType = tet;

                            //get enrollments for the selected tei
                            EnrollmentService.getByEntity($scope.selectedTeiId).then(function(response){                    
                                var enrollments = angular.isObject(response) && response.enrollments ? response.enrollments : [];
                                var selectedEnrollment = null;
                                var backupSelectedEnrollment = null;
                                
                                ProgramFactory.getProgramsByOu($scope.selectedOrgUnit,false).then(function(res){
                                    $scope.programs = [];
                                    $scope.programNames = [];  
                                    $scope.programStageNames = [];        

                                    //get programs valid for the selected ou and tei
                                    angular.forEach(res.programs, function(program){                                    
                                        if( program.trackedEntityType.id === $scope.selectedTei.trackedEntityType ){
                                            $scope.programs.push(program);
                                            $scope.programNames[program.id] = {id: program.id, displayName: program.displayName};
                                            angular.forEach(program.programStages, function(stage){                
                                                    $scope.programStageNames[stage.id] = {id: stage.id, displayName: stage.displayName};
                                            });

                                            if($scope.selectedProgramId && program.id === $scope.selectedProgramId){
                                                $scope.selectedProgram = program;
                                                angular.forEach(enrollments, function(en){
                                                    if( en.program === $scope.selectedProgramId ){
                                                        if( en.status === 'ACTIVE'){
                                                            selectedEnrollment = en;
                                                        }
                                                        else{
                                                            backupSelectedEnrollment = en;
                                                        }
                                                    }
                                                });
                                                selectedEnrollment = selectedEnrollment ? selectedEnrollment : backupSelectedEnrollment;
                                            }
                                        }                                
                                    });
                                    

                                    //filter those enrollments that belong to available programs
                                    var len = enrollments.length;
                                    while(len--){
                                        if(enrollments[len].program && !$scope.programNames[enrollments[len].program]){
                                            enrollments.splice(len,1);
                                        }
                                    }

                                    DHIS2EventFactory.getEventsByProgram($scope.selectedTeiId, null).then(function(events){                                        
                                        //prepare selected items for broadcast
                                        CurrentSelection.setSelectedTeiEvents(events);                                        
                                        CurrentSelection.set({tei: $scope.selectedTei, te: $scope.trackedEntityType, prs: $scope.programs, pr: $scope.selectedProgram, prNames: $scope.programNames, prStNames: $scope.programStageNames, enrollments: enrollments, selectedEnrollment: selectedEnrollment, optionSets: $scope.optionSets});                            
                                        getDashboardLayout(); 
                                    });                    
                                });
                            });
                        }); 
                    }
                });  
            });
        });
    }
    
    
    //listen for any change to program selection
    //it is possible that such could happen during enrollment.
    $scope.$on('mainDashboard', function(event, args) {
        var selections = CurrentSelection.get();
        $scope.selectedProgram = null;
        angular.forEach($scope.programs, function(pr){
            if(pr.id === selections.pr){
                $scope.selectedProgram = pr;
            }
        });
        
        $scope.applySelectedProgram();
    }); 
    
    function getCurrentDashboardLayout(){
        var widgets = [];
        $scope.hasBigger = false;
        $scope.hasSmaller = false;
        angular.forEach($rootScope.dashboardWidgets, function(widget){
            var w = angular.copy(widget);            
            if($scope.orderChanged){
                if($scope.widgetsOrder.biggerWidgets.indexOf(w.title) !== -1){
                    $scope.hasBigger = $scope.hasBigger || w.show;
                    w.parent = 'biggerWidget';
                    w.order = $scope.widgetsOrder.biggerWidgets.indexOf(w.title);
                }
                
                if($scope.widgetsOrder.smallerWidgets.indexOf(w.title) !== -1){
                    $scope.hasSmaller = $scope.hasSmaller || w.show;
                    w.parent = 'smallerWidget';
                    w.order = $scope.widgetsOrder.smallerWidgets.indexOf(w.title);
                }
            }
            widgets.push(w);
        });        
        var layout = {};
        if($scope.selectedProgram && $scope.selectedProgram.id){
            layout[$scope.selectedProgram.id] = {widgets: widgets, program: $scope.selectedProgram.id};
        }
        else{
            layout['DEFAULT'] = {widgets: widgets, program: 'DEFAULT'};
        }
        return layout;
    }
    
    function saveDashboardLayout(){
        var layout = getCurrentDashboardLayout();        
        DashboardLayoutService.saveLayout(layout, false).then(function(){
            if(!$scope.orderChanged){
                $scope.hasSmaller = $filter('filter')($scope.dashboardWidgets, {parent: "smallerWidget", show: true}).length > 0;
                $scope.hasBigger = $filter('filter')($scope.dashboardWidgets, {parent: "biggerWidget", show: true}).length > 0;                                
            }                
            setWidgetsSize();      
        });
    };
    
    //watch for widget sorting    
    $scope.$watch('widgetsOrder', function() {        
        if(angular.isObject($scope.widgetsOrder)){
            $scope.orderChanged = false;
            for(var i=0; i<$scope.widgetsOrder.smallerWidgets.length; i++){
                if($scope.widgetsOrder.smallerWidgets.length === $scope.dashboardWidgetsOrder.smallerWidgets.length && $scope.widgetsOrder.smallerWidgets[i] !== $scope.dashboardWidgetsOrder.smallerWidgets[i]){
                    $scope.orderChanged = true;
                }
                
                if($scope.widgetsOrder.smallerWidgets.length !== $scope.dashboardWidgetsOrder.smallerWidgets.length){
                    $scope.orderChanged = true;
                }
            }
            
            for(var i=0; i<$scope.widgetsOrder.biggerWidgets.length; i++){
                if($scope.widgetsOrder.biggerWidgets.length === $scope.dashboardWidgetsOrder.biggerWidgets.length && $scope.widgetsOrder.biggerWidgets[i] !== $scope.dashboardWidgetsOrder.biggerWidgets[i]){
                    $scope.orderChanged = true;
                }
                
                if($scope.widgetsOrder.biggerWidgets.length !== $scope.dashboardWidgetsOrder.biggerWidgets.length){
                    $scope.orderChanged = true;
                }
            }
            
            if($scope.orderChanged){
                saveDashboardLayout();
            }
        }
    });
    
    $scope.applySelectedProgram = function(){
        getDashboardLayout();
    };
    
    $scope.applySelectedProgramPostback = function(program){
        $window.location.href = $window.location.href.replace(/&program=\w+/,"&program=" + program.id);
    };
    
    $scope.broadCastSelections = function(tei){
        
        var selections = CurrentSelection.get();
        if(tei){
            $scope.selectedTei = tei;
        }
        else{
            $scope.selectedTei = selections.tei;
        }
        
        $scope.trackedEntityType = selections.te;
        $scope.optionSets = selections.optionSets;
        
        CurrentSelection.set({tei: $scope.selectedTei, te: $scope.trackedEntityType, prs: $scope.programs, pr: $scope.selectedProgram, prNames: $scope.programNames, prStNames: $scope.programStageNames, enrollments: selections.enrollments, selectedEnrollment: selections.selectedEnrollment, optionSets: $scope.optionSets});        
        $timeout(function() { 
            $rootScope.$broadcast('selectedItems', {programExists: $scope.programs.length > 0});            
        }, 500);    
    };     
    
    $scope.activiateTEI = function(){
        var st = !$scope.selectedTei.inactive || $scope.selectedTei.inactive === '' ? true : false;
        
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: st ? 'deactivate_tei' : 'activate_tei',
            bodyText: 'are_you_sure_to_proceed'
        };

        ModalService.showModal({}, modalOptions).then(function (result) {

            $scope.selectedTei.inactive = st;
            TEIService.update($scope.selectedTei, $scope.optionSets, $scope.attributesById).then(function (data) {
                setInactiveMessage();
                $scope.broadCastSelections($scope.selectedTei);                
            });
        }, function(){            
        });
    };
    
    $scope.dataEntryMainMenuItemSelected = false;    
    $scope.back = function(){
        if(!$scope.dataEntryMainMenuItemSelected){
            //reload OU tree
            selection.load();
            $location.path('/').search({program: $scope.selectedProgramId});        
        }
        else {
            $rootScope.$broadcast('DashboardBackClicked');
            $scope.dataEntryMainMenuItemSelected = false;            
        }
    };    

    $scope.$on('DataEntryMainMenuItemSelected', function(event, data){        
        $scope.dataEntryMainMenuItemSelected = true;   
        
        //Custom code for folkehelsa, collapsing widgets dependig on main menu selection:
        //reading the code it might be useful to realize that only risk and management 
        //widget has a "programstage" seg.
        switch(data.selected) {
            case "WZbXY0S00lP":
            case "edqlbukwRfQ":
            case "uUHQw5KrZAL":
            case "PUZaKR0Jh2k":
                //antenatal care, US and previous pregs:
                angular.forEach($scope.dashboardWidgets, function(widget){
                    if(widget.programstage ){
                        if(widget.programstage === "tlzRiafqzgd" ||
                           widget.programstage === "iXDSolqmauJ")
                        {
                            widget.expand = true;
                        }
                        else
                        {
                            widget.expand = false;
                        }
                    }
                    else if(widget.title === 'feedback' ||
                            widget.title === 'risksANCMED') {
                        widget.expand = true;
                    }
                });
                break;
            case "dqF3sxJKBls":
                //ppc
                angular.forEach($scope.dashboardWidgets, function(widget){
                    if(widget.programstage){
                        if(widget.programstage === "E8Jetf3Q90U" ||
                           widget.programstage === "WPgz41MctSW")
                        {
                            widget.expand = true;
                        }
                        else
                        {
                            widget.expand = false;
                        }
                    }
                    else if(widget.title === 'feedback' ||
                            widget.title === 'risksANCMED') {
                        widget.expand = false;
                    }
                });
                break;
            case "FRSZV43y35y":
                //nbc
                angular.forEach($scope.dashboardWidgets, function(widget){
                    if( widget.programstage){
                        if(widget.programstage === "w9cPvMH5LaN" ||
                           widget.programstage === "MO39jKgz2VA")
                        {
                            widget.expand = true;
                        }
                        else
                        {
                            widget.expand = false;
                        }
                    }
                    else if(widget.title === 'feedback' ||
                            widget.title === 'risksANCMED') {
                        widget.expand = false;
                    }
                });
                break;
            default:
                angular.forEach($scope.dashboardWidgets, function(widget){
                    if(widget.programstage){
                        widget.expand = true;
                    }
                    else if(widget.title === 'feedback' ||
                            widget.title === 'risksANCMED') {
                        widget.expand = true;
                    }
                });
                break;
        }
        
    });
    
    $scope.$on('DataEntryMainMenuVisibilitySet', function(event, data){
        if(data.visible){            
            //hide all widgets except visibleItems in data
            angular.forEach($scope.dashboardWidgets, function(widget){
                if(!data.visibleItems[widget.title]){
                    $scope.temporaryHideWidgets[widget.title] = true;
                }
                else {
                    $scope.temporaryShowWidgets[widget.title] = true;
                }

            });            
        }else if(data.closingStage){//Palestine, show only closing stage
            
        }
        else{
            //show widgets, reset temporary settings
            $scope.temporaryHideWidgets = [];
            $scope.temporaryShowWidgets = [];
            
        }
    });
    
    $scope.$on('BeforeOpenEnrollment', function(event, dataEntryVisible){
        
        //not in use for now
        /*
        if(!dataEntryVisible){
            $scope.temporaryHideWidgets['dataentry'] = true;
            $scope.temporaryShowWidgets['dataentry'] = false;
        }
        else {
            $scope.temporaryHideWidgets['dataentry'] = false;
            $scope.temporaryShowWidgets['dataentry'] = true;
        }
        */

    });
    
    $scope.getBackButtonText = function(){
        if(!$scope.dataEntryMainMenuItemSelected){
            return $translate.instant('clinic');
        }
        else {
            return $translate.instant('menu');
        }
    };
    
    $scope.$on('$locationChangeSuccess',function(){
        selection.load();
    });
    
    $scope.displayEnrollment = false;
    $scope.showEnrollment = function(){
        $scope.displayEnrollment = true;
    };
    
    $scope.removeWidget = function(widget){        
        widget.show = false;
        saveDashboardLayout();
    };
    
    $scope.expandCollapse = function(widget){
        widget.expand = !widget.expand;
        saveDashboardLayout();
    };
    
    $scope.saveDashboarLayoutAsDefault = function(){      
        var layout = angular.copy($scope.dashboardLayouts.defaultLayout);
        var currentLayout = getCurrentDashboardLayout();
        angular.extend(layout, currentLayout);
        delete layout.DEFAULT;
        DashboardLayoutService.saveLayout(layout, true).then(function(){
            var dialogOptions = {
                    headerText: 'success',
                    bodyText: $translate.instant('dashboard_layout_saved')
                };
            DialogService.showDialog({}, dialogOptions);
            return;
        }, function(){
            var dialogOptions = {
                    headerText: 'error',
                    bodyText: $translate.instant('dashboard_layout_not_saved')
                };
            DialogService.showDialog({}, dialogOptions);
            return;
        });
    };
    
    $scope.stickUnstick = function(){       
        $scope.stickyDisabled = !$scope.stickyDisabled;        
        var layout = getCurrentDashboardLayout();        
        var layoutKey = $scope.selectedProgram && $scope.selectedProgram.id ? $scope.selectedProgram.id : 'DEFAULT';        
        layout[layoutKey].stickRightSide = !$scope.stickyDisabled;        
        DashboardLayoutService.saveLayout(layout, false).then(function(){
        });        
    };
    
    $scope.showHideWidgets = function(){
        var modalInstance = $modal.open({
            templateUrl: "components/dashboard/dashboard-widgets.html",
            controller: "DashboardWidgetsController"
        });

        modalInstance.result.then(function () {
        });
    };
    
    $rootScope.closeOpenWidget = function(widget){
        saveDashboardLayout();
    };
    
    $scope.fetchTei = function(mode){
        var current = $scope.sortedTeiIds.indexOf($scope.selectedTeiId);
        var pr = ($location.search()).program;
        var tei = null;
        if(mode === 'NEXT'){            
            tei = $scope.sortedTeiIds[current+1];
        }
        else{            
            tei = $scope.sortedTeiIds[current-1];
        }        
        $location.path('/dashboard').search({tei: tei, program: pr ? pr: null});
    };
});
