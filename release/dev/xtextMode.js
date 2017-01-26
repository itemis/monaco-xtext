/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-go version: 0.0.1(10663473bffdcd65c6b3b4156f547e1be27124b1)
 * Released under the MIT license
 * https://github.com/mbana/monaco-go/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/

define('vs/language/xtext/workerManager',["require", "exports"], function (require, exports) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    
    var Promise = monaco.Promise;
    var STOP_WHEN_IDLE_FOR = 2 * 60 * 1000; // 2min
    var WorkerManager = (function () {
        function WorkerManager(defaults) {
            var _this = this;
            this._defaults = defaults;
            this._worker = null;
            this._idleCheckInterval = window.setInterval(function () { return _this._checkIfIdle(); }, 30 * 1000);
            this._lastUsedTime = 0;
            this._configChangeListener = this._defaults.onDidChange(function () { return _this._stopWorker(); });
        }
        WorkerManager.prototype._stopWorker = function () {
            if (this._worker) {
                this._worker.dispose();
                this._worker = null;
            }
            this._client = null;
        };
        WorkerManager.prototype.dispose = function () {
            clearInterval(this._idleCheckInterval);
            this._configChangeListener.dispose();
            this._stopWorker();
        };
        WorkerManager.prototype._checkIfIdle = function () {
            if (!this._worker) {
                return;
            }
            var timePassedSinceLastUsed = Date.now() - this._lastUsedTime;
            if (timePassedSinceLastUsed > STOP_WHEN_IDLE_FOR) {
                this._stopWorker();
            }
        };
        WorkerManager.prototype._getClient = function () {
            this._lastUsedTime = Date.now();
            if (!this._client) {
                this._worker = monaco.editor.createWebWorker({
                    // module that exports the create() method and returns a `CSSWorker` instance
                    moduleId: 'vs/language/xtext/xtextWorker',
                    label: 'xtext',
                    // label: this._defaults.languageId,
                    // passed in to the create() method
                    createData: {
                        // languageSettings: this._defaults.diagnosticsOptions,
                        // languageId: this._defaults.languageId
                        languageSettings: {
                            validate: false,
                            lint: null
                        },
                        languageId: 'mydsl'
                    }
                });
                this._client = this._worker.getProxy();
            }
            return this._client;
        };
        WorkerManager.prototype.getLanguageServiceWorker = function () {
            var _this = this;
            var resources = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                resources[_i - 0] = arguments[_i];
            }
            var _client;
            return toShallowCancelPromise(this._getClient().then(function (client) {
                _client = client;
            }).then(function (_) {
                return _this._worker.withSyncedResources(resources);
            }).then(function (_) { return _client; }));
        };
        return WorkerManager;
    }());
    exports.WorkerManager = WorkerManager;
    function toShallowCancelPromise(p) {
        var completeCallback;
        var errorCallback;
        var r = new Promise(function (c, e) {
            completeCallback = c;
            errorCallback = e;
        }, function () { });
        p.then(completeCallback, errorCallback);
        return r;
    }
});

define('vs/language/xtext/language-client/web-socket-reader',["require", "exports"], function (require, exports) {
    
    var Emitter = monaco.Emitter;
    var WebSocketMessageReader = (function () {
        function WebSocketMessageReader(ws, uiHooks) {
            this.ws = ws;
            this.uiHooks = uiHooks;
            this._logMsgs = false;
            this._encoder = new TextEncoder();
            this._decoder = new TextDecoder();
            this._errorEmitter = new Emitter();
            this._closeEmitter = new Emitter();
            this.attachHandlers();
        }
        WebSocketMessageReader.prototype.listen = function (callback) {
            this._callback = callback;
        };
        WebSocketMessageReader.prototype.attachHandlers = function () {
            var _this = this;
            this.ws.onmessage = function (ev) {
                var data = ev.data ? ev.data : '';
                // data:
                // "Content-Length: 207\r\nContent-Type: application/vscode-jsonrpc; charset=utf8\r\n\r\n{\"id\":0,\"result\":{\"capabilities\":{\"textDocumentSync\":1,\"hoverProvider\":true,\"definitionProvider\":true,\"referencesProvider\":true,\"documentSymbolProvider\":true,\"workspaceSymbolProvider\":true}},\"jsonrpc\":\"2.0\"}"
                if (!_this._callback || typeof data !== 'string') {
                }
                else {
                    _this.logMsg(data);
                    _this.handleMessages(data);
                }
            };
        };
        WebSocketMessageReader.prototype.logMsg = function (data) {
            if (!this._logMsgs) {
                return;
            }
            var encoded = this._encoder.encode(data);
            var encodedBytes = (encoded ? encoded : []).toString();
            var decoded = this._decoder.decode(encoded);
            console.log('WebSocketMessageReader:onmessage');
            console.log('[%s]', encodedBytes);
            console.log(decoded);
        };
        WebSocketMessageReader.prototype.handleMessages = function (data) {
            var _this = this;
            var msgs = this.splitMessages(data);
            // console.info('WebSocketMessageReader:onmessage - msgs.length ', msgs.length);
            msgs.map(function (data) {
                // this.logMsg(data);
                _this.handleJsonRpcMessage(data);
            });
        };
        WebSocketMessageReader.prototype.splitMessages = function (data) {
            var searchString = 'Content-Length:';
            var msgs = [];
            var from = data.indexOf(searchString, 0);
            for (var end = 0; end !== -1;) {
                end = data.indexOf(searchString, from + 1);
                var msg = void 0;
                if (end === -1) {
                    msg = data.substring(from);
                }
                else {
                    msg = data.substring(from, end);
                }
                from = end;
                msgs.push(msg);
            }
            return msgs;
        };
        WebSocketMessageReader.prototype.handleJsonRpcMessage = function (data) {
            if (data.length === 0) {
                return;
            }
            var CRLF = '\r\n';
            var SEPARATOR = "" + CRLF + CRLF;
            var response = data.split(SEPARATOR, 2);
            // let headers = response[0];
            var json = response[1];
            var msg = JSON.parse(json);
            // let msg = JSON.parse(json);
            this._callback(msg);
            if (this.uiHooks) {
                var recv = msg;
                var id = recv && recv.id ? recv.id : '';
                var details = {
                    id: id,
                    msg: msg,
                };
                this.uiHooks.onRequestEnd(details);
            }
        };
        Object.defineProperty(WebSocketMessageReader.prototype, "onError", {
            get: function () {
                return this._errorEmitter.event;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebSocketMessageReader.prototype, "onClose", {
            get: function () {
                return this._closeEmitter.event;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebSocketMessageReader.prototype, "onPartialMessage", {
            get: function () {
                return this._partialMessageEmitter.event;
            },
            enumerable: true,
            configurable: true
        });
        return WebSocketMessageReader;
    }());
    exports.WebSocketMessageReader = WebSocketMessageReader;
});

define('vs/language/xtext/language-client/utils',["require", "exports"], function (require, exports) {
    
    var Utils = (function () {
        function Utils() {
        }
        Utils.byteLength = function (input, encoding) {
            if (encoding === void 0) { encoding = 'utf-8'; }
            // new TextEncoder('utf-8').encode('foo')).length
            var encoder = new TextEncoder(encoding).encode(input);
            var len = encoder.length;
            return len;
        };
        return Utils;
    }());
    exports.Utils = Utils;
});

/// <reference path="./text-encoding.d.ts" />
define('vs/language/xtext/language-client/web-socket-writer',["require", "exports", './utils'], function (require, exports, utils_1) {
    
    var Emitter = monaco.Emitter;
    var WebSocketMessageWriter = (function () {
        function WebSocketMessageWriter(ws, uiHooks) {
            this.ws = ws;
            this.uiHooks = uiHooks;
            this._logMsgs = false;
            this._encoder = new TextEncoder();
            this._decoder = new TextDecoder();
            this._errorEmitter = new Emitter();
            this._closeEmitter = new Emitter();
        }
        WebSocketMessageWriter.prototype.write = function (msg) {
            var json = JSON.stringify(msg);
            var data = this.toRpc(json);
            this.logMsg(data);
            if (this.uiHooks) {
                var send = msg;
                var id = send && send.id ? send.id : '';
                var details = {
                    id: id,
                    msg: msg,
                };
                this.uiHooks.onRequestStart(details);
            }
            this.ws.send(data);
        };
        WebSocketMessageWriter.prototype.toRpc = function (json) {
            var CONTENT_LENGTH = 'Content-Length: ';
            var CRLF = '\r\n';
            var encoding = 'utf-8';
            var contentLength = utils_1.Utils.byteLength(json, encoding);
            var contents = [
                CONTENT_LENGTH, contentLength.toString(), CRLF, CRLF,
                json
            ];
            var rpc = contents.join('');
            return rpc;
        };
        WebSocketMessageWriter.prototype.logMsg = function (data) {
            if (!this._logMsgs) {
                return;
            }
            var encoded = this._encoder.encode(data);
            var encodedBytes = (encoded ? encoded : []).toString();
            var decoded = this._decoder.decode(encoded);
            console.log('WebSocketMessageWriter:send');
            console.log('[%s]', encodedBytes);
            console.log(decoded);
        };
        Object.defineProperty(WebSocketMessageWriter.prototype, "onError", {
            get: function () {
                return this._errorEmitter.event;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WebSocketMessageWriter.prototype, "onClose", {
            get: function () {
                return this._closeEmitter.event;
            },
            enumerable: true,
            configurable: true
        });
        return WebSocketMessageWriter;
    }());
    exports.WebSocketMessageWriter = WebSocketMessageWriter;
});

define('vs/language/xtext/language-client/web-socket-stream',["require", "exports", './web-socket-reader', './web-socket-writer'], function (require, exports, web_socket_reader_1, web_socket_writer_1) {
    
    exports.WebSocketMessageReader = web_socket_reader_1.WebSocketMessageReader;
    exports.WebSocketMessageWriter = web_socket_writer_1.WebSocketMessageWriter;
    var WebSocketStream = (function () {
        function WebSocketStream(ws, uiHooks) {
            this.ws = ws;
            this.uiHooks = uiHooks;
            this.writer = new web_socket_writer_1.WebSocketMessageWriter(ws, uiHooks);
            this.reader = new web_socket_reader_1.WebSocketMessageReader(ws, uiHooks);
        }
        WebSocketStream.getWorkspaceConfig = function () {
            // run the below in the console then refresh when doing local dev.
            //
            // let langserverConfigJson = {
            // 	hostname: '13.65.101.250',
            // 	port: 4389,
            // 	scheme: 'ws'
            // };
            // let langserverConfigStr = JSON.stringify(langserverConfigJson);
            // localStorage.setItem('monaco.workspace.xtext.langserver', langserverConfigStr);
            var CONFIG_KEY = 'monaco.workspace.xtext.langserver';
            var configStr = localStorage.getItem(CONFIG_KEY);
            return JSON.parse(configStr);
        };
        WebSocketStream.createUrl = function () {
            var workspaceConfig = WebSocketStream.getWorkspaceConfig();
            var scheme = "ws";
            if (workspaceConfig && workspaceConfig.scheme) {
                scheme = workspaceConfig.scheme;
            }
            // location.host
            // "13.65.101.250:8080"
            // location.hostname
            // "13.65.101.250"
            var host = {
                hostname: location.hostname,
                port: '4389',
            };
            if (workspaceConfig && workspaceConfig.hostname) {
                host.hostname = workspaceConfig.hostname;
            }
            if (workspaceConfig && workspaceConfig.port) {
                host.port = workspaceConfig.port;
            }
            return scheme + "://" + host.hostname + ":" + host.port;
        };
        WebSocketStream.create = function (uiHooks) {
            return new Promise(function (resolve, reject) {
                var ws;
                try {
                    var url = WebSocketStream.createUrl();
                    ws = new WebSocket(url);
                    ws.onopen = function (ev) {
                        var streamInfo = new WebSocketStream(ws, uiHooks);
                        resolve(streamInfo);
                    };
                }
                catch (err) {
                    reject(err);
                }
                ws.onclose = function (ev) {
                    console.error('WebSocketStream:onclose - CloseEvent: ', ev);
                    reject(ev);
                };
                ws.onerror = function (ev) {
                    console.error('WebSocketStream:onerror - ErrorEvent: ', ev);
                    reject(ev);
                };
                ws.onmessage = function (ev) {
                    // console.info('WebSocketStream:onmessage - MessageEvent: ', ev);
                };
            });
        };
        return WebSocketStream;
    }());
    exports.WebSocketStream = WebSocketStream;
});

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define('vs/language/xtext/language-client/monaco-language-client',["require", "exports", 'vscode-languageclient', './web-socket-stream'], function (require, exports, vscode_languageclient_1, web_socket_stream_1) {
    
    var Uri = monaco.Uri;
    var MonacoLanguageClient = (function (_super) {
        __extends(MonacoLanguageClient, _super);
        function MonacoLanguageClient(id, serverOptions, clientOptions, forceDebug) {
            if (forceDebug === void 0) { forceDebug = false; }
            _super.call(this, id, serverOptions, clientOptions, forceDebug);
        }
        MonacoLanguageClient.create = function (uiHooks) {
            var id = 'langserver-antha';
            var serverOptions = function () {
                return web_socket_stream_1.WebSocketStream.create(uiHooks);
            };
            var documentSelector = ['mydsl'];
            var initializationFailedHandler = MonacoLanguageClient.createInitializationFailedHandler();
            var errorHandler = MonacoLanguageClient.createErrorHandler();
            var synchronize = {
                configurationSection: null,
                fileEvents: null
            };
            var uriConverters = MonacoLanguageClient.createUriConverters();
            var clientOptions = {
                documentSelector: documentSelector,
                synchronize: synchronize,
                // initializationOptions,
                initializationFailedHandler: initializationFailedHandler,
                errorHandler: errorHandler,
                uriConverters: uriConverters,
            };
            var forceDebug = false;
            var client = new MonacoLanguageClient(id, serverOptions, clientOptions, forceDebug);
            return client;
        };
        MonacoLanguageClient.createInitializationFailedHandler = function () {
            return function (error) {
                console.error('MonacoLanguageClient: ', error);
                // return false to terminate the LanguageClient
                return false;
            };
        };
        MonacoLanguageClient.createErrorHandler = function () {
            // shutdown then restart the server...
            return {
                error: function (error, message, count) {
                    console.error('MonacoLanguageClient: ', error, message, count);
                    return vscode_languageclient_1.ErrorAction.Shutdown;
                },
                closed: function () {
                    return vscode_languageclient_1.CloseAction.DoNotRestart;
                }
            };
        };
        MonacoLanguageClient.createUriConverters = function () {
            var makeHTTPPrefix = function () {
                var loc = location.href;
                var prefix = loc;
                var lastSlash = loc.lastIndexOf('/');
                if (lastSlash === (loc.length - 1)) {
                    prefix = loc.substr(0, lastSlash);
                }
                return prefix;
            };
            var SCHEME_PREFIX_FILE = 'file://';
            var SCHEME_PREFIX_HTTP = makeHTTPPrefix();
            // todo: cleanup - inverse ops...
            return {
                code2Protocol: function (uri) {
                    var value = uri.toString();
                    if (value.startsWith(SCHEME_PREFIX_HTTP)) {
                        var uri_1 = value.replace(SCHEME_PREFIX_HTTP, SCHEME_PREFIX_FILE);
                        return uri_1;
                    }
                    else {
                        return value;
                    }
                },
                protocol2Code: function (value) {
                    // not ideal: replace the file:// scheme that is returned by
                    // the langserver to http:// for monaco to load model
                    if (value.startsWith(SCHEME_PREFIX_FILE)) {
                        var noPrefix = value.replace(SCHEME_PREFIX_FILE, SCHEME_PREFIX_HTTP);
                        var uri = Uri.parse(noPrefix);
                        return uri;
                    }
                    else {
                        return Uri.parse(value);
                    }
                }
            };
        };
        return MonacoLanguageClient;
    }(vscode_languageclient_1.LanguageClient));
    exports.MonacoLanguageClient = MonacoLanguageClient;
});

define('vs/language/xtext/xtextMode',["require", "exports", './workerManager', './language-client/monaco-language-client'], function (require, exports, workerManager_1, monaco_language_client_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    
    function setupMode(defaults, uiHooks) {
        var disposables = [];
        var languageClient = monaco_language_client_1.MonacoLanguageClient.create(uiHooks);
        disposables.push(languageClient.start());
        var client = new workerManager_1.WorkerManager(defaults);
        disposables.push(client);
        var worker = function (first) {
            var more = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                more[_i - 1] = arguments[_i];
            }
            return client.getLanguageServiceWorker.apply(client, [first].concat(more));
        };
        var languageId = defaults.languageId;
        return disposables;
    }
    exports.setupMode = setupMode;
});
