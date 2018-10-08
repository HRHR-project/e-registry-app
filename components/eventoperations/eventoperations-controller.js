var eRegistry = angular.module('eRegistry');
eRegistry.controller('EventOperationsController',
        function(
                $scope,
                $translate,
                EventUtils,
                SessionStorageService,
                CurrentSelection,
                DateUtils,
                EventCreationService ) {
                    
    $scope.dashboardReady = false;
    $scope.widget = $scope.$parent.$parent.biggerWidget ? $scope.$parent.$parent.biggerWidget
    : $scope.$parent.$parent.smallerWidget ? $scope.$parent.$parent.smallerWidget : null;
    $scope.widgetTitle = $scope.widget.title;    
    
    $scope.widgetTitleLabel = $translate.instant($scope.widgetTitle);
    $scope.programStage = $scope.widget.programstage;
    $scope.eventButtons = $scope.widget.buttons;
    $scope.openEventButton =  $scope.widget.openEventButton;
    
    var selections = CurrentSelection.get();    
    $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU');
    $scope.selectedProgram = selections.pr;
    $scope.selectedEnrollment = selections.selectedEnrollment;
    $scope.selectedEntity = selections.tei;
    
    $scope.showEventButtons = true;
        
    $scope.createStageEvent = function(action){
        if(angular.isDefined($scope.dataEntryControllerData) && angular.isDefined($scope.dataEntryControllerData.programStages) && angular.isDefined($scope.dataEntryControllerData.eventsByStage)){
            
            var stage = getProgramStage($scope.programStage, $scope.dataEntryControllerData.programStages);
            
            EventCreationService.showModal($scope.dataEntryControllerData.eventsByStage,stage,null, null, $scope.selectedEntity,$scope.selectedProgram, $scope.selectedOrgUnit,$scope.selectedEnrollment,false,action, null)
                  .then(function(eventContainer) {
                      if(angular.isDefined(eventContainer)){                
                          var ev = eventContainer.ev;
                          var dummyEvent = eventContainer.dummyEvent;      

                          if (angular.isObject(ev) && angular.isObject(dummyEvent)) {

                              var newEvent = ev;
                              newEvent.orgUnitName = dummyEvent.orgUnitName;
                              newEvent.displayName = dummyEvent.displayName;
                              newEvent.executionDateLabel = dummyEvent.executionDateLabel;
                              newEvent.sortingDate = ev.eventDate ? ev.eventDate : ev.dueDate,
                              newEvent.statusColor = EventUtils.getEventStatusColor(ev);
                              newEvent.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                              newEvent.dueDate = DateUtils.formatFromApiToUser(ev.dueDate);
                              newEvent.enrollmentStatus = dummyEvent.enrollmentStatus;

                              if (dummyEvent.coordinate) {
                                  newEvent.coordinate = {};
                              }

                              if(angular.isDefined($scope.dataEntryControllerData.addNewEvent)){
                                  $scope.dataEntryControllerData.addNewEvent(newEvent,true);
                                  $scope.dataEntryControllerData.openEvent(newEvent);
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
    
    $scope.$on('dashboardWidgets', function() {
        //$scope.dashboardReady = true;
        var selections = CurrentSelection.get();
        if(!selections.selectedEnrollment){
            $scope.dashboardReady = true;
            $scope.showButtons = false;
        }
    });
    
    $scope.openEvent = function(){
        $scope.dataEntryControllerData.openEvent($scope.currentEvent);
    };    
    
    $scope.$on('dataEntryControllerData', function (event, args) {  
        $scope.dataEntryControllerData = args;
        $scope.currentEvent = null;
        var stage = getProgramStage($scope.programStage, $scope.dataEntryControllerData.programStages);
        $scope.eventButtonsDisabled = false;
        if(stage && !stage.repeatable){
           var events = $scope.dataEntryControllerData.eventsByStage[$scope.programStage];
           if(events.length >0){
               if($scope.openEventButton){
                   $scope.currentEvent = events[0];
                   $scope.showOpenEventButton = true;
                   $scope.showEventButtons = false;
                   
                    //hardcode palestine
                    if(stage.id === 'HaOwL7bIdrs'){
                        if(events[0].status ==='ACTIVE'){
                            $scope.openEventButton.text = $scope.eventButtons[0].text;
                            $scope.openEventButton.class = $scope.eventButtons[0].class;
                        }else{
                            $scope.openEventButton.text = stage.displayName;
                            $scope.openEventButton.class = 'btn btn-primary col-md-12';
                        }
                    }
                   
               }

           }else{
               $scope.showOpenEventButton = false;
               $scope.showEventButtons = true;
           }

        } else {
            $scope.showButtons = false;
            $scope.noStageMessage = true;
            $scope.dashboardReady = true;
            return;
        }
        $scope.dashboardReady = true;
        $scope.showButtons = true;
    });
});