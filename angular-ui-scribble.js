angular.module('angular-ui-scribble',[])
.directive('uiScribble', function(){
	return {
		scope:{
			config:'=?',
			callbackFn: '&',
			callbackBtn: '&'
		},
		template:
		'<div class="scribble">'+
			'<ul class="scribble-actions">'+
				'<li><button ng-click="clearSignature()">Clear</button></li>'+
				'<li ng-if=\'mode!="erase"\'><button ng-click="setMode(\'erase\')">Erase</button></li>'+
				'<li ng-if=\'mode=="erase"\'><button ng-click="setMode(\'pen\')">Pen</button></li>'+
				'<li ng-if=\'mode!="streaming" && !isMobile\'><button ng-click="setBackground()">Background</button></li>'+
				'<li ng-if=\'mode=="streaming" && !isMobile\'><button ng-click="screenshot()">Screenshot</button></li>'+
				'<li><input  id="selectBackground" type="file" accept="image/*" capture="camera"></lis>'+
			'</ul>'+
			'<div class="scribble-canvas" height="200" width="350">'+
				'<video ng-show=\'mode=="streaming"\' height="200" width="380" autoplay id="videoFeed" style="z-index:2;"></video>'+
				'<canvas  height="200" width="380" style="z-index:3;"></canvas>'+
				'<canvas ng-show=\'mode!="streaming"\' id="scribble-background" height="200" width="380" style="z-index:1;"></canvas>'+
				'<button ng-if="signatureReady" ng-click="callbackBtn({signature: signaturePad.toDataURL()})">Done</button>'+
			'</div>'+
		'</div>',
		controller: function($scope, $element, $attrs){
			$scope.isMobile = false; //TODO: detect mobile/desktop version
			$scope.mode = 'pen';
			$scope.signaturePad;

			var canvas = $element.find('canvas')[0];
			var ctx = canvas.getContext('2d');
			$scope.signaturePad = new SignaturePad(canvas);

			var video = document.querySelector('#videoFeed');
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
				videoStream = stream.getTracks()[0];
			}

			function videoError(){}

			$scope.screenshot = function(){
				$scope.setMode('pen');
				if(video.paused || video.ended) console.log("no video");;
				if(video.paused || video.ended) return false;

				var background = document.getElementById('scribble-background');
				var backgroundCtx = background.getContext('2d');
				var width = background.width;
				var height = background.height;

				backgroundCtx.drawImage(video, 0, 0, width, height);
				videoStream.stop();
			};


			// Expose original signaturePad object
			$scope.config.getSignaturePad = function(){
				return signaturePad;
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
						$scope.callbackFn($scope.signaturePad.toDataURL());
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
					backgroundCtx.clearRect(0, 0, canvas.width, canvas.height);
						backgroundCtx.drawImage(image, 0, 0, width, height);
				};
			}
			// }}}
		}
	}
});
