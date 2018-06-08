
/* global eRegistry, angular */
var eRegistry = angular.module('eRegistry');
eRegistry.controller('EventCreationController',
        function ($scope,
                $modalInstance,
                $timeout,
                $rootScope,
                DateUtils,
                DHIS2EventFactory,
                OrgUnitFactory,
                DialogService,
                ModalService,
                EventCreationService,
                RegistrationService,
                eventsByStage,
                stage,
                stages,
                allStages,
                tei,
                currentEvent,
                program,
                orgUnit,
                enrollment,                
                eventCreationAction,
                autoCreate,
                EventUtils,
                events,
                suggestedStage,
                EnrollmentService,
                CurrentSelection) {
    $scope.stages = stages;
    $scope.allStages = allStages;
    $scope.events = events;
    $scope.eventCreationAction = eventCreationAction;
    $scope.eventCreationActions = EventCreationService.eventCreationActions;
    $scope.isNewEvent = (eventCreationAction === $scope.eventCreationActions.add);
    $scope.isScheduleEvent = (eventCreationAction === $scope.eventCreationActions.schedule || eventCreationAction === $scope.eventCreationActions.referral);
    $scope.isReferralEvent = (eventCreationAction === $scope.eventCreationActions.referral);
    $scope.model = {selectedStage: stage, dueDateInvalid: false, eventDateInvalid: false};
    $scope.stageSpecifiedOnModalOpen = angular.isObject(stage) ? true : false;
    $scope.suggestedStage = suggestedStage;
    $scope.enrollment = enrollment;
    var orgPath = [];    
    var dummyEvent = {};
    
    $scope.scheduleDateDataElement = "";
    $scope.daysPregAtSchedDate = -1;

    if(currentEvent && stage) {
        for(var i = 0; i < stage.programStageDataElements.length; i++) {
            if(stage.programStageDataElements[i].dataElement.code === "DAYSPREGNANTATSCHEDULEDDDATE") {
                var id = stage.programStageDataElements[i].dataElement.id;
                $scope.daysPregAtSchedDate = currentEvent[id];
                $scope.gestAgeWeeks = Math.floor($scope.daysPregAtSchedDate/7);
                $scope.gestAgeDays = $scope.daysPregAtSchedDate%7;

            }
        }
    }

    function prepareEvent(){
       
        if(currentEvent) {
            for(var i = 0; i < stage.programStageDataElements.length; i++) {
                if(stage.programStageDataElements[i].dataElement.code === "SCHEDULEDATE") {
                    var id = stage.programStageDataElements[i].dataElement.id;
                    $scope.scheduleDateDataElement = currentEvent[id];
                }
            }
        }

        dummyEvent = EventUtils.createDummyEvent(eventsByStage[stage.id], tei, program, stage, orgUnit, enrollment, $scope.scheduleDateDataElement);
        
        $scope.newEvent = {programStage: stage};
        $scope.dhis2Event = {eventDate: $scope.isScheduleEvent ? '' : DateUtils.getToday(), dueDate: dummyEvent.dueDate, executionDateLabel : dummyEvent.executionDateLabel, displayName: dummyEvent.displayName, invalid: true};        
        
        ////custom code for folkehelsa. Set empty eventDate if selectedStage is previous pregnancies
        if($scope.model.selectedStage.id === 'PUZaKR0Jh2k' ||
                $scope.model.selectedStage.id === 'bO5aSsPeB4A' ||
                $scope.model.selectedStage.id === 'uD4lKVSbeyB' ||
                $scope.model.selectedStage.id === 'uOGkguF3MCs' ||
                $scope.model.selectedStage.id === 'uD4lKVSbeyB'){
            $scope.dhis2Event.eventDate = '';
        }
        
        
        if ($scope.model.selectedStage.periodType) {
            $scope.dhis2Event.eventDate = dummyEvent.dueDate;
            $scope.dhis2Event.periodName = dummyEvent.periodName;
            $scope.dhis2Event.periods = dummyEvent.periods;
            $scope.dhis2Event.selectedPeriod = dummyEvent.periods[0];
        }       
    };
    
    function suggestStage(){        
        var suggestedStage;
        var events = $scope.events;        
        var allStages = $scope.allStages;
        
        var availableStagesOrdered = $scope.stages.slice();
        availableStagesOrdered.sort(function (a,b){
            return a.sortOrder - b.sortOrder;
        });
        
        var stagesById = [];
        
        if((angular.isUndefined(events) || events.length === 0) && angular.isUndefined($scope.suggestedStage)){
            suggestedStage = availableStagesOrdered[0];
        }
        else{
            angular.forEach(allStages, function(stage){
                stagesById[stage.id] = stage;
            });
            
            var lastStageForEvents;
            
            if(angular.isUndefined($scope.suggestedStage)){
                for(var i = 0; i < events.length; i++){
                    var event = events[i];
                    var eventStage = stagesById[event.programStage];
                        if(i > 0){
                            if(eventStage.sortOrder > lastStageForEvents.sortOrder){
                                lastStageForEvents = eventStage;
                            }
                            else if(eventStage.sortOrder === lastStageForEvents.sortOrder){
                                if(eventStage.id !== lastStageForEvents.id){
                                    if(eventStage.displayName.localeCompare(lastStageForEvents.displayName) > 0){
                                        lastStageForEvents = eventStage;
                                    }
                                }                            
                            }
                        }
                        else {
                            lastStageForEvents = eventStage;
                        }
                }   
            }
            else {
                lastStageForEvents = $scope.suggestedStage;
            }

            
            for(var j = 0; j < availableStagesOrdered.length; j++){
                var availableStage = availableStagesOrdered[j];
                
                if(availableStage.id === lastStageForEvents.id){
                    suggestedStage = availableStage;
                    break;
                }
                else if(availableStage.sortOrder === lastStageForEvents.sortOrder){
                    if(availableStage.displayName.localeCompare(lastStageForEvents.displayName) > 0){
                        suggestedStage = availableStage;
                        break;
                    }
                }
                else if(availableStage.sortOrder > lastStageForEvents.sortOrder){
                    suggestedStage = availableStage;
                    break;
                }
            }
            
            if(angular.isUndefined(suggestedStage)){
                suggestedStage = availableStagesOrdered[availableStagesOrdered.length - 1];
            }
        }
        
        $scope.model.selectedStage = suggestedStage;
        stage = $scope.model.selectedStage;
    };
    
    if(!$scope.stageSpecifiedOnModalOpen){
        //suggest stage
        suggestStage();        
    }
    
    
    $scope.$watch('model.selectedStage', function(){       
        if(angular.isObject($scope.model.selectedStage)){
            stage = $scope.model.selectedStage;
            prepareEvent();
            
            //If the caller wants to create right away, go ahead and save.
            if (autoCreate) {
                $scope.save();
            };
        }
    });    

    //watch for changes in due/event-date
    $scope.$watchCollection('[dhis2Event.dueDate, dhis2Event.eventDate]', function () {
        if (angular.isObject($scope.dhis2Event)) {
            if (!$scope.dhis2Event.dueDate) {
                $scope.model.dueDateInvalid = true;
                return;
            }

            if ($scope.dhis2Event.dueDate) {
                var rDueDate = $scope.dhis2Event.dueDate;
                var cDueDate = DateUtils.format($scope.dhis2Event.dueDate);
                $scope.model.dueDateInvalid = rDueDate !== cDueDate;
            }

            if ($scope.dhis2Event.eventDate) {
                var rEventDate = $scope.dhis2Event.eventDate;
                var cEventDate = DateUtils.format($scope.dhis2Event.eventDate);
                $scope.model.eventDateInvalid = rEventDate !== cEventDate;
            }
        }
    });

    $scope.save = function () {
        //check for form validity
        if ($scope.model.dueDateInvalid || $scope.model.eventDateInvalid) {
            return false;
        }
        if($scope.isReferralEvent && !$scope.selectedSearchingOrgUnit){
            $scope.orgUnitError = true;
            return false;
        }        
        
        $scope.orgUnitError =  false;
        
        if ($scope.model.selectedStage.periodType) {
            $scope.dhis2Event.eventDate = $scope.dhis2Event.selectedPeriod.endDate;
            $scope.dhis2Event.dueDate = $scope.dhis2Event.selectedPeriod.endDate;
        }
        
        var eventDate = DateUtils.formatFromUserToApi($scope.dhis2Event.eventDate);
        var dueDate = DateUtils.formatFromUserToApi($scope.dhis2Event.dueDate);
        var newEvents = {events: []};
        var newEvent = {
            trackedEntityInstance: dummyEvent.trackedEntityInstance,
            program: dummyEvent.program,
            programStage: dummyEvent.programStage,
            enrollment: dummyEvent.enrollment,
            orgUnit: dummyEvent.orgUnit,
            dueDate: dueDate,
            eventDate: eventDate,
            notes: [],
            dataValues: [],
            status: 'ACTIVE'
        };

        newEvent.status = newEvent.eventDate ? 'ACTIVE' : 'SCHEDULE';

        newEvents.events.push(newEvent);
        DHIS2EventFactory.create(newEvents).then(function (response) {
            if (response.response && response.response.importSummaries[0].status === 'SUCCESS') {
                newEvent.event = response.response.importSummaries[0].reference;
                $modalInstance.close({dummyEvent: dummyEvent, ev: newEvent});
            }
            else {
                var dialogOptions = {
                    headerText: 'event_creation_error',
                    bodyText: response.message
                };

                DialogService.showDialog({}, dialogOptions);
            }
        });
    };

    //Start referral logic
    
    $scope.onetimeReferral = function(){
        $scope.save();
    };
    
    $scope.movePermanently = function(){
        var modalOptions = {
            headerText: 'move_permanently',
            bodyText: 'are_you_sure_you_want_to_move_permanently'
        };             
        ModalService.showModal({},modalOptions).then(function(){
            $rootScope.$broadcast('changeOrgUnit', {orgUnit: dummyEvent.orgUnit});
            
            $scope.attributesById = CurrentSelection.getAttributesById();
            $scope.optionSets = CurrentSelection.getOptionSets();
            $scope.tei = CurrentSelection.get().tei;

            $scope.tei.orgUnit = dummyEvent.orgUnit;

            RegistrationService.registerOrUpdate($scope.tei, $scope.optionSets, $scope.attributesById).then(function (regResponse) {
                $scope.save();
            });
        });
    };
    
    $scope.setSelectedSearchingOrgUnit = function(orgUnit){
        $scope.selectedSearchingOrgUnit = orgUnit;
        dummyEvent.orgUnit = orgUnit.id;
        dummyEvent.orgUnitName = orgUnit.name;
    };
    
    
    if(angular.isDefined(orgUnit) && angular.isDefined(orgUnit.id) && $scope.isReferralEvent){
        $scope.orgUnitsLoading = true;
        $timeout(function(){
            OrgUnitFactory.get(orgUnit.id).then(function(ou){
                if(ou){
                    orgUnit = ou;
                    var url = generateFieldsUrl();
                    OrgUnitFactory.getOrgUnits(orgUnit.id,url).then(function(data){
                        if(data && data.organisationUnits && data.organisationUnits.length >0){
                            $scope.orgWithParents = data.organisationUnits[0];
                            var org = data.organisationUnits[0];
                            var orgUnitsById ={};
                            orgUnitsById[org.id] = org;
                            while(org.parent){
                                org.parent.childrenLoaded = true;
                                orgUnitsById[org.parent.id] = org.parent;
                                org.parent.show = true;
                                for(var i=0;i<org.parent.children.length;i++){
                                    angular.forEach(org.parent.children[i].children, function(child){
                                       if(!orgUnitsById[child.id]){
                                            orgUnitsById[child.id] =child; 
                                       }
                                    });
                                    if(org.parent.children[i].id===org.id){
                                        org.parent.children[i] = org;
                                        i= org.parent.children.length;
                                    }else{
                                        orgUnitsById[org.parent.children[i].id] = org.parent.children[i];
                                    }
                                }
                                org = org.parent;
                            }
                            $scope.orgUnits = [org];

                            //For palestine
                            setDefaultOrgUnit($scope.orgWithParents);
                        }
                        $scope.orgUnitsLoading = false;
                    });
                }else{
                    $scope.orgUnitsLoading = false;
                }

                
            });
            
        },350);
    }
    
    function generateFieldsUrl(){
        var fieldUrl = "fields=id,name,organisationUnitGroups[shortName]";
        var parentStartDefault = ",parent[id,name,children[id,name,organisationUnitGroups[shortName],children[id,name,organisationUnitGroups[shortName]]]";
        var parentEndDefault = "]";
        if(orgUnit.level && orgUnit.level > 1){
            var parentStart = parentStartDefault;
            var parentEnd = parentEndDefault;
            for(var i =0; i< orgUnit.level-2;i++){
                parentStart+= parentStartDefault;
                parentEnd +=parentStartDefault;
            }
            fieldUrl += parentStart;
            fieldUrl += parentEnd;
        }
        return fieldUrl;
    }
    
    function setDefaultOrgUnit(){
        if($scope.orgWithParents.parent){
            var parent = $scope.orgWithParents.parent;
            for(var i=0;i<parent.children.length;i++){
                if(hasGroup(parent.children[i])){
                    parent.show = true;
                    $scope.setSelectedSearchingOrgUnit(parent.children[i]);
                    return;
                }
            }
        }
        
        if($scope.orgWithParents.parent.parent){
            var parent = $scope.orgWithParents.parent.parent;
            for(var i=0;i<parent.children.length; i++){
                var children = parent.children[i].children;
                if(children){
                    for(var t=0;t<children.length; t++){
                       if(hasGroup(children[t])){
                           parent.children[i].show = true;
                           parent.show = true;
                           parent.childrenLoaded = true;
                           $scope.orgWithParents.parent.show=false;
                           $scope.setSelectedSearchingOrgUnit(children[t]);
                           return;
                       }
                   }                   
                }
            }
        }
    }
    
    function hasGroup(org){
        if(org.organisationUnitGroups){
            for(var i=0; i<org.organisationUnitGroups.length;i++){
                if(org.organisationUnitGroups[i].shortName ==='HRC'){
                    return true;
                }
            }            
        }
        return false;
    }

    $scope.calcGestAge = function(date) {
        var originalDate = $scope.scheduleDateDataElement;
        var newDate = date;
        var daysBetween = 0;

        originalDate = new Date(originalDate);
        newDate = new Date(newDate);

        
        daysBetween = (newDate - originalDate) / 1000 / 60 / 60 / 24;
        
        $scope.gestAgeWeeks = Math.floor(($scope.daysPregAtSchedDate + daysBetween) / 7);
        $scope.gestAgeDays = ($scope.daysPregAtSchedDate + daysBetween) % 7;
    }

    $scope.expandCollapse = function(orgUnit) {
        orgUnit.show = !orgUnit.show;
        if(!orgUnit.childrenLoaded){
            OrgUnitFactory.get(orgUnit.id).then(function(ou){
                orgUnit.children = ou.children;
                orgUnit.childrenLoaded = true;
                
            });
        }
        
        /*
        if(!orgUnit.childrenLoaded){
            angular.forEach(orgUnit.children, function(child){
                var origChild = $scope.orgUnitsById[child.id];
                child.displayName = origChild.displayName;
                child.children = origChild.children;
                
            })
            orgUnit.childrenLoaded = true;
        }*/
    };
    //end referral logic
    $scope.cancel = function () {
        $modalInstance.close();
    };
});
