angular.module('angular-ui-scribble',[])
.directive('uiScribble', function(){
	return {
		scope:{},
		template:
		`<div class="scribble">
			<div class="scribble-canvas">
					<canvas height="300" width="600"></canvas>
			</div>
			<button ng-click="clearSignature()">Clear</button>
			<button ng-click="setMode('erase')">Erase</button>
			<button ng-click="setMode('pen')">Pen</button>
		</div>`,
		controller: function($scope, $element){
			$scope.mode = 'pen';
			var signaturePad;
			var canvas = $element.find('canvas')[0];
			var ctx = canvas.getContext('2d');
			signaturePad = new SignaturePad(canvas);

			$scope.clearSignature = function(){
				signaturePad.clear();
			};

			$scope.setMode = function(mode){
				$scope.mode = mode;
			};

			$scope.$watch('mode', function(newVal, oldVal){
				if (newVal == 'erase' && newVal !== oldVal) {
					$scope.oldStroke = {
						oldComposition: ctx.globalCompositeOperation,
						minWidth: signaturePad.minWidth,
						maxWidth: signaturePad.maxWidth
					};
					ctx.globalCompositeOperation = 'destination-out';
					signaturePad.minWidth = 6;
					signaturePad.maxWidth = 8;
				} else if (oldVal == 'erase') {
					ctx.globalCompositeOperation = $scope.oldStroke.oldComposition;
					signaturePad.minWidth = $scope.oldStroke.minWidth;
					signaturePad.maxWidth = $scope.oldStroke.maxWidth;
				}
			});
		}
	}
});
