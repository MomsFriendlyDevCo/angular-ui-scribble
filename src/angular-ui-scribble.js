angular.module('angular-ui-scribble',[])
.factory('$debounce', ['$timeout', function($timeout) {
	/**
	* @author Matt Carter <m@ttcarter.com>
	* Calls fn once after timeout even if more than one call to debounced fn was made
	* Edited version of the original part of ng-tools - https://github.com/capaj/ng-tools
	*/
	function debounce(callback, timeout, apply) {
		timeout = angular.isUndefined(timeout) ? 0 : timeout;
		apply = angular.isUndefined(apply) ? true : apply;
		var callCount = 0;
		return function() {
			var self = this;
			var args = arguments;
			callCount++;
			var wrappedCallback = (function(version) {
				return function() {
					if (version === callCount) return callback.apply(self, args);
				};
			})(callCount);
			return $timeout(wrappedCallback, timeout, apply);
		};
	}
	return debounce;
}])
.directive('uiScribble', function(){
	return {
		scope:{
			callback: '&',
			editable: '<',
			buttons:'<',
			width: '@?',
			height: '@?',
			sizes: '<',
			colors: '<',
		},
		template: `
			<div class="scribble" ng-class="editable ? 'scribble-editable' : 'scribble-not-editable'">
				<input class="scribble-file-camera selectBackground" type="file" accept="image/*" >
				<nav ng-if="editable" class="scribble-actions navbar navbar-default" style="width: {{width}}px">
					<div class="navbar-form pull-left">
						<div ng-if="buttons.camera" class="btn-group">
							<a ng-if="mode!='streaming' && !isMobile" tooltip="Set background image" ng-click="setBackground()" class="btn btn-primary"><i class="fa fa-image"></i></a>
							<a ng-if="mode=='streaming' && !isMobile" tooltip="Take screenshot" ng-click="screenshot()" class="btn btn-primary"><i class="fa fa-camera"></i></a>
							<a ng-click="requestCamera()" class="btn btn-primary"><i class="fa fa-{{isMobile ? 'camera' : 'paperclip'}}"></i></a>
						</div>
						<div class="btn-group">
							<a ng-click="setMode('pen')" ng-class="mode=='pen' && 'active'" tooltip="Pen" class="btn btn-default"><i class="fa fa-pencil"></i></a>
							<a ng-if="buttons.eraser" ng-click="setMode('erase')" ng-class="mode=='erase' && 'active'" tooltip="Eraser" class="btn btn-default"><i class="fa fa-eraser"></i></a>
						</div>
						<div ng-if="buttons.sizes" class="btn-group scribble-pens">
							<a ng-repeat="size in sizes" ng-click="setPenSize(size)" ng-class="penSize==size && 'active'" tooltip="Pen Size {{size}}" class="btn btn-default"><i class="fa fa-circle" style="transform: scale({{$index / sizes.length + 0.2}})"></i></a>
						</div>
						<div ng-if="buttons.colors" class="btn-group scribble-colors">
							<a ng-repeat="color in colors" ng-click="setPenColor(color)" ng-class="penColor==color && 'active'" tooltip="Pen Color {{color}}" class="btn btn-default"><i class="fa fa-square" style="color: {{color}}"></i></a>
						</div>
					</div>
					<div ng-if="buttons.clear" class="navbar-form pull-right">
						<div class="btn-group">
							<a ng-click="clearSignature()" class="btn btn-danger"><i class="fa fa-trash"></i></a>
						</div>
					</div>
				</nav>
				<div class="scribble-area" style="width: {{width}}px; height: {{height}}px">
					<canvas class="scribble-board" height="{{height}}" width="{{width}}"></canvas>
					<video class="scribble-video" ng-show="mode=='streaming'" height="{{height}}" width="{{width}}" autoplay></video>
					<canvas class="scribble-background" ng-show="mode!='streaming'" height="{{height}}" width="{{width}}"></canvas>
					<a ng-if="signatureReady" ng-click="submit()" class="btn btn-success btn-circular btn-fab"><i class="fa fa-fw fa-check fa-2x"></i></a>
				</div>
				<canvas class="scribble-composed" height="{{height}}" width="{{width}}"></canvas>
			</div>
		`,
		controller: function($scope, $element, $debounce){
			// Mobile version {{{
			var userAgent = navigator.userAgent;
			$scope.isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent));
			$scope.requestCamera = ()=> {
				$scope.setMode('pen');

				if (videoStream && videoStream.getTracks()[0])
					videoStream.getTracks()[0].stop();
				$element.find('input[type=file]').trigger('click')
			};
			// }}}

			// Deal with user config {{{
			if (!$scope.height) $scope.height = 200;
			if (!$scope.width) $scope.width = 490;
			if (!$scope.sizes) $scope.sizes = [1, 2, 3, 4, 5];
			if (!$scope.colors) $scope.colors = ['#000', '#337AB7', '#3C763D', '#8A6D3B', '#A94442'];

			$scope.buttons = Object.assign({ // Set default buttons unless overriden
				camera: true,
				colors: true,
				clear: true,
				eraser: true,
				sizes: true,
			}, $scope.buttons);
			// }}}

			// Screenshot management {{{
			var canvas = $element[0].querySelector('.scribble-board');
			var ctx = canvas.getContext('2d');
			$scope.signaturePad = new SignaturePad(canvas);

			var canvasBackground = $element[0].querySelector('.scribble-background');
			var ctxBackground = canvasBackground.getContext('2d');
			var composedImage = $element[0].querySelector('.scribble-composed');
			var ctxComposed = composedImage.getContext('2d');
			var video = $element[0].querySelector('.scribble-video');
			var videoStream;
			// check for getUserMedia support
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

			$scope.setBackground = function(){
				$scope.setMode('streaming'); // Start video feed
				$scope.signatureReady = false;
				// Clear canvas
				if (ctxBackground)
					ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
				
				if (navigator.getUserMedia) navigator.getUserMedia({video: true}, stream => { // Get webcam feed if available
					video.src = window.URL.createObjectURL(stream);
					videoStream = stream;
				}, function() {});
			};

			$scope.reversed = false;
			$scope.flipContext = function(){
				$scope.reversed = !$scope.reversed;
				ctxBackground.translate(canvasBackground.width, 0);
				ctxBackground.scale(-1, 1);
			}; 

			$scope.screenshot = function(){
				$scope.setMode('pen');
				$scope.signatureReady = false;

				if(video.paused || video.ended) console.log("no video");;
				if(video.paused || video.ended) return false;
				//TODO: hack to flip context only once {{{
				if (!$scope.reversed)
					$scope.flipContext();
				// }}}

				ctxBackground.drawImage(video, 0, 0, $scope.width, $scope.height);
				videoStream.getTracks()[0].stop();
				$scope.signatureReady = true;
			};
			// }}}

			// Handle signature pad events {{{
			$scope.clearSignature = ()=> $scope.signaturePad.clear();

			$scope.signaturePad.onBegin = ()=> $scope.$applyAsync(()=> $scope.signatureReady = false);

			$scope.signaturePad.onEnd = $debounce(()=> $scope.$applyAsync(()=> {
				if ($scope.editable) {
					$scope.signatureReady = true;
				} else {
					$scope.submit();
				}
			}), 1500, false);
			// }}}

			// Manage mode {{{
			$scope.mode = 'pen';
			$scope.setMode = mode => $scope.mode = mode;

			$scope.$watch('mode', function(newVal, oldVal){
				if (newVal == 'erase' && newVal !== oldVal) {
					$scope.oldStroke = {
						oldComposition: ctx.globalCompositeOperation,
						minWidth: $scope.signaturePad.minWidth,
						maxWidth: $scope.signaturePad.maxWidth
					};
					ctx.globalCompositeOperation = 'destination-out';
					$scope.signaturePad.minWidth = 6;
					$scope.signaturePad.maxWidth = 8;
				} else if (oldVal == 'erase') {
					ctx.globalCompositeOperation = $scope.oldStroke.oldComposition;
					$scope.signaturePad.minWidth = $scope.oldStroke.minWidth;
					$scope.signaturePad.maxWidth = $scope.oldStroke.maxWidth;
				}
			});
			// }}}

			// Pen size {{{
			$scope.penSize = 1;
			$scope.setPenSize = size => {
				$scope.penSize = size;
				$scope.signaturePad.minWidth = size - 0.5;
				$scope.signaturePad.maxWidth = size + 1.5;
			};
			// }}}

			// Pen color {{{
			$scope.penColor = '#000';
			$scope.setPenColor = color => {
				$scope.penColor = color;
				$scope.signaturePad.penColor = color;
			};
			// }}}

			// Background - mobile {{{
			var selectBackground = $element[0].querySelector('.selectBackground')
			selectBackground.addEventListener('change', function(e){
				if (!selectBackground.files.length) return;

				var backgroundSrc = selectBackground.files[0];
				var reader = new FileReader();

				reader.onload = function(event){
					var image = new Image();
					var ratio = window.devicePixelRatio || 1;

					image.src = event.target.result;
					image.onload = function () {
						$scope.$applyAsync(() => {
							if ($scope.reversed)
								$scope.flipContext()
								$scope.signatureReady = true;
	
							ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
							ctxBackground.drawImage(image, 0, 0, canvasBackground.width, canvasBackground.height);
						});
					};
				};

				if (reader)
					reader.readAsDataURL(backgroundSrc);
			});
			// }}}

			// Submit signature {{{
			$scope.getDataURI = ()=> {
				ctxComposed.clearRect(0, 0, composedImage.width, composedImage.height);
				ctxComposed.drawImage(canvasBackground, 0, 0);
				ctxComposed.drawImage(canvas, 0, 0);
				return composedImage.toDataURL();
			};

			$scope.getBlob = dataURI => {
				var byteString = atob(dataURI.replace(/^data:image\/png;base64,/,''));
				var ia = new Uint8Array(byteString.length);
				for (var i = 0; i < byteString.length; i++) {
					ia[i] = byteString.charCodeAt(i);
				}
				return new Blob([ia], {type: 'image/png'});
			};

			$scope.submit = ()=> {
				var dataURI = $scope.getDataURI();
				$scope.callback({
					dataURI,
					blob: $scope.getBlob(dataURI),
				});
			};
			// }}}
		}
	}
});
