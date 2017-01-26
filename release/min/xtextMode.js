/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-go version: 0.0.1(10663473bffdcd65c6b3b4156f547e1be27124b1)
 * Released under the MIT license
 * https://github.com/mbana/monaco-go/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/
define("vs/language/xtext/workerManager",["require","exports"],function(e,t){function n(e){var t,n,o=new r(function(e,r){t=e,n=r},function(){});return e.then(t,n),o}var r=monaco.Promise,o=12e4,i=function(){function e(e){var t=this;this._defaults=e,this._worker=null,this._idleCheckInterval=window.setInterval(function(){return t._checkIfIdle()},3e4),this._lastUsedTime=0,this._configChangeListener=this._defaults.onDidChange(function(){return t._stopWorker()})}return e.prototype._stopWorker=function(){this._worker&&(this._worker.dispose(),this._worker=null),this._client=null},e.prototype.dispose=function(){clearInterval(this._idleCheckInterval),this._configChangeListener.dispose(),this._stopWorker()},e.prototype._checkIfIdle=function(){if(this._worker){var e=Date.now()-this._lastUsedTime;e>o&&this._stopWorker()}},e.prototype._getClient=function(){return this._lastUsedTime=Date.now(),this._client||(this._worker=monaco.editor.createWebWorker({moduleId:"vs/language/xtext/xtextWorker",label:"xtext",createData:{languageSettings:{validate:!1,lint:null},languageId:"mydsl"}}),this._client=this._worker.getProxy()),this._client},e.prototype.getLanguageServiceWorker=function(){for(var e=this,t=[],r=0;r<arguments.length;r++)t[r-0]=arguments[r];var o;return n(this._getClient().then(function(e){o=e}).then(function(n){return e._worker.withSyncedResources(t)}).then(function(e){return o}))},e}();t.WorkerManager=i}),define("vs/language/xtext/language-client/web-socket-reader",["require","exports"],function(e,t){var n=monaco.Emitter,r=function(){function e(e,t){this.ws=e,this.uiHooks=t,this._logMsgs=!1,this._encoder=new TextEncoder,this._decoder=new TextDecoder,this._errorEmitter=new n,this._closeEmitter=new n,this.attachHandlers()}return e.prototype.listen=function(e){this._callback=e},e.prototype.attachHandlers=function(){var e=this;this.ws.onmessage=function(t){var n=t.data?t.data:"";e._callback&&"string"==typeof n&&(e.logMsg(n),e.handleMessages(n))}},e.prototype.logMsg=function(e){if(this._logMsgs){var t=this._encoder.encode(e),n=(t?t:[]).toString(),r=this._decoder.decode(t);console.log("WebSocketMessageReader:onmessage"),console.log("[%s]",n),console.log(r)}},e.prototype.handleMessages=function(e){var t=this,n=this.splitMessages(e);n.map(function(e){t.handleJsonRpcMessage(e)})},e.prototype.splitMessages=function(e){for(var t="Content-Length:",n=[],r=e.indexOf(t,0),o=0;o!==-1;){o=e.indexOf(t,r+1);var i=void 0;i=o===-1?e.substring(r):e.substring(r,o),r=o,n.push(i)}return n},e.prototype.handleJsonRpcMessage=function(e){if(0!==e.length){var t="\r\n",n=""+t+t,r=e.split(n,2),o=r[1],i=JSON.parse(o);if(this._callback(i),this.uiHooks){var s=i,a=s&&s.id?s.id:"",c={id:a,msg:i};this.uiHooks.onRequestEnd(c)}}},Object.defineProperty(e.prototype,"onError",{get:function(){return this._errorEmitter.event},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"onClose",{get:function(){return this._closeEmitter.event},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"onPartialMessage",{get:function(){return this._partialMessageEmitter.event},enumerable:!0,configurable:!0}),e}();t.WebSocketMessageReader=r}),define("vs/language/xtext/language-client/utils",["require","exports"],function(e,t){var n=function(){function e(){}return e.byteLength=function(e,t){void 0===t&&(t="utf-8");var n=new TextEncoder(t).encode(e),r=n.length;return r},e}();t.Utils=n}),define("vs/language/xtext/language-client/web-socket-writer",["require","exports","./utils"],function(e,t,n){var r=monaco.Emitter,o=function(){function e(e,t){this.ws=e,this.uiHooks=t,this._logMsgs=!1,this._encoder=new TextEncoder,this._decoder=new TextDecoder,this._errorEmitter=new r,this._closeEmitter=new r}return e.prototype.write=function(e){var t=JSON.stringify(e),n=this.toRpc(t);if(this.logMsg(n),this.uiHooks){var r=e,o=r&&r.id?r.id:"",i={id:o,msg:e};this.uiHooks.onRequestStart(i)}this.ws.send(n)},e.prototype.toRpc=function(e){var t="Content-Length: ",r="\r\n",o="utf-8",i=n.Utils.byteLength(e,o),s=[t,i.toString(),r,r,e],a=s.join("");return a},e.prototype.logMsg=function(e){if(this._logMsgs){var t=this._encoder.encode(e),n=(t?t:[]).toString(),r=this._decoder.decode(t);console.log("WebSocketMessageWriter:send"),console.log("[%s]",n),console.log(r)}},Object.defineProperty(e.prototype,"onError",{get:function(){return this._errorEmitter.event},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"onClose",{get:function(){return this._closeEmitter.event},enumerable:!0,configurable:!0}),e}();t.WebSocketMessageWriter=o}),define("vs/language/xtext/language-client/web-socket-stream",["require","exports","./web-socket-reader","./web-socket-writer"],function(e,t,n,r){t.WebSocketMessageReader=n.WebSocketMessageReader,t.WebSocketMessageWriter=r.WebSocketMessageWriter;var o=function(){function e(e,t){this.ws=e,this.uiHooks=t,this.writer=new r.WebSocketMessageWriter(e,t),this.reader=new n.WebSocketMessageReader(e,t)}return e.getWorkspaceConfig=function(){var e="monaco.workspace.xtext.langserver",t=localStorage.getItem(e);return JSON.parse(t)},e.createUrl=function(){var t=e.getWorkspaceConfig(),n="ws";t&&t.scheme&&(n=t.scheme);var r={hostname:location.hostname,port:"4389"};return t&&t.hostname&&(r.hostname=t.hostname),t&&t.port&&(r.port=t.port),n+"://"+r.hostname+":"+r.port},e.create=function(t){return new Promise(function(n,r){var o;try{var i=e.createUrl();o=new WebSocket(i),o.onopen=function(r){var i=new e(o,t);n(i)}}catch(s){r(s)}o.onclose=function(e){console.error("WebSocketStream:onclose - CloseEvent: ",e),r(e)},o.onerror=function(e){console.error("WebSocketStream:onerror - ErrorEvent: ",e),r(e)},o.onmessage=function(e){}})},e}();t.WebSocketStream=o});var __extends=this&&this.__extends||function(e,t){function n(){this.constructor=e}for(var r in t)t.hasOwnProperty(r)&&(e[r]=t[r]);e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)};define("vs/language/xtext/language-client/monaco-language-client",["require","exports","vscode-languageclient","./web-socket-stream"],function(e,t,n,r){var o=monaco.Uri,i=function(e){function t(t,n,r,o){void 0===o&&(o=!1),e.call(this,t,n,r,o)}return __extends(t,e),t.create=function(e){var n="langserver-antha",o=function(){return r.WebSocketStream.create(e)},i=["mydsl"],s=t.createInitializationFailedHandler(),a=t.createErrorHandler(),c={configurationSection:null,fileEvents:null},u=t.createUriConverters(),l={documentSelector:i,synchronize:c,initializationFailedHandler:s,errorHandler:a,uriConverters:u},g=!1,f=new t(n,o,l,g);return f},t.createInitializationFailedHandler=function(){return function(e){return console.error("MonacoLanguageClient: ",e),!1}},t.createErrorHandler=function(){return{error:function(e,t,r){return console.error("MonacoLanguageClient: ",e,t,r),n.ErrorAction.Shutdown},closed:function(){return n.CloseAction.DoNotRestart}}},t.createUriConverters=function(){var e=function(){var e=location.href,t=e,n=e.lastIndexOf("/");return n===e.length-1&&(t=e.substr(0,n)),t},t="file://",n=e();return{code2Protocol:function(e){var r=e.toString();if(r.startsWith(n)){var o=r.replace(n,t);return o}return r},protocol2Code:function(e){if(e.startsWith(t)){var r=e.replace(t,n),i=o.parse(r);return i}return o.parse(e)}}},t}(n.LanguageClient);t.MonacoLanguageClient=i}),define("vs/language/xtext/xtextMode",["require","exports","./workerManager","./language-client/monaco-language-client"],function(e,t,n,r){function o(e,t){var o=[],i=r.MonacoLanguageClient.create(t);o.push(i.start());var s=new n.WorkerManager(e);o.push(s);e.languageId;return o}t.setupMode=o});