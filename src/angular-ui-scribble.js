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
		},
		template: `
			<div class="scribble" ng-class="editable ? 'scribble-editable' : 'scribble-not-editable'">
				<input class="scribble-file-camera selectBackground" type="file" accept="image/*" capture="camera">
				<nav ng-if="editable" class="scribble-actions navbar navbar-default" style="width: {{width}}px">
					<div class="container-fluid">
						<form class="navbar-form pull-left">
							<div class="btn-group">
								<a ng-if="buttons.camera && mode!='streaming' && !isMobile" tooltip="Set background image" ng-click="setBackground()" class="btn btn-primary"><i class="fa fa-image"></i></a>
								<a ng-if="buttons.camera && mode=='streaming' && !isMobile" tooltip="Take screenshot" ng-click="screenshot()" class="btn btn-primary"><i class="fa fa-camera"></i></a>
								<a ng-if="buttons.camera && isMobile" ng-click="requestCamera()" class="btn btn-primary"><i class="fa fa-camera"></i></a>
							</div>
							<div class="btn-group">
								<a ng-click="setMode('pen')" ng-class="mode=='pen' && 'active'" tooltip="Pen" class="btn btn-default"><i class="fa fa-pencil"></i></a>
								<a ng-click="setMode('erase')" ng-class="mode=='erase' && 'active'" tooltip="Eraser" class="btn btn-default"><i class="fa fa-eraser"></i></a>
							</div>
						</form>
						<form class="navbar-form pull-right">
							<div class="btn-group">
								<a ng-click="clearSignature()" class="btn btn-danger"><i class="fa fa-trash"></i></a>
							</div>
						</form>
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
			$scope.requestCamera = ()=> $element.find('input[type=file]').trigger('click');
			// }}}

			// Deal with user config {{{
			if (!$scope.height) $scope.height = 200;
			if (!$scope.width) $scope.width = 400;

			$scope.buttons = Object.assign({ // Set default buttons unless overriden
				camera: true,
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
				if (navigator.getUserMedia) navigator.getUserMedia({video: true}, stream => { // Get webcam feed if available
					video.src = window.URL.createObjectURL(stream);
					videoStream = stream;
				}, function() {});
			};

			$scope.reversed = false;
			$scope.screenshot = function(){
				$scope.setMode('pen');
				if(video.paused || video.ended) console.log("no video");;
				if(video.paused || video.ended) return false;
				//TODO: hack to flip context only once {{{
				if (!$scope.reversed) {
					$scope.reversed = true;
					ctxBackground.translate(canvasBackground.width, 0);
					ctxBackground.scale(-1, 1);
				}
				// }}}

				ctxBackground.drawImage(video, 0, 0, $scope.width, $scope.height);
				videoStream.getTracks()[0].stop();
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

			// Background - mobile {{{
			var selectBackground = $element[0].querySelector('.selectBackground')
			selectBackground.addEventListener('change', function(e){
				var backgroundSrc = selectBackground.files[0];
				var reader = new FileReader();

				reader.onload = function(event){
					var image = new Image();
					var ratio = window.devicePixelRatio || 1;

					image.src = event.target.result;
					image.onload = function () {
						ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
						ctxBackground.drawImage(image, 0, 0, canvasBackground.width, canvasBackground.height);
					};
				};

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
