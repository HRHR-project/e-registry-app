/* global eRegistry, angular */
var eRegistry = angular.module('eRegistry');
eRegistry.controller('EnrollmentController',
        function($rootScope,
                $scope,  
                $route,
                $location,
                $timeout,
                DateUtils,
                SessionStorageService,
                CurrentSelection,
                OrgUnitService,
                EnrollmentService,
                DialogService,
                ModalService,
                $translate,
                DHIS2EventFactory,
                DHIS2BASEURL) {
    $scope.DHIS2BASEURL = DHIS2BASEURL;
    $scope.today = DateUtils.getToday();
    $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU'); 
    $scope.dashboardReady = false;
    
    //listen for the selected items
    var selections = {};
    $scope.$on('selectedItems', function(event, args) {  
        $scope.attributes = [];
        $scope.historicalEnrollments = [];
        $scope.showEnrollmentDiv = false;
        $scope.showEnrollmentHistoryDiv = false;
        $scope.hasEnrollmentHistory = false;
        $scope.selectedEnrollment = null;
        $scope.currentEnrollment = null;
        $scope.newEnrollment = {};
        
        //Palestine
        $scope.enrollmentCompletedDateLabel = $translate.instant('enrollment_completed_date');
        
        selections = CurrentSelection.get();        
        processSelectedTei();       
        
        $scope.selectedEntity = selections.te;
        $scope.selectedProgram = selections.pr;
        $scope.optionSets = selections.optionSets;
        $scope.programs = selections.prs;
        $scope.hasOtherPrograms = $scope.programs.length >1 ? true : false;
        var selectedEnrollment = selections.selectedEnrollment;
        $scope.enrollments = selections.enrollments;
        $scope.programExists = args.programExists;
        $scope.programNames = selections.prNames;
        $scope.programStageNames = selections.prStNames;
        $scope.attributesById = CurrentSelection.getAttributesById();
        $scope.activeEnrollments =  [];
        angular.forEach(selections.enrollments, function(en){
            if(en.status === "ACTIVE" && $scope.selectedProgram && $scope.selectedProgram.id !== en.program){
                $scope.activeEnrollments.push(en);                           
            }
        });
        if($scope.selectedProgram){
            
            $scope.stagesById = [];        
            angular.forEach($scope.selectedProgram.programStages, function(stage){
                $scope.stagesById[stage.id] = stage;
            });
            
            angular.forEach($scope.enrollments, function(enrollment){
                if(enrollment.orgUnit !== $scope.selectedOrgUnit.id) {
                    OrgUnitService.get(enrollment.orgUnit).then(function(ou){
                        if(ou){
                            enrollment.orgUnitName = $scope.selectedOrgUnit.displayName;
                        }                                                       
                    });
                }
                else{
                    enrollment.orgUnitName = $scope.selectedOrgUnit.displayName;
                }
                if(enrollment.program === $scope.selectedProgram.id ){
                    if(enrollment.status === 'ACTIVE'){
                        selectedEnrollment = enrollment;
                        $scope.currentEnrollment = enrollment;
                    }
                    if(enrollment.status === 'CANCELLED' || enrollment.status === 'COMPLETED'){
                        $scope.historicalEnrollments.push(enrollment);
                        $scope.hasEnrollmentHistory = true;
                    }
                }
            });
            if(selectedEnrollment && selectedEnrollment.status === 'ACTIVE'){
                $scope.selectedEnrollment = selectedEnrollment;
                $scope.loadEnrollmentDetails(selectedEnrollment);
            }
            else{
                $scope.selectedEnrollment = null;
                $scope.showEnrollmentHistoryDiv = true;
                $scope.broadCastSelections('dashboardWidgets');
            }
            
            //Folkehelsa: get closing stage events.
            DHIS2EventFactory.getEventsByProgramStage($scope.selectedTei.trackedEntityInstance, 'HaOwL7bIdrs').then(function(events){
                $scope.enrollmentCompletedDates = {};
                angular.forEach(events, function(event){
                   $scope.enrollmentCompletedDates[event.enrollment] = DateUtils.formatFromApiToUser(event.completedDate);
                });
            });
        }
        else{
            $scope.broadCastSelections('dashboardWidgets');
        }        
    });
    $scope.$on('teienrolled', function(event,args){
        /*
         * Custom code palestine
         * Set current pregnancy outcome in previous enrollment as previous pregnancy
         */
        var newEnrollment = args.enrollment;
        var events = CurrentSelection.getSelectedTeiEvents();
        if($scope.enrollments){
            var last = null;
            angular.forEach($scope.enrollments, function(enrollment){
               if(!last){
                   last = enrollment;
               }else{
                    var lastDate = moment(last.enrollmentDate);
                    var enrollmentDate = moment(enrollment.enrollmentDate);
                    if(enrollmentDate.diff(lastDate) > 0){
                        last = enrollment;
                    }
               }
            });
            if(last){
                angular.forEach(events, function(event){
                    if(event.enrollment === last.enrollment && event.programStage === 'bO5aSsPeB4A'){
                            var newEvent = {
                                trackedEntityInstance: event.trackedEntityInstance,
                                program: event.program,
                                programStage: "PUZaKR0Jh2k",
                                enrollment: newEnrollment.enrollment,
                                orgUnit: event.orgUnit,
                                dueDate: event.dueDate,
                                eventDate: event.eventDate,
                                notes: event.notes,
                                dataValues: event.dataValues,
                                status: event.status
                            };
                        DHIS2EventFactory.create(newEvent).then(function(){
                        });
                    }
                });
            }
        }     
        //End custom code
        
        $route.reload();
 
    });
    $scope.loadEnrollmentDetails = function(enrollment){
        $scope.showEnrollmentHistoryDiv = false;
        $scope.selectedEnrollment = enrollment;
        
        //Palestine
        $scope.hideCompleteIncompleteButton = true;
        // end custom code
        
        if($scope.selectedEnrollment.enrollment && $scope.selectedEnrollment.orgUnit){            
            $scope.broadCastSelections('dashboardWidgets');
        }
    };
        
    $scope.showNewEnrollment = function(){
        $scope.showEnrollmentDiv = !$scope.showEnrollmentDiv;
        
        $timeout(function() { 
            $rootScope.$broadcast('enrollmentEditing', {enrollmentEditing: $scope.showEnrollmentDiv});
        }, 200);
            
        if($scope.showEnrollmentDiv){
            
            $scope.showEnrollmentHistoryDiv = false;
            
            //load new enrollment details
            $scope.selectedEnrollment = {orgUnitName: $scope.selectedOrgUnit.displayName};            
            $scope.loadEnrollmentDetails($scope.selectedEnrollment);
            
            $timeout(function() { 
                $rootScope.$broadcast('registrationWidget', {registrationMode: 'ENROLLMENT', selectedTei: $scope.selectedTei});
            }, 200);
        }
        else{
            hideEnrollmentDiv();
        }
    };
       
    $scope.showEnrollmentHistory = function(){
        
        $scope.showEnrollmentHistoryDiv = !$scope.showEnrollmentHistoryDiv;
        
        if($scope.showEnrollmentHistoryDiv){
            $scope.selectedEnrollment = null;
            $scope.showEnrollmentDiv = false;
            
            $scope.broadCastSelections('dashboardWidgets');
        }
    };
    
    $scope.broadCastSelections = function(listeners){
        var selections = CurrentSelection.get();
        var tei = selections.tei;
        $scope.dashboardReady = true;
        
        CurrentSelection.set({tei: tei, te: $scope.selectedEntity, prs: $scope.programs, pr: $scope.selectedProgram, prNames: $scope.programNames, prStNames: $scope.programStageNames, enrollments: $scope.enrollments, selectedEnrollment: $scope.selectedEnrollment, optionSets: $scope.optionSets});
        $timeout(function() { 
            $rootScope.$broadcast(listeners, {});
        }, 200);
    };
    
    var processSelectedTei = function(){
        $scope.selectedTei = angular.copy(selections.tei);
        angular.forEach($scope.selectedTei.attributes, function(att){
            $scope.selectedTei[att.attribute] = att.value;
        });
        delete $scope.selectedTei.attributes;
    };
    
    var hideEnrollmentDiv = function(){
        
        /*currently the only way to cancel enrollment window is by going through
         * the main dashboard controller. Here I am mixing program and programId, 
         * as I didn't want to refetch program from server, the main dashboard
         * has already fetched the programs. With the ID passed to it, it will
         * pass back the actual program than ID. 
         */
        processSelectedTei();
        $scope.selectedProgram = ($location.search()).program;
        $scope.broadCastSelections('mainDashboard'); 
    };
    
    $scope.cancelEnrollment = function(){        

        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'cancel_enrollment',
            bodyText: 'are_you_sure_to_cancel_enrollment'
        };

        ModalService.showModal({}, modalOptions).then(function(result){            
            EnrollmentService.cancel($scope.selectedEnrollment).then(function(data){                
                $scope.selectedEnrollment.status = 'CANCELLED';
                $scope.loadEnrollmentDetails($scope.selectedEnrollment);                
            });
        });
    };
    
    $scope.completeEnrollment = function(){        
        var modalOptions = {};
        if($scope.selectedEnrollment.status ==='ACTIVE' && !completeEnrollmentAllowed()){
            modalOptions = {
                actionButtonText: 'OK',
                headerText: 'complete_enrollment_failed',
                bodyText: 'complete_active_events_before_completing_enrollment'
            };
            ModalService.showModal({}, modalOptions);
            return;
        }
        
        
        modalOptions = {
            closeButtonText: 'cancel',
            actionButtonText: $scope.selectedEnrollment.status === 'ACTIVE' ? 'complete' : 'incomplete',
            headerText: $scope.selectedEnrollment.status === 'ACTIVE' ? 'complete_enrollment' : 'incomplete_enrollment',
            bodyText: $scope.selectedEnrollment.status === 'ACTIVE' ? 'are_you_sure_to_complete_enrollment_delete_schedule' : 'are_you_sure_to_incomplete_enrollment'
        };
        

        ModalService.showModal({}, modalOptions).then(function(result){            
            
            var status = 'completed';            
            
            if($scope.selectedEnrollment.status === 'COMPLETED'){
                status = 'incompleted';
            }
            if(status === 'completed'){
                
            }
            EnrollmentService.completeIncomplete($scope.selectedEnrollment, status).then(function(data){                                
                $scope.selectedEnrollment.status = $scope.selectedEnrollment.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
                if($scope.selectedEnrollment.status === 'COMPLETED'){
                    $scope.dataEntryControllerData.deleteScheduleOverDueEvents().then(function(result){
                        selection.load();
                        $location.path('/').search({program: $scope.selectedProgram.id});
                    });

                }else{
                    $scope.loadEnrollmentDetails($scope.selectedEnrollment);   
                }
             
            }, function(response){
                if(response && response.data && response.data.status === "ERROR"){
                    //notify user
                    var dialogOptions = {
                            headerText: response.data.status,
                            bodyText: response.data.message
                        };
                    DialogService.showDialog({}, dialogOptions);
                }
            });
        });
    };
    
    $scope.markForFollowup = function(){
        $scope.selectedEnrollment.followup = !$scope.selectedEnrollment.followup; 
        EnrollmentService.update($scope.selectedEnrollment).then(function(data){         
        });
    };
    
    $scope.changeProgram = function(program){
        var pr = $location.search().program;
        if(pr && pr === program){
            $route.reload();            
        }
        else{
            $location.path('/dashboard').search({tei: $scope.selectedTeiId, program: program});
        }
    };
    
    $scope.canUseEnrollment = function(){
        
        if($scope.selectedTei.inactive){
            return false;
        }
        
        if($scope.currentEnrollment && $scope.selectedEnrollment.enrollment !== $scope.currentEnrollment.enrollment){
            if($scope.currentEnrollment.status === 'ACTIVE'){
                return false;
            }
        }        
        return true;        
    };
    
    var completeEnrollmentAllowed = function(ignoreEventId){
        var programStages = $scope.dataEntryControllerData.programStages;
        var eventsByStage = $scope.dataEntryControllerData.eventsByStage;
        for(var i = 0; i < programStages.length; i++ ) {
            for(var e = 0; e < eventsByStage[programStages[i].id].length; e++) {
                if(eventsByStage[programStages[i].id][e].status ==='ACTIVE' && eventsByStage[programStages[i].id][e].event !== ignoreEventId){
                    //Folkehelsa: We dont want to mind the Risks, Managements and previous pregnancies:
                    if(programStages[i].id !== 'iXDSolqmauJ'
                            && programStages[i].id !== 'tlzRiafqzgd'
                            && programStages[i].id !== 'w9cPvMH5LaN'
                            && programStages[i].id !== 'WPgz41MctSW'
                            && programStages[i].id !== 'PUZaKR0Jh2k'
                            && programStages[i].id !== 'E8Jetf3Q90U'
                            && programStages[i].id !== 'MO39jKgz2VA')
                    return false;
                }
            }
        }
        return true;
    };
    
    //Hardcode palestine
    $scope.hideCompleteIncompleteButton = true;
    $scope.$on('closingStageEvent', function(event, args){
        if(args.event && args.event.status === 'COMPLETED'){
            $scope.completedDate = DateUtils.formatFromApiToUser(args.event.completedDate);
            $scope.hideCompleteIncompleteButton = false;
        }else{
            $scope.hideCompleteIncompleteButton = true;
        }
        
    });
    
    $scope.$on('dataEntryControllerData', function (event, args) {        
        $scope.dataEntryControllerData = args;
    });
   
    
});
