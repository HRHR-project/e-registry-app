/* global angular, moment, dhis2 */

'use strict';

/* Services */

var eRegistryServices = angular.module('eRegistryServices', ['ngResource']);

eRegistryServices.factory('ERStorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2er",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['programs', 'programStages', 'trackedEntityTypes', 'attributes', 'relationshipTypes', 'optionSets', 'programValidations', 'programIndicators', 'ouLevels', 'programRuleVariables', 'programRules','constants','programAccess']
    });
    return{
        currentStore: store
    };
})

/* Service to fetch/store dasboard widgets */
.service('DashboardLayoutService', function($http, EventCreationService, DHIS2URL) {
    
    var ButtonIds = { Complete: "Complete", Incomplete: "Incomplete", Validate: "Validate", Delete: "Delete", Skip: "Skip", Unskip: "Unskip", Note: "Note" };
      
    var w = {};
    w.enrollmentWidget = {title: 'enrollment', view: "components/enrollment/enrollment.html", show: true, expand: true, parent: 'smallerWidget', order: 12, showHideAllowed: true};
    //w.indicatorWidget = {title: 'indicators', view: "components/rulebound/rulebound.html", show: true, expand: true, parent: 'smallerWidget', order: 1, showHideAllowed: false};
    w.dataentryWidget = {title: 'dataentry', view: "components/dataentry/dataentry.html", show: true, expand: true, parent: 'biggerWidget', order: 2,showHideAllowed: false};
    w.reportWidget = {title: 'report', view: "components/report/tei-report.html", show: false, expand: true, parent: 'biggerWidget', order: 3, showHideAllowed: true};
    w.managementANCWidget = {
        title: 'managementANC', programstage: "tlzRiafqzgd", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'biggerWidget', order: 4,showHideAllowed: false,
        eventDateIsEditable: true,
        visibleDataElements: {Kb2LvjqXHfi: {}, AcMrnleqHqc: {}, AqK1IHqCkEE: {}, RO9lM47fth5: {editable: true}},
        sortBy: ['AqK1IHqCkEE', 'AcMrnleqHqc'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Incomplete, ButtonIds.Note]
    };
    
    w.managementPPCWidget = {
        title: 'managementPPC', programstage: "E8Jetf3Q90U", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'biggerWidget', order: 5,showHideAllowed: false,
        eventDateIsEditable: true,
        visibleDataElements: {AcMrnleqHqc: {}, AqK1IHqCkEE: {}, RO9lM47fth5: {editable: true}},
        sortBy: ['AqK1IHqCkEE', 'AcMrnleqHqc'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Incomplete, ButtonIds.Note]
    };
    
    w.managementNBCWidget = {
        title: 'managementNBC', programstage: "MO39jKgz2VA", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'biggerWidget', order: 5,showHideAllowed: false,
        eventDateIsEditable: true,
        visibleDataElements: {AcMrnleqHqc: {}, AqK1IHqCkEE: {}, RO9lM47fth5: {editable: true}},
        sortBy: ['AqK1IHqCkEE', 'AcMrnleqHqc'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Incomplete, ButtonIds.Note]
    };
    
    w.selectedWidget = {title: 'current_selections', view: "components/selected/selected.html", show: false, expand: true, parent: 'smallerWidget', order: 2,showHideAllowed: true};
    w.feedbackWidget = {title: 'feedback', view: "components/rulebound/rulebound.html", show: true, expand: true, parent: 'smallerWidget', order: 3,showHideAllowed: false};
    w.medicalConditionWidget = {title: 'risksANCMED', view: "components/rulebound/rulebound.html", show: true, expand: true, parent: 'smallerWidget', order: 4,showHideAllowed: false,
    importantTexts: ["allergy"]
    };
    
    w.risksWidget = {
        title: 'risksANC', programstage: "iXDSolqmauJ", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'smallerWidget', order: 5,showHideAllowed: false,
        visibleDataElements: {mmh2QLYRmFE: {}, Kb2LvjqXHfi: {}},
        sortBy: ['mmh2QLYRmFE'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Delete]
    };
    w.risksPPCWidget = {
        title: 'risksPPC', programstage: "WPgz41MctSW", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'smallerWidget', order: 6,showHideAllowed: false,
        visibleDataElements: {MMbct7RkquQ: {}},
        sortBy: ['MMbct7RkquQ'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Delete]        
    };
    w.risksNNCWidget = {
        title: 'risksNNC', programstage: "w9cPvMH5LaN", view: "components/eventoverview/event-overview.html", show: true, expand: true, parent: 'smallerWidget', order: 7,showHideAllowed: false,
        visibleDataElements: {t0wIsOcVyV0: {}},
        sortBy: ['t0wIsOcVyV0'],
        applicableButtons: [ButtonIds.Complete, ButtonIds.Delete]        
    };
    w.profileWidget = {title: 'profile', view: "components/profile/profile.html", show: true, expand: false, parent: 'smallerWidget', order: 0,showHideAllowed: false};
    w.notesWidget = {title: 'notes', view: "components/notes/notes.html", show: true, expand: true, parent: 'smallerWidget', order: 10,showHideAllowed: false};  
    w.activeProgramsWidget = {title: 'activePrograms', view: "components/activeprograms/active-programs.html", show: false, expand: true, parent: 'smallerWidget', order: 12,showHideAllowed: true};
    w.relationshipWidget = {title: 'relationships', view: "components/relationship/relationship.html", show: false, expand: true, parent: 'smallerWidget', order: 13,showHideAllowed: true};
    w.closeEnrollmentWidget = { title: 'close_file', programstage: 'HaOwL7bIdrs', view: "components/eventoperations/eventoperations.html", show: false, expand: true, parent: 'smallerWidget', order:11, showHideAllowed: false,
    buttons : [{class: 'btn btn-danger col-md-12', text: 'close_pregnancy_file', action: EventCreationService.eventCreationActions.add }], openEventButton: {text: '', class:'btn btn-primary col-md-12'},
    buttonsDisabledText: 'close_event_exists'};
    var defaultLayout = new Object();
    
    defaultLayout['DEFAULT'] = {widgets: w, program: 'DEFAULT'};
    
    var getDefaultLayout = function(customLayout){
        var dashboardLayout = {customLayout: customLayout, defaultLayout: defaultLayout};        
        var promise = $http.get(  DHIS2URL+'/systemSettings/keyTrackerDashboardDefaultLayout' ).then(function(response){
            angular.extend(dashboardLayout.defaultLayout, response.data);
            return dashboardLayout;
        }, function(){
            return dashboardLayout;
        });
        return promise;        
    };
    
    return {
        saveLayout: function(dashboardLayout, saveAsDefault){
            var layout = JSON.stringify(dashboardLayout);
            var url = DHIS2URL+'/userSettings/keyTrackerDashboardLayout?value=';            
            if(saveAsDefault){
                url = DHIS2URL+'/systemSettings/keyTrackerDashboardDefaultLayout?value=';
            }
            var promise = $http.post( url + layout, '', {headers: {'Content-Type': 'text/plain;charset=utf-8'}}).then(function(response){
                return response.data;
            });
            return promise;            
        },
        get: function(){
            var promise = $http.get(  DHIS2URL+'/userSettings/keyTrackerDashboardLayout' ).then(function(response){
                return getDefaultLayout(response.data);
            }, function(){
                return getDefaultLayout(null);
            });
            return promise;
        }
    };
})

.service('SystemSettingsService', function($http, DHIS2URL) {
    return {
        getCountry: function(){
            var promise = $http.get(DHIS2URL+'/systemSettings/keyCountry').then(function(response){
                return response.data;
            }, function(){
                return null;
            });
            return promise;            
        },
        getMainMenuConfig: function(){
            var promise = $http.get(DHIS2URL+'/dataStore/tracker/mainMenuConfig').then(function(response){
                return response.data;
            }, function(){
                return null;
            });
            return promise;
        }
    };
})

.service('DataStoreService', function($http) {
    return {
        getCountry: function(){
            var promise = $http.get(DHIS2URL+'/dataStore/mch-tracker/country').then(function(response){
                return response.data.country;
            }, function(){
                return null;
            });
            return promise;            
        }
    };
})


/* current selections */
.service('PeriodService', function(DateUtils, CalendarService, $filter){
    
    var calendarSetting = CalendarService.getSetting();    
    
    var splitDate = function(dateValue){
        if(!dateValue){
            return;
        }
        var calendarSetting = CalendarService.getSetting();            

        return {year: moment(dateValue, calendarSetting.momentFormat).year(), month: moment(dateValue, calendarSetting.momentFormat).month(), week: moment(dateValue, calendarSetting.momentFormat).week(), day: moment(dateValue, calendarSetting.momentFormat).day()};
    };
    
    function processPeriodsForEvent(periods,event){
        var index = -1;
        var occupied = null;
        for(var i=0; i<periods.length && index === -1; i++){
            if(moment(periods[i].endDate).isSame(event.sortingDate) ||
                    moment(periods[i].startDate).isSame(event.sortingDate) ||
                    moment(periods[i].endDate).isAfter(event.sortingDate) && moment(event.sortingDate).isAfter(periods[i].endDate)){
                index = i;
                occupied = angular.copy(periods[i]);
            }
        }
        
        if(index !== -1){
            periods.splice(index,1);
        }
        
        return {available: periods, occupied: occupied};
    };
    
    this.getPeriods = function(events, stage, enrollment){
     
        if(!stage){
            return;
        }
        
        var referenceDate = enrollment.incidentDate ? enrollment.incidentDate : enrollment.enrollmentDate;
        var offset = stage.minDaysFromStart;
        
        if(stage.generatedByEnrollmentDate){
            referenceDate = enrollment.enrollmentDate;
        }        
               
        var occupiedPeriods = [];
        var availablePeriods = [];
        if(!stage.periodType){
            angular.forEach(events, function(event){
                occupiedPeriods.push({event: event.event, displayName: event.sortingDate, stage: stage.id});
            });            
            
        }
        else{

            var startDate = DateUtils.format( moment(referenceDate, calendarSetting.momentFormat).add(offset, 'days') );
            var periodOffset = splitDate(startDate).year - splitDate(DateUtils.getToday()).year;
            var eventDateOffSet = moment(referenceDate, calendarSetting.momentFormat).add('d', offset)._d;
            eventDateOffSet = $filter('date')(eventDateOffSet, calendarSetting.keyDateFormat);        
            
            //generate availablePeriods
            var pt = new PeriodType();
            var d2Periods = pt.get(stage.periodType).generatePeriods({offset: periodOffset, filterFuturePeriods: false, reversePeriods: false});
            angular.forEach(d2Periods, function(p){
                p.endDate = DateUtils.formatFromApiToUser(p.endDate);
                p.startDate = DateUtils.formatFromApiToUser(p.startDate);
                
                if(moment(p.endDate).isAfter(eventDateOffSet)){                    
                    availablePeriods.push( p );
                }
            });                

            //get occupied periods
            angular.forEach(events, function(event){
                var ps = processPeriodsForEvent(availablePeriods, event);
                availablePeriods = ps.available;
                if(ps.occupied){
                    occupiedPeriods.push(ps.occupied);
                }
            });
        }
        return {occupiedPeriods: occupiedPeriods, availablePeriods: availablePeriods};
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, ERStorageService) { 
    return {
        getAll: function(){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });                    
                });
            });            
            
            return def.promise;            
        },
        get: function(uid){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('optionSets', uid).done(function(optionSet){                    
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });                        
            return def.promise;            
        },        
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }            
            return key;
        },        
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){                    
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }            
            return key;
        }
    };
})

/* Factory to fetch relationships */
.factory('RelationshipFactory', function($q, $rootScope, ERStorageService) { 
    return {
        getAll: function(){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('relationshipTypes').done(function(relationshipTypes){
                    $rootScope.$apply(function(){
                        def.resolve(relationshipTypes);
                    });                    
                });
            });            
            
            return def.promise;            
        },
        get: function(uid){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('relationshipTypes', uid).done(function(relationshipType){                    
                    $rootScope.$apply(function(){
                        def.resolve(relationshipType);
                    });
                });
            });                        
            return def.promise;            
        }
    };
})

/* Factory to fetch programs */
.factory('ProgramFactory', function($q, $rootScope, SessionStorageService, ERStorageService) { 
    var access = null;
    
    return {
        getAllAccesses: function(){
            var def = $q.defer();
            if(access){
                def.resolve(access);
            }else{
                ERStorageService.currentStore.open().done(function(){
                    ERStorageService.currentStore.getAll('programAccess').done(function(programAccess){
                        access = { programsById: {}, programStagesById: {}};
                        angular.forEach(programAccess, function(program){
                            access.programsById[program.id] = program.access;
                            angular.forEach(program.programStages, function(programStage){
                                access.programStagesById[programStage.id] = programStage.access;
                            });
                        });
                        def.resolve(access);
                    });
                });
            }
            return def.promise;
            
        },     
        get: function(uid){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('programs', uid).done(function(pr){                    
                    $rootScope.$apply(function(){
                        def.resolve(pr);
                    });
                });
            });                        
            return def.promise;            
        },
        getProgramsByOu: function(ou,loadSelectedProgram, selectedProgram){
            var def = $q.defer();
            this.getAllAccesses().then(function(accesses){
                ERStorageService.currentStore.open().done(function(){
                    ERStorageService.currentStore.getAll('programs').done(function(prs){
                        var programs = [];
                        angular.forEach(prs, function(pr){                            
                            if(pr.organisationUnits.hasOwnProperty( ou.id ) && accesses.programsById[pr.id] && accesses.programsById[pr.id].data.read){
                                pr.access = accesses.programsById[pr.id];
                                var accessiblePrs = [];
                                angular.forEach(pr.programStages, function(prs){
                                    if(accesses.programStagesById[prs.id] && accesses.programStagesById[prs.id].data.read){
                                        prs.access = accesses.programStagesById[prs.id];
                                        accessiblePrs.push(prs);
                                    }
                                });
                                pr.programStages = accessiblePrs;
                                programs.push(pr);
                            }
                        });
                        if(loadSelectedProgram){
                            if(programs.length === 0){
                                selectedProgram = null;
                            }
                            else if(programs.length === 1){
                                selectedProgram = programs[0];
                            } 
                            else{
                                if(selectedProgram){
                                    var continueLoop = true;
                                    for(var i=0; i<programs.length && continueLoop; i++){
                                        if(programs[i].id === selectedProgram.id){                                
                                            selectedProgram = programs[i];
                                            continueLoop = false;
                                        }
                                    }
                                    if(continueLoop){
                                        selectedProgram = null;
                                    }
                                }
                            }
                        }
                        
                        $rootScope.$apply(function(){
                            def.resolve({programs: programs, selectedProgram: selectedProgram});
                        });                      
                    });
                });
            });
            
            return def.promise;
        }
    };
})

/* Factory to fetch programStages */
.factory('ProgramStageFactory', function($q, $rootScope, ERStorageService) {  
    
    return {        
        get: function(uid){            
            var def = $q.defer();
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('programStages', uid).done(function(pst){                    
                    $rootScope.$apply(function(){
                        def.resolve(pst);
                    });
                });
            });            
            return def.promise;
        },
        getByProgram: function(program){
            var def = $q.defer();
            var stageIds = [];
            var programStages = [];
            angular.forEach(program.programStages, function(stage){
                stageIds.push(stage.id);
            });
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('programStages').done(function(stages){   
                    angular.forEach(stages, function(stage){
                        if(stageIds.indexOf(stage.id) !== -1){                            
                            programStages.push(stage);                               
                        }                        
                    });
                    $rootScope.$apply(function(){
                        def.resolve(programStages);
                    });
                });                
            });            
            return def.promise;
        }
    };    
})
/* Factory to fetch programValidations */
.factory('ProgramValidationFactory', function($q, $rootScope, ERStorageService) {  
    
    return {        
        get: function(uid){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('programValidations', uid).done(function(pv){                    
                    $rootScope.$apply(function(){
                        def.resolve(pv);
                    });
                });
            });                        
            return def.promise;
        },
        getByProgram: function(program){
            var def = $q.defer();
            var programValidations = [];
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('programValidations').done(function(pvs){   
                    angular.forEach(pvs, function(pv){
                        if(pv.program.id === program){                            
                            programValidations.push(pv);                               
                        }                        
                    });
                    $rootScope.$apply(function(){
                        def.resolve(programValidations);
                    });
                });                
            });            
            return def.promise;
        }
    };        
})

/* service to deal with TEI registration and update */
.service('RegistrationService', function(TEIService, $q, $translate){
    return {
        registerOrUpdate: function(tei, optionSets, attributesById){
            if(tei){
                var def = $q.defer();
                if(tei.trackedEntityInstance){
                    TEIService.update(tei, optionSets, attributesById).then(function(response){
                        def.resolve(response); 
                    },function(error){
                    });
                }
                else{
                    TEIService.register(tei, optionSets, attributesById).then(function(response){
                        def.resolve(response); 
                    });
                }
                return def.promise;
            }            
        },
        processForm: function(existingTei, formTei, attributesById){
            var tei = angular.copy(existingTei);            
            tei.attributes = [];
            var formEmpty = true;            
            for(var k in attributesById){
                if( formTei[k] ){
                    var att = attributesById[k];
                    tei.attributes.push({attribute: att.id, value: formTei[k], displayName: att.displayName, valueType: att.valueType});
                    formEmpty = false;              
                }
                delete tei[k];
            }
            formTei.attributes = tei.attributes;
            return {tei: tei, formEmpty: formEmpty};
        }
    };
})

/* Service to deal with enrollment */
.service('EnrollmentService', function($http, DateUtils, DialogService, $translate, DHIS2URL, TeiAccessApiService) {
    
    var convertFromApiToUser = function(enrollment){
        if(enrollment.enrollments){
            angular.forEach(enrollment.enrollments, function(enrollment){
                enrollment.incidentDate = DateUtils.formatFromApiToUser(enrollment.incidentDate);
                enrollment.enrollmentDate = DateUtils.formatFromApiToUser(enrollment.enrollmentDate);                
            });
        }
        else{
            enrollment.incidentDate = DateUtils.formatFromApiToUser(enrollment.incidentDate);
            enrollment.enrollmentDate = DateUtils.formatFromApiToUser(enrollment.enrollmentDate);
        }
        
        return enrollment;
    };
    var convertFromUserToApi = function(enrollment){
        enrollment.incidentDate = DateUtils.formatFromUserToApi(enrollment.incidentDate);
        enrollment.enrollmentDate = DateUtils.formatFromUserToApi(enrollment.enrollmentDate);
        delete enrollment.orgUnitName;
        delete enrollment.events;
        return enrollment;
    };
    return {        
        get: function( enrollmentUid ){
            var promise = $http.get(  DHIS2URL+'/enrollments/' + enrollmentUid ).then(function(response){
                return convertFromApiToUser(response.data);
            });
            return promise;
        },
        getByEntity: function( entity ){
            var promise = $http.get(  DHIS2URL+'/enrollments.json?ouMode=ACCESSIBLE&trackedEntityInstance=' + entity + '&paging=false').then(function(response){
                return convertFromApiToUser(response.data);
            });
            return promise;
        },
        getByEntityAndProgram: function( entity, program ){
            var promise = $http.get(  DHIS2URL+'/enrollments.json?ouMode=ACCESSIBLE&trackedEntityInstance=' + entity + '&program=' + program + '&paging=false').then(function(response){
                return convertFromApiToUser(response.data);
            }, function(response){
                if( response && response.data && response.data.status === 'ERROR'){
                    var dialogOptions = {
                        headerText: response.data.status,
                        bodyText: response.data.message ? response.data.message : $translate.instant('unable_to_fetch_data_from_server')
                    };		
                    DialogService.showDialog({}, dialogOptions);
                }                
            });
            return promise;
        },
        getByStartAndEndDate: function( program, orgUnit, ouMode, startDate, endDate ){
            var promise = $http.get(  DHIS2URL+'/enrollments.json?ouMode=ACCESSIBLE&program=' + program + '&orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&startDate=' + startDate + '&endDate=' + endDate + '&paging=false').then(function(response){
                return convertFromApiToUser(response.data);
            });
            return promise;
        },
        enroll: function( enrollment ){
            var en = convertFromUserToApi(angular.copy(enrollment));
            var promise = TeiAccessApiService.post(enrollment.trackedEntityInstance, enrollment.program,  DHIS2URL + '/enrollments', en ).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_save_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        update: function( enrollment ){
            var en = convertFromUserToApi(angular.copy(enrollment));
            delete en.notes;
            var promise = TeiAccessApiService.put(enrollment.trackedEntityInstance, enrollment.program, DHIS2URL + '/enrollments/' + en.enrollment , en ).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_update_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        updateForNote: function( enrollment ){
            var promise = $http.post(DHIS2URL+'/enrollments/' + enrollment.enrollment + '/note', enrollment).then(function(response){
                return response.data;         
            });
            return promise;
        },
        cancel: function(enrollment){
            var promise = $http.put(DHIS2URL+'/enrollments/' + enrollment.enrollment + '/cancelled').then(function(response){
                return response.data;
            });
            return promise;
        },
        completeIncomplete: function(enrollment, status){
            var promise = $http.put(DHIS2URL+'/enrollments/' + enrollment.enrollment + '/' + status).then(function(response){
                return response.data;
            });
            return promise;
        }
    };
})

/* Service for getting tracked entity */
.factory('TEService', function(ERStorageService, $q, $rootScope) {

    return {        
        getAll: function(){            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('trackedEntityTypes').done(function(entities){
                    $rootScope.$apply(function(){
                        def.resolve(entities);
                    });                    
                });
            });            
            return def.promise;
        },
        get: function(uid){            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get('trackedEntityTypes', uid).done(function(te){                    
                    $rootScope.$apply(function(){
                        def.resolve(te);
                    });
                });
            });                        
            return def.promise;            
        }
    };
})

/* Service for getting tracked entity instances */
.factory('TEIService', function($http, $q, AttributesFactory, DialogService, DHIS2URL ) {
    var convertFromUserToApi = function(tei){
        delete tei.enrollments;
        delete tei.programOwnersById;
        return tei;
    }
    return {
        get: function(entityUid, optionSets, attributesById, programUid){
            const program = programUid ? 'program=' + programUid + "&" : "";
            var promise = $http.get( DHIS2URL+'/trackedEntityInstances/' +  entityUid + '.json?' + program + 'fields=*').then(function(response){
                var tei = response.data;
                angular.forEach(tei.attributes, function(att){                    
                    if(attributesById[att.attribute]){
                        att.displayName = attributesById[att.attribute].displayName;
                    }
                    att.value = AttributesFactory.formatAttributeValue(att, attributesById, optionSets, 'USER');
                });
                return tei;
            }, function(error){
                if(error){
                    var dialogOptions = {
                        headerText: 'error',
                        bodyText: 'access_denied'
                    };
                    if(error.statusText) {
                        dialogOptions.headerText = error.statusText;
                    }
                    if(error.data && error.data.message) {
                        dialogOptions.bodyText = error.data.message;
                    }
                    
                    DialogService.showDialog({}, dialogOptions);
                }
            });
            
            return promise;
        },
        search: function(ouId, ouMode, queryUrl, programUrl, attributeUrl, pager, paging) {
                
            var url =  DHIS2URL+'/trackedEntityInstances/query.json?ou=' + ouId + '&ouMode='+ ouMode;
            
            if(queryUrl){
                url = url + '&'+ queryUrl;
            }
            if(programUrl){
                url = url + '&' + programUrl;
            }
            if(attributeUrl){
                url = url + '&' + attributeUrl;
            }
            
            if(paging){
                var pgSize = pager ? pager.pageSize : 50;
                var pg = pager ? pager.page : 1;
                pgSize = pgSize > 1 ? pgSize  : 1;
                pg = pg > 1 ? pg : 1;
                url = url + '&pageSize=' + pgSize + '&page=' + pg + '&totalPages=true';
            }
            else{
                url = url + '&paging=false';
            }
            var def = $q.defer();
            $http.get( url ).then(function(response){
                def.resolve(response.data);
            }, function(error){
                if(error && error.status === 403){
                    var dialogOptions = {
                        headerText: 'error',
                        bodyText: 'access_denied'
                    };		
                    DialogService.showDialog({}, dialogOptions);
                    def.reject();
                    return;
                }
                def.reject(error);
            });    
            return def.promise;
        },                
        update: function(tei, optionSets, attributesById){
            var formattedTei = angular.copy(tei);
            angular.forEach(formattedTei.attributes, function(att){                        
                att.value = AttributesFactory.formatAttributeValue(att, attributesById, optionSets, 'API');                                                                
            });
            var promise = $http.put( DHIS2URL+'/trackedEntityInstances/' + formattedTei.trackedEntityInstance , formattedTei ).then(function(response){                    
                return response.data;
            });
            
            return promise;
        },
        register: function(tei, optionSets, attributesById){
            var formattedTei = convertFromUserToApi(angular.copy(tei));
            var attributes = [];
            angular.forEach(formattedTei.attributes, function(att){ 
                attributes.push({attribute: att.attribute, value: AttributesFactory.formatAttributeValue(att, attributesById, optionSets, 'API')});
            });
            
            formattedTei.attributes = attributes;
            var promise = $http.post( DHIS2URL+'/trackedEntityInstances' , formattedTei ).then(function(response){                    
                return response.data;
            }, function(response) {
                //Necessary now that import errors gives a 409 response from the server.
                //The 409 response is treated as an error response.
                return response.data;
            });                    
            return promise;            
        },
        processAttributes: function(selectedTei, selectedProgram, selectedEnrollment){
            var def = $q.defer();
            if(selectedTei.attributes){
                if(selectedProgram && selectedEnrollment){
                    //show attribute for selected program and enrollment
                    AttributesFactory.getByProgram(selectedProgram).then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts, selectedTei.attributes, true);
                        def.resolve(selectedTei);
                    });
                }
                if(selectedProgram && !selectedEnrollment){
                    //show attributes for selected program
                    AttributesFactory.getByProgram(selectedProgram).then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts, selectedTei.attributes, false);
                        def.resolve(selectedTei);
                    });
                }
                if(!selectedProgram && !selectedEnrollment){
                    //show attributes in no program
                    AttributesFactory.getWithoutProgram().then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts, selectedTei.attributes, false);
                        def.resolve(selectedTei);
                    });
                }
            }
            return def.promise;
        },
        addAuditMessage: function(tei, message){
            var promise = $http.get(DHIS2URL+'/trackedEntityInstances/'+tei+'/auditMessage', {params:{"message": message}}).then(function(){
                return null;
            });
            return promise;
            
        }
    };
})

/* Factory for getting tracked entity attributes */
.factory('AttributesFactory', function($q, $rootScope, ERStorageService, orderByFilter, DateUtils, OptionSetService, OperatorFactory) {      

    return {
        getAll: function(){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll('attributes').done(function(attributes){                    
                    $rootScope.$apply(function(){
                        def.resolve(attributes);
                    });
                });
            });            
            return def.promise;            
        }, 
        getByProgram: function(program){
            var def = $q.defer();
            this.getAll().then(function(atts){                
                
                if(program && program.id){
                    var attributes = [];
                    var programAttributes = [];
                    angular.forEach(atts, function(attribute){
                        attributes[attribute.id] = attribute;
                    });

                    angular.forEach(program.programTrackedEntityAttributes, function(pAttribute){
                        var att = attributes[pAttribute.trackedEntityAttribute.id];
                        att.mandatory = pAttribute.mandatory;
                        if(pAttribute.displayInList){
                            att.displayInListNoProgram = true;
                        }
                        if(pAttribute.searchable){
                            att.searchable = true;
                        }
                        programAttributes.push(att);                
                    });
                    
                    def.resolve(programAttributes);
                }                
                else{
                    var attributes = [];
                    angular.forEach(atts, function(attribute){
                        if (attribute.displayInListNoProgram) {
                            attributes.push(attribute);
                        }
                    });     
                    
                    attributes = orderByFilter(attributes, '-sortOrderInListNoProgram').reverse();
                    def.resolve(attributes);
                }                
            });
            return def.promise;    
        },
        getByTrackedEntityType: function(trackedEntityType){
            var def = $q.defer();
            this.getAll().then(function(atts){

                if(trackedEntityType && trackedEntityType.id){
                    var attributes = [];
                    var trackedEntityTypeAttributes = [];
                    angular.forEach(atts, function(attribute){
                        attributes[attribute.id] = attribute;
                    });

                    angular.forEach(trackedEntityType.trackedEntityTypeAttributes, function(teAttribute){
                        var att = attributes[teAttribute.trackedEntityAttribute.id];
                        if (att) {
                            att.mandatory = teAttribute.mandatory;
                            if (teAttribute.displayInList) {
                                att.displayInListNoProgram = true;
                            }
                            if(teAttribute.renderOptionsAsRadio){
                                att.renderOptionsAsRadio = teAttribute.renderOptionsAsRadio;
                            }
                            if(teAttribute.searchable)
                            {
                                att.searchable = teAttribute.searchable;
                            }
                            trackedEntityTypeAttributes.push(att);
                        }
                    });

                    def.resolve(trackedEntityTypeAttributes);
                }
                else{
                    var attributes = [];
                    angular.forEach(atts, function(attribute){
                        if (attribute.displayInListNoProgram) {
                            attributes.push(attribute);
                        }
                    });

                    attributes = orderByFilter(attributes, '-sortOrderInListNoProgram').reverse();
                    def.resolve(attributes);
                }
            });
            return def.promise;
        },
        getWithoutProgram: function(){   
            
            var def = $q.defer();
            this.getAll().then(function(atts){
                var attributes = [];
                angular.forEach(atts, function(attribute){
                    if (attribute.displayInListNoProgram) {
                        attributes.push(attribute);
                    }
                });     
                def.resolve(attributes);             
            });     
            return def.promise;
        },        
        getMissingAttributesForEnrollment: function(tei, program){
            var def = $q.defer();
            this.getByProgram(program).then(function(atts){
                var programAttributes = atts;
                var existingAttributes = tei.attributes;
                var missingAttributes = [];
                
                for(var i=0; i<programAttributes.length; i++){
                    var exists = false;
                    for(var j=0; j<existingAttributes.length && !exists; j++){
                        if(programAttributes[i].id === existingAttributes[j].attribute){
                            exists = true;
                        }
                    }
                    if(!exists){
                        missingAttributes.push(programAttributes[i]);
                    }
                }
                def.resolve(missingAttributes);
            });            
            return def.promise();            
        },
        showRequiredAttributes: function(requiredAttributes, teiAttributes, fromEnrollment){        
            
            //first reset teiAttributes
            for(var j=0; j<teiAttributes.length; j++){
                teiAttributes[j].show = false;
            }

            //identify which ones to show
            for(var i=0; i<requiredAttributes.length; i++){
                var processed = false;
                for(var j=0; j<teiAttributes.length && !processed; j++){
                    if(requiredAttributes[i].id === teiAttributes[j].attribute){                    
                        processed = true;
                        teiAttributes[j].show = true;
                        teiAttributes[j].order = i;
                        teiAttributes[j].mandatory = requiredAttributes[i].mandatory ? requiredAttributes[i].mandatory : false;
                        teiAttributes[j].allowFutureDate = requiredAttributes[i].allowFutureDate ? requiredAttributes[i].allowFutureDate : false;
                        teiAttributes[j].displayName = requiredAttributes[i].displayName;
                    }
                }

                if(!processed && fromEnrollment){//attribute was empty, so a chance to put some value
                    teiAttributes.push({show: true, order: i, allowFutureDate: requiredAttributes[i].allowFutureDate ? requiredAttributes[i].allowFutureDate : false, mandatory: requiredAttributes[i].mandatory ? requiredAttributes[i].mandatory : false, attribute: requiredAttributes[i].id, displayName: requiredAttributes[i].displayName, type: requiredAttributes[i].valueType, value: ''});
                }                   
            }

            teiAttributes = orderByFilter(teiAttributes, '-order');
            teiAttributes.reverse();
            return teiAttributes;
        },
        formatAttributeValue: function(att, attsById, optionSets, destination){
            var val = att.value;
            var type = '';
            if(att.type){
                type = att.type;
            }            
            if(att.valueType){
                type = att.valueType;
            }
            if(type === 'TRUE_ONLY'){
                if(destination === 'USER'){
                    val = val === 'true' ? true : '';
                }
                else{
                    val = val === true ? 'true' : '';
                }                
            }
            if(val && 
                attsById[att.attribute] && 
                attsById[att.attribute].optionSetValue && 
                attsById[att.attribute].optionSet && 
                attsById[att.attribute].optionSet.id && 
                optionSets[attsById[att.attribute].optionSet.id]){
                if(destination === 'USER'){
                    val = OptionSetService.getName(optionSets[attsById[att.attribute].optionSet.id].options, String(val));                                
                }
                else{
                    val = OptionSetService.getCode(optionSets[attsById[att.attribute].optionSet.id].options, val);                                
                }
            } 
            else{
                if(val){  
                    if(type === 'NUMBER' ||
                        type === 'INTEGER' ||
                        type === 'INTEGER_POSITIVE' ||
                        type === 'INTEGER_NEGATIVE' ||
                        type === 'INTEGER_ZERO_OR_POSITIVE'){
                        if( dhis2.validation.isNumber(val)){
                            if(type === 'NUMBER'){
                                val = parseFloat(val);
                            }else{
                                val = parseInt(val);
                            }
                        } else {
                            val = parseInt('0');
                        }
                    }
                    if(type === 'DATE'){
                        if(destination === 'USER'){
                            val = DateUtils.formatFromApiToUser(val);
                        }
                        else{
                            val = DateUtils.formatFromUserToApi(val);
                        }                        
                    }                 
                }
            }
            return val;
        },
        generateAttributeFilters: function(attributes){
            angular.forEach(attributes, function(attribute){
                if(attribute.valueType === 'NUMBER' || attribute.valueType === 'DATE'){
                    attribute.operator = OperatorFactory.defaultOperators[0];
                }
            });            
            return attributes;
        }
    };
})

.factory('TeiAccessApiService', function($http, $q, $modal){
    var auditCancelledSettings = {};
    var needAuditError = {
        code: 401,
        message: "OWNERSHIP_ACCESS_DENIED"
    }
    var modalDefaultSettings = {
        templateUrl: 'components/teiAudit/tei-audit.html',
        controller: 'TeiAuditController'
    }
    var getModalSettings = function(tei, program){
        return {
            templateUrl: 'components/teiAudit/tei-audit.html',
            controller: 'TeiAuditController',
            resolve: {
                tei: function(){
                    return tei;
                },
                program: function(){
                    return program;
                },
                auditCancelledSettings: function(){
                    return auditCancelledSettings
                }
            }
        }
    }

    var handleSuccess = function(response){
        return response;
    }
    var handleError = function(error, tei, program, postAuditApiFn){
        if(error && error.data && error.data.httpStatusCode === needAuditError.code && error.data.message === needAuditError.message){
            return handleAudit(tei,program,postAuditApiFn);
        }else{
            var def = $q.defer();
            def.reject(error);
            return def.promise;
        }
    }

    var saveAuditMessage = function(tei, program, auditMessage){
        var obj = {}; /*{
            tei: tei,
            program: program,
            reason: auditMessage
        }*/
        return $http.post(DHIS2URL+'/tracker/ownership/override?trackedEntityInstance='+tei+'&program='+program+'&reason='+auditMessage, obj);
    }

    var handleAudit = function(tei, program, postAuditApiFn){
        return $modal.open(getModalSettings(tei,program)).result.then(function(result){
            return saveAuditMessage(tei,program,result.auditMessage).then(function(result){
                return callApi(postAuditApiFn, tei,program);
            }, function(error){
                var def = $q.defer();
                def.reject(error);
                return def.promise;
            });
        }, function(error){
            var def = $q.defer();
            def.reject(error);
            return def.promise;
        });
    }

    var service = {};

    var callApi = function(apiFn, tei, program){
        return apiFn().then(function(response){
            return response;
        },function(error){
            return handleError(error, tei, program, apiFn);
        });
    }

    service.setAuditCancelledSettings = function(settings){
        auditCancelledSettings = settings;
    }
    service.get = function(tei, program, url){
        return callApi(function() { return $http.get(url) }, tei, program);
    }

    service.post = function(tei,program,url, data){
        return callApi(function() { return $http.post(url, data) }, tei, program);
    }

    service.put = function(tei,program,url, data){
        return callApi(function() { return $http.put(url, data) }, tei, program);
    }

    service.delete = function(tei,program,url, data){
        return callApi(function() { return $http.delete(url, data) }, tei, program);
    }
    return service;
})

.service('NotificationService', function (DialogService, $timeout) {
    this.showNotifcationDialog = function(errorMsgheader, errorMsgBody, errorResponse){
        var dialogOptions = {
            headerText: errorMsgheader,
            bodyText: errorMsgBody
        };
        var summaries = null;
        if (errorResponse && errorResponse.data) {
            if(errorResponse.data.message && (errorResponse.data.status === 'ERROR' || errorResponse.data.status === 'WARNING')) {
                dialogOptions.bodyText += "<br/>"+errorResponse.data.message+"<br/>";
            }
            if( errorResponse.data.response && errorResponse.data.response.importSummaries && errorResponse.data.response.importSummaries.length > 0 ){
                summaries = JSON.stringify(errorResponse.data.response.importSummaries);
            }
        }
        DialogService.showDialog({}, dialogOptions, summaries);
    };

    this.showNotifcationWithOptions = function(dialogDefaults, dialogOptions){
        DialogService.showDialog(dialogDefaults, dialogOptions);
    };

    this.displayDelayedHeaderMessage = function( message ){
        setHeaderDelayMessage( message );
    };

    this.displayHeaderMessage = function( message ){
        $timeout(function(){
            setHeaderMessage( message );
        }, 1000);
    };

    this.removeHeaderMessage = function(){
        hideHeaderMessage();
    };
})

/* factory for handling events */
.factory('DHIS2EventFactory', function($http, NotificationService, $translate, DHIS2URL, TeiAccessApiService) {
    var skipPaging = "&skipPaging=true";
    var errorHeader = $translate.instant("error");

    var getContextEvent = function(dhis2Event){
        if(Array.isArray(dhis2Event)){
            return dhis2Event[0];
        }
        return dhis2Event;
    }

    return {

        getEventsByStatus: function(entity, orgUnit, program, programStatus){
            var promise = TeiAccessApiService.get(entity,program, DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + '&orgUnit=' + orgUnit + '&program=' + program + '&programStatus=' + programStatus  + skipPaging).then(function(response){
                return response.data.events;
            }, function (response) {

                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
            });

            return promise;
        },
        getEventsByProgram: function(entity, program, attributeCategory){
            var url = DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + skipPaging;

            url = url + '&program=' + program;

            if( attributeCategory && !attributeCategory.default){
                url = url + '&attributeCc=' + attributeCategory.cc + '&attributeCos=' + attributeCategory.cp;
            }

            var promise = TeiAccessApiService.get(entity,program, url ).then(function(response){
                return response.data.events;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getEventsByProgramStage: function(entity, program, programStage){
            var url = DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + skipPaging;
            if(programStage){
                url += '&programStage='+programStage;
            }
            var promise = TeiAccessApiService.get(entity,program, url).then(function(response){
                return response.data.events;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getByOrgUnitAndProgram: function(orgUnit, ouMode, program, startDate, endDate){
            var url;
            if(startDate && endDate){
                url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + '&startDate=' + startDate + '&endDate=' + endDate + skipPaging;
            }
            else{
                url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + skipPaging;
            }
            var promise = $http.get( url ).then(function(response){
                return response.data.events;
            }, function(response){
                if( response && response.data && response.data.status === 'ERROR'){
                    var errorBody = $translate.instant('unable_to_fetch_data_from_server');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        get: function(teiUid, programUid, eventUid){
            var promise = TeiAccessApiService.get(teiUid, programUid, DHIS2URL + '/events/' + eventUid + '.json').then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && response.data.status === 'ERROR') {
                    var errorBody = $translate.instant('failed_to_fetch_events');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        create: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.post(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events.json', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && (response.data.status === 'ERROR' || response.data.status === 'WARNING')) {
                    var errorBody = $translate.instant('event_creation_error');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                    return null;
                }
            });
            return promise;
        },
        delete: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.delete(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event).then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && response.data.status === 'ERROR') {
                    var errorBody = $translate.instant('delete_error_audit');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        update: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.put(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event, dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
            });
            return promise;
        },
        updateForSingleValue: function(singleValue){
            var promise = TeiAccessApiService.put(singleValue.trackedEntityInstance, singleValue.program, DHIS2URL + '/events/' + singleValue.event + '/' + singleValue.dataValues[0].dataElement, singleValue ).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        updateForNote: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.post(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event + '/note', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        updateForEventDate: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.put(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event + '/eventDate', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        }
    };
})

/* factory for handling event reports */
.factory('EventReportService', function($http, DialogService, $translate, DHIS2URL) {   
    
    return {        
        getEventReport: function(orgUnit, ouMode, program, startDate, endDate, programStatus, eventStatus, pager){
            
            var url = DHIS2URL+'/events/eventRows.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program;
            
            if( programStatus ){
                url = url + '&programStatus=' + programStatus;
            }
            
            if( eventStatus ){
                url = url + '&eventStatus=' + eventStatus;
            }
            
            if(startDate && endDate){
                url = url + '&startDate=' + startDate + '&endDate=' + endDate ;
            }
            
            if( pager ){
                var pgSize = pager ? pager.pageSize : 50;
                var pg = pager ? pager.page : 1;
                pgSize = pgSize > 1 ? pgSize  : 1;
                pg = pg > 1 ? pg : 1;
                url = url + '&pageSize=' + pgSize + '&page=' + pg + '&paging=true&totalPages=false';
            } 
            
            var promise = $http.get( url ).then(function(response){
                return response.data;
            }, function(response){
                if( response && response.data && response.data.status === 'ERROR'){
                    var dialogOptions = {
                        headerText: response.data.status,
                        bodyText: response.data.message ? response.data.message : $translate.instant('unable_to_fetch_data_from_server')
                    };		
                    DialogService.showDialog({}, dialogOptions);
                }                
            });            
            return promise;
        }
    };    
})

.factory('OperatorFactory', function($translate){
    
    var defaultOperators = [$translate.instant('IS'), $translate.instant('RANGE')];
    var boolOperators = [$translate.instant('yes'), $translate.instant('no')];
    var textOperators = [$translate.instant('EQ')];
    return{
        defaultOperators: defaultOperators,
        boolOperators: boolOperators,
        textOperators: textOperators
    };  
})

/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, ERStorageService) {  
    
    return {        
        get: function(store, uid){
            
            var def = $q.defer();
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.get(store, uid).done(function(pv){                    
                    $rootScope.$apply(function(){
                        def.resolve(pv);
                    });
                });
            });                        
            return def.promise;
        },
        getByProgram: function(store, program){
            var def = $q.defer();
            var obj = [];
            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll(store, program).done(function(pvs){   
                    angular.forEach(pvs, function(pv){
                        if(pv.program.id === program){                            
                            obj.push(pv);                               
                        }                        
                    });
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });                
            });            
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();            
            ERStorageService.currentStore.open().done(function(){
                ERStorageService.currentStore.getAll(store).done(function(pvs){                       
                    $rootScope.$apply(function(){
                        def.resolve(pvs);
                    });
                });                
            });            
            return def.promise;
        }
    };        
})

/* Returns a function for getting rules for a specific program */
.factory('TrackerRulesFactory', function($q,MetaDataFactory,$filter){
    return{                
        getRules : function(programUid){            
            var def = $q.defer();            
            MetaDataFactory.getAll('constants').then(function(constants) {
                MetaDataFactory.getByProgram('programIndicators',programUid).then(function(pis){                    
                    var variables = [];
                    var programRules = [];
                    angular.forEach(pis, function(pi){
                        if(pi.displayInForm){
                            var newAction = {
                                    id:pi.id,
                                    content:pi.displayDescription ? pi.displayDescription : pi.displayName,
                                    data:pi.expression,
                                    programRuleActionType:'DISPLAYKEYVALUEPAIR',
                                    location:'indicators'
                                };
                            var newRule = {
                                    displayName:pi.displayName,
                                    id: pi.id,
                                    shortname:pi.shortname,
                                    code:pi.code,
                                    program:pi.program,
                                    description:pi.description,
                                    condition:pi.filter ? pi.filter : 'true',
                                    programRuleActions: [newAction]
                                };

                            programRules.push(newRule);

                            var variablesInCondition = newRule.condition.match(/[A#]{\w+.?\w*}/g);
                            var variablesInData = newAction.data.match(/[A#]{\w+.?\w*}/g);
                            var valueCountPresent = newRule.condition.indexOf("V{value_count}") >= 0 
                                                            || newAction.data.indexOf("V{value_count}") >= 0;
                            var positiveValueCountPresent = newRule.condition.indexOf("V{zero_pos_value_count}") >= 0
                                                            || newAction.data.indexOf("V{zero_pos_value_count}") >= 0;
                            var variableObjectsCurrentExpression = [];
                            
                            var pushDirectAddressedVariable = function(variableWithCurls) {
                                var variableName = $filter('trimvariablequalifiers')(variableWithCurls);
                                var variableNameParts = variableName.split('.');

                                var newVariableObject;

                                if(variableNameParts.length === 2) {
                                    //this is a programstage and dataelement specification. translate to program variable:
                                    newVariableObject = {
                                        displayName:variableName,
                                        programRuleVariableSourceType:'DATAELEMENT_NEWEST_EVENT_PROGRAM_STAGE',
                                        dataElement:variableNameParts[1],
                                        programStage:variableNameParts[0],
                                        program:programUid
                                    };
                                }
                                else if(variableNameParts.length === 1)
                                {
                                    //This is an attribute - let us translate to program variable:
                                    newVariableObject = {
                                        displayName:variableName,
                                        programRuleVariableSourceType:'TEI_ATTRIBUTE',
                                        trackedEntityAttribute:variableNameParts[0],
                                        program:programUid
                                    };
                                }
                                variables.push(newVariableObject);
                                
                                return newVariableObject;
                                
                            };
                            
                            angular.forEach(variablesInCondition, function(variableInCondition) {
                                var pushed = pushDirectAddressedVariable(variableInCondition);
                            });

                            angular.forEach(variablesInData, function(variableInData) {
                                var pushed = pushDirectAddressedVariable(variableInData);
                                
                                //We only count the number of values in the data part of the rule
                                //(Called expression in program indicators)
                                variableObjectsCurrentExpression.push(pushed);
                            });
                            
                            //Change expression or data part of the rule to match the program rules execution model
                            
                            if(valueCountPresent) {
                                var valueCountText;
                                angular.forEach(variableObjectsCurrentExpression, function(variableCurrentRule) {
                                   if(valueCountText) {
                                       //This is not the first value in the value count part of the expression. 
                                       valueCountText +=  ' + d2:count(\'' + variableCurrentRule.displayName + '\')';
                                   }
                                   else
                                   {
                                       //This is the first part value in the value count expression:
                                       valueCountText = '(d2:count(\'' + variableCurrentRule.displayName + '\')';
                                   }
                                });
                                //To finish the value count expression we need to close the paranthesis:
                                valueCountText += ')';

                                //Replace all occurrences of value counts in both the data and expression:
                                newRule.condition = newRule.condition.replace(new RegExp("V{value_count}", 'g'),valueCountText);
                                newAction.data = newAction.data.replace(new RegExp("V{value_count}", 'g'),valueCountText);
                            }
                            if(positiveValueCountPresent) {
                                var zeroPosValueCountText;
                                angular.forEach(variableObjectsCurrentExpression, function(variableCurrentRule) {
                                   if(zeroPosValueCountText) {
                                       //This is not the first value in the value count part of the expression. 
                                       zeroPosValueCountText +=  '+ d2:countifzeropos(\'' + variableCurrentRule.displayName + '\')';
                                   }
                                   else
                                   {
                                       //This is the first part value in the value count expression:
                                       zeroPosValueCountText = '(d2:countifzeropos(\'' + variableCurrentRule.displayName + '\')';
                                   }
                                });
                                //To finish the value count expression we need to close the paranthesis:
                                zeroPosValueCountText += ')';

                                //Replace all occurrences of value counts in both the data and expression:
                                newRule.condition = newRule.condition.replace(new RegExp("V{zero_pos_value_count}", 'g'),zeroPosValueCountText);
                                newAction.data = newAction.data.replace(new RegExp("V{zero_pos_value_count}", 'g'),zeroPosValueCountText);
                            }
                        }
                    });

                    var programIndicators = {rules:programRules, variables:variables};
                    
                    MetaDataFactory.getByProgram('programValidations',programUid).then(function(programValidations){                    
                        MetaDataFactory.getByProgram('programRuleVariables',programUid).then(function(programVariables){                    
                            MetaDataFactory.getByProgram('programRules',programUid).then(function(prs){
                                var programRules = [];
                                angular.forEach(prs, function(rule){
                                    rule.actions = [];
                                    rule.programStageId = rule.programStage && rule.programStage.id ? rule.programStage.id : null;
                                    programRules.push(rule);
                                });                                
                                def.resolve({constants: constants, programIndicators: programIndicators, programValidations: programValidations, programVariables: programVariables, programRules: programRules});
                            });
                        });
                    });
                }); 
            });                        
            return def.promise;
        }
    };  
})

.service('EntityQueryFactory', function(OperatorFactory, DateUtils){  
    
    this.getAttributesQuery = function(attributes, enrollment){

        var query = {url: null, hasValue: false};
        
        angular.forEach(attributes, function(attribute){           

            if(attribute.valueType === 'DATE' || attribute.valueType === 'NUMBER'){
                var q = '';
                
                if(attribute.operator === OperatorFactory.defaultOperators[0]){
                    if(attribute.exactValue && attribute.exactValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE'){
                            attribute.exactValue = DateUtils.formatFromUserToApi(attribute.exactValue);
                        }
                        q += 'EQ:' + attribute.exactValue + ':';
                    }
                }                
                if(attribute.operator === OperatorFactory.defaultOperators[1]){
                    if(attribute.startValue && attribute.startValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE'){
                            attribute.startValue = DateUtils.formatFromUserToApi(attribute.startValue);
                        }
                        q += 'GT:' + attribute.startValue + ':';
                    }
                    if(attribute.endValue && attribute.endValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE'){
                            attribute.endValue = DateUtils.formatFromUserToApi(attribute.endValue);
                        }
                        q += 'LT:' + attribute.endValue + ':';
                    }
                }                
                if(query.url){
                    if(q){
                        q = q.substr(0,q.length-1);
                        query.url = query.url + '&filter=' + attribute.id + ':' + q;
                    }
                }
                else{
                    if(q){
                        q = q.substr(0,q.length-1);
                        query.url = 'filter=' + attribute.id + ':' + q;
                    }
                }
            }
            else{
                if(attribute.value && attribute.value !== ''){                    
                    query.hasValue = true;                

                    if(angular.isArray(attribute.value)){
                        var q = '';
                        angular.forEach(attribute.value, function(val){                        
                            q += val + ';';
                        });

                        q = q.substr(0,q.length-1);

                        if(query.url){
                            if(q){
                                query.url = query.url + '&filter=' + attribute.id + ':IN:' + q;
                            }
                        }
                        else{
                            if(q){
                                query.url = 'filter=' + attribute.id + ':IN:' + q;
                            }
                        }                    
                    }
                    else{                        
                        if(query.url){
                            query.url = query.url + '&filter=' + attribute.id + ':LIKE:' + attribute.value;
                        }
                        else{
                            query.url = 'filter=' + attribute.id + ':LIKE:' + attribute.value;
                        }
                    }
                }
            }            
        });
        
        if(enrollment){
            var q = '';
            if(enrollment.operator === OperatorFactory.defaultOperators[0]){
                if(enrollment.programExactDate && enrollment.programExactDate !== ''){
                    query.hasValue = true;
                    q += '&programStartDate=' + DateUtils.formatFromUserToApi(enrollment.programExactDate) + '&programEndDate=' + DateUtils.formatFromUserToApi(enrollment.programExactDate);
                }
            }
            if(enrollment.operator === OperatorFactory.defaultOperators[1]){
                if(enrollment.programStartDate && enrollment.programStartDate !== ''){                
                    query.hasValue = true;
                    q += '&programStartDate=' + DateUtils.formatFromUserToApi(enrollment.programStartDate);
                }
                if(enrollment.programEndDate && enrollment.programEndDate !== ''){
                    query.hasValue = true;
                    q += '&programEndDate=' + DateUtils.formatFromUserToApi(enrollment.programEndDate);
                }
            }            
            if(q){
                if(query.url){
                    query.url = query.url + q;
                }
                else{
                    query.url = q;
                }
            }            
        }
        return query;
        
    };   
    
    this.resetAttributesQuery = function(attributes, enrollment){
        
        angular.forEach(attributes, function(attribute){
            attribute.exactValue = '';
            attribute.startValue = '';
            attribute.endValue = '';
            attribute.value = '';           
        });
        
        if(enrollment){
            enrollment.programStartDate = '';
            enrollment.programEndDate = '';          
        }        
        return attributes;        
    }; 
})

/*Orgunit service for local db */
.service('OuService', function($window, $q){
    
    var indexedDB = $window.indexedDB;
    var db = null;
    
    var open = function(){
        var deferred = $q.defer();
        
        var request = indexedDB.open("dhis2ou");
        
        request.onsuccess = function(e) {
          db = e.target.result;
          deferred.resolve();
        };

        request.onerror = function(){
          deferred.reject();
        };

        return deferred.promise;
    };
    
    var get = function(uid){
        
        var deferred = $q.defer();
        
        if( db === null){
            deferred.reject("DB not opened");
        }
        else{
            var tx = db.transaction(["ou"]);
            var store = tx.objectStore("ou");
            var query = store.get(uid);
                
            query.onsuccess = function(e){
                if(e.target.result){
                    deferred.resolve(e.target.result);
                }
                else{
                    var t = db.transaction(["ouPartial"]);
                    var s = t.objectStore("ouPartial");
                    var q = s.get(uid);
                    q.onsuccess = function(e){
                        deferred.resolve(e.target.result);
                    };
                }            
            };
        }
        return deferred.promise;
    };
    
    return {
        open: open,
        get: get
    };    
})

.service('TEIGridService', function(OptionSetService, CurrentSelection, DateUtils, $translate, $filter, SessionStorageService){
    var setShowGridColumn = function(column, columnIndex, config, savedGridColumnsKeyMap){
        if(config.showAll){
            column.show = true;
        }
        else if(savedGridColumnsKeyMap && savedGridColumnsKeyMap[column.id]){
            column.show = savedGridColumnsKeyMap[column.id].show;
        }else if(config.defaultRange && config.defaultRange.start && config.defaultRange.end){
            if(columnIndex >= config.defaultRange.start && columnIndex <= config.defaultRange.end){
                column.show = true;
            }
        }else{
            column.show = false;
        }
    }
    return {
        format: function(grid, map, optionSets, invalidTeis, isFollowUp){
            
            var ou = SessionStorageService.get('SELECTED_OU');
            
            invalidTeis = !invalidTeis ? [] : invalidTeis;
            if(!grid || !grid.rows){
                return;
            }            
            
            //grid.headers[0-6] = Instance, Created, Last updated, OU ID, Ou Name, Tracked entity, Inactive
            //grid.headers[7..] = Attribute, Attribute,.... 
            var attributes = [];
            for(var i=6; i<grid.headers.length; i++){
                attributes.push({id: grid.headers[i].name, displayName: grid.headers[i].column, type: grid.headers[i].type});
            }

            var entityList = {own: [], other: []};
            
            angular.forEach(grid.rows, function(row){
                if(invalidTeis.indexOf(row[0]) === -1 ){
                    var entity = {};
                    var isEmpty = true;

                    entity.id = row[0];
                    entity.created = DateUtils.formatFromApiToUser( row[1] );

                    entity.orgUnit = row[3];
                    entity.orgUnitName = row[4];
                    entity.type = row[5];
                    entity.inactive = row[6] !== "" ? row[6] : false;
                    entity.followUp = isFollowUp;
                    
                    for(var i=7; i<row.length; i++){
                        if(row[i] && row[i] !== ''){
                            isEmpty = false;
                            var val = row[i];

                            if(attributes[grid.headers[i].name] && 
                                    attributes[grid.headers[i].name].optionSetValue && 
                                    optionSets &&    
                                    attributes[grid.headers[i].name].optionSet &&
                                    optionSets[attributes[grid.headers[i].name].optionSet.id] ){
                                val = OptionSetService.getName(optionSets[attributes[grid.headers[i].name].optionSet.id].options, val);
                            }
                            if(attributes[grid.headers[i].name] && attributes[grid.headers[i].name].valueType === 'date'){                                    
                                val = DateUtils.formatFromApiToUser( val );
                            }

                            entity[grid.headers[i].name] = val;
                        }
                    }

                    if(map){
                        entityList[entity.id] = entity;
                    }
                    else{
                        if(entity.orgUnit === ou.id){
                            entityList.own.push(entity);
                        }
                        else{
                            entityList.other.push(entity);
                        }
                    }
                }
            });
            
            var len = entityList.own.length + entityList.other.length;
            return {headers: attributes, rows: entityList, pager: grid.metaData.pager, length: len};
            
        },
        generateGridColumns: function(attributes, ouMode, nonConfidential){
            
            if( ouMode === null ){
                ouMode = 'SELECTED';
            }
            var filterTypes = {}, filterText = {};
            var columns = [];
            
            var returnAttributes = [];
            if(nonConfidential) {
                //Filter out attributes that is confidential, so they will not be part of any grid:
                returnAttributes = angular.copy($filter('nonConfidential')(attributes));
            }
            else
            {
                returnAttributes = angular.copy(attributes);
            }
       
            //also add extra columns which are not part of attributes (orgunit for example)
            columns.push({id: 'orgUnitName', displayName: $translate.instant('registering_unit'), valueType: 'TEXT', displayInListNoProgram: false, attribute: false});
            columns.push({id: 'created', displayName: $translate.instant('registration_date'), valueType: 'DATE', displayInListNoProgram: false, attribute: false});
            columns.push({id: 'inactive', displayName: $translate.instant('inactive'), valueType: 'BOOLEAN', displayInListNoProgram: false, attribute: false});
            columns = columns.concat(returnAttributes ? returnAttributes : []);
            
            //generate grid column for the selected program/attributes
            angular.forEach(columns, function(column){
                column.attribute = angular.isUndefined(column.attribute) ? true : false;
                column.show = false;

                if( (column.id === 'orgUnitName' && ouMode !== 'SELECTED') ||
                    column.displayInListNoProgram || 
                    column.displayInList){
                    column.show = true;
                }                
                column.showFilter = false;                
                filterTypes[column.id] = column.valueType;
                if(column.valueType === 'DATE' || column.valueType === 'NUMBER' ){
                    filterText[column.id]= {};
                }
            });
            return {columns: columns, filterTypes: filterTypes, filterText: filterText};
        },
        makeGridColumns: function(attributes,config, savedGridColumnsKeyMap){
            var gridColumns = [
                {id: 'orgUnitName', displayName: $translate.instant('registering_unit'), show: false, valueType: 'TEXT'},
                {id: 'created', displayName: $translate.instant('registration_date'), show: false, valueType: 'DATE'},
                {id: 'inactive', displayName: $translate.instant('inactive'), show: false, valueType: 'BOOLEAN'}
            ];
            setShowGridColumn(gridColumns[0],0, config, savedGridColumnsKeyMap);
            setShowGridColumn(gridColumns[1],1, config, savedGridColumnsKeyMap);
            setShowGridColumn(gridColumns[2],2, config, savedGridColumnsKeyMap);

            var gridColumnIndex = 2;
            
            angular.forEach(attributes, function(attr){
                if(attr.displayInListNoProgram){
                    gridColumnIndex++;
                    var gridColumn = {id: attr.id, displayName: attr.displayName, show: false, valueType: attr.valueType};
                    setShowGridColumn(gridColumn,gridColumnIndex, config, savedGridColumnsKeyMap);
                    gridColumns.push(gridColumn);
                }
            });
            return gridColumns;
        },
        getData: function(rows, columns){
            var data = [];
            angular.forEach(rows, function(row){
                var d = {};
                angular.forEach(columns, function(col){
                    if(col.show){
                        d[col.displayName] = row[col.id];
                    }                
                });
                data.push(d);            
            });
            return data;
        },
        getHeader: function(columns){
            var header = []; 
            angular.forEach(columns, function(col){
                if(col.show){
                    header.push($translate.instant(col.displayName));
                }
            });        
            return header;
        }
    };
})

.service('EventUtils', function(DateUtils, CommonUtils, PeriodService, CalendarService, $translate, $filter, orderByFilter){
    
    var getEventDueDate = function(eventsByStage, programStage, enrollment){       
        
        var referenceDate = enrollment.incidentDate ? enrollment.incidentDate : enrollment.enrollmentDate,
            offset = programStage.minDaysFromStart,
            calendarSetting = CalendarService.getSetting(),
            dueDate;

        if(programStage.generatedByEnrollmentDate){
            referenceDate = enrollment.enrollmentDate;
        }

        if(programStage.repeatable){
            var evs = [];                
            angular.forEach(eventsByStage, function(ev){
                if(ev.eventDate){
                    evs.push(ev);
                }
            });

            if(evs.length > 0){
                evs = orderByFilter(evs, '-eventDate');                
                if(programStage.periodType){
                    
                }
                else{
                    referenceDate = evs[0].eventDate;
                    offset = programStage.standardInterval;
                }
            }                
        }
        dueDate = moment(referenceDate, calendarSetting.momentFormat).add('d', offset)._d;
        dueDate = $filter('date')(dueDate, calendarSetting.keyDateFormat);        
        return dueDate;
    };
    
    var getEventDuePeriod = function(eventsByStage, programStage, enrollment){ 
        
        var evs = [];                
        angular.forEach(eventsByStage, function(ev){
            if(ev.eventDate){
                evs.push(ev);
            }
        });

        if(evs.length > 0){
            evs = orderByFilter(evs, '-eventDate');
        }
        
        var availabelPeriods = PeriodService.getPeriods(evs,programStage, enrollment).availablePeriods;
        var periods = [];
        for(var k in availabelPeriods){
            if(availabelPeriods.hasOwnProperty(k)){
                periods.push( availabelPeriods[k] );
            }
        }        
        return periods;
    };
    
    return {
        createDummyEvent: function(eventsPerStage, tei, program, programStage, orgUnit, enrollment, scheduleDate){
            var today = DateUtils.getToday();
            var dummyEvent = {trackedEntityInstance: tei.trackedEntityInstance, 
                              programStage: programStage.id, 
                              program: program.id,
                              orgUnit: orgUnit.id,
                              orgUnitName: orgUnit.displayName,
                              displayName: programStage.displayName,
                              executionDateLabel: programStage.executionDateLabel ? programStage.executionDateLabel : $translate.instant('report_date'),
                              enrollmentStatus: 'ACTIVE',
                              enrollment: enrollment.enrollment,
                              status: 'SCHEDULED'};
                          
            if(programStage.periodType){                
                var periods = getEventDuePeriod(eventsPerStage, programStage, enrollment);
                dummyEvent.dueDate = periods[0].endDate;
                dummyEvent.periodName = periods[0].displayName;
                dummyEvent.eventDate = dummyEvent.dueDate;
                dummyEvent.periods = periods;
            }
            else{
                dummyEvent.dueDate = getEventDueDate(eventsPerStage, programStage, enrollment);
            }

            if(scheduleDate) {
                dummyEvent.dueDate = scheduleDate;
            }
            
            dummyEvent.sortingDate = dummyEvent.dueDate;
            
            
            if(programStage.captureCoordinates){
                dummyEvent.coordinate = {};
            }
            
            dummyEvent.statusColor = 'alert-warning';//'stage-on-time';
            if(moment(today).isAfter(dummyEvent.dueDate)){
                dummyEvent.statusColor = 'alert-danger';//'stage-overdue';
            }
            return dummyEvent;        
        },
        getEventStatusColor: function(dhis2Event){    
            var eventDate = DateUtils.getToday();
            var calendarSetting = CalendarService.getSetting();
            
            if(dhis2Event.eventDate){
                eventDate = dhis2Event.eventDate;
            }
    
            if(dhis2Event.status === 'COMPLETED'){
                return 'custom-tracker-complete';//'stage-completed';
            }
            else if(dhis2Event.status === 'SKIPPED'){
                return 'alert-default'; //'stage-skipped';
            }
            else{                
                if(dhis2Event.eventDate){
                    return 'alert-warning'; //'stage-executed';
                }
                else{
                    if(moment(eventDate, calendarSetting.momentFormat).isAfter(dhis2Event.dueDate) && eventDate !== dhis2Event.dueDate){
                        return 'alert-danger';//'stage-overdue';
                    }                
                    return 'alert-success';//'stage-on-time';
                }               
            }            
        },
        autoGenerateEvents: function(teiId, program, orgUnit, enrollment){
            var dhis2Events = {events: []};
            if(teiId && program && orgUnit && enrollment){
                angular.forEach(program.programStages, function(stage){
                    if(stage.autoGenerateEvent){
                        var newEvent = {
                                trackedEntityInstance: teiId,
                                program: program.id,
                                programStage: stage.id,
                                orgUnit: orgUnit.id,
                                enrollment: enrollment.enrollment
                            };
                        if(stage.periodType){
                            var periods = getEventDuePeriod(null, stage, enrollment);
                            newEvent.dueDate = DateUtils.formatFromUserToApi(periods[0].endDate);;
                            newEvent.eventDate = newEvent.dueDate;
                        }
                        else{
                            newEvent.dueDate = DateUtils.formatFromUserToApi(getEventDueDate(null,stage, enrollment));
                        }
                        
                        if(stage.openAfterEnrollment){
                            if(stage.reportDateToUse === 'incidentDate'){
                                newEvent.eventDate = DateUtils.formatFromUserToApi(enrollment.incidentDate);
                            }
                            else{
                                newEvent.eventDate = DateUtils.formatFromUserToApi(enrollment.enrollmentDate);
                            }
                        }

                        newEvent.status = newEvent.eventDate ? 'ACTIVE' : 'SCHEDULE';
                        
                        dhis2Events.events.push(newEvent);    
                    }
                });
            }
            
           return dhis2Events;
        },
        reconstruct: function(dhis2Event, programStage, optionSets){
            
            var e = {dataValues: [], 
                    event: dhis2Event.event, 
                    program: dhis2Event.program, 
                    programStage: dhis2Event.programStage, 
                    orgUnit: dhis2Event.orgUnit, 
                    trackedEntityInstance: dhis2Event.trackedEntityInstance,
                    status: dhis2Event.status,
                    dueDate: DateUtils.formatFromUserToApi(dhis2Event.dueDate)
                };
                
            angular.forEach(programStage.programStageDataElements, function(prStDe){
                if(dhis2Event[prStDe.dataElement.id]){                    
                    var value = CommonUtils.formatDataValue(dhis2Event.event, dhis2Event[prStDe.dataElement.id], prStDe.dataElement, optionSets, 'API');                    
                    var val = {value: value, dataElement: prStDe.dataElement.id};
                    if(dhis2Event.providedElsewhere[prStDe.dataElement.id]){
                        val.providedElsewhere = dhis2Event.providedElsewhere[prStDe.dataElement.id];
                    }
                    e.dataValues.push(val);
                }                                
            });
            
            if(programStage.captureCoordinates){
                e.coordinate = {latitude: dhis2Event.coordinate.latitude ? dhis2Event.coordinate.latitude : 0,
                                longitude: dhis2Event.coordinate.longitude ? dhis2Event.coordinate.longitude : 0};
            }
            
            if(dhis2Event.eventDate){
                e.eventDate = DateUtils.formatFromUserToApi(dhis2Event.eventDate);
            }
            
            return e;
        },
        processEvent: function(event, stage, optionSets, prStDes){
            event.providedElsewhere = {};
            angular.forEach(event.dataValues, function(dataValue){
                
                var prStDe = prStDes[dataValue.dataElement];

                if( prStDe ){                
                    var val = dataValue.value;
                    if(prStDe.dataElement){
                        val = CommonUtils.formatDataValue(event.event, val, prStDe.dataElement, optionSets, 'USER');                        
                    }    
                    event[dataValue.dataElement] = val;
                    if(dataValue.providedElsewhere){
                        event.providedElsewhere[dataValue.dataElement] = dataValue.providedElsewhere;
                    }
                }

            });        

            if(stage.captureCoordinates){
                event.coordinate = {latitude: event.coordinate.latitude ? event.coordinate.latitude : '',
                                         longitude: event.coordinate.longitude ? event.coordinate.longitude : ''};
            }        

            event.allowProvidedElsewhereExists = false;        
            for(var i=0; i<stage.programStageDataElements.length; i++){
                if(stage.programStageDataElements[i].allowProvidedElsewhere){
                    event.allowProvidedElsewhereExists = true;
                    break;
                }
            }
            return event;
        }
    };
    
})

.service('EventCreationService', function($modal){
            
        this.showModal = function(eventsByStage, stage, availableStages,programStages,selectedEntity,selectedProgram,selectedOrgUnit,selectedEnrollment, autoCreate, eventCreationAction,allEventsSorted, suggestedStage, currentEvent){
            var modalInstance = $modal.open({
                templateUrl: 'components/dataentry/new-event.html',
                controller: 'EventCreationController',
                resolve: {                    
                    eventsByStage: function () {
                        return eventsByStage;
                    },
                    stage: function () {
                        return stage;
                    },                
                    stages: function(){
                        return availableStages;
                    },
                    allStages: function(){
                        return programStages;
                    },
                    tei: function(){
                        return selectedEntity;
                    },
                    program: function(){
                        return selectedProgram;
                    },
                    orgUnit: function(){
                        return selectedOrgUnit;
                    },
                    enrollment: function(){
                        return selectedEnrollment;
                    },
                    autoCreate: function () {
                        return autoCreate;
                    },
                    eventCreationAction: function(){
                        return eventCreationAction;
                    },
                    events: function(){
                        return allEventsSorted;
                    },
                    suggestedStage: function(){
                        return suggestedStage;
                    },
                    currentEvent: function() {
                        return currentEvent;
                    }
                }
            }).result;
            return modalInstance;
        };
        this.eventCreationActions = { add: 'ADD',  schedule: 'SCHEDULE', referral: 'REFERRAL'};
})
.service("SearchGroupService", function(TEIService, $q, OperatorFactory, AttributesFactory, DateUtils){
    var programSearchConfigsById = {};
    var trackedEntityTypeSearchConfigsById = {};
    var defaultOperators = OperatorFactory.defaultOperators;
    var searchScopes = { PROGRAM: "PROGRAM", TET: "TET"};
    var checkMaxTeiCount = false;

    this.forceMaxTeiCount = function(){
        checkMaxTeiCount = true;
    };

    this.getSearchScopes = function(){ return searchScopes;}
    var makeSearchConfig = function(dimensionAttributes, settings,orgUnitUniqueAsSearchGroup){
        var searchConfig = { searchGroups: [], searchGroupsByAttributeId: {}};
        if(dimensionAttributes){
            var defaultSearchGroup = { id: dhis2.util.uid(), attributes: [], ouMode: {name: 'ACCESSIBLE'}, orgunitUnique: false};
            var attributes = AttributesFactory.generateAttributeFilters(angular.copy(dimensionAttributes));
            angular.forEach(attributes, function(attr){
                if(attr.searchable || (attr.unique && !attr.orgunitScope)){
                    searchConfig.searchGroupsByAttributeId[attr.id] = {};
                    if(attr.unique){
                        var uniqueAttr = attr.orgunitScope ? angular.copy(attr) : attr;
                        uniqueAttr.operator = ["DATETIME", "NUMBER", "DATE"].includes(uniqueAttr.valueType) ?  OperatorFactory.defaultOperators[0] : OperatorFactory.textOperators[0];
                        var uniqueSearchGroup = {
                            id: dhis2.util.uid(),
                            uniqueGroup: true,
                            orgunitUnique: uniqueAttr.orgunitScope,
                            attributes: [uniqueAttr],
                            ouMode: {name: 'ACCESSIBLE'},
                            minAttributesRequiredToSearch: 1,
                            maxTeiCountToReturn: 1,
                        }
                        if(uniqueAttr.orgunitScope) uniqueSearchGroup.ouMode = {name: 'SELECTED'};
                        searchConfig.searchGroups.push(uniqueSearchGroup);
                        searchConfig.searchGroupsByAttributeId[uniqueAttr.id].unique = uniqueSearchGroup;
                    }
                    if(!attr.unique || attr.orgunitScope){
                        if(attr.optionSetValue && attr.valueType === "TEXT") attr.operator = OperatorFactory.textOperators[0];
                        defaultSearchGroup.attributes.push(attr);
                        searchConfig.searchGroupsByAttributeId[attr.id].default = defaultSearchGroup;
                    }

                }
            });
            if(defaultSearchGroup.attributes.length !== 0){
                defaultSearchGroup.minAttributesRequiredToSearch = settings.minAttributesRequiredToSearch;
                defaultSearchGroup.maxTeiCountToReturn = settings.maxTeiCountToReturn;
                searchConfig.searchGroups.push(defaultSearchGroup);
            }
        }
        return searchConfig;
    }

    var getSearchParams = function(searchGroup, program,trackedEntityType, orgUnit,pager, searchScope){
        var uniqueSearch = false;
        var numberOfSetAttributes = 0;
        var query = {url: null, hasValue: false};
        if(searchGroup){
            angular.forEach(searchGroup.attributes, function(attr){
                if(searchGroup.uniqueGroup) uniqueSearch = true;
                if(attr.valueType === 'DATE' || attr.valueType === 'NUMBER' || attr.valueType === 'DATETIME'){
                    var q = '';
    
                    if(attr.operator === OperatorFactory.defaultOperators[0]){
                        var exactValue = searchGroup[attr.id] ? searchGroup[attr.id].exactValue : null;
                        if(exactValue == null) exactValue = searchGroup[attr.id];


                        if(exactValue && exactValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'DATETIME'){
                                exactValue = DateUtils.formatFromUserToApi(exactValue);
                            }
                            if(attr.valueType === 'DATETIME') {
                                q += 'LIKE:' + exactValue + ':';
                            } else {
                                q += 'EQ:' + exactValue + ':';
                            }
                            numberOfSetAttributes++;
                        }
                    }
                    if(attr.operator === OperatorFactory.defaultOperators[1]){
                        var startValue =  searchGroup[attr.id] ? searchGroup[attr.id].startValue : null;
                        var endValue = searchGroup[attr.id] ? searchGroup[attr.id].endValue : null;
                        if(startValue && startValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'DATETIME'){
                                startValue = DateUtils.formatFromUserToApi(startValue);
                            }
                            q += 'GT:' + startValue + ':';
                        }
                        if(endValue && endValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'DATETIME'){
                                endValue = DateUtils.formatFromUserToApi(endValue);
                            }
                            q += 'LT:' + endValue + ':';
                        }
                    }
                    if(query.url){
                        if(q){
                            numberOfSetAttributes++;
                            q = q.substr(0,q.length-1);
                            query.url = query.url + '&filter=' + attr.id + ':' + q;
                        }
                    }
                    else{
                        if(q){
                            numberOfSetAttributes++;
                            q = q.substr(0,q.length-1);
                            query.url = 'filter=' + attr.id + ':' + q;
                        }
                    }
                }
                else{
                    var value = searchGroup[attr.id] ? searchGroup[attr.id].value : null;
                    if(value == null) value = searchGroup[attr.id];
                    if(value && value !== ''){
                        query.hasValue = true;
    
                        if(angular.isArray(value)){
                            var q = '';
                            angular.forEach(value, function(val){
                                q += val + ';';
                            });
    
                            q = q.substr(0,q.length-1);
    
                            if(query.url){
                                if(q){
                                    numberOfSetAttributes++;
                                    query.url = query.url + '&filter=' + attr.id + ':IN:' + q;
                                }
                            }
                            else{
                                if(q){
                                    numberOfSetAttributes++;
                                    query.url = 'filter=' + attr.id + ':IN:' + q;
                                }
                            }
                        }
                        else{
                            if(query.url){
                                numberOfSetAttributes++;
                                if(attr.operator === OperatorFactory.textOperators[0]){
                                    query.url = query.url + '&filter=' + attr.id + ':EQ:' + value;
                                }else{
                                    query.url = query.url + '&filter=' + attr.id + ':LIKE:' + value;
                                }
                                
                            }
                            else{
                                numberOfSetAttributes++;
                                if(attr.operator === "Eq"){
                                    query.url = 'filter=' + attr.id + ':EQ:' + value;
                                }else{
                                    query.url = 'filter=' + attr.id + ':LIKE:' + value;
                                }
                                
                            }
                        }
                    }
                }
            });
        }
        if(query.hasValue &&(uniqueSearch || numberOfSetAttributes >= searchGroup.minAttributesRequiredToSearch)){
            var programOrTETUrl = searchScope === searchScopes.PROGRAM ? "program="+program.id : "trackedEntityType="+trackedEntityType.id;

            //FIX FOR FINDING TEI WITHOUT ENTROLLMENTS
            if(searchGroup.dropTetInQuery){
                programOrTETUrl = null;
            }

            var searchOrgUnit = searchGroup.orgUnit ? searchGroup.orgUnit : orgUnit;
            return { orgUnit: searchOrgUnit, ouMode: searchGroup.ouMode.name, programOrTETUrl: programOrTETUrl, queryUrl: query.url, pager: pager, uniqueSearch: uniqueSearch };
        }
    }
    
    this.getSearchConfigForProgram = function(program, orgUnitUniqueAsSearchGroup) {
        var def = $q.defer();
        if(!programSearchConfigsById[program.id]){
            return AttributesFactory.getByProgram(program).then(function(attributes)
            {
                var settings = { minAttributesRequiredToSearch: program.minAttributesRequiredToSearch, maxTeiCountToReturn: program.maxTeiCountToReturn};
                var searchConfig = makeSearchConfig(attributes, settings,orgUnitUniqueAsSearchGroup);
                programSearchConfigsById[program.id] = searchConfig;
                def.resolve(angular.copy(searchConfig));
                return def.promise;
            });
        }
        def.resolve(angular.copy(programSearchConfigsById[program.id]));
        return def.promise;
    }
    this.getSearchConfigForTrackedEntityType = function(trackedEntityType,orgUnitUniqueAsSearchGroup){
        var def = $q.defer();
        if(!trackedEntityTypeSearchConfigsById[trackedEntityType.id]){
            return AttributesFactory.getByTrackedEntityType(trackedEntityType).then(function(attributes)
            {
                var settings = { minAttributesRequiredToSearch: trackedEntityType.minAttributesRequiredToSearch, maxTeiCountToReturn: trackedEntityType.maxTeiCountToReturn};
                var searchConfig = makeSearchConfig(attributes, settings, orgUnitUniqueAsSearchGroup);
                trackedEntityTypeSearchConfigsById[trackedEntityType.id] = searchConfig;
                def.resolve(angular.copy(searchConfig));
                return def.promise;
            });
        }
        def.resolve(angular.copy(trackedEntityTypeSearchConfigsById[trackedEntityType.id]));
        return def.promise;
    }

    this.programScopeSearchCount = function(searchGroup,tetSearchGroup, program, trackedEntityType, orgUnit, pager){
        var params = getSearchParams(searchGroup, program, trackedEntityType, orgUnit, pager, searchScopes.PROGRAM);
        if(params){
            return TEIService.searchCount(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, params.pager, true).then(function(response){
                if(response){
                    return response;
                }else{
                    return tetScopeSearchCount(tetSearchGroup, program, trackedEntityType, orgUnit, pager);
                }
                return 0;
            },function(error){
                return 0;
            });
        }else{
            var def = $q.defer();
            def.resolve(0);
            return def.promise;
        }
    }
    var tetScopeSearchCount = this.tetScopeSearchCount = function(searchGroup,tetSearchGroup, program, trackedEntityType, orgUnit, pager){
        var params = getSearchParams(searchGroup, program, trackedEntityType, orgUnit, pager, searchScopes.TET);
        if(params){
            return TEIService.searchCount(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, params.pager, true).then(function(response){
                if(response){
                    return response;
                }
                return 0;
            },function(error){
                return 0;
            });
        }else{
            var def = $q.defer();
            def.resolve(0);
            return def.promise;
        }
    }
    this.findValidTetSearchGroup = function(programSeachGroup,tetSearchConfig, attributesById){
        for(var sg = 0; sg < tetSearchConfig.searchGroups.length; sg++){
            var searchGroup = tetSearchConfig.searchGroups[sg];
            for(var a=0; a < tetSearchConfig.searchGroups[sg].attributes.length; a++){
                var attr = tetSearchConfig.searchGroups[sg].attributes[a];
                var value = programSeachGroup[attr.id];
                if(value){
                    searchGroup[attr.id] = value;
                }
            }
            if(this.isValidSearchGroup(searchGroup, attributesById)){
                return searchGroup;
            }
        }
    }

    this.isValidSearchGroup = function(searchGroup, attributesById){
        var nrOfSetAttributes = 0;
        for(var key in searchGroup){
            var attr = attributesById[key];
            if(attr){
                if(attr.valueType === "TEXT" && searchGroup[key] && searchGroup[key].value !== "") nrOfSetAttributes++;
                else if(attr.valueType !== "TEXT" && attr.valueType === "TRUE_ONLY") nrOfSetAttributes++;
                else if(attr.valueType !== "TEXT" && attr.valueType !== "TRUE_ONLY" && searchGroup[key]) nrOfSetAttributes++;
            }
        }
        if(searchGroup.minAttributesRequiredToSearch > nrOfSetAttributes){
            return false;
        }
        return true;
    }

    this.programScopeSearch = function(programSearchGroup, tetSearchGroup, program, trackedEntityType, orgUnit, pager){
        var params = getSearchParams(programSearchGroup, program, trackedEntityType, orgUnit, pager, searchScopes.PROGRAM);
        if(params){

        }
        return TEIService.search(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, params.pager, true).then(function(response){
                if(response && response.rows && response.rows.length > 0){
                    var def = $q.defer();
                    if(checkMaxTeiCount && programSearchGroup.maxTeiCountToReturn > 0 && response.rows.length > programSearchGroup.maxTeiCountToReturn){
                        def.resolve({ status: "TOOMANYMATCHES", data: null});
                    }else{
                        var result = { data: response, callingScope: searchScopes.PROGRAM, resultScope: searchScopes.PROGRAM };
                        if(params.uniqueSearch){
                            result.status = "UNIQUE";
                        }else{
                            result.status = "MATCHES";
                        }
                        def.resolve(result);
                    }
                    return def.promise;
                }else{
                    if(tetSearchGroup){
                        return tetScopeSearch(tetSearchGroup, program, trackedEntityType, orgUnit, pager).then(function(result){
                            result.callingScope = searchScopes.PROGRAM;
                            return result;
                        },function(){
                            return {status: "NOMATCH"};
                        });
                    }else{
                        var def = $q.defer();
                        def.resolve({status: "NOMATCH"});
                        return def.promise;
                    }

                }
            },function(error){
                var d = $q.defer();
                if(error && error.data && error.data.message === "maxteicountreached"){
                    d.resolve({ status: "TOOMANYMATCHES", data: null});
                } 
                else {
                    d.reject(error);
                }
                return d.promise;
            });

    }
    var tetScopeSearch = this.tetScopeSearch = function(tetSearchGroup, program,trackedEntityType, orgUnit, pager){
        var params = getSearchParams(tetSearchGroup, program, trackedEntityType, orgUnit, pager, searchScopes.TET);
        if(params){
            return TEIService.search(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, params.pager, true).then(function(response){
                var result = {data: response, callingScope: searchScopes.TET, resultScope: searchScopes.TET };
                if(response && response.rows && response.rows.length > 0){
                    if(checkMaxTeiCount && tetSearchGroup.maxTeiCountToReturn > 0 && response.rows.length > tetSearchGroup.maxTeiCountToReturn){
                       return { status: "TOOMANYMATCHES", data: null};
                    }
                    if(params.uniqueSearch){
                        result.status = "UNIQUE";
                    }else{
                        result.status = "MATCHES";
                    }
                }else{
                    result.status = "NOMATCH";
                }
                return result;
            },function(error){
                var d = $q.defer();
                if(error && error.data && error.data.message === "maxteicountreached"){
                    d.resolve({ status: "TOOMANYMATCHES", data: null});
                } 
                else {
                    d.reject(error);
                }
                return d.promise;
            });
        }else{
            var def = $q.defer();
            def.resolve({status: "NOMATCH"});
            return def.promise;
        }
    }
})
.service('TeiAuditService', function($q, $http,DHIS2URL){
    this.add = function(teiId, userId, auditMessage){
        var url = DHIS2URL+"/dataStore/E-Registry/teiaudit-"+dhis2.util.uid();
        var auditobject = {
            created: moment().utc().toJSON(),
            trackedEntityInstance: teiId,
            user: userId,
            auditMessage: auditMessage
        }
        return $http.post(url, auditobject);
    }
})
.factory('offlineHttpInterceptor', function($q, $location,$translate, $injector) {
    var methods = ["PUT", "POST"];
    var responseError = function(rejection) {
        if (rejection.status === 0 && methods.indexOf(rejection.config.method) > -1 && !rejection.config.skipIntercept) {
            var def = $q.defer();
            var modal = $injector.get("$modal");
            rejection.config.skipIntercept = true;
            var modalInstance = modal.open({
                template: '<div class="modal-header page">Network Error</div><div class="modal-body page"><span>Save failed due to network error. Please check you internet connection</span></div><div class="modal-footer"><button class="btn btn-default" data-ng-click="ok()">{{"ok"| translate}}</button></div>',
                controller: function($scope,$modalInstance){
                    $scope.ok = function(){
                        $modalInstance.close();
                    }
                }
            });
            modalInstance.result.then(function(){
                def.reject(rejection);
            })
            
            return def;
        }
        return $q.reject(rejection);
    }

    var service = {
        responseError: responseError
    };
    return service;
});

