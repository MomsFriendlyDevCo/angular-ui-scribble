angular.module('angular-ui-scribble',[])
.directive('uiScribble', function(){
	return {
		scope:{
			config:'=?',
			callbackFn: '&',
			callbackBtn: '&'
		},
		template: `
			<div class="scribble">
				<ul class="scribble-actions">
					<li><button ng-click="clearSignature()">Clear</button></li>
					<li ng-if="mode!='erase'"><button ng-click="setMode('erase')">Erase</button></li>
					<li ng-if="mode=='erase'"><button ng-click="setMode('pen')">Pen</button></li>
					<li ng-if="mode!='streaming' && !isMobile"><button ng-click="setBackground()">Background</button></li>
					<li ng-if="mode=='streaming' && !isMobile"><button ng-click="screenshot()">Screenshot</button></li>
					<li><input class="selectBackground" type="file" accept="image/*" capture="camera"></lis>
				</ul>
				<div class="scribble-canvas" height="{{scribbleHeight}}" width="{{scribbleWidth}}">
					<video ng-show="mode=='streaming'" height="{{scribbleHeight}}" width="{{scribbleWidth}}" autoplay class="videoFeed" style="z-index:2;"></video>
					<canvas class="scribble-board" height="{{scribbleHeight}}" width="{{scribbleWidth}}" style="z-index:3;"></canvas>
					<canvas class="scribble-background" ng-show="mode!="streaming'" height="{{scribbleHeight}}" width="{{scribbleWidth}}" style="z-index:1;"></canvas>
					<button ng-if="signatureReady" ng-click="callbackBtn({signature: getSignatureImage()})">Done</button>
				</div>
				<canvas class="scribble-composed" ng-show=false height="{{scribbleHeight}}" width="{{scribbleWidth}}" ></canvas>
			</div>
		`,
		controller: function($scope, $element, $attrs){
			$scope.isMobile = false; //TODO: detect mobile/desktop version
			$scope.mode = 'pen';
			$scope.signaturePad;
			$scope.scribbleHeight = 400;
			$scope.scribbleWidth = 400;

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

			var video = $element[0].querySelector('.videoFeed');
			var videoStream;
			// check for getUserMedia support
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

			$scope.setBackground = function(){
				// start video feed
				$scope.setMode('streaming');

				// get webcam feed if available
				if(navigator.getUserMedia) navigator.getUserMedia({video: true}, handleVideo, videoError);
			};

			function handleVideo(stream){
				video.src = window.URL.createObjectURL(stream);
				streamOriginal = stream;
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
						$scope.callbackFn(image);
					} else if($attrs.callbackBtn && typeof $scope.callbackBtn === 'function') {
						$scope.signatureReady = true;
					}
				});
			}

			$scope.signaturePad.onEnd = _.debounce(signatureReady, 1500)

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
