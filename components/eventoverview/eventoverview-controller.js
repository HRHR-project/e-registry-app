var eRegistry = angular.module('eRegistry');
eRegistry.controller('EventOverViewController',
        function(
                $scope,
                $translate,
                $log,
                $q,
                $filter,
                CommonUtils,
                ProgramStageFactory,
                DHIS2EventFactory,
                EventUtils,
                SessionStorageService,
                CurrentSelection,
                DateUtils,
                EventCreationService,                
                $rootScope) {
    
    $scope.widget = $scope.$parent.$parent.biggerWidget ? $scope.$parent.$parent.biggerWidget
    : $scope.$parent.$parent.smallerWidget ? $scope.$parent.$parent.smallerWidget : null;
    $scope.widgetTitle = $scope.widget.title;
    $scope.dashboardReady = false;
    
    $scope.widgetTitleLabel = $translate.instant($scope.widgetTitle);
    $scope.programStageIdFilter = $scope.widget.programstage;
  
    var selections = CurrentSelection.get();    
    $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU');
    $scope.selectedProgram = selections.pr;
    $scope.selectedEnrollment = selections.selectedEnrollment;
    
    $scope.selectedEntity = selections.tei;
    $scope.optionSets = selections.optionSets;    
  
    $scope.eventsInProgramStage = [];   
    $scope.eventDateHeader = "";    
    $scope.dataElementsForProgramStageAss = {};
    $scope.dataElementsForProgramStage = [];
    $scope.programStage = {};
    
    $scope.visibleDataElements = $scope.widget.visibleDataElements;
    $scope.eventDateIsEditable = angular.isDefined($scope.widget.eventDateIsEditable) ? $scope.widget.eventDateIsEditable : false;
    
    $scope.currentEvent = {};
    $scope.currentEventWrapped = { currentEvent: $scope.currentEvent };
    
    $scope.eventOrginal = [];
    $scope.actions = {};
    $scope.dataEntryControllerData = {};
    
    $scope.refresh = function() {        
        
        $scope.getDataElementsForProgramStage()
            .then(function(){
                return $scope.getEventsInProgramStage();
            })
            .then(function(){
                //succeeded
                $scope.dashboardReady = true;
            }, function(){
               //get failed 
            });
    };
    
    $scope.$on('dashboardWidgets', function() {
        $scope.refresh();        
    });
    
    $scope.getDataElementsForProgramStage = function() {        
        var def = $q.defer();
        var stages = $scope.selectedProgram.programStages;
        $scope.prStDes ={};
        $scope.hiddenAuditDataElements = [];
        for(var i = 0; i < stages.length; i++){  
            var stage = stages[i];
            if(stage.id === $scope.programStageIdFilter){
                $scope.programStage = stage;
                angular.forEach(stage.programStageDataElements, function (prStDe) {
                    $scope.prStDes[prStDe.dataElement.id] = prStDe;
                    if(angular.isDefined($scope.visibleDataElements[prStDe.dataElement.id])){
                        prStDe.dataElement.sortOrder = prStDe.sortOrder;               
                        prStDe.dataElement.compulsory = prStDe.compulsory;
                        prStDe.dataElement.editable = angular.isDefined($scope.visibleDataElements[prStDe.dataElement.id].editable) ? true : false;
                        $scope.dataElementsForProgramStageAss[prStDe.dataElement.id] = prStDe.dataElement;
                        $scope.dataElementsForProgramStage.push(prStDe.dataElement);                        
                    }
                    if(prStDe.dataElement.id === 'RO9lM47fth5'){
                        
                    }
                });
                sortDataElements();
                break;                    
            }
        }
        def.resolve();        
        return def.promise;
    };
    
    $scope.getEventsInProgramStage = function() {
        var def = $q.defer(); 

        var dhis2events = CurrentSelection.getSelectedTeiEvents();
        dhis2events = $filter('filter')(dhis2events, {program: $scope.selectedProgram.id});  
        if($scope.selectedEnrollment !== null){
            dhis2events = $filter('filter')(dhis2events, {enrollment: $scope.selectedEnrollment.enrollment});
        }        
    
        if(angular.isObject(dhis2events)){
            for(var i = 0; i < dhis2events.length; i++){
                var dhis2event = dhis2events[i];
                if(dhis2event.programStage === $scope.programStageIdFilter){                      
                    if($scope.eventsInProgramStage.length === 0){                        
                        $scope.eventDateHeader = dhis2event.excecutionDateLabel;
                    }
                    dhis2event.deStatus = {};
                    dhis2event.deClickedOption = [];
                    $scope.eventsInProgramStage.push(dhis2event);
                }      
            }                                    
        }
        
        for(var i = 0; i < $scope.eventsInProgramStage.length; i++){
            var currentEvent = $scope.eventsInProgramStage[i];            
            $scope.addUserFormattedDataValuesForEvent(currentEvent);            
        }
        $rootScope.eventsInProgramStageById[$scope.programStageIdFilter] = $scope.eventsInProgramStage;
        
        $scope.sortEvents();
        
        def.resolve();
        return def.promise;        
    };  
    
    $scope.addUserFormattedDataValuesForEvent = function(currentEvent){
        
        angular.forEach(currentEvent.dataValues, function(dataValues){
            var value;
            if($scope.dataElementsForProgramStageAss[dataValues.dataElement]){
                value = CommonUtils.formatDataValue(currentEvent, dataValues.value, $scope.dataElementsForProgramStageAss[dataValues.dataElement], $scope.optionSets, 'USER');            
                currentEvent[dataValues.dataElement] = value;
            }else{
                value = dataValues.value;
            }
            currentEvent[dataValues.dataElement] = value;

        });
        
    };
    
    $scope.getEventDataValuesAsString = function (currentEvent){
        var dataElementsWithSortOrder = [];
        angular.forEach(currentEvent.dataValues, function(dataElement){
            dataElementsWithSortOrder.push({id: dataElement.dataElement, value: dataElement.value, sortOrder: $scope.dataElementsForProgramStageAss[dataElement.dataElement].sortOrder}); 
        });

        dataElementsWithSortOrder.sort(function(a,b){
            return a.sortOrder - b.sortOrder;
        });

        currentEvent.dataValuesAsString = "";            
        angular.forEach(dataElementsWithSortOrder, function(dataElementWithSortOrder){                                                
            if(currentEvent.dataValuesAsString !== ""){
                currentEvent.dataValuesAsString += " ";
            }                
            currentEvent.dataValuesAsString += CommonUtils.formatDataValue(currentEvent, dataElementWithSortOrder.value, $scope.dataElementsForProgramStageAss[dataElementWithSortOrder.id], $scope.optionSets, 'USER');
        });
    };
    
    $scope.addEvent = function(event){
        $scope.eventsInProgramStage.push(event);               
        $scope.sortEvents();        
    };
    
    $scope.sortEvents = function(){
        
        var sortBy = ['eventDate'];                
        if(angular.isDefined($scope.widget.sortBy)){
            var widgetSortBy = $scope.widget.sortBy;
            if(angular.isArray(widgetSortBy)){
                for(var i = 0; i < widgetSortBy.length; i++){
                    sortBy.push(widgetSortBy[i]);
                }
            }
            else if(angular.isString(widgetSortBy)){
                sortBy.push(widgetSortBy);
            }
        }        
        sortBy.push('event');
        
        $scope.eventsInProgramStage.sort(function(a,b){
            
            var result = 0;
            
            for(var i = 0; i < sortBy.length; i++){                                
                
                if(angular.isUndefined(a[sortBy[i]]) && angular.isUndefined(b[sortBy[i]])){
                    result = 0;
                }
                else if(angular.isUndefined(a[sortBy[i]])){
                    result = -1;
                }
                else if(angular.isUndefined(b[sortBy[i]])){
                    result = 1;
                }
                else if(sortBy[i] === 'eventDate'){
                    result = new Date(a.eventDate) - new Date(b.eventDate);
                }
                else {
                    result = a[sortBy[i]].localeCompare(b[sortBy[i]]);
                }
                
                if(result !== 0){
                    break;
                }
            }            
            return result;
        });
    };
    
    function sortDataElements(){
        $scope.dataElementsForProgramStage.sort(function(a,b){
            
            return a.sortOrder - b.sortOrder;
            
        });
        
        $scope.widget.show = $scope.dataElementsForProgramStage && $scope.dataElementsForProgramStage.length > 0;
    }
    
    $scope.saveEventDate = function(event, modelCtrl){
        
        if(modelCtrl.$invalid){
            return;
        }
        
        var eventDate = event.eventDate;
        $scope.currentElement = {id: 'eventDate', event: event.event, status: $scope.elementStatuses.pending};
        
        if(angular.isUndefined($scope.eventOrginal[event.event]) || $scope.eventOrginal[event.event].eventDate !== eventDate){
            if(angular.isDefined(event.notPersisted) && event.notPersisted === true){
                return $scope.dataEntryControllerData.persistEvent(event, $scope.programStage, $scope.optionSets, false)
                    .then(function(){
                        $scope.eventOrginal[event.event] = angular.copy(event);
                        $scope.currentElement = {id: 'eventDate', event: event.event, status: $scope.elementStatuses.saved};
                    });
            }
            else {
                
                var e = angular.copy(event);
                e.eventDate = DateUtils.formatFromUserToApi(e.eventDate);
                e.dueDate = DateUtils.formatFromUserToApi(e.dueDate);
                
                DHIS2EventFactory.updateForEventDate(e).then(function (data) {
                    $scope.eventOrginal[event.event] = angular.copy(event);
                    $scope.currentElement = {id: 'eventDate', event: event.event, status: $scope.elementStatuses.saved};
                });               
                
            }
        }
        
    }
    
    
    $scope.saveDataValueForRadio = function (dataElement, event, value){
        event[dataElement.id] = value; 
        return $scope.saveDataValueWithPreAction(dataElement, event);
    };
    
    $scope.saveDataValueWithPreAction = function(dataElement, event){        
        
        if(angular.isUndefined($scope.eventOrginal[event.event]) || $scope.eventOrginal[event.event][dataElement.id] !== event[dataElement.id]){
            
            if(dataElement.id === "RO9lM47fth5" && event[dataElement.id] === "false"){
                return $scope.actions[event.event].notes().then(function(){                    
                    return $scope.saveDataValue(dataElement, event);
                }, function(){                    
                });
            }
            else {
                return $scope.saveDataValue(dataElement, event);
            }
        }        
    };    
    
    $scope.saveDataValue = function(dataElement, event){
            
        var value = CommonUtils.formatDataValue(event, event[dataElement.id], dataElement, $scope.optionSets, 'API');            
        
        $scope.currentElement = {id: dataElement.id, event: event.event, status: $scope.elementStatuses.pending, value: value};
                
        if(angular.isDefined(event.notPersisted) && event.notPersisted === true){
            return $scope.dataEntryControllerData.persistEvent(event, $scope.programStage, $scope.optionSets, true)
                    .then(function(){
                        $scope.eventOrginal[event.event] = angular.copy(event);
                        $scope.currentElement = {id: dataElement.id, event: event.event, status: $scope.elementStatuses.saved, value: value};
                    });
        }
        else {                        

            var ev = {event: event.event,
                orgUnit: event.orgUnit,
                program: event.program,
                programStage: event.programStage,
                status: event.status,
                trackedEntityInstance: event.trackedEntityInstance,
                dataValues: [
                    {
                        dataElement: dataElement.id,
                        value: value,
                        providedElsewhere: event.providedElsewhere[dataElement.id] ? true : false
                    }
                ]
            };

            return DHIS2EventFactory.updateForSingleValue(ev).then(function (response) {
                $scope.eventOrginal[event.event] = angular.copy(event);
                $scope.dataEntryControllerData.executeRules();
                $scope.currentElement = {id: dataElement.id, event: event.event, status: $scope.elementStatuses.saved, value: value};
                return "saved";            
            });   
        }

        
            
    };  
    
    $scope.switchToEvent = function(event){       
       
        if($scope.currentEvent !== event){
            $scope.currentEvent = event;
        }    
        
    };
    
    $scope.elementStatuses = {saved: 1, error: 2, pending: 3};
    $scope.getInputNotificationClass = function(event, element, value, foreground){
        
        if(angular.isUndefined($scope.currentElement)){
            return '';
        }
        
        if(event === $scope.currentElement.event && element === $scope.currentElement.id){
            if(angular.isDefined(value)){
                if(value !== $scope.currentElement.value){
                    return '';
                }
            }
            
            var styleClass;
            
            if($scope.currentElement.status === $scope.elementStatuses.saved){
                styleClass = 'input-success';                
            }
            else if($scope.currentElement.status === $scope.elementStatuses.error){
                styleClass = 'input-error';
            }
            else if($scope.currentElement.status === $scope.elementStatuses.pending){
                styleClass = 'input-pending';
            }
            else {
                return '';
            }
            
            if(angular.isDefined(foreground) && foreground === true){
                    styleClass += '-foreground';
            }
            return styleClass;
        }
        return '';
    };
    
    $scope.getEventStyle = function (ev, excludeCommonStyle) {
        
        var style = EventUtils.getEventStatusColor(ev);
        
        if ($scope.currentEvent && $scope.currentEvent.event === ev.event) {
            style = style + ' current-event';
        }
        
        if(angular.isUndefined(excludeCommonStyle) || excludeCommonStyle !== true){
            style += $scope.getCommonStyle(ev, true);
        }
        
        return style;
    };
    
    $scope.getEventStyleNotActive = function(ev){
        
        var style = 'col-md-12';
        style += $scope.getCommonStyle(ev, true);        
        return style;        
    }
    
    $scope.getCommonStyle = function(ev, addLeadingSpace){
        
        var style = "";
        if(angular.isDefined($scope.widget.importantTexts)){
            var importantTexts = $scope.widget.importantTexts;
            if(angular.isDefined(ev[importantTexts.dataElement]) && ev[importantTexts.dataElement] !== ""){
                var eventText = ev[importantTexts.dataElement].toUpperCase();
                for(var i = 0; i < importantTexts.texts.length; i++){
                    if(eventText.indexOf(importantTexts.texts[i].toUpperCase()) !== -1){
                        style += 'important-texts-in-event-overview';
                        if(addLeadingSpace === true){
                            style = " " + style;
                        }
                        break;
                    }
                }
            }
        }
        return style;
    }
    
    $scope.getBooleanString = function (value){
       
        if(value === "true"){
            return 'Yes';
        }
        else if(value === "false"){
            return 'No';
        }
        else {
            return '';
        }
    };
    
    $scope.$watch('currentEventWrapped.currentEvent', function(newEvent, oldEvent){
        if(angular.isDefined(newEvent)){
            if(newEvent !== oldEvent && newEvent !== $scope.currentEvent){
                $scope.currentEvent = newEvent;
            }
        }    
    });
    
    $scope.$watch('currentEvent', function(newEvent, oldEvent){        
        if(angular.isDefined(newEvent)){
            if(newEvent !== oldEvent && newEvent !== $scope.currentEventWrapped.currentEvent){
                $scope.currentEventWrapped.currentEvent = newEvent;    
            }            
        }        
    });
    
    $scope.deselectCurrent = function(id){        
        if($scope.currentEvent.event === id){            
            $scope.currentEvent = {};
            $scope.sortEvents();
        }        
    };
    
    var managementActionsWithLink = { highRiskClinic: "referral to high risk clinic" };
    
    $scope.provideManagementLink = function(managementAction){ 
        
        if(!managementAction) {
            return false;
        }
        
        var managementActionLC = managementAction.toLowerCase();
        
        for(var key in managementActionsWithLink){
            if(managementActionsWithLink[key] === managementActionLC){
                return true;
            }
        }
        return false;        
    };
    
    $scope.managementAction = function(referText){
        
        var actions = managementActionsWithLink;
        
        var referTextLC = referText.toLowerCase();
       
        switch(referTextLC){
            case actions.highRiskClinic:
                $scope.createReferraleventForProgramStage('edqlbukwRfQ');
                break;
            default:                
                break;
        }                
    };
    
    $scope.createReferraleventForProgramStage = function(programStageId){
                
        if(angular.isDefined($scope.dataEntryControllerData) && angular.isDefined($scope.dataEntryControllerData.programStages) && angular.isDefined($scope.dataEntryControllerData.eventsByStage)){
                        
            var stage = getProgramStage(programStageId, $scope.dataEntryControllerData.programStages);
        
            EventCreationService.showModal($scope.dataEntryControllerData.eventsByStage,stage,null, null, $scope.selectedEntity,$scope.selectedProgram, $scope.selectedOrgUnit,$scope.selectedEnrollment,false,EventCreationService.eventCreationActions.referral, null)
                    .then(function(eventContainer) {
                        if(angular.isDefined(eventContainer)){                
                            var ev = eventContainer.ev;
                            var dummyEvent = eventContainer.dummyEvent;      

                            if (angular.isObject(ev) && angular.isObject(dummyEvent)) {

                                var newEvent = ev;
                                newEvent.orgUnitName = dummyEvent.orgUnitName;
                                newEvent.displayName = dummyEvent.displayName;
                                newEvent.excecutionDateLabel = dummyEvent.excecutionDateLabel;
                                newEvent.sortingDate = ev.eventDate ? ev.eventDate : ev.dueDate,
                                newEvent.statusColor = EventUtils.getEventStatusColor(ev);
                                newEvent.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                                newEvent.dueDate = DateUtils.formatFromApiToUser(ev.dueDate);
                                newEvent.enrollmentStatus = dummyEvent.enrollmentStatus;

                                if (dummyEvent.coordinate) {
                                    newEvent.coordinate = {};
                                }

                                if(angular.isDefined($scope.dataEntryControllerData.addNewEvent)){
                                    $scope.dataEntryControllerData.addNewEvent(newEvent);
                                }
                            } 
                        }

                    }, function(){
                        //error
                    });
        }        
    };
    
    function getProgramStage(id, stages){
        for(var i = 0; i < stages.length; i++){
            var stage = stages[i];
            if(stage.id === id){
                return stage;
            }
        }        
    }
    
    $scope.tableRowStatusButtonsEnabled = function(event){        
        return event.orgUnit === $scope.selectedOrgUnit.id && $scope.selectedEntity.inactive === false && $scope.selectedEnrollment.status === 'ACTIVE';
    };
    
    $scope.$on('removeNotSavedEvents', function(event, args){
        
    });
    //listen for new events created
    $scope.$on('eventcreated', function (event, args) {
       
        if($scope.programStageIdFilter === args.event.programStage){
            $scope.addUserFormattedDataValuesForEvent(args.event);
            $scope.addEvent(args.event);
        }        
    });
    
    $scope.$on('dataEntryControllerData', function (event, args) {  
        $scope.dataEntryControllerData = args;
    });
    
});
