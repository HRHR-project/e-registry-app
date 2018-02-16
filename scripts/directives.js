/* global directive, selection, dhis2, angular */

'use strict';

/* Directives */

var eRegistryDirectives = angular.module('eRegistryDirectives',[]);

eRegistryDirectives.directive('stringToNumber', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function (value) {
                return '' + value;
            });
            ngModel.$formatters.push(function (value) {
                return parseFloat(value, 10);
            });
        }
    };
})
.directive('heightChangeSource', function ($window) {
    return {
        link: function (scope, element, attrs) {
            element.css("width","100%");
            var w = angular.element($window);
            scope.getWindowDimensions = function () {
                return {
                    'h': w.height(),
                    'w': w.width()
                };
            };
            scope.$watch(function(){
                if(element.height()!== scope._height){
                    scope._height = element.height();
                }
            });
            scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
                if(scope._height !== element.height()){
                    scope._height = element.height();
                    console.log("heightChangeSourceb");
                }

            }, true);
            
            w.bind('resize', function () {
                scope.$apply();
            });
        }
    };
})
.directive('heightChangeTarget', function () {
    return {
        link: function (scope, element, attrs) {
            scope.$watch('_height', function (newValue, oldValue) {
                if(newValue && newValue !== oldValue){
                    element.css('padding-top',newValue);     
                }

            }, true);
        }
    };
})

.directive('eventstatusInTable', function (){
    return {
        restrict: 'E',
        templateUrl: 'components/dataentry/eventstatus-in-table.html',
        scope: {
            event: '=',            
            chosenEventWrapped: '=', //two-way-binding not working if not wrapped in object!
            getEventStyle: '&',
            programStage: '=',
            optionSets: '=',            
            completeActionCustom: '=', //optional
            reopenActionCustom: '=', //optional
            validateActionCustom: '=', //optional
            deleteActionCustom: '=', //optional
            skipActionCustom: '=', //optional
            unskipActionCustom: '=', //optional
            notesActionCustom: '=', //optional            
            applicableButtons: '=', //optional
            actions: '=',
            allEvents: '=',
            formData: '=',
            buttonsEnabled: '&',
            deleteActionExtended: '&',
            persistEventFunction: '='
        },
        controller: [
            '$scope',
            '$element',
            '$attrs',
            '$q',
            'EventUtils',
            'DHIS2EventFactory',
            'DialogService',
            '$translate',
            function($scope, $element, $attrs, $q, EventUtils, DHIS2EventFactory, DialogService, $translate){
                
                $scope.EVENTSTATUSCOMPLETELABEL = "COMPLETED";
                $scope.EVENTSTATUSSKIPPEDLABEL = "SKIPPED";
                $scope.EVENTSTATUSVISITEDLABEL = "VISITED";
                $scope.EVENTSTATUSACTIVELABEL = "ACTIVE";
                $scope.EVENTSTATUSSCHEDULELABEL = "SCHEDULE";
                var COMPLETE = "Complete";
                var INCOMPLETE = "Incomplete";
                var VALIDATE = "Validate";
                var DELETE = "Delete";    
                var SKIP = "Skip";
                var UNSKIP = "Unskip";
                var NOTE = "Note";     
                
                $scope.completeAction = function() {                    
                    if(angular.isDefined($scope.completeActionCustom)){
                        $scope.completeActionCustom();
                    }
                    else {
                        $scope.completeActionDefault();
                    }
                };     
                
                $scope.reopenAction = function() {                    
                     if(angular.isDefined($scope.reopenActionCustom)){
                        $scope.reopenActionCustom();
                    }
                    else {
                        $scope.reopenActionDefault();
                    }                  
                };
                
                $scope.validateAction = function(){
                    if(angular.isDefined($scope.validateActionCustom)){
                        $scope.validateActionCustom();
                    }                    
                };
                
                $scope.deleteAction = function(){
                    
                    if(angular.isDefined($scope.deleteActionCustom)){
                        $scope.deleteActionCustom();
                    }
                    else {
                        var promise = $scope.deleteActionDefault();
                        if(angular.isDefined($scope.deleteActionExtended)){
                            promise.then(function(){
                                $scope.deleteActionExtended();
                            });
                        }                        
                    }

                };
                
                $scope.skipAction = function(){
                    if(angular.isDefined($scope.skipActionCustom)){
                        $scope.skipActionCustom();
                    }                    
                };
                
                $scope.unskipAction = function(){
                    if(angular.isDefined($scope.unskipActionCustom)){
                        $scope.unskipActionCustom();
                    }                    
                };
                
                $scope.showNotes = function(){
                    if(angular.isDefined($scope.notesActionCustom)){
                        $scope.notesActionCustom();
                    }
                    else {
                        $scope.notesModal();
                    }                                       
                };
                
                $scope.showNoteExistsIcon = true;
                if(angular.isDefined($scope.applicableButtons)){
                    $scope.showNoteExistsIcon = false;
                    for(var i = 0; i < $scope.applicableButtons.length; i++){
                        if($scope.applicableButtons[i] === NOTE){
                            $scope.showNoteExistsIcon = true;
                            break;
                        }
                    }
                }
                
                $scope.notesSummary = function(){
                    var summary = "";
                    angular.forEach($scope.event.notes, function(note){                        
                        if(summary !== ""){
                            summary += "<br/>";
                        }
                        
                        if(note.value.length > 30){
                            //find index of space
                            var noteSubstring = note.value.substr(0, 30);
                            var lastSpace = noteSubstring.lastIndexOf(" ");
                            if(lastSpace !== -1){
                                noteSubstring = noteSubstring.substr(0, lastSpace + 1);
                            }                            
                            
                            summary += "- " + noteSubstring + "...";
                        }
                        else {
                            summary += "- " + note.value;
                        }
                    });
                    
                    var summaryHeader = $translate.instant('notes');
                    summaryHeader += ":<br/>";
                    
                    var summaryFooter = "<br/>(" + $translate.instant('click_to_edit_view_complete_notes') + ")";
                    summary = "<p align='left'>" + summaryHeader + summary + summaryFooter + "</p>";
                    return summary;
                };
                
                $scope.eventTableOptions = {};    
                $scope.eventTableOptions[COMPLETE] = {text: "Complete", tooltip: 'Complete', icon: "<span class='glyphicon glyphicon-check'></span>", value: COMPLETE, onClick: $scope.completeAction, sort: 0};
                $scope.eventTableOptions[INCOMPLETE] = {text: "Reopen", tooltip: 'Reopen', icon: "<span class='glyphicon glyphicon-pencil'></span>", value: INCOMPLETE, onClick: $scope.reopenAction, sort: 1};
                $scope.eventTableOptions[VALIDATE] = {text: "Validate", tooltip: 'Validate', icon: "<span class='glyphicon glyphicon-cog'></span>", value: VALIDATE, onClick: $scope.validateAction, sort: 2};    
                $scope.eventTableOptions[DELETE] = {text: "Delete", tooltip: 'Delete', icon: "<span class='glyphicon glyphicon-floppy-remove'></span>", value: DELETE, onClick: $scope.deleteAction, sort: 3};
                $scope.eventTableOptions[SKIP] = {text: "Skip", tooltip: 'Skip', icon: "<span class='glyphicon glyphicon-step-forward'></span>", value: SKIP, onClick: $scope.skipAction, sort: 4};
                $scope.eventTableOptions[UNSKIP] = {text: "Schedule back", tooltip: 'Schedule back', icon: "<span class='glyphicon glyphicon-step-backward'></span>", value: UNSKIP, onClick: $scope.unskipAction, sort: 5};
                $scope.eventTableOptions[NOTE] = {text: "Notes", tooltip: 'Show notes', icon: "<span class='glyphicon glyphicon-list-alt'></span>", value: NOTE, onClick: $scope.showNotes, sort: 6};
                
                $scope.event.validatedEventDate = $scope.event.eventDate;   
    
                updateEventTableOptions();

                $scope.$watch("event.status", function(newValue, oldValue){        
                    
                    if(newValue !== oldValue){
                        updateEventTableOptions();
                    }
                });

                $scope.$watch("validatedDateSetForEvent", function(newValue, oldValue){                        

                    if(angular.isDefined(newValue)){
                        if(!angular.equals(newValue, {})){
                            var updatedEvent = newValue.event;
                            if(updatedEvent === $scope.event){                    
                                    $scope.event.validatedEventDate = newValue.date; 
                                    updateEventTableOptions();                    
                            }
                        }
                    } 
                });

                function updateEventTableOptions(){

                    var eventRow = $scope.event;        

                    for(var key in $scope.eventTableOptions){
                        $scope.eventTableOptions[key].show = true;
                        $scope.eventTableOptions[key].disabled = false;
                    }

                    $scope.eventTableOptions[UNSKIP].show = false;        

                    switch(eventRow.status){
                        case $scope.EVENTSTATUSCOMPLETELABEL:
                            $scope.eventTableOptions[COMPLETE].show = false;
                            $scope.eventTableOptions[SKIP].show = false;                            
                            $scope.eventTableOptions[VALIDATE].show = false;                                      
                            $scope.defaultOption = $scope.eventTableOptions[INCOMPLETE];
                            $scope.defaultOption2 = $scope.eventTableOptions[DELETE];
                            break;
                        case $scope.EVENTSTATUSSKIPPEDLABEL:
                            $scope.eventTableOptions[COMPLETE].show = false;
                            $scope.eventTableOptions[INCOMPLETE].show = false;
                            $scope.eventTableOptions[VALIDATE].show = false;                
                            $scope.eventTableOptions[SKIP].show = false;

                            $scope.eventTableOptions[UNSKIP].show = true;
                            $scope.defaultOption = $scope.eventTableOptions[UNSKIP];
                            $scope.defaultOption2 = $scope.eventTableOptions[DELETE];
                            break;            
                        default:                 
                            if(eventRow.validatedEventDate){
                                $scope.eventTableOptions[INCOMPLETE].show = false;
                                $scope.defaultOption = $scope.eventTableOptions[COMPLETE];
                                $scope.defaultOption2 = $scope.eventTableOptions[DELETE];
                            }
                            else {
                                $scope.eventTableOptions[INCOMPLETE].show = false;                    
                                $scope.eventTableOptions[VALIDATE].show = false;
                                $scope.eventTableOptions[COMPLETE].disabled = true;
                                $scope.defaultOption = $scope.eventTableOptions[COMPLETE];
                                $scope.defaultOption2 = $scope.eventTableOptions[DELETE];
                            }                          
                            break;
                    }

                    createOptionsArray();
                }

                function createOptionsArray(){
                    $scope.eventTableOptionsArr = [];                            
                   
                    if(angular.isDefined($scope.applicableButtons)){
                        var defaultFound = false;
                        for(var key in $scope.eventTableOptions){
                            var show = false;
                            
                            for(var i = 0; i < $scope.applicableButtons.length; i++){
                                if($scope.applicableButtons[i] === key){
                                    show = true;
                                    break;
                                }
                            }
                            
                            if(show){
                                if($scope.eventTableOptions[key] === $scope.defaultOption){
                                    defaultFound = true;
                                }
                                $scope.eventTableOptionsArr.push($scope.eventTableOptions[key]);
                            }
                        }
                        
                        $scope.eventTableOptionsArr.sort(function(a,b){                           
                            return a.sort - b.sort;
                        });
                        
                        if(!defaultFound){
                            $scope.defaultOption = $scope.defaultOption2;
                        }
                    }
                    else {
                        for(var key in $scope.eventTableOptions){
                            $scope.eventTableOptionsArr[$scope.eventTableOptions[key].sort] = $scope.eventTableOptions[key];
                        }
                    }
                }
                
                //-----------                
                $scope.notesModal = function(){
                    
                    var def = $q.defer();
                    
                    var bodyList = [];
                    if($scope.event.notes) {
                        for(var i = 0; i < $scope.event.notes.length; i++){
                            var currentNote = $scope.event.notes[i];            
                            bodyList.push({value1: currentNote.storedDate, value2: currentNote.value});
                        }
                    }

                    var dialogOptions = {
                        closeButtonText: 'Close',            
                        textAreaButtonText: 'Add',
                        textAreaButtonShow: $scope.event.status === $scope.EVENTSTATUSSKIPPEDLABEL ? false : true,
                        headerText: 'Notes',
                        bodyTextAreas: [{model: 'note', placeholder: 'Add another note here', required: true, show: $scope.event.status === $scope.EVENTSTATUSSKIPPEDLABEL ? false : true}],
                        bodyList: bodyList,
                        currentEvent: $scope.event,
                        persistEventFunction: $scope.persistFromModal
                        
                    };        

                    var dialogDefaults = {

                        templateUrl: 'views/list-with-textarea-modal.html',
                        controller: function ($scope, $modalInstance, DHIS2EventFactory, DateUtils, $translate) {                    
                                $scope.modalOptions = dialogOptions;
                                $scope.formSubmitted = false;
                                $scope.currentEvent = $scope.modalOptions.currentEvent;
                                $scope.textAreaValues = [];
                                $scope.errorMsg = "";

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
                                    
                                    $scope.errorMsg = "";
                                    
                                    if(angular.isUndefined($scope.currentEvent.notPersisted) || $scope.currentEvent.notPersisted === false){
                                        $scope.executeAddNote().catch(function(){
                                            $scope.errorMsg = $translate.instant('generic_error_message');
                                        });
                                    }
                                    else {                                        
                                        $scope.modalOptions.persistEventFunction($scope.currentEvent).then(function(){
                                           return $scope.executeAddNote(); 
                                        })
                                        .catch(function(error){
                                           $scope.errorMsg = $translate.instant('generic_error_message');
                                        });
                                    }
                                };
                                
                                $scope.executeAddNote = function(){
                                    
                                    var newNote = {value: $scope.note};
                                    var date = DateUtils.formatToHrsMins(new Date());                                    
                                    
                                    
                                    var e = {event: $scope.currentEvent.event,
                                            program: $scope.currentEvent.program,
                                            programStage: $scope.currentEvent.programStage,
                                            orgUnit: $scope.currentEvent.orgUnit,
                                            trackedEntityInstance: $scope.currentEvent.trackedEntityInstance,
                                            notes: [newNote]
                                    };                                                                        
                                    
                                    return DHIS2EventFactory.updateForNote(e).then(function (data) {
                                        if (angular.isUndefined($scope.modalOptions.bodyList) || $scope.modalOptions.bodyList.length === 0) {
                                            $scope.modalOptions.bodyList = [{value1: date, value2: newNote.value}];
                                            $scope.modalOptions.currentEvent.notes = [{storedDate: date, value: newNote.value}];
                                        }
                                        else {
                                            $scope.modalOptions.bodyList.splice(0, 0, {value1: date, value2: newNote.value});
                                            $scope.modalOptions.currentEvent.notes.splice(0,0,{storedDate: date, value: newNote.value});
                                        }
                                            $scope.note = $scope.textAreaValues["note"] = "";
                                    });
                                    
                                };
                            }            
                    };

                    DialogService.showDialog(dialogDefaults, dialogOptions).then(function(e){                        
                        $scope.event.notes = e.notes;
                        def.resolve();
                    });
                    
                    return def.promise;
                };   
                
                if(angular.isDefined($scope.actions)){                    
                    $scope.actions[$scope.event.event] = {};
                    $scope.actions[$scope.event.event].notes = $scope.notesModal;
                }
                //-----------
                
                $scope.persistFromModal = function(event){
                    return $scope.persistEventFunction(event, $scope.programStage, $scope.optionSets, true);
                };
                
                $scope.deleteActionDefault = function() {
                    
                    if(angular.isUndefined($scope.event.notPersisted) || $scope.event.notPersisted === false){
                        return DHIS2EventFactory.delete($scope.event).then(function (data) {
                            $scope.removeEventFromAllEvents();                            
                        });
                    }
                    else {
                        $scope.removeEventFromAllEvents();
                        return $q.when();
                    }                    
                };
                
                $scope.removeEventFromAllEvents = function(){
                    
                    var foundIndex = -1;
                    //find index
                    for(var i = 0; i < $scope.allEvents.length; i++){
                        if($scope.allEvents[i] === $scope.event){
                            foundIndex = i;
                            break;
                        }
                    }

                    if(foundIndex !== -1){
                        $scope.allEvents.splice(foundIndex,1);                            
                    }
                    setChosenEventToNothing();
                };
                
                $scope.completeActionDefault = function() {                    
                    
                    $scope.event.submitted = true;
                    if($scope.formData.$valid){
                        if(angular.isUndefined($scope.event.notPersisted) || $scope.event.notPersisted === false){
                            var dhis2EventToUpdate = makeDhis2EventToUpdate();
                            dhis2EventToUpdate.status = $scope.EVENTSTATUSCOMPLETELABEL;
                            DHIS2EventFactory.update(dhis2EventToUpdate).then(function (data) {
                                $scope.event.status = $scope.EVENTSTATUSCOMPLETELABEL;                                                  
                                setChosenEventToNothing();  

                                //reset dataElementStatus for event
                                $scope.event.deStatus = {};
                            }, function(){

                            });
                        }
                        else{
                            //make event
                            var tempStatus = $scope.event.status;
                            $scope.event.status = $scope.EVENTSTATUSCOMPLETELABEL;
                            $scope.persistEventFunction($scope.event, $scope.programStage, $scope.optionSets, true).then(function(){                                
                                setChosenEventToNothing();
                                //reset dataElementStatus for event
                                $scope.event.deStatus = {};
                            }, function(){
                                $scope.event.status = tempStatus;
                            });
                        }
                    }
                };
                
                $scope.reopenActionDefault = function () {
                    
                    if(angular.isUndefined($scope.event.notPersisted) || $scope.event.notPersisted === false){
                        var dhis2EventToUpdate = makeDhis2EventToUpdate();
                        dhis2EventToUpdate.status = $scope.EVENTSTATUSACTIVELABEL;
                        DHIS2EventFactory.update(dhis2EventToUpdate).then(function (data) {
                            $scope.event.status = $scope.EVENTSTATUSACTIVELABEL;
                        });
                    }
                    else {
                        //make event
                        var tempStatus = $scope.event.status;
                        $scope.event.status = $scope.EVENTSTATUSACTIVELABEL;
                        $scope.persistEventFunction($scope.event, $scope.programStage, $scope.optionSets, true).then(function(){
                                                
                        }, function(){
                            $scope.event.status = tempStatus;
                        });
                    }                    
                };
                
                function makeDhis2EventToUpdate() {
                    
                    var dhis2EventToUpdate = {};
                    
                    if(angular.isDefined($scope.programStage) && angular.isDefined($scope.optionSets)){
                                                
                        var dhis2Event = EventUtils.reconstruct($scope.event, $scope.programStage, $scope.optionSets);
                        dhis2EventToUpdate = angular.copy(dhis2Event);
                    }
                    else {
                        dhis2EventToUpdate = angular.copy($scope.event);                      
                    }
                    
                    /*
                    dhis2EventToUpdate.dataValues = [];
                    
                    for(var key in $scope.event[assocValuesProp]){
                        dhis2EventToUpdate.dataValues.push($scope.event[assocValuesProp][key]);
                    } */                   
                    
                    return dhis2EventToUpdate;
                }
                
                function setChosenEventToNothing(){
                    $scope.chosenEventWrapped.currentEvent = {};
                }
                
                $scope.$watch('chosenEventWrapped.currentEvent', function(newEvent, oldEvent){                          
                    if(angular.isDefined(newEvent)){
                        
                        if(newEvent !== oldEvent){
                            $scope.chosenEvent = newEvent;
                        }
                    }                                        
                });
                
                
            }
        ]
    };
})
.directive('dhis2RadioButton', function (){  
    return {
        restrict: 'E',
        templateUrl: 'views/dhis2-radio-button.html',        
        scope: {            
            value: '=ngModel',
            disabled: '=dhDisabled',            
            customOnClick: '&dhClick',
            currentElement: '=dhCurrentElement',
            event: '=dhEvent',
            id: '=dhId',
            useExternalButtonColorExp: '=dhUseExternalButtonColorExp',
            buttonColorClass: '&dhButtonColorClass'
        },
        controller: [
            '$scope',
            '$element',
            '$attrs',
            '$q',   
            'CommonUtils',
            function($scope, $element, $attrs, $q, CommonUtils){
                
                $scope.status = "";                
                $scope.clickedButton = "";
                $scope.keepNewValueEvenOnError = true;                
                
                $scope.valueClicked = function (buttonValue){
                    
                    $element.trigger('change');
                    
                    $scope.clickedButton = buttonValue;
                    
                    var originalValue = $scope.value;
                    var tempValue = buttonValue;
                    if($scope.value === buttonValue){
                        tempValue = "";
                    }
                    
                    if(angular.isDefined($scope.customOnClick)){
                        var promise = $scope.customOnClick({value: tempValue});
                        
                        if(angular.isDefined(promise) && angular.isDefined(promise.then)){
                            promise.then(function(status){
                                
                                if(angular.isUndefined(status) || status !== "notSaved"){
                                    $scope.status = "saved";                                    
                                }           
                            }, function(){   
                                $scope.status = "error";                                
                            });
                        }                       
                    }   
                };
                
                $scope.getDisabledValue = function(inValue){                    
                    return CommonUtils.displayBooleanAsYesNo(inValue);                    
                };
                
                $scope.getDisabledIcon = function(inValue){                    
                    if(inValue === true || inValue === "true"){
                        return "fa fa-check";
                    }
                    else if(inValue === false || inValue === "false"){
                        return "fa fa-times";
                    }
                    return '';
                };
                
            }],
        link: function (scope, element, attrs) {
           
            scope.radioButtonColor = function(buttonValue){
                
                if(angular.isDefined(scope.useExternalButtonColorExp) && scope.useExternalButtonColorExp === true){
                    var backgroundClass = scope.buttonColorClass({value: buttonValue});
                    if(backgroundClass === ''){
                        return 'radio-white'; 
                    }
                    return backgroundClass;
                }
                else {
                    if(scope.value !== ""){
                        if(scope.status === "saved"){
                            if(angular.isUndefined(scope.currentElement) || (scope.currentElement.id === scope.id && scope.currentElement.event === scope.event)){
                                if(scope.clickedButton === buttonValue){
                                    return 'radio-save-success';
                                }
                            }                                                                    
                        }
                    }                
                    return 'radio-white';                    
                }
            };

            scope.radioButtonImage = function(buttonValue){        

                if(angular.isDefined(scope.value)){
                    if(scope.value === buttonValue && buttonValue === "true"){
                        return 'fa fa-stack-1x fa-check';                
                    }            
                    else if(scope.value === buttonValue && buttonValue === "false"){
                        return 'fa fa-stack-1x fa-times';
                    }
                }
                return 'fa fa-stack-1x';        
            };    
        }
    };
})

/*.directive('dhis2Deselect', function ($document) {
    return {
        restrict: 'A',
        scope: {
            onDeselected: '&dhOnDeselected',
            id: '@dhId',
            preSelected: '=dhPreSelected'                   
        },
        controller: [
            '$scope',
            '$element',
            '$attrs',
            '$q',            
            function($scope, $element, $attrs, $q){
                
                $scope.documentEventListenerSet = false;
                $scope.elementClicked = false;
                
                $element.on('click', function(event) {                    
                                        
                    $scope.elementClicked = true;
                    if($scope.documentEventListenerSet === false){
                        $document.on('click', $scope.documentClick);
                        $scope.documentEventListenerSet = true;
                    }                             
                });
                
                $scope.documentClick = function(event){
                    
                    var modalPresent = $(".modal-backdrop").length > 0;
                    var calendarPresent = $(".calendars-popup").length > 0;
                    var calendarPresentInEvent = $(event.target).parents(".calendars-popup").length > 0;
                    
                    if($scope.elementClicked === false && 
                        modalPresent === false && 
                        calendarPresent === false && 
                        calendarPresentInEvent === false){                        
                        $scope.onDeselected({id:$scope.id});
                        $scope.$apply();  
                        $document.off('click', $scope.documentClick);
                        $scope.documentEventListenerSet = false;
                    }
                    $scope.elementClicked = false;
                };
                
                if(angular.isDefined($scope.preSelected) && $scope.preSelected === true){                    
                    $document.on('click', $scope.documentClick);
                    $scope.documentEventListenerSet = true;
                }
                
            }],
        link: function (scope, element, attrs) {}
    };
})*/

.directive('onEditingCssClass', [function(){
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ctrl) {                                
             
                var elementNr = ctrl.$parsers.push(addClass) - 1;
                
                function addClass(value){
                    if(!element.hasClass(attrs.onEditingCssClass)){
                        element.addClass(attrs.onEditingCssClass);
                    }                    
                    
                    if(ctrl.$parsers.length > elementNr && elementNr !== -1){
                            ctrl.$parsers.splice(elementNr, 1);
                            elementNr = -1;
                    }
                    
                    return value;
                }
                
                
                element.on('blur', function(event){
                    if(element.hasClass(attrs.onEditingCssClass)){
                        element.removeClass(attrs.onEditingCssClass);
                    }
                    
                    if(elementNr === -1){
                        elementNr = ctrl.$parsers.push(addClass) - 1;
                    }
                    
                });
            }
        };
}])

.directive('erUsersInput', function(){
    return {
        restrict: 'E',
        templateUrl: 'views/users-input.html',
        scope: {
            d2Model: '=',
            d2ModelId: '=',
            d2Required: '=',
            d2Disabled: '=',
            d2SelectedOrgunitId: '=',
            d2SaveMethode: '&',
            d2SaveMethodeParameter1: '=',
            d2SaveMethodeParameter2: '=',
            d2MaxOptionSize: '=',
            d2AttributeData: '@',
            d2SelectedProgramId: '@',
            d2SelectedTeiId: '@'
            
        },
        link: function (scope, element, attrs) {

        },
        controller: function($scope, UsersService, OrgUnitFactory) {
            $scope.$watch("d2SelectedOrgunitId", function(newValue, oldValue){
                $scope.allUsers = [];        
                $scope.temp = UsersService.getAll().then(function(users){
                    var temp = [];
                    if($scope.d2SelectedOrgunitId) {
                        var relatedOrgunits = OrgUnitFactory.get($scope.d2SelectedOrgunitId).then(function(selectedOrgUnit) {
                            angular.forEach(users, function(user){  
                                //Hardcoded for Bangladesh (Checks if the user has a certain role).
                                if(user.roles.map(function(user) { return user.id; }).indexOf('lItc9BR90WI') >= 0 || user.roles.map(function(user) { return user.id; }).indexOf('UUICdmkm35V') >= 0) {
                                    angular.forEach(user.orgUnits, function(orgUnit){  
                                        if(selectedOrgUnit.organisationUnits[0].id === orgUnit.id && $scope.allUsers.indexOf(user) === -1) {
                                            $scope.allUsers.push(user);
                                        }
                                    });
                                }
                            });
                        });
                    //No OrgUnit selected.
                    } else {
                        //Hardcoded for Bangladesh (Checks if the user has a certain role).
                        angular.forEach(users, function(user){  
                            if(user.roles.map(function(user) { return user.id; }).indexOf('lItc9BR90WI') >= 0 || user.roles.map(function(user) { return user.id; }).indexOf('UUICdmkm35V') >= 0) {
                                $scope.allUsers.push(user);
                            }
                        });
                    }
                });
            });

            $scope.saveOption = function() {
                $scope.d2SaveMethode()($scope.d2SaveMethodeParameter1, $scope.d2SaveMethodeParameter2);
            };
        }

    };
})

.directive('erUsersInputFind', function(){
    return {
        restrict: 'E',
        templateUrl: 'views/find-user.html',
        scope: {
            d2Model: '=',
            d2MaxOptionSize: '=',
            d2SelectedOrgunitId: '='
            
        },
        link: function (scope, element, attrs) {

        },
        controller: function($scope, UsersService, OrgUnitFactory) {
            
            $scope.$watch("d2SelectedOrgunitId", function(newValue, oldValue){
                $scope.allUsers = [];        
                $scope.temp = UsersService.getAll().then(function(users){
                    var temp = [];
                    if($scope.d2SelectedOrgunitId) {
                        var relatedOrgunits = OrgUnitFactory.get($scope.d2SelectedOrgunitId).then(function(selectedOrgUnit) {
                            angular.forEach(users, function(user){
                                //Hardcoded for Bangladesh (Checks if the user has a certain role).
                                if(user.roles.map(function(user) { return user.id; }).indexOf('lItc9BR90WI') >= 0 || user.roles.map(function(user) { return user.id; }).indexOf('UUICdmkm35V') >= 0) {
                                    angular.forEach(user.orgUnits, function(orgUnit){  
                                        if(selectedOrgUnit.organisationUnits[0].id === orgUnit.id && $scope.allUsers.indexOf(user) === -1) {
                                            $scope.allUsers.push(user);
                                        }
                                    });
                                }
                            });
                        });
                    //No OrgUnit selected.
                    } else {
                        //Hardcoded for Bangladesh (Checks if the user has a certain role).
                        angular.forEach(users, function(user){  
                            if(user.roles.map(function(user) { return user.id; }).indexOf('lItc9BR90WI') >= 0 || user.roles.map(function(user) { return user.id; }).indexOf('UUICdmkm35V') >= 0) {
                                $scope.allUsers.push(user);
                            }
                        });
                    }
                });
            });
        }
    };
})

.directive('handleDirty', [function(){
        return {
            restrict: 'A',            
            require: 'ngModel',
            link: {
                post: function (scope, element, attrs, ctrl) {                                                    
                    
                    var fieldCtrl = ctrl;                                   
                    
                    var addDirtyForEvent = function(skipApply){
                         var eventKey;
                            if(attrs.handleDirty !== ""){
                                eventKey = scope[attrs.handleDirty].event;
                            }
                            else {
                                eventKey = scope.currentEvent.event;
                            }       

                            if(angular.isUndefined(fieldCtrl[eventKey])){
                                fieldCtrl[eventKey] = {};
                            }
                            fieldCtrl[eventKey].isDirty = true;
                            
                            if(angular.isUndefined(skipApply) || skipApply !== true){
                                scope.$apply();
                            }
                    };
                    
                    if(angular.isDefined(attrs.handleDirtyType)){
                        if(attrs.handleDirtyType === "select"){
                            ctrl.$parsers.unshift(function(value) {
                                addDirtyForEvent(true);
                                return value;
                            });
                        }
                        else if(attrs.handleDirtyType === "dhis2RadioButton"){
                            element.on('change', function(){
                                addDirtyForEvent(true);
                            });
                        }
                        else{
                            element.on('blur', function(){
                                addDirtyForEvent();
                            });
                        }
                    }
                    else {
                        element.on('blur', function(){
                            addDirtyForEvent();
                        });
                    }
                }
            },
            controller: function($scope){
                
            }
        };
}])

.directive('dhis2CompiledInclude', [
  '$templateCache',
  function($templateCache) {
    return {
      restrict: 'A',
      priority: 400, // Same as ng-include
      compile: function(element, attrs){        
        var templateName = attrs.dhis2CompiledInclude;
        if(!templateName){
          throw new Error('ngInline: expected template name');
        }
        var template = $templateCache.get(templateName);
     	  if(angular.isUndefined(template)){
          throw new Error('ngInline: unknown template ' + templateName);
        }
        element.html(template);
      }
    };
  }
])
.directive('trackerTeiList', function(){
    return {
        restrict: 'E',
        templateUrl: 'views/tei-list.html',
        scope: {
            data: "=teiData",
            pager: "=?teiPager",
            sortColumn: "=?teiSortColumn",
            gridColumns: "=?teiGridColumns",
            refetchData: "&teiRefetchData",
            onTeiClicked: "&onTeiClicked"
        },

        
        controller: function($scope, Paginator){
            $scope.$watch("pager", function(){
                if($scope.pager){
                    Paginator.setPage($scope.pager.page);
                    Paginator.setPageCount($scope.pager.pageCount);
                    Paginator.setPageSize($scope.pager.pageSize);
                    Paginator.setItemCount($scope.pager.total);
                }
            });

            $scope.$watch("data", function(){
                setGridColumns();
            });

            var setGridColumns = function(){
                if($scope.data && !$scope.gridColumns){
                    $scope.gridColumns = [];
                    for(var key in $scope.data.headers){
                        if($scope.data.headers.hasOwnProperty(key)){
                            var column = $scope.data.headers[key];
                            column.show = true;
                            $scope.gridColumns.push(column);
                        }
                    }
                }
            }

            setGridColumns();

            $scope.sortGrid = function(gridHeader){
                if ($scope.sortColumn && $scope.sortColumn.id === gridHeader.id){
                    $scope.sortColumn.direction = $scope.sortColumn.direction === 'asc' ? 'desc' : 'asc';
                }else if(!$scope.sortColumn){
                    $scope.sortColumn = {id: gridHeader.id, direction: 'asc'};
                }else{
                    $scope.sortColumn.id = gridHeader.id;
                    $scope.sortColumn.direction = 'asc';
                }
                $scope.refetchData({pager: $scope.pager, sortColumn: $scope.sortColumn});
            };

            $scope.onTeiClickedInternal = function(tei){
                $scope.onTeiClicked({tei : tei});
            }
            
            $scope.getPage = function(page){
                $scope.pager.page = page;

                $scope.refetchData({pager: $scope.pager, sortColumn: $scope.sortColumn});
            };

            $scope.resetPageSize = function(){
                $scope.pager.page = 1;
                $scope.refetchData({pager: $scope.pager, sortColumn: $scope.sortColumn});
            };

            $scope.jumpToPage = function(){
                if($scope.pager && $scope.pager.page && $scope.pager.pageCount && $scope.pager.page > $scope.pager.pageCount){
                    $scope.pager.page = $scope.pager.pageCount;
                }
                $scope.refetchData({pager: $scope.pager, sortColumn: $scope.sortColumn});
                
            };
        }
    }
});
