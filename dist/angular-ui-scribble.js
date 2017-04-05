'use strict';

angular.module('angular-ui-scribble', []).factory('$debounce', ['$timeout', function ($timeout) {
	/**
 * @author Matt Carter <m@ttcarter.com>
 * Calls fn once after timeout even if more than one call to debounced fn was made
 * Edited version of the original part of ng-tools - https://github.com/capaj/ng-tools
 */
	function debounce(callback, timeout, apply) {
		timeout = angular.isUndefined(timeout) ? 0 : timeout;
		apply = angular.isUndefined(apply) ? true : apply;
		var callCount = 0;
		return function () {
			var self = this;
			var args = arguments;
			callCount++;
			var wrappedCallback = function (version) {
				return function () {
					if (version === callCount) return callback.apply(self, args);
				};
			}(callCount);
			return $timeout(wrappedCallback, timeout, apply);
		};
	}
	return debounce;
}]).directive('uiScribble', function () {
	return {
		scope: {
			callback: '&',
			editable: '<',
			buttons: '<',
			width: '@?',
			height: '@?'
		},
		template: '\n\t\t\t<div class="scribble" ng-class="editable ? \'scribble-editable\' : \'scribble-not-editable\'">\n\t\t\t\t<input class="scribble-file-camera selectBackground" type="file" accept="image/*" capture="camera">\n\t\t\t\t<nav ng-if="editable" class="scribble-actions navbar navbar-default" style="width: {{width}}px">\n\t\t\t\t\t<div class="container-fluid">\n\t\t\t\t\t\t<ul class="nav navbar-nav">\n\t\t\t\t\t\t\t<li><a ng-click="clearSignature()" class="btn btn-danger"><i class="fa fa-trash"></i></a></li>\n\t\t\t\t\t\t\t<li ng-if="mode!=\'erase\'"><a ng-click="setMode(\'erase\')" tooltip="Eraser" class="btn btn-default"><i class="fa fa-eraser"></i></a></li>\n\t\t\t\t\t\t\t<li ng-if="mode==\'erase\'"><a ng-click="setMode(\'pen\')" tooltip="Pen" class="btn btn-default"><i class="fa fa-pencil"></i></a></li>\n\t\t\t\t\t\t\t<li ng-if="buttons.camera && mode!=\'streaming\' && !isMobile" tooltip="Set background image"><a ng-click="setBackground()" class="btn btn-default"><i class="fa fa-image"></i></a></li>\n\t\t\t\t\t\t\t<li ng-if="buttons.camera && mode==\'streaming\' && !isMobile" tooltip="Take screenshot"><a ng-click="screenshot()" class="btn btn-default"><i class="fa fa-camera"></i></a></li>\n\t\t\t\t\t\t\t<li ng-show="buttons.camera && isMobile">\n\t\t\t\t\t\t\t\t<a ng-click="requestCamera()" class="btn btn-default"><i class="fa fa-camera"></i></a>\n\t\t\t\t\t\t\t</li>\n\t\t\t\t\t\t</ul>\n\t\t\t\t\t</div>\n\t\t\t\t</nav>\n\t\t\t\t<div class="scribble-area" style="width: {{width}}px; height: {{height}}px">\n\t\t\t\t\t<canvas class="scribble-board" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t\t\t<video class="scribble-video" ng-show="mode==\'streaming\'" height="{{height}}" width="{{width}}" autoplay></video>\n\t\t\t\t\t<canvas class="scribble-background" ng-show="mode!=\'streaming\'" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t\t\t<a ng-if="signatureReady" ng-click="submit()" class="btn btn-success btn-circular btn-fab"><i class="fa fa-fw fa-check fa-2x"></i></a>\n\t\t\t\t</div>\n\t\t\t\t<canvas class="scribble-composed" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t</div>\n\t\t',
		controller: ["$scope", "$element", "$debounce", function controller($scope, $element, $debounce) {
			// Mobile version {{{
			var userAgent = navigator.userAgent;
			$scope.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);
			$scope.requestCamera = function () {
				return $element.find('input[type=file]').trigger('click');
			};
			// }}}

			// Deal with user config {{{
			if (!$scope.height) $scope.height = 400;
			if (!$scope.width) $scope.width = 400;

			$scope.buttons = Object.assign({ // Set default buttons unless overriden
				camera: true
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

			$scope.setBackground = function () {
				$scope.setMode('streaming'); // Start video feed
				if (navigator.getUserMedia) navigator.getUserMedia({ video: true }, function (stream) {
					// Get webcam feed if available
					video.src = window.URL.createObjectURL(stream);
					videoStream = stream;
				}, function () {});
			};

			$scope.reversed = false;
			$scope.screenshot = function () {
				$scope.setMode('pen');
				if (video.paused || video.ended) console.log("no video");;
				if (video.paused || video.ended) return false;
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
			$scope.clearSignature = function () {
				return $scope.signaturePad.clear();
			};

			$scope.signaturePad.onBegin = function () {
				return $scope.$applyAsync(function () {
					return $scope.signatureReady = false;
				});
			};

			$scope.signaturePad.onEnd = $debounce(function () {
				return $scope.$applyAsync(function () {
					if ($scope.editable) {
						$scope.signatureReady = true;
					} else {
						$scope.submit();
					}
				});
			}, 1500, false);
			// }}}

			// Manage mode {{{
			$scope.mode = 'pen';
			$scope.setMode = function (mode) {
				return $scope.mode = mode;
			};

			$scope.$watch('mode', function (newVal, oldVal) {
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
			var selectBackground = $element[0].querySelector('.selectBackground');
			selectBackground.addEventListener('change', function (e) {
				var backgroundSrc = selectBackground.files[0];
				var reader = new FileReader();

				reader.onload = function (event) {
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
			$scope.getSignatureImage = function () {
				ctxComposed.clearRect(0, 0, composedImage.width, composedImage.height);
				ctxComposed.drawImage(canvasBackground, 0, 0);
				ctxComposed.drawImage(canvas, 0, 0);
				return composedImage.toDataURL();
			};

			$scope.submit = function () {
				var image = $scope.getSignatureImage();
				$scope.callback({ image: image });
			};
			// }}}
		}]
	};
});