var eRegistry = angular.module('eRegistry');

eRegistry.controller('SearchController',function(
    $rootScope,
    $scope,
    $modal,
    $location,
    $filter,
    $translate,
    $timeout,
    $q,
    Paginator,
    MetaDataFactory,
    DateUtils,
    OrgUnitFactory,
    ProgramFactory,
    AttributesFactory,
    EntityQueryFactory,
    CurrentSelection,
    TEService,
    SearchGroupService,
    OperatorFactory,
    TEIGridService,
    SessionStorageService,
    AuthorityService,
    TeiAuditService) {
        var searchScopes = SearchGroupService.getSearchScopes();
        var currentSearchScope = searchScopes.TRACKEDENTITYTYPE;
        $scope.trackedEntityTypes = {};
        $scope.tetSearchConfig = {};
        $scope.searchConfig = {};
        $scope.defaultOperators = OperatorFactory.defaultOperators;
        var userProfile = SessionStorageService.get('USER_PROFILE');
        $scope.userAuthority = AuthorityService.getUserAuthorities(userProfile);

        if(!$scope.userAuthority.ALL){
            SearchGroupService.forceMaxTeiCount();
        }

        $scope.base.attributesById = CurrentSelection.getAttributesById();
        if(!$scope.base.attributesById || $scope.base.attributesById.length < 1){
            $scope.base.attributesById = [];
            AttributesFactory.getAll().then(function(atts){
                angular.forEach(atts, function(att){
                    $scope.base.attributesById[att.id] = att;
                });
                
                CurrentSelection.setAttributesById($scope.base.attributesById);
            });
        }


        $scope.$watch('base.selectedProgram', function() {
            loadTrackedEntityTypes()
            .then(loadForProgram);
        });

        var loadForProgram = function(){
            if($scope.base.selectedProgram){
                currentSearchScope = searchScopes.PROGRAM;
                return SearchGroupService.getSearchConfigForProgram($scope.base.selectedProgram).then(function(searchConfig)
                {
                    $scope.searchConfig = searchConfig;
                });
            }else{
                $scope.searchConfig = $scope.tetSearchConfig;
            }
            return emptyPromise();
        }

        $scope.setTrackedEntityType = function(){
            if(!$scope.selectedProgram){
                currentSearchScope = searchScopes.TRACKEDENTITYTYPE;
                return loadTrackedEntityTypeSearchConfig();
            }
            return emptyPromise();
        }

        var loadTrackedEntityTypeSearchConfig = function(){
            return SearchGroupService.getSearchConfigForTrackedEntityType($scope.trackedEntityTypes.selected).then(function(searchConfig)
            {
                $scope.tetSearchConfig = searchConfig;
                if(!$scope.base.selectedProgram){
                    $scope.searchConfig = $scope.tetSearchConfig;
                }
            });
        }

        var loadTrackedEntityTypes = function(){
            var promise;
            if(!$scope.trackedEntityTypes.all){
                promise = TEService.getAll().then(function(trackedEntityTypes){
                    $scope.trackedEntityTypes.all = trackedEntityTypes;
                });
            }else{
                promise = emptyPromise();
            }
            return promise.then(function(){
                if($scope.base.selectedProgram){
                    var tet = $.grep($scope.trackedEntityTypes.all, function(tet){
                        return tet.id == $scope.base.selectedProgram.trackedEntityType.id;
                    });
                    $scope.trackedEntityTypes.selected = tet[0];
                    return loadTrackedEntityTypeSearchConfig();
                }
                return emptyPromise();
            });
        }

        var emptyPromise = function(){
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        }
        var searching = false;

        var programScopeSearch =  function(programSearchGroup){
            return SearchGroupService.search(programSearchGroup, $scope.base.selectedProgram,$scope.trackedEntityTypes.selected, $scope.selectedOrgUnit, searchScopes.PROGRAM).then(function(res)
            {
                if(res.status === "NOMATCH")
                {
                    var validTetSearchGroup = findValidTetSearchGroup(programSearchGroup);
                    if(validTetSearchGroup){
                        return tetScopeSearch(validTetSearchGroup).then(function(data){
                            data.callingScope = searchScopes.PROGRAM;
                            return data;
                        });
                    }
                }
                var def = $q.defer();
                def.resolve({result: res, callingScope: searchScopes.PROGRAM, resultScope: searchScopes.PROGRAM});
                return def.promise;
            });
        }

        var tetScopeSearch = function(tetSearchGroup){
            return SearchGroupService.search(programSearchGroup, $scope.base.selectedProgram,$scope.trackedEntityTypes.selected, $scope.selectedOrgUnit, searchScopes.TET).then(function(res)
            {
                return { result: res, callingScope: searchScopes.TET, resultScope: searchScopes.TET};
            });
        }

        $scope.search = function(searchGroup){
            if(!searching){
                searching = true;
                if(!SearchGroupService.isValidSearchGroup(searchGroup, $scope.base.attributesById)){
                    searchGroup.error = true;
                    searching = false; 
                    return;
                }
            }
            var promise;
            if(currentSearchScope === searchScopes.PROGRAM){
                var tetSearchGroup = SearchGroupService.findValidTetSearchGroup(searchGroup, $scope.tetSearchConfig, $scope.base.attributesById);

                //FIX FOR TEI WITHOUT ENROLLMENT
                if(!tetSearchGroup && searchGroup.uniqueGroup) {
                    tetSearchGroup = angular.copy(searchGroup);
                    tetSearchGroup.dropTetInQuery = true;
                }

                promise = SearchGroupService.programScopeSearch(searchGroup,tetSearchGroup, $scope.base.selectedProgram,$scope.trackedEntityTypes.selected, $scope.selectedOrgUnit)
            }else{
                promise = SearchGroupService.tetScopeSearch(searchGroup, $scope.base.selectedProgram,$scope.trackedEntityTypes.selected, $scope.selectedOrgUnit);
            }

            return promise.then(function(res){
                //If only one tei found and in selectedOrgUnit, go straight to dashboard
                if(res && res.data && res.data.rows && res.data.rows.length === 1){
                    var gridData = TEIGridService.format(res.data, false, null, null);

                    //Open TEI if unique and in same search scope and in selected org unit
                    if(gridData.rows.own.length ===1 && res.callingScope === res.resultScope && searchGroup.uniqueGroup){
                        searching = false;
                        openTei(gridData.rows.own[0]);
                        return;
                    }
                }
                return showResultModal(res, searchGroup).then(function(){ searching = false;});
            });

        }

        var openTei = function(tei){
            $location.path('/dashboard').search({tei: tei.id,
                program: $scope.base.selectedProgram ? $scope.base.selectedProgram.id: null,
                ou: $scope.selectedOrgUnit.id});
        }

        var translateWithTETName = function(text, nameToLower){
            var trackedEntityTypeName = $scope.trackedEntityTypes.selected ? $scope.trackedEntityTypes.selected.displayName : "tracked entity instance";

            if(nameToLower) trackedEntityTypeName = trackedEntityTypeName.toLowerCase();
            var translated = $translate.instant(text);

            return translated.replace("{trackedEntityTypeName}", trackedEntityTypeName);
        }

        var translateWithOULevelName = function(text,orgUnitId, nameToLower){
            var translated = $translate.instant(text);
            var name = "Organisation unit";
            if(orgUnitId){
                var orgUnit = $scope.base.orgUnitsById[orgUnitId];
                
                if(orgUnit){
                    var level = $scope.base.ouLevelsByLevel[orgUnit.level];
                    if(level && level.displayName){
                        name = level.displayName;
                    }
                }
            }
            if(nameToLower) name = name.toLowerCase();
            return translated.replace("{orgUnitLevelName}", name);
        }


        var showErrorModal = function(error){
            return $modal.open({
                templateUrl: 'components//search/error-modal.html',
                controller: function($scope,$modalInstance, error){
                    $scope.errorMessage = error && error.message? error.message : null;
                    $scope.close = function(){
                        $modalInstance.close();
                    }
                },
                resolve: {
                    error: function(){
                        return error;
                    }
                }
            }).result.then(function(){return;}, function(){return;});
        }

        $scope.isOrgunitUnique = function(item){
            return item.orgunitUnique;
        }

        var canOpenRegistration = function(){
            if($scope.base.selectedProgram && $scope.trackedEntityTypes.selected){
                return $scope.base.selectedProgram.access.data.write && $scope.trackedEntityTypes.selected.access.data.write;
            }
            return false; 
        }

        var showResultModal = function(res, searchGroup){
            var internalService = {
                translateWithOULevelName: translateWithOULevelName,
                translateWithTETName: translateWithTETName,
                base: $scope.base
            }

            return $modal.open({
                templateUrl: 'components/search/result-modal.html',
                windowClass: 'app-modal-search',
                controller: function($scope, $modalInstance, TEIGridService,OrgUnitFactory, orgUnit, res, refetchDataFn, internalService, canOpenRegistration)
                {
                    $scope.gridData = null;
                    $scope.isUnique = false;
                    $scope.canOpenRegistration = canOpenRegistration;
                    $scope.tooManySearchResults = false;
                    var loadData =  function(){
                        $scope.tooManySearchResults = res.status === "TOOMANYMATCHES";
                        if(res.status !== "NOMATCH" && res.status !== "TOOMANYMATCHES"){
                            $scope.gridData = TEIGridService.format(res.data, false, null, null);
                        }
                        $scope.notInSameScope = res.callingScope != res.resultScope;
                        $scope.pager = res.data && res.data.metaData ? res.data.metaData.pager : null;
    
                        if(res.status === "UNIQUE"){
                            $scope.isUnique = true;
                            $scope.uniqueTei = $scope.gridData.rows.own.length > 0 ? $scope.gridData.rows.own[0] : $scope.gridData.rows.other[0];
                            if(!internalService.base.orgUnitsById[$scope.uniqueTei.orgUnit]){
                                $scope.orgUnitLoading = true;
                                OrgUnitFactory.get($scope.uniqueTei.orgUnit).then(function(ou){
                                    internalService.base.orgUnitsById[ou.id] = ou;
                                    $scope.orgUnitLoading = false;
                                });
                            }
                        }
                    }
                    loadData();

                    $scope.translateWithTETName = internalService.translateWithTETName;
                    $scope.translateWithOULevelName = internalService.translateWithOULevelName; 

                    $scope.openRegistration = function(tei){
                        $modalInstance.close({action: "OPENREGISTRATION"});
                    }

                    $scope.openTei = function(tei){
                        $modalInstance.close({ action: "OPENTEI", tei: tei});
                    }
                    $scope.cancel = function(){
                        $modalInstance.close({ action: "CANCEL"});
                    }

                    $scope.refetchData = function(pager, sortColumn){
                        refetchDataFn(pager, sortColumn).then(function(newRes)
                        {
                            res = newRes;
                            loadData();
                        });
                    }
                },
                resolve: {
                    refetchDataFn: function(){
                        return function(pager,sortColumn){ return SearchGroupService.search(searchGroup, $scope.base.selectedProgram,$scope.trackedEntityTypes.selected, $scope.selectedOrgUnit, pager); }
                    },

                    orgUnit: function(){
                        return $scope.selectedOrgUnit;
                    },
                    res: function(){
                        return res;
                    },
                    internalService: function(){
                        return internalService;
                    },
                    canOpenRegistration: function(){
                        return canOpenRegistration();
                    }
                }
            }).result.then(function(res){
                var def = $q.defer();
                def.resolve();
                if(res.action === "OPENTEI"){
                    if(res.tei.orgUnit !== $scope.selectedOrgUnit.id){
                        return showFoundInOtherOrgUnitModal(res.tei).then(function(){
                            openTei(res.tei);   
                        }, function(){

                        });
                    }
                    openTei(res.tei);
                }else if(res.action === "OPENREGISTRATION")
                {
                    var registrationPrefill = getRegistrationPrefill(searchGroup);
                    $scope.goToRegistrationWithData(registrationPrefill);
                }
                return def.promise;
            }, function(){return;});
        }
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

        $scope.setSelectedOrgUnit = function(orgUnit, searchGroup){
            if(searchGroup.orgUnit && searchGroup.orgUnit.id === orgUnit.id){
                searchGroup.orgUnit = null;
                searchGroup.ouMode = {name: "ACCESSIBLE"};
                return;
            }
            searchGroup.orgUnit = orgUnit;
            if(searchGroup.ouMode && searchGroup.ouMode.name === "ACCESSIBLE"){
                searchGroup.ouMode = { name: "SELECTED" };
            }
        }

        $scope.setSelectedOrgUnitUnion = function(orgUnit){
            if(orgUnit === $scope.selectedSearchingOrgUnit) {
                $scope.selectedSearchingOrgUnit = null;
            } else {
                $scope.selectedSearchingOrgUnit = orgUnit;            
            }
        }

        $scope.setOuModeAccessible = function(searchGroup){
            searchGroup.orgUnit = null;
        }

        var getRegistrationPrefill = function(searchGroup){
            var prefill = {};
            for(var key in searchGroup){
                if($scope.base.attributesById[key]){
                    var val = searchGroup[key];
                    if(angular.isDefined(val.value)){
                        prefill[key] = val.value;
                    }else if(angular.isDefined(val.exactValue)){
                        prefill[key] = val.exactValue;
                    }else if(angular.isDefined(val.startValue)){
                        prefill[key] = val.startValue;
                    }else if(angular.isDefined(val.endValue))
                    {
                        prefill[key] = val.endValue;
                    }else{
                        prefill[key] = val;
                    }

                }
            }
            return prefill;


        }

        var sameUnion = function(teiOrgUnit) {
            return OrgUnitFactory.getParents(teiOrgUnit).then(function(result){
                var parent = result.ancestors.find(function(orgunit){
                    return orgunit.level === 5;
                });

                if(parent){
                    return OrgUnitFactory.getChildren(parent.id).then(function(result){
                        var foundChild = result.children.find(function(child){
                            return child.id === $scope.selectedOrgUnit.id;
                        });
                        return !!foundChild;
                    });
                }
                return false;
            });
        }

        //AUDIT
        var showFoundInOtherOrgUnitModal = function(tei){            
            
            return sameUnion(tei.orgUnit).then(function(isSameUnion) {
                if(isSameUnion && $scope.isBangladesh) {
                    var def = $q.defer();
                    def.resolve();
                    return def.promise;
                }

                return $modal.open({
                    templateUrl: 'components/search/audit-modal.html',
                    windowClass: '',
                    resolve: {
                        tei: function(){ return tei; }
                    },
                    controller: function($scope,$modalInstance, $translate, tei){
                        $scope.model = {};
                        $scope.textAreaReasonID = 5;
                        $scope.reasons = [
                            { name: "change_place_of_residence", id: 1},
                            { name: "visiting_family", id: 2},
                            { name: "urgent_case", id: 3},
                            { name: "desire_to_change_the_place_of_receiving_care", id: 4},
                            { name: "specify_other", id: 5}
                        ];
                        angular.forEach($scope.reasons, function(r){ r.displayName = $translate.instant(r.name);});
    
                        $scope.cancel = function(){
    
                        }
                        $scope.cancel = function(){
                            $modalInstance.dismiss();
                        }
                        $scope.open = function(){
                            $scope.openDisabled = true;
                            $scope.form.$setSubmitted();
                            if($scope.form.$valid){
                                var reasonMessage = $scope.model.selectedReason.name;
                                if($scope.model.selectedReason.id === $scope.textAreaReasonID){
                                    reasonMessage = $scope.model.specifiedReason;
                                }
                                TeiAuditService.add(tei.id, userProfile.id, reasonMessage).then(function(){
                                    $modalInstance.close();
                                }, function(){
                                    $modalInstance.dismiss();
                                });
                            }else{
                                $scope.openDisabled = false;
                            }
                        }
                    }
                }).result;
            });
        };
});
