//Controller for the dashboard widgets
var eRegistry = angular.module('eRegistry');
eRegistry.controller('DashboardWidgetsController', 
    function($scope, 
            $modalInstance){
    
    $scope.close = function () {
        $modalInstance.close();
    };       
});