angular.module('angular-ui-scribble',[])
.directive('uiScribble', function(){
	return {
		scope:{},
		template:
		`<div class="scribble">
			<ul class="scribble-actions">
				<li><button ng-click="clearSignature()">Clear</button></li>
				<li ng-if='mode!="erase"'><button ng-click="setMode('erase')">Erase</button></li>
				<li ng-if='mode=="erase"'><button ng-click="setMode('pen')">Pen</button></li>
				<li><input  id="selectBackground" type="file" accept="image/*" capture="camera"></lis>
			</ul>
			<div class="scribble-canvas" height="200" width="350">
				<canvas height="200" width="380" style="z-index:2;"></canvas>
				<canvas id="scribble-background" height="200" width="380" style="z-index:1;"></canvas>
			</div>
		</div>`,
		controller: function($scope, $element){
			$scope.mode = 'pen';
			var signaturePad;
			var canvas = $element.find('canvas')[0];
			var ctx = canvas.getContext('2d');
			signaturePad = new SignaturePad(canvas);

			$scope.isMobile = true;

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

			// Background {{{

			var selectBackground = document.getElementById('selectBackground');
			var reader;

			selectBackground.addEventListener('change', function(e){
				var backgroundSrc = selectBackground.files[0];
				reader = new FileReader();

				reader.onload = function(event){
					loadBackground(event.target.result);
				};

				reader.readAsDataURL(backgroundSrc);
			});

			function loadBackground(dataUrl){
				var background = document.getElementById('scribble-background');
				var backgroundCtx = background.getContext('2d');
				var image = new Image();
				var ratio = window.devicePixelRatio || 1;
				var width = background.width;
				var height = background.height;

				image.src = dataUrl;
				image.onload = function () {
						backgroundCtx.drawImage(image, 0, 0, width, height);
				};
			}
			// }}}
		}
	}
});
