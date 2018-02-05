//Controller for column show/hide
var eRegistry = angular.module('eRegistry');
eRegistry.controller('DisplayModeController',
        function($scope, $modalInstance) {
    
    $scope.close = function () {
      $modalInstance.close($scope.gridColumns);
    };
});