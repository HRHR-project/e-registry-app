/* global dhis2, angular, selection, i18n_ajax_login_failed, _ */
dhis2.util.BASEURL = BASEURL;
dhis2.util.namespace('dhis2.er');
// whether current user has any organisation units
dhis2.er.emptyOrganisationUnits = false;

var i18n_no_orgunits = 'No organisation unit attached to current user, no data entry possible';
var i18n_offline_notification = 'You are offline';
var i18n_online_notification = 'You are online';
var i18n_ajax_login_failed = 'Login failed, check your username and password and try again';

var optionSetsInPromise = [];
var attributesInPromise = [];
var batchSize = 50;

dhis2.er.store = null;
dhis2.er.metaDataCached = dhis2.er.metaDataCached || false;
dhis2.er.memoryOnly = $('html').hasClass('ie7') || $('html').hasClass('ie8');
var hasAllAccess = false;
var adapters = [];    
if( dhis2.er.memoryOnly ) {
    adapters = [ dhis2.storage.InMemoryAdapter ];
} else {
    adapters = [ dhis2.storage.IndexedDBAdapter, dhis2.storage.DomLocalStorageAdapter, dhis2.storage.InMemoryAdapter ];
}


dhis2.er.store = new dhis2.storage.Store({
    name: 'dhis2er',
    adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
    objectStores: ['programs', 'programStages', 'trackedEntityTypes', 'attributes', 'relationshipTypes', 'optionSets', 'programValidations', 'programIndicators', 'ouLevels', 'programRuleVariables', 'programRules','constants','programAccess']
});

(function($) {
    $.safeEach = function(arr, fn)
    {
        if (arr)
        {
            $.each(arr, fn);
        }
    };

    var s = $("#searchIcon");
})(jQuery);

/**
 * Page init. The order of events is:
 *
 * 1. Load ouwt 
 * 2. Load meta-data (and notify ouwt) 
 * 
 */
$(document).ready(function()
{
    $.ajaxSetup({
        type: 'POST',
        cache: false
    });
    $("#searchIcon").attr("src", "a/b/c");
    $('#loaderSpan').show();
});

$(document).bind('dhis2.online', function(event, loggedIn)
{
    if (loggedIn)
    {
        if (dhis2.er.emptyOrganisationUnits) {
            setHeaderMessage(i18n_no_orgunits);
        }
        else {
            setHeaderDelayMessage(i18n_online_notification);
        }
    }
    else
    {
        var form = [
            '<form style="display:inline;">',
            '<label for="username">Username</label>',
            '<input name="username" id="username" type="text" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<label for="password">Password</label>',
            '<input name="password" id="password" type="password" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<button id="login_button" type="button">Login</button>',
            '</form>'
        ].join('');

        setHeaderMessage(form);
        ajax_login();
    }
});

$(document).bind('dhis2.offline', function()
{
    if (dhis2.er.emptyOrganisationUnits) {
        setHeaderMessage(i18n_no_orgunits);
    }
    else {
        setHeaderMessage(i18n_offline_notification);
    }
});

function ajax_login()
{
    $('#login_button').bind('click', function()
    {
        var username = $('#username').val();
        var password = $('#password').val();

        $.post(BASEURL+'/dhis-web-commons-security/login.action', {
            'j_username': username,
            'j_password': password
        }).success(function()
        {
            var ret = dhis2.availability.syncCheckAvailability();

            if (!ret)
            {
                alert(i18n_ajax_login_failed);
            }
        });
    });
}

// -----------------------------------------------------------------------------
// Metadata downloading
// -----------------------------------------------------------------------------


function downloadMetaData()
{
    console.log('Loading required meta-data');
    var def = $.Deferred();
    var promise = def.promise();
    promise = promise.then( dhis2.er.store.open );
    promise = promise.then( getSystemSetting );
    promise = promise.then( getUserSetting );
    promise = promise.then( getUserProfile );
    promise = promise.then(setHasAllAccess);
    promise = promise.then( getConstants );
    promise = promise.then( getRelationships );       
    promise = promise.then( getTrackedEntityTypesWithAccess );
    promise = promise.then( getMetaPrograms );     
    promise = promise.then( getPrograms );
    promise = promise.then( getOptionSetsForDataElements );
    promise = promise.then( getMetaTrackeEntityAttributes );
    promise = promise.then( getTrackedEntityAttributes );
    promise = promise.then( getOptionSetsForAttributes );
    promise = promise.then( getMetaProgramRuleVariables );
    promise = promise.then( getProgramRuleVariables );
    promise = promise.then( getMetaProgramRules );
    promise = promise.then( getProgramRules );       
    promise = promise.then( getMetaProgramIndicators );
    promise = promise.then( getProgramIndicators );
    promise = promise.then( getOrgUnitLevels );
    promise = promise.then(getProgramAccess);
    promise.done(function() {        
        //Enable ou selection after meta-data has downloaded
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
        dhis2.er.metaDataCached = true;
        dhis2.availability.startAvailabilityCheck();
        console.log( 'Finished loading meta-data' );        
        selection.responseReceived(); 
    });

    def.resolve();    
}

function setHasAllAccess(){
    var def = $.Deferred();
    var SessionStorageService = angular.element('body').injector().get('SessionStorageService');    
    var userProfile = SessionStorageService.get('USER_PROFILE');
    if(userProfile && userProfile.authorities){
        var r = $.grep(userProfile.authorities, function(a){ return a === 'ALL'});
        if(r.length > 0) hasAllAccess = true;
    }
    def.resolve();
    return def.promise();
}


function getSystemSetting()
{   
    if(localStorage['SYSTEM_SETTING']){
       return; 
    }
    
    return dhis2.tracker.getTrackerObject(null, 'SYSTEM_SETTING', BASEAPIURL + '/systemSettings', 'key=keyGoogleMapsApiKey&key=keyCalendar&key=keyDateFormat', 'localStorage', dhis2.er.store);
}

function getUserSetting()
{   
    var SessionStorageService = angular.element('body').injector().get('SessionStorageService');    
    if( SessionStorageService.get('USER_SETTING') ){
       return; 
    }
    
    return dhis2.tracker.getTrackerObject(null, 'USER_SETTING', BASEAPIURL + '/userSettings.json', 'key=keyDbLocale&key=keyUiLocale&key=keyCurrentStyle&key=keyStyle', 'sessionStorage', dhis2.er.store);
}

function getUserProfile()
{
    var SessionStorageService = angular.element('body').injector().get('SessionStorageService');    
    if( SessionStorageService.get('USER_PROFILE') ){
       return; 
    }
    
    return dhis2.tracker.getTrackerObject(null, 'USER_PROFILE', BASEAPIURL + '/me.json', 'fields=id,displayName,userCredentials[username,userRoles[id,programs,authorities]],organisationUnits[id,displayName,level,code,path,children[id,displayName,level,children[id]]],dataViewOrganisationUnits[id,displayName,level,path,code,children[id,displayName,level,children[id]]],teiSearchOrganisationUnits[id,displayName,level,path,code,children[id,displayName,level,children[id]]]', 'sessionStorage', dhis2.er.store);
}

function getConstants()
{
    return dhis2.er.store.getKeys( 'constants').done(function(res){        
        if(res.length > 0){
            return;
        }        
        return dhis2.tracker.getTrackerObjects('constants', 'constants', BASEAPIURL+'/constants.json', 'paging=false&fields=id,name,displayName,value', 'idb', dhis2.er.store);        
    });    
}

function getOrgUnitLevels()
{
    return dhis2.er.store.getKeys( 'ouLevels').done(function(res){        
        if(res.length > 0){
            return;
        }        
        return dhis2.tracker.getTrackerObjects('ouLevels', 'organisationUnitLevels', BASEAPIURL+'/organisationUnitLevels.json', 'filter=level:gt:1&fields=id,name,displayName,level&paging=false', 'idb', dhis2.er.store);
    }); 
}

function getRelationships()
{    
    return dhis2.er.store.getKeys( 'relationshipTypes').done(function(res){        
        if(res.length > 0){
            return;
        }
        return dhis2.tracker.getTrackerObjects('relationshipTypes', 'relationshipTypes', BASEAPIURL+'/relationshipTypes.json', 'paging=false&fields=id,name,aIsToB,bIsToA,displayName', 'idb', dhis2.er.store);
    });    
}

function getTrackedEntityTypesWithAccess()
{
    return dhis2.tracker.getTrackerObjects('trackedEntityTypes', 'trackedEntityTypes', BASEAPIURL + '/trackedEntityTypes.json', 'paging=false&fields=id,displayName,maxTeiCountToReturn,minAttributesRequiredToSearch,trackedEntityTypeAttributes[*,trackedEntityAttribute[id,unique]],access[data[read,write]]','temp', dhis2.er.store).then(function(trackedEntityTypes)
    {
        if(hasAllAccess){
            _.each(_.values(trackedEntityTypes), function(tet){
                tet.access.data = {read: true, write: true};
            });
        }
        return dhis2.er.store.setAll('trackedEntityTypes', trackedEntityTypes);
    });
}

function getMetaPrograms()
{    
    return dhis2.tracker.getTrackerObjects('programs', 'programs', BASEAPIURL+'/programs.json', 'filter=programType:eq:WITH_REGISTRATION&paging=false&fields=id,version,programTrackedEntityAttributes[trackedEntityAttribute[id,optionSet[id,version]]],programStages[id,version,programStageDataElements[dataElement[optionSet[id,version]]]]', 'temp', dhis2.er.store);
}

function getProgramAccess(){
    return dhis2.tracker.getTrackerObjects('programAccess','programs', BASEAPIURL+'/programs.json', 'filter=programType:eq:WITH_REGISTRATION&paging=false&fields=id,access[data[read,write]],programStages[access[data[read,write]]]','temp', dhis2.er.store).then(function(programAccesses){
        var programAccessesById = {};
        _.each(_.values(programAccesses), function(programAccess){
            if(hasAllAccess) programAccess.access.data = {read: true, write: true };
            programAccess.programStages = [];
            programAccessesById[programAccess.id] = programAccess;
        });
        return dhis2.tracker.getTrackerObjects('programStageAccess','programStages', BASEAPIURL+'/programStages.json', 'paging=false&fields=id,program,access[data[read,write]]','temp', dhis2.er.store).then(function(programStageAccesses){
            _.each(_.values(programStageAccesses), function(programStageAccess){
                if(programStageAccess.program && programAccessesById[programStageAccess.program.id]){
                    if(hasAllAccess) programStageAccess.access.data = {read : true, write: true};
                    programAccessesById[programStageAccess.program.id].programStages.push(programStageAccess);
                }

            });
            return dhis2.er.store.setAll('programAccess',programAccesses);
        });
    });
}
function getPrograms( programs )
{
    if( !programs ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    var ids = [];
    _.each( _.values( programs ), function ( program ) {
        build = build.then(function() {
            var d = $.Deferred();
            var p = d.promise();
            dhis2.er.store.get('programs', program.id).done(function(obj) {
                if(!obj || obj.version !== program.version) {
                    ids.push( program.id );
                }

                d.resolve();
            });

            return p;
        });
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            var _ids = null;
            if( ids && ids.length > 0 ){
                _ids = ids.toString();
                _ids = '[' + _ids + ']';
                promise = promise.then( getAllPrograms( _ids ) );
            } 
            
            mainDef.resolve( programs, ids );
        } );
    }).fail(function(){
        mainDef.resolve( null, null );
    });

    builder.resolve();

    return mainPromise;
}

function getAllPrograms( ids )
{    
    return function() {
        return $.ajax( {
            url: BASEAPIURL+'/programs.json',
            type: 'GET',
            data: 'fields=id,name,displayName,type,version,displayFrontPageList,dataEntryMethod,enrollmentDateLabel,incidentDateLabel,displayIncidentDate,ignoreOverdueEvents,selectEnrollmentDatesInFuture,selectIncidentDatesInFuture,onlyEnrollOnce,externalAccess,displayOnAllOrgunit,registration,minAttributesRequiredToSearch,maxTeiCountToReturn,dataEntryForm[id,name,displayName,style,htmlCode,format],relationshipText,relationshipFromA,relatedProgram[id,name,displayName],relationshipType[id,name,displayName],trackedEntityType[id,name,displayName,description],userRoles[id,name,displayName],organisationUnits[id,name,displayName],userRoles[id,name,displayName],programStages[id,name,displayName,executionDateLabel,sortOrder,version,dataEntryForm[id,name,displayName,style,htmlCode,format],captureCoordinates,blockEntryForm,autoGenerateEvent,allowGenerateNextVisit,generatedByEnrollmentDate,remindCompleted,hideDueDate,executionDateLabel,minDaysFromStart,repeatable,openAfterEnrollment,standardInterval,periodType,reportDateToUse,programStageSections[id,name,displayName,dataElements[id]],programStageDataElements[displayInReports,allowProvidedElsewhere,allowFutureDate,compulsory,dataElement[id,code,name,displayName,displayShortName,description,displayDescription,displayFormName,valueType,optionSetValue,optionSet[id],dataElementGroups[id,name,displayName]]]],programTrackedEntityAttributes[displayInList,mandatory,searchable,allowFutureDate,trackedEntityAttribute[id,unique]]&paging=false&filter=id:in:' + ids
        }).done( function( response ){
            
            if(response.programs){
                _.each(_.values( response.programs), function(program){
                    var ou = {};
                    _.each(_.values( program.organisationUnits), function(o){
                        ou[o.id] = o.displayName;
                    });
                    program.organisationUnits = ou;

                    var ur = {};
                    _.each(_.values( program.userRoles), function(u){
                        ur[u.id] = u.displayName;
                    });
                    program.userRoles = ur;
                    
                    _.each(program.programStages, function(stage)
                    {
                       _.each(stage.programStageSections, function(section)
                       {
                           section.programStageDataElements = [];
                           _.each(section.dataElements, function(de)
                           {
                               section.programStageDataElements.push({ dataElement: de});
                           });
                       });
                    });
                    dhis2.er.store.set( 'programs', program );                    
                    dhis2.er.store.setAll( 'programStages', program.programStages );
                });
            }
        });
    };
}


function getOptionSetsForDataElements( programs, programIds )
{
    if( !programs ){
        return;
    }
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();    

    _.each( _.values( programs ), function ( program ) {
        
        if(program.programStages){
            _.each(_.values( program.programStages), function( programStage) {
                
                if(programStage.programStageDataElements){
                    _.each(_.values( programStage.programStageDataElements), function(prStDe){            
                        if( prStDe.dataElement.optionSet && prStDe.dataElement.optionSet.id ){
                            build = build.then(function() {
                                var d = $.Deferred();
                                var p = d.promise();
                                dhis2.er.store.get('optionSets', prStDe.dataElement.optionSet.id).done(function(obj) {                                    
                                    if( (!obj || obj.version !== prStDe.dataElement.optionSet.version) && optionSetsInPromise.indexOf(prStDe.dataElement.optionSet.id) === -1) {                                
                                        optionSetsInPromise.push( prStDe.dataElement.optionSet.id );                                    }
                                    d.resolve();
                                });

                                return p;
                            });
                        }            
                    });
                }                
            });
        }                                      
    });

    build.done(function() {
        def.resolve();
        promise = promise.done( function () {
            mainDef.resolve( programs, programIds );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;    
}

function getMetaTrackeEntityAttributes( programs, programIds ){
    
    var def = $.Deferred();
    
    $.ajax({
        url: BASEAPIURL+'/trackedEntityAttributes.json',
        type: 'GET',
        data:'paging=false&filter=displayInListNoProgram:eq:true&fields=id,optionSet[id,version]'
    }).done( function(response) {          
        var trackedEntityAttributes = [];
        _.each( _.values( response.trackedEntityAttributes ), function ( trackedEntityAttribute ) {             
            if( trackedEntityAttribute && trackedEntityAttribute.id ) {            
                trackedEntityAttributes.push( trackedEntityAttribute );
            }            
        });
        
        _.each( _.values( programs ), function ( program ) {        
            if(program.programTrackedEntityAttributes){
                _.each(_.values(program.programTrackedEntityAttributes), function(teAttribute){                    
                    trackedEntityAttributes.push(teAttribute.trackedEntityAttribute);
                });
            }
        });
        
        def.resolve( {trackedEntityAttributes: trackedEntityAttributes, programs: programs, programIds: programIds} );
        
    }).fail(function(){
        def.resolve( null );
    });
    
    return def.promise();
}

function getTrackedEntityAttributes( data )
{
    if( !data.trackedEntityAttributes ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();        

    _.each(_.values(data.trackedEntityAttributes), function(teAttribute){        
        build = build.then(function() {
            var d = $.Deferred();
            var p = d.promise();
            dhis2.er.store.get('attributes', teAttribute.id).done(function(obj) {
                if((!obj || obj.version !== teAttribute.version) && attributesInPromise.indexOf(teAttribute.id) === -1) {
                    attributesInPromise.push( teAttribute.id );
                }
                d.resolve();
            });
            return p;
        });            
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            if( attributesInPromise && attributesInPromise.length > 0 ){
                var _attributesInPromise = attributesInPromise.toString();
                _attributesInPromise = '[' + _attributesInPromise + ']';
                
                var filter = 'fields=id,name,generated,displayName,code,version,description, displayDescription, valueType,optionSetValue,confidential,inherit,sortOrderInVisitSchedule,sortOrderInListNoProgram,displayOnVisitSchedule,displayInListNoProgram,unique,programScope,orgunitScope,confidential,optionSet[id,version],trackedEntityType[id,name,displayName]';
                filter = filter + '&filter=id:in:' + _attributesInPromise + '&paging=false';
                
                var url = BASEAPIURL+'/trackedEntityAttributes';
                promise = promise.then( dhis2.tracker.getTrackerObjects( 'attributes', 'trackedEntityAttributes', url, filter, 'idb', dhis2.er.store ) );
            }            
            
            mainDef.resolve( {trackedEntityAttributes: data.trackedEntityAttributes, programs: data.programs, programIds: data.programIds} );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;    
}

function getOptionSetsForAttributes( data )
{
    if( !data.trackedEntityAttributes ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    _.each(_.values( data.trackedEntityAttributes), function( teAttribute) {           
        if( teAttribute.optionSet && teAttribute.optionSet.id ){
            build = build.then(function() {
                var d = $.Deferred();
                var p = d.promise();
                dhis2.er.store.get('optionSets', teAttribute.optionSet.id).done(function(obj) {                            
                    if((!obj || obj.version !== teAttribute.optionSet.version) && optionSetsInPromise.indexOf(teAttribute.optionSet.id) === -1) {                                
                        optionSetsInPromise.push(teAttribute.optionSet.id);
                    }
                    d.resolve();
                });

                return p;
            });
        }            
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            
            if( optionSetsInPromise && optionSetsInPromise.length > 0 ){
                var _optionSetsInPromise = optionSetsInPromise.toString();
                _optionSetsInPromise = '[' + _optionSetsInPromise + ']';
                
                var filter = 'fields=id,name,displayName,version,options[id,name,displayName,code]';                
                filter = filter + '&filter=id:in:' + _optionSetsInPromise + '&paging=false';
                
                var url = BASEAPIURL+'/optionSets';
                promise = promise.then( dhis2.tracker.getTrackerObjects( 'optionSets', 'optionSets', url, filter, 'idb', dhis2.er.store ) );
            }
            
            mainDef.resolve( data.programs, data.programIds );
        } );
    }).fail(function(){
        mainDef.resolve( null, null);
    });

    builder.resolve();

    return mainPromise;    
}

function getObjectIds(data){
    return data && Array.isArray(data.self) ? data.self.map(obj => obj.id) : [];
}

/*function getMetaProgramValidations( programs, programIds )
{
    programs.programIds = programIds;
    return dhis2.tracker.getTrackerMetaObjects(programs, 'programValidations', BASEAPIURL+'/programValidations.json', 'paging=false&fields=id&filter=program.id:in:');
}

function getProgramValidations( programValidations )
{
    return dhis2.tracker.checkAndGetTrackerObjects( programValidations, 'programValidations', BASEAPIURL+'/programValidations', 'fields=id,name,displayName,operator,rightSide[expression,description],leftSide[expression,description],program[id]', dhis2.er.store);
}*/

function getMetaProgramIndicators( programs )
{    
    return dhis2.tracker.getTrackerMetaObjects(programs, 'programIndicators', BASEAPIURL+'/programIndicators.json', 'paging=false&fields=id&filter=program.id:in:');
}

function getProgramIndicators( data )
{
    var ids = getObjectIds(data);
    return dhis2.tracker.getBatches(ids, batchSize, data.programs, 'programIndicators','programIndicators',BASEAPIURL + '/programIndicators', 'fields=id,name,code,shortName,displayInForm,expression,displayDescription,rootDate,description,valueType,displayName,filter,program[id]','idb', dhis2.er.store);
}

function getMetaProgramRules( programs )
{    
    return dhis2.tracker.getTrackerMetaObjects(programs, 'programRules', BASEAPIURL+'/programRules.json', 'paging=false&fields=id&filter=program.id:in:');
}

function getProgramRules( data )
{
    var ids = getObjectIds(data);
    return dhis2.tracker.getBatches(ids, batchSize, data.programs, 'programRules','programRules',BASEAPIURL + '/programRules', 'fields=id,name,displayName,condition,description,program[id],programStage[id],priority,programRuleActions[id,content,location,data,programRuleActionType,programStageSection[id],dataElement[id],trackedEntityAttribute[id],programIndicator[id],programStage[id]]','idb', dhis2.er.store);
}

function getMetaProgramRuleVariables( programs, programIds)
{    
    programs.programIds = programIds;
    return dhis2.tracker.getTrackerMetaObjects(programs, 'programRuleVariables', BASEAPIURL+'/programRuleVariables.json', 'paging=false&fields=id&filter=program.id:in:');
}

function getProgramRuleVariables( data )
{
    var ids = getObjectIds(data);
    return dhis2.tracker.getBatches(ids, batchSize, data.programs, 'programRuleVariables','programRuleVariables',BASEAPIURL + '/programRuleVariables', 'fields=id,name,displayName,programRuleVariableSourceType,program[id],programStage[id],dataElement[id],trackedEntityAttribute[id],useCodeForOptionSet','idb',dhis2.er.store);
}