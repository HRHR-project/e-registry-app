var trackerCapture = angular.module('trackerCapture');
trackerCapture.controller('ManagementController',
        function(
                $scope,
                $translate,
                $log,
                CurrentSelection) {
    
    $scope.widget = $scope.$parent.$parent.biggerWidget ? $scope.$parent.$parent.biggerWidget
    : $scope.$parent.$parent.smallerWidget ? $scope.$parent.$parent.smallerWidget : null;
    $scope.widgetTitle = $scope.widget.title;    
    
    $scope.widgetTitleLabel = $translate.instant($scope.widgetTitle);
    
    $scope.eventToShow = '';
    
    $scope.refresh = function() {
        CurrentSelection.getSelectedTeiEvents();
        
    };
    
    $scope.refresh();
});
