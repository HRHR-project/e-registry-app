/* global eRegistry, angular */
var eRegistry = angular.module('eRegistry');
eRegistry.controller('RegistrationController', 
        function($rootScope,
                $scope,
                $location,
                $timeout,
                $modal,
                AttributesFactory,
                DHIS2EventFactory,
                TEService,
                CustomFormService,
                EnrollmentService,
                DialogService,
                CurrentSelection,
                MetaDataFactory,
                EventUtils,
                RegistrationService,
                DateUtils,
                SessionStorageService,
                TEIGridService,
                TrackerRulesFactory,
                TrackerRulesExecutionService,
                UsersService,
                OrgUnitFactory,
                ModalService,
                DHIS2BASEURL,
                AttributeUtils) {
    $scope.DHIS2BASEURL = DHIS2BASEURL;
    $scope.maxOptionSize = 30;
    $scope.today = DateUtils.getToday();
    $scope.trackedEntityForm = null;
    $scope.customForm = null;    
    $scope.selectedTei = {};
    $scope.tei = {};
    $scope.registrationMode = 'REGISTRATION';    
    $scope.hiddenFields = {};
    $scope.assignedFields = [];

    //Placeholder till proper settings for time is implemented. Currently hard coded to 12h format.
    $scope.timeFormat = '12h';
    
    $scope.helpTexts = {};
    
    $scope.showHelpText = function(attributeId){
        $scope.helpTexts[attributeId] = $scope.helpTexts[attributeId] ? false : true;
    };
    
    $scope.attributesById = CurrentSelection.getAttributesById();
    if(!$scope.attributesById){
        $scope.attributesById = [];
        AttributesFactory.getAll().then(function(atts){
            angular.forEach(atts, function(att){
                $scope.attributesById[att.id] = att;
            });
            
            CurrentSelection.setAttributesById($scope.attributesById);
        });
    }
    
    $scope.optionSets = CurrentSelection.getOptionSets();        
    if(!$scope.optionSets){
        $scope.optionSets = [];
        MetaDataFactory.getAll('optionSets').then(function(optionSets){
            angular.forEach(optionSets, function(optionSet){                        
                $scope.optionSets[optionSet.id] = optionSet;
            });
            CurrentSelection.setOptionSets($scope.optionSets);
        });
    }
    
    $scope.$on('orgunitSet', function() {
        $scope.selectedOrgUnit = SessionStorageService.get('SELECTED_OU');
        $scope.selectedEnrollment = {enrollmentDate: $scope.today, incidentDate: $scope.today, orgUnitName: $scope.selectedOrgUnit.displayName};
    });
            
    $scope.trackedEntityTypes = {available: []};
    TEService.getAll().then(function(entities){
        $scope.trackedEntityTypes.available = entities;   
        $scope.trackedEntityTypes.selected = $scope.trackedEntityTypes.available[0];
    });

    var getProgramRules = function(){
        $scope.trackedEntityForm = null;
        $scope.customForm = null;        
        $scope.allProgramRules = {constants: [], programIndicators: {}, programValidations: [], programVariables: [], programRules: []};
        if( angular.isObject($scope.selectedProgram) && $scope.selectedProgram.id ){
            TrackerRulesFactory.getRules($scope.selectedProgram.id).then(function(rules){                    
                $scope.allProgramRules = rules;
            });
        }        
    };
    
    //watch for selection of program
    $scope.$watch('selectedProgram', function(newValue, oldValue) {
        if( newValue !== oldValue )
        {
            getProgramRules();
            
            if($scope.registrationMode === 'REGISTRATION'){
                $scope.getAttributes($scope.registrationMode);
            }
        }                
    }); 
    
    //listen to modes of registration
    $scope.$on('registrationWidget', function(event, args){
        $scope.selectedTei = {};
        $scope.tei = {};
        $scope.registrationMode = args.registrationMode;
        
        if($scope.registrationMode !== 'REGISTRATION'){
            $scope.selectedTei = args.selectedTei;            
            $scope.tei = angular.copy(args.selectedTei);  
            //$scope.teiOriginal = angular.copy(args.selectedTei);  
        }
        
        if($scope.registrationMode === 'PROFILE'){
            $scope.selectedEnrollment = args.enrollment;
        }

        $scope.getAttributes($scope.registrationMode);
        
        if($scope.selectedProgram && $scope.selectedProgram.id){
            getProgramRules();
        }
    });
        
    $scope.getAttributes = function(_mode){        
        var mode = _mode ? _mode : 'ENROLLMENT';
        AttributesFactory.getByProgram($scope.selectedProgram).then(function(atts){            
            $scope.attributes = TEIGridService.generateGridColumns(atts, null,false).columns;
            fetchGeneratedAttributes();
            $scope.customFormExists = false;
            if($scope.selectedProgram && $scope.selectedProgram.id && $scope.selectedProgram.dataEntryForm && $scope.selectedProgram.dataEntryForm.htmlCode){
                $scope.customFormExists = true;
                $scope.trackedEntityForm = $scope.selectedProgram.dataEntryForm;  
                $scope.trackedEntityForm.attributes = $scope.attributes;
                $scope.trackedEntityForm.selectIncidentDatesInFuture = $scope.selectedProgram.selectIncidentDatesInFuture;
                $scope.trackedEntityForm.selectEnrollmentDatesInFuture = $scope.selectedProgram.selectEnrollmentDatesInFuture;
                $scope.trackedEntityForm.displayIncidentDate = $scope.selectedProgram.displayIncidentDate;
                $scope.customForm = CustomFormService.getForTrackedEntity($scope.trackedEntityForm, mode);
            }
            if($rootScope.findAttributes){
                for(var key in $rootScope.findAttributes){
                    if($rootScope.findAttributes.hasOwnProperty(key)){
                        $scope.selectedTei[key] =$rootScope.findAttributes[key];
                    }
                }
            }
        });
    };
    var fetchGeneratedAttributes = function() {
        angular.forEach($scope.attributes, function(att) {
            if (att.generated && !$scope.selectedTei[att.id]) {
                AttributeUtils.generateUniqueValue(att.id, $scope.selectedTei, $scope.selectedProgram, $scope.selectedOrgUnit).then(function (data) {
                    if (data && data.status === "ERROR") {
                        NotificationService.showNotifcationDialog($translate.instant("error"), data.message);
                        $scope.model.autoGeneratedAttFailed = true;
                    } else {
                        if (att.valueType === "NUMBER") {
                            $scope.selectedTei[att.id] = Number(data);
                        } else {
                            $scope.selectedTei[att.id] = data;
                        }
                        $scope.model.autoGeneratedAttFailed = false;
                    }
                });
            }
        });
    };
    
    var goToDashboard = function(destination, teiId){
        //reset form
        $scope.selectedTei = {};
        //$scope.selectedEnrollment = {enrollmentDate: $scope.today, incidentDate: $scope.today, orgUnitName: $scope.selectedOrgUnit.displayName};
        $scope.outerForm.submitted = false;
        $scope.outerForm.$setPristine();

        if(destination === 'DASHBOARD') {
            $location.path('/dashboard').search({tei: teiId,                                            
                                    program: $scope.selectedProgram ? $scope.selectedProgram.id: null});
        }
        else if (destination === 'SELF'){
            //notify user
            var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'registration_complete'
                };
            DialogService.showDialog({}, dialogOptions);
            $scope.selectedTei = {};
            $scope.tei = {};
        }
    };
    
    var reloadProfileWidget = function(){
        var selections = CurrentSelection.get();
        CurrentSelection.set({tei: $scope.selectedTei, te: $scope.selectedTei.trackedEntityType, prs: selections.prs, pr: $scope.selectedProgram, prNames: selections.prNames, prStNames: selections.prStNames, enrollments: selections.enrollments, selectedEnrollment: $scope.selectedEnrollment, optionSets: selections.optionSets});        
        $timeout(function() { 
            $rootScope.$broadcast('profileWidget', {}); 
        }, 200);
    };
    
    var notifyRegistrationCompletion = function(destination, teiId, enrollment){
        if($scope.registrationMode === 'ENROLLMENT'){
            broadcastTeiEnrolled(enrollment);
        }else{
            goToDashboard( destination ? destination : 'DASHBOARD', teiId );  
        }
         

    };
    
    var performRegistration = function(destination){
        $scope.saving = true;
        RegistrationService.registerOrUpdate($scope.tei, $scope.optionSets, $scope.attributesById).then(function(regResponse){
            var reg = regResponse.response.responseType ==='ImportSummaries' ? regResponse.response.importSummaries[0] : regResponse.response.responseType === 'ImportSummary' ? regResponse.response : {};
            if(reg.reference && reg.status === 'SUCCESS'){                
                $scope.tei.trackedEntityInstance = reg.reference;
                
                if( $scope.registrationMode === 'PROFILE' ){
                    $scope.saving = false;
                    reloadProfileWidget();
                    $rootScope.$broadcast('teiupdated', {});
                    if(destination==='newOrgUnit'){
                        $scope.selectedEnrollment.orgUnit = $scope.tei.orgUnit;
                        EnrollmentService.update($scope.selectedEnrollment);
                        selection.load();
                        $location.path('/').search({program: $scope.selectedProgram.id});                 
                    }
                }
                else{
                    if( $scope.selectedProgram ){
                        
                        //enroll TEI
                        var enrollment = {};
                        enrollment.trackedEntityInstance = $scope.tei.trackedEntityInstance;
                        enrollment.program = $scope.selectedProgram.id;
                        enrollment.status = 'ACTIVE';
                        enrollment.orgUnit = $scope.selectedOrgUnit.id;
                        enrollment.enrollmentDate = $scope.selectedEnrollment.enrollmentDate;
                        enrollment.incidentDate = $scope.selectedEnrollment.incidentDate === '' ? $scope.selectedEnrollment.enrollmentDate : $scope.selectedEnrollment.incidentDate;

                        EnrollmentService.enroll(enrollment).then(function(enrollmentResponse){
                            var en = enrollmentResponse.response && enrollmentResponse.response.importSummaries && enrollmentResponse.response.importSummaries[0] ? enrollmentResponse.response.importSummaries[0] : {};
                            if(en.reference && en.status === 'SUCCESS'){                                
                                enrollment.enrollment = en.reference;
                                $scope.selectedEnrollment = enrollment;
                                var dhis2Events = EventUtils.autoGenerateEvents($scope.tei.trackedEntityInstance, $scope.selectedProgram, $scope.selectedOrgUnit, enrollment);
                                if(dhis2Events.events.length > 0){
                                    DHIS2EventFactory.create(dhis2Events).then(function(){
                                        $scope.saving = false;
                                        notifyRegistrationCompletion(destination, $scope.tei.trackedEntityInstance, enrollment);
                                    });
                                }else{
                                    $scope.saving = false;
                                    notifyRegistrationCompletion(destination, $scope.tei.trackedEntityInstance, enrollment);
                                } 
                            }
                            else{
                                $scope.saving = false;
                                //enrollment has failed
                                var dialogOptions = {
                                        headerText: 'enrollment_error',
                                        bodyText: enrollmentResponse.message
                                    };
                                DialogService.showDialog({}, dialogOptions);
                                return;                                                            
                            }
                        });
                    }
                    else{
                       notifyRegistrationCompletion(destination, $scope.tei.trackedEntityInstance); 
                    }
                }                
            }
            else{//update/registration has failed
                var dialogOptions = {
                        headerText: $scope.tei && $scope.tei.trackedEntityInstance ? 'update_error' : 'registration_error',
                        bodyText: regResponse.message
                    };
                DialogService.showDialog({}, dialogOptions);
                return;
            }
        });
        
    };
    
    function broadcastTeiEnrolled(enrollment){
        $rootScope.$broadcast('teienrolled', {enrollment: enrollment});
    }
    
    $scope.registerEntity = function(destination){
        //check for form validity
        $scope.outerForm.submitted = true;        
        if( $scope.outerForm.$invalid ){
            return false;
        }                   
        
        //form is valid, continue the registration
        //get selected entity        
        if(!$scope.selectedTei.trackedEntityInstance){
            $scope.selectedTei.trackedEntityType = $scope.tei.trackedEntityType = $scope.selectedProgram && $scope.selectedProgram.trackedEntityType && $scope.selectedProgram.trackedEntityType.id ? $scope.selectedProgram.trackedEntityType.id : $scope.trackedEntityTypes.selected.id;
            $scope.selectedTei.orgUnit = $scope.tei.orgUnit = $scope.selectedOrgUnit.id;
            $scope.selectedTei.attributes = $scope.selectedTei.attributes = [];
        }
        
        //get tei attributes and their values
        //but there could be a case where attributes are non-mandatory and
        //registration form comes empty, in this case enforce at least one value        
        
        var result = RegistrationService.processForm($scope.tei, $scope.selectedTei, $scope.attributesById);
        $scope.formEmpty = result.formEmpty;
        $scope.tei = result.tei;
        
        if($scope.formEmpty){//registration form is empty
            return false;
        }        
        performRegistration(destination);
    };

    OrgUnitFactory.getSearchTreeRoot().then(function(response) {  
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

    $scope.expandCollapse = function(orgUnit) {
        if( orgUnit.hasChildren ){            
            //Get children for the selected orgUnit
            OrgUnitFactory.get(orgUnit.id).then(function(ou) {                
                orgUnit.show = !orgUnit.show;
                orgUnit.hasChildren = false;
                orgUnit.children = ou.children;                
                angular.forEach(orgUnit.children, function(ou){                    
                    ou.hasChildren = ou.children && ou.children.length > 0 ? true : false;
                });                
            });           
        }
        else{
            orgUnit.show = !orgUnit.show;   
        }        
    };

    $scope.expandCollapseOrgUnitTree = function(orgUnit) {
        if( orgUnit.children && orgUnit.children.length > 0 ){
            //Get children for the selected orgUnit
            OrgUnitFactory.getChildren(orgUnit.id).then(function(ou) {
                orgUnit.show = !orgUnit.show;
                orgUnit.children = ou.children;
                orgUnit.hasChildren = orgUnit.children.length > 0 ? true : false;
                angular.forEach(orgUnit.children, function(o){
                    //Hard coded for Bangladesh, we set children to false to stop rendring below these orgUnits.
                    o.hasChildren = false;
                });
            });
        }
        else{
            orgUnit.show = !orgUnit.show;
        }
    };

    $scope.setSelectedSearchingOrgUnitFromId = function(id){    
        if(id) {
            OrgUnitFactory.get(id).then(function(ou) {  
                $scope.setSelectedSearchingOrgUnit(ou);
            });
        } else {
            $scope.setSelectedSearchingOrgUnit(null);
        }
    };
    
    //load programs for the selected orgunit (from tree)
    $scope.setSelectedSearchingOrgUnit = function(orgUnit){    
        if(orgUnit === $scope.selectedSearchingOrgUnit) {
            $scope.selectedSearchingOrgUnit = null;
        } else {
            $scope.selectedSearchingOrgUnit = orgUnit;            
        }
    };
    
    var flag = {debug: true, verbose: false};
    $scope.executeRules = function () {
        //repopulate attributes with updated values
        $scope.selectedTei.attributes = [];
        angular.forEach($scope.attributes, function (metaAttribute) {
            var newAttributeInArray = {
                attribute: metaAttribute.id,
                code: metaAttribute.code,
                displayName: metaAttribute.displayName,
                type: metaAttribute.valueType,
                value: $scope.selectedTei[metaAttribute.id]
            };

            $scope.selectedTei.attributes.push(newAttributeInArray);
        });

        if ($scope.selectedProgram && $scope.selectedProgram.id) {
            var eventExists = $scope.currentEvent && $scope.currentEvent.event;
            var evs = null;
            if( eventExists ){
                evs = {all: [], byStage: {}};
                evs.all = [$scope.currentEvent];
                evs.byStage[$scope.currentStage.id] = [$scope.currentEvent];
            }
            
            TrackerRulesExecutionService.executeRules(
                $scope.allProgramRules, 
                eventExists ? $scope.currentEvent : 'registration', 
                evs,
                $scope.prStDes ? $scope.prStDes : {}, 
                $scope.attributesById,
                $scope.selectedTei, 
                $scope.selectedEnrollment, 
                $scope.optionSets, 
                flag);
        }
    };
    
    //check if field is hidden
    $scope.isHidden = function (id) {
        //In case the field contains a value, we cant hide it. 
        //If we hid a field with a value, it would falsely seem the user was aware that the value was entered in the UI.        
        return $scope.selectedTei[id] ? false : $scope.hiddenFields[id];
    };
    
    $scope.teiValueUpdated = function(tei, field){
        $scope.executeRules();
    };
    
    //listen for rule effect changes
    $scope.$on('ruleeffectsupdated', function (event, args) {
        if (args.event === "registration" || args.event === 'SINGLE_EVENT') {
            $scope.warningMessages = [];
            $scope.hiddenFields = [];
            $scope.assignedFields = [];
            $scope.errorMessages = {};
            $scope.hiddenSections = [];

            var effectResult = TrackerRulesExecutionService.processRuleEffectAttribute(args.event, $scope.selectedTei, $scope.tei, $scope.currentEvent, {}, $scope.currentEvent, $scope.attributesById, $scope.prStDes ? $scope.prStDes : {}, $scope.hiddenFields, $scope.hiddenSections, $scope.warningMessages, $scope.assignedFields, $scope.optionSets);
            $scope.selectedTei = effectResult.selectedTei;
            $scope.currentEvent = effectResult.currentEvent;
            $scope.hiddenFields = effectResult.hiddenFields;
            $scope.hiddenSections = effectResult.hiddenSections;
            $scope.assignedFields = effectResult.assignedFields;
            $scope.warningMessages = effectResult.warningMessages;
        }
    });
    
    $scope.$on('changeOrgUnit', function (event, args) {
        $scope.tei.orgUnit = args.orgUnit;
    });


    $scope.interacted = function(field) {
        var status = false;
        if(field){            
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;        
    };
    
    $scope.getTrackerAssociate = function(selectedAttribute, existingAssociateUid){        

        var modalInstance = $modal.open({
            templateUrl: 'components/teiadd/tei-add.html',
            controller: 'TEIAddController',
            windowClass: 'modal-full-window',
            resolve: {
                relationshipTypes: function () {
                    return $scope.relationshipTypes;
                },
                addingRelationship: function(){
                    return false;
                },
                selections: function () {
                    return CurrentSelection.get();
                },
                selectedTei: function(){
                    return $scope.selectedTei;
                },
                selectedAttribute: function(){
                    return selectedAttribute;
                },
                existingAssociateUid: function(){
                    return existingAssociateUid;
                },
                selectedProgram: function(){
                    return $scope.selectedProgram;
                },
                relatedProgramRelationship: function(){
                    return $scope.relatedProgramRelationship;
                }
            }
        });

        modalInstance.result.then(function (res) {
            if(res && res.id){
                $scope.selectedTei[selectedAttribute.id] = res.id;
            }
        });
    };
    $scope.cancelRegistrationWarning = function(cancelFunction){
        
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'cancel',
            bodyText: 'are_you_sure_to_cancel_registration'
        }
        ModalService.showModal({}, modalOptions).then(function(){
            cancelFunction();
        });
    }
    $scope.hasTeiOrProgramWrite = function(){
        return $scope.trackedEntityTypes && $scope.trackedEntityTypes.selected && $scope.selectedProgram && ($scope.selectedProgram.access.data.write || $scope.trackedEntityTypes.selected.access.data.write);
    }
    $scope.isDisabled = function(attribute) {
        return attribute.generated || $scope.assignedFields[attribute.id] || $scope.editingDisabled;
    };

    $scope.attributeFieldDisabled = function(attribute){
        if($scope.isDisabled(attribute)) return true;
        if($scope.selectedOrgUnit.closedStatus) return true;
        if(!$scope.hasTeiOrProgramWrite()) return true;
        return false;
    }

    $scope.dataElementEditable = function(prStDe){
        if($scope.eventEditable()){
            if($scope.assignedFields && $scope.assignedFields[$scope.currentEvent.event] && $scope.assignedFields[$scope.currentEvent.event][prStDe.dataElement.id]){
                return false;
            } 
            return true;
        }
        return false;
    }

    $scope.eventEditable = function(){
        if($scope.selectedOrgUnit.closedStatus || $scope.selectedEnrollment.status !== 'ACTIVE' || $scope.currentEvent.editingNotAllowed) return false;
        if($scope.currentEvent.expired && !$scope.userAuthority.canEditExpiredStuff) return false;
        return true;
    }
});
