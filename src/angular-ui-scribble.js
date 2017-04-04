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
			config:'=?',
			callbackFn: '&',
			callbackBtn: '&',
			buttons:'=?'
		},
		template: `
			<div class="scribble">
				<nav class="scribble-actions navbar navbar-default" style="width: {{scribbleWidth}}px">
					<div class="container-fluid">
						<ul class="nav navbar-nav">
							<li><a ng-click="clearSignature()" class="btn btn-danger"><i class="fa fa-trash"></i></a></li>
							<li ng-if="mode!='erase'"><a ng-click="setMode('erase')" tooltip="Eraser" class="btn btn-default"><i class="fa fa-eraser"></i></a></li>
							<li ng-if="mode=='erase'"><a ng-click="setMode('pen')" tooltip="Pen" class="btn btn-default"><i class="fa fa-pencil"></i></a></li>
							<li ng-if="buttons.camera && mode!='streaming' && !isMobile" tooltip="Set background image"><a ng-click="setBackground()" class="btn btn-default"><i class="fa fa-image"></i></a></li>
							<li ng-if="buttons.camera && mode=='streaming' && !isMobile" tooltip="Take screenshot"><a ng-click="screenshot()" class="btn btn-default"><i class="fa fa-camera"></i></a></li>
							<li ng-show="buttons.camera && isMobile">
								<input class="scrible-file-camera selectBackground" type="file" accept="image/*" capture="camera">
								<a ng-click="requestCamera()" class="btn btn-default"><i class="fa fa-camera"></i></a>
							</li>
						</ul>
					</div>
				</nav>
				<div class="scribble-area" style="width: {{scribbleWidth}}px; height: {{scribbleWidth}}px">
					<canvas class="scribble-board" height="{{scribbleHeight}}" width="{{scribbleWidth}}"></canvas>
					<video class="scribble-video" ng-show="mode=='streaming'" height="{{scribbleHeight}}" width="{{scribbleWidth}}" autoplay></video>
					<canvas class="scribble-background" ng-show="mode!='streaming'" height="{{scribbleHeight}}" width="{{scribbleWidth}}"></canvas>
					<a ng-if="signatureReady" ng-click="callbackBtn({signature: getSignatureImage()})" class="btn btn-success btn-circular btn-fab"><i class="fa fa-fw fa-check fa-2x"></i></a>
				</div>
				<canvas class="scribble-composed" ng-show=false height="{{scribbleHeight}}" width="{{scribbleWidth}}" ></canvas>
			</div>
		`,
		controller: function($scope, $element, $attrs, $debounce){
			// Mobile version {{{
			var userAgent = navigator.userAgent;
			$scope.isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent));
			$scope.requestCamera = function(){
				$element.find('input[type=file]').trigger('click');
			};
			// }}}
			$scope.mode = 'pen';
			$scope.signaturePad;
			$scope.scribbleHeight = 400;
			$scope.scribbleWidth = 400;
			$scope.buttons = $scope.buttons || { camera: true };

			var canvas = $element[0].querySelector('.scribble-board');
			var ctx = canvas.getContext('2d');

			var canvasBackground = $element[0].querySelector('.scribble-background');
			var ctxBackground = canvasBackground.getContext('2d');
			var composedImage = $element[0].querySelector('.scribble-composed');
			var ctxComposed = composedImage.getContext('2d');

			// Flip the screenshot {{{
			//TODO: not flipping the screenshot
			var reversed = false;
			// ctxBackground.translate(canvasBackground.width, 0);
			// ctxBackground.scale(-1, 1);
			// }}}

			$scope.signaturePad = new SignaturePad(canvas);

			var video = $element[0].querySelector('.scribble-video');
			var videoStream;
			// check for getUserMedia support
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

			$scope.setBackground = function(){
				// start video feed
				$scope.setMode('streaming');

				// get webcam feed if available
				if(navigator.getUserMedia) navigator.getUserMedia({video: true}, handleVideo, videoError);
			};

			function handleVideo(stream){
				video.src = window.URL.createObjectURL(stream);
				videoStream = stream
			}

			function videoError(){}

			$scope.screenshot = function(){
				$scope.setMode('pen');
				if(video.paused || video.ended) console.log("no video");;
				if(video.paused || video.ended) return false;
				//TODO: hack to flip context only once {{{
				if (!reversed) {
					reversed = true;
					ctxBackground.translate(canvasBackground.width, 0);
					ctxBackground.scale(-1, 1);
				}
				// }}}

				ctxBackground.drawImage(video, 0, 0, $scope.scribbleWidth, $scope.scribbleHeight);
				videoStream.getTracks()[0].stop();
			};

			// Expose original signaturePad object
			$scope.config.getSignaturePad = function(){
				return signaturePad;
			};

			// Expose composed image
			$scope.config.getSignatureImage = $scope.getSignatureImage;

			// Returns composed image of background and foreground
			$scope.getSignatureImage = function(){
				ctxComposed.clearRect(0, 0, composedImage.width, composedImage.height);
				ctxComposed.drawImage(canvasBackground, 0, 0);
				ctxComposed.drawImage(canvas, 0, 0);
				return composedImage.toDataURL();
			};

			$scope.clearSignature = function(){
				$scope.signaturePad.clear();
			};

			$scope.signaturePad.onBegin = function(e){
				$scope.$applyAsync(function(){
					$scope.signatureReady = false;
				});
			};

			function signatureReady(){
				$scope.$applyAsync(function(){
					if ($attrs.callbackFn && typeof $scope.callbackFn === 'function') {
						var image = $scope.getSignatureImage();
						$scope.callbackFn({ signature: image });
					} else if($attrs.callbackBtn && typeof $scope.callbackBtn === 'function') {
						$scope.signatureReady = true;
					}
				});
			}

			$scope.signaturePad.onEnd = $debounce(signatureReady, 1500, false);

			$scope.setMode = function(mode){
				$scope.mode = mode;
			};

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

			// Background - mobile {{{
			var selectBackground = $element[0].querySelector('.selectBackground')
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
				var image = new Image();
				var ratio = window.devicePixelRatio || 1;

				image.src = dataUrl;
				image.onload = function () {
					ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
					ctxBackground.drawImage(image, 0, 0, canvasBackground.width, canvasBackground.height);
				};
			}
			// }}}
		}
	}
});
