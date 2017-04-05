var app = angular.module("app", [
	'angular-ui-scribble'
]);

app.controller("scribbleExampleCtrl", function($scope) {
	$scope.callback = function(image){
		alert('Processing signature');
		console.log('Got image', image);
	};
});
