angular-ui-scribble
===================
Simple drawing widget to collect signatures, drawings or scrawls on a plain background or input from a webcam.

Can be used for:

* Signature collection
* Annotated drawings
* Simple scribbles

[Demo](https://momsfriendlydevco.github.io/angular-ui-scribble)


Installation
------------
NOTE: This module requires [signature_pad](https://github.com/szimek/signature_pad)

1. Grab the NPM

```shell
npm install --save @momsfriendlydevco/angular-ui-scribble
```


2. Install the required script + CSS somewhere in your build chain or include it in a HTML header:

```html
<script src="/libs/angular-ui-scribble/dist/votetally.min.js"/>
<link href="/libs/angular-ui-scribble/dist/angular-ui-scribble.min.css" rel="stylesheet" type="text/css"/>
```


3. Include the router in your main `angular.module()` call:

```javascript
var app = angular.module('app', ['angular-ui-scribble'])
```


4. Use somewhere in your template:

```html
<ui-scribble editable="true" callback="someFunction(image)"></ui-scribble>
```


A demo is also available. To use this [follow the instructions in the demo directory](./demo/README.md).


Directive
=========
The UI widget is a AngularJS directive which supports the following options:

| Option           | Type       | Default            | Description                                                                                                    |
|------------------|------------|--------------------|----------------------------------------------------------------------------------------------------------------|
| `callback`       | `function` | `none`             | The function to accept the completed drawing. The callback must contain either keyword `dataURI` or `blob` somewhere which will be replaced with the DataURI of the encoded image and the raw binary blob. e.g. `myCallback(dataURI)` to recieve the dataURI and `myCallback(blob)` to get the Blob object |
| `editable`       | `boolean`  | `false`            | If false the first scribble the user makes will be used, if true the user has access to some editing tools before submission |
| `colors`         | `array`    | *Pastel colors*    | An array of colors to select from                                                                              |
| `sizes`          | `array`    | `[1,2,3,4,5]`      | An array of pen sizes to select from                                                                           |
| `buttons`        | `Object`   | `{}`               | Which buttons should be displayed in the UI. See below for each individual option                              |
| `buttons.camera` | `boolean`  | `true`             | Display the camera capture button if the platform supports it                                                  |
| `buttons.colors` | `boolean`  | `true`             | Display the color selection buttons                                                                            |
| `buttons.clear`  | `boolean`  | `true`             | Display the clear input button                                                                                 |
| `buttons.eraser` | `boolean`  | `true`             | Display the eraser tool                                                                                        |
| `buttons.sizes`  | `boolean`  | `true`             | Display the pen size selection buttons                                                                         |
| `width`          | `number`   | `400`              | The width of the widget                                                                                        |
| `height`         | `number`   | `200`              | The height of the widget                                                                                       |
