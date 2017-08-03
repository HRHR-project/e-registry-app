/* global angular, trackerCapture */
var trackerCapture = angular.module('trackerCapture');
trackerCapture.controller('RuleBoundController',
        function(
                $rootScope,
                $scope,
                $translate,
                $log) {
    $scope.dashboardReady = false;
    $scope.widget = $scope.$parent.$parent.biggerWidget ? $scope.$parent.$parent.biggerWidget
    : $scope.$parent.$parent.smallerWidget ? $scope.$parent.$parent.smallerWidget : null;
    $scope.widgetTitle = $scope.widget ? $scope.widget.title : null;    
    $scope.emptyFeedbackListLabel = $translate.instant('no_feedback_exist');
    $scope.emptyIndicatorListLabel = $translate.instant('no_indicators_exist');
    
    $scope.lastEventUpdated = null;
    $scope.widgetTitleLabel = $translate.instant($scope.widgetTitle);
    
    $scope.displayTextEffects = {};
    $scope.displayKeyDataEffects = {};
    $scope.$on('dashboardWidgets',function(){
       $scope.dashboardReady = true; 
    });
    //listen for updated rule effects
    $scope.$on('ruleeffectsupdated', function(event, args) {
        var textInEffect = false;
        var keyDataInEffect = false;
        
        if($scope.lastEventUpdated !== args.event) {
            $scope.displayTextEffects = {};
            $scope.displayKeyDataEffects = {};
            $scope.lastEventUpdated = args.event;
        }
        
        //Bind non-bound rule effects, if any.
        angular.forEach($rootScope.ruleeffects[args.event], function(effect) {
            if(effect.location === $scope.widgetTitle){
                //This effect is affecting the local widget
                
                if(effect.action === "DISPLAYTEXT") {
                    //this action is display text. Make sure the displaytext is
                    //added to the local list of displayed texts
                    if(!angular.isObject($scope.displayTextEffects[effect.id])){
                        $scope.displayTextEffects[effect.id] = effect;
                    }
                    if(effect.ineffect)
                    {
                        textInEffect = true;
                    }
                }
                else if(effect.action === "DISPLAYKEYVALUEPAIR") {                    
                    //this action is display text. Make sure the displaytext is
                    //added to the local list of displayed texts
                    if(!angular.isObject($scope.displayTextEffects[effect.id])){
                        $scope.displayKeyDataEffects[effect.id] = effect;
                    }
                    if(effect.ineffect)
                    {
                        keyDataInEffect = true;
                    }
                }
                else if(effect.action === "ASSIGN") {
                    //the dataentry control saves the variable and or dataelement
                }
                else {
                    $log.warn("action: '" + effect.action + "' not supported by rulebound-controller.js");
                }
            }
        });
        
        $scope.showKeyDataSection = keyDataInEffect;
        $scope.showTextSection = textInEffect;        
    });
    
    $scope.getItemStyle = function(content){
        
        var style = "";
        if(angular.isDefined($scope.widget.importantTexts)){
            var importantTexts = $scope.widget.importantTexts;
            if(angular.isDefined(content) && content !== ""){
                var contentUpped = content.toUpperCase();
                for(var i = 0; i < importantTexts.length; i++){
                    if(contentUpped.indexOf(importantTexts[i].toUpperCase()) !== -1){
                        style += 'important-texts-in-event-overview';                        
                        break;
                    }
                }
            }
        }
        return style;
    }
});
