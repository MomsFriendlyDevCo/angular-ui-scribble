var app = angular.module("app", [
	'angular-ui-scribble'
]);

app.controller("scribbleExampleCtrl", function($scope) {
	$scope.config  = {};

	$scope.callbackFn = function(signature){
		window.alert('Processing signature');
	};

	$scope.callbackBtn = function(signature){
		window.alert('Processing signature');
	};

});
