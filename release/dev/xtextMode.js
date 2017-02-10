/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-go version: 0.0.1(ce2c611b33f00a26197f84429c9eb436d581d849)
 * Released under the MIT license
 * https://github.com/mbana/monaco-go/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/
define('vs/language/xtext/workerManager',["require", "exports"], function (require, exports) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
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
                    moduleId: 'vs/language/mydsl/xtextWorker',
                    label: 'mydsl',
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
                resources[_i] = arguments[_i];
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

define('vs/language/xtext/languageFeatures',["require", "exports", "vscode-languageserver-types"], function (require, exports, ls) {
    'use strict';
    var Uri = monaco.Uri;
    var Range = monaco.Range;
    // --- diagnostics --- ---
    var DiagnostcsAdapter = (function () {
        function DiagnostcsAdapter(_languageId, _worker) {
            var _this = this;
            this._languageId = _languageId;
            this._worker = _worker;
            this._disposables = [];
            this._listener = Object.create(null);
            var onModelAdd = function (model) {
                var modeId = model.getModeId();
                if (modeId !== _this._languageId) {
                    return;
                }
                var handle;
                _this._listener[model.uri.toString()] = model.onDidChangeContent(function () {
                    clearTimeout(handle);
                    handle = window.setTimeout(function () { return _this._doValidate(model.uri, modeId); }, 500);
                });
                _this._doValidate(model.uri, modeId);
            };
            var onModelRemoved = function (model) {
                monaco.editor.setModelMarkers(model, _this._languageId, []);
                delete _this._listener[model.uri.toString()];
            };
            this._disposables.push(monaco.editor.onDidCreateModel(onModelAdd));
            this._disposables.push(monaco.editor.onWillDisposeModel(onModelRemoved));
            this._disposables.push(monaco.editor.onDidChangeModelLanguage(function (event) {
                onModelRemoved(event.model);
                onModelAdd(event.model);
            }));
            this._disposables.push({
                dispose: function () {
                    for (var key in _this._listener) {
                        _this._listener[key].dispose();
                    }
                }
            });
            monaco.editor.getModels().forEach(onModelAdd);
        }
        DiagnostcsAdapter.prototype.dispose = function () {
            this._disposables.forEach(function (d) { return d && d.dispose(); });
            this._disposables = [];
        };
        DiagnostcsAdapter.prototype._doValidate = function (resource, languageId) {
            this._worker(resource).then(function (worker) {
                return worker.doValidation(resource.toString());
            }).then(function (diagnostics) {
                var markers = diagnostics.map(function (d) { return toDiagnostics(resource, d); });
                monaco.editor.setModelMarkers(monaco.editor.getModel(resource), languageId, markers);
            }).done(undefined, function (err) {
                console.error(err);
            });
        };
        return DiagnostcsAdapter;
    }());
    exports.DiagnostcsAdapter = DiagnostcsAdapter;
    function toSeverity(lsSeverity) {
        switch (lsSeverity) {
            case 1 /* Error */: return monaco.Severity.Error;
            case 2 /* Warning */: return monaco.Severity.Warning;
            case 3 /* Information */:
            case 4 /* Hint */:
            default:
                return monaco.Severity.Info;
        }
    }
    function toDiagnostics(resource, diag) {
        if (resource) { }
        var code = typeof diag.code === 'number' ? String(diag.code) : diag.code;
        return {
            severity: toSeverity(diag.severity),
            startLineNumber: diag.range.start.line + 1,
            startColumn: diag.range.start.character + 1,
            endLineNumber: diag.range.end.line + 1,
            endColumn: diag.range.end.character + 1,
            message: diag.message,
            code: code,
            source: diag.source
        };
    }
    // --- completion ------
    function fromPosition(position) {
        if (!position) {
            return void 0;
        }
        return { character: position.column - 1, line: position.lineNumber - 1 };
    }
    function fromRange(range) {
        if (!range) {
            return void 0;
        }
        return { start: fromPosition(range.getStartPosition()), end: fromPosition(range.getEndPosition()) };
    }
    function toRange(range) {
        if (!range) {
            return void 0;
        }
        return new Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
    }
    function toCompletionItemKind(kind) {
        var mItemKind = monaco.languages.CompletionItemKind;
        switch (kind) {
            case 1 /* Text */: return mItemKind.Text;
            case 2 /* Method */: return mItemKind.Method;
            case 3 /* Function */: return mItemKind.Function;
            case 4 /* Constructor */: return mItemKind.Constructor;
            case 5 /* Field */: return mItemKind.Field;
            case 6 /* Variable */: return mItemKind.Variable;
            case 7 /* Class */: return mItemKind.Class;
            case 8 /* Interface */: return mItemKind.Interface;
            case 9 /* Module */: return mItemKind.Module;
            case 10 /* Property */: return mItemKind.Property;
            case 11 /* Unit */: return mItemKind.Unit;
            case 12 /* Value */: return mItemKind.Value;
            case 13 /* Enum */: return mItemKind.Enum;
            case 14 /* Keyword */: return mItemKind.Keyword;
            case 15 /* Snippet */: return mItemKind.Snippet;
            case 16 /* Color */: return mItemKind.Color;
            case 17 /* File */: return mItemKind.File;
            case 18 /* Reference */: return mItemKind.Reference;
        }
        return mItemKind.Property;
    }
    function toTextEdit(textEdit) {
        if (!textEdit) {
            return void 0;
        }
        return {
            range: toRange(textEdit.range),
            text: textEdit.newText
        };
    }
    var CompletionAdapter = (function () {
        function CompletionAdapter(_worker, _client) {
            this._worker = _worker;
            this.client = _client;
        }
        Object.defineProperty(CompletionAdapter.prototype, "triggerCharacters", {
            get: function () {
                return [' ', ':'];
            },
            enumerable: true,
            configurable: true
        });
        CompletionAdapter.prototype.provideCompletionItems = function (model, position, token) {
            var _this = this;
            // const wordInfo = model.getWordUntilPosition(position);
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.doComplete(_this.client, resource.toString(), fromPosition(position));
            }).then(function (info) {
                if (!info) {
                    return;
                }
                var items = info.items.map(function (entry) {
                    var completionItem = {
                        label: entry.label,
                        insertText: entry.insertText,
                        sortText: entry.sortText,
                        filterText: entry.filterText,
                        documentation: entry.documentation,
                        detail: entry.detail,
                        kind: toCompletionItemKind(entry.kind),
                        textEdit: toTextEdit(entry.textEdit)
                    };
                    return completionItem;
                });
                return {
                    isIncomplete: info.isIncomplete,
                    items: items
                };
            }));
        };
        return CompletionAdapter;
    }());
    exports.CompletionAdapter = CompletionAdapter;
    function toMarkedStringArray(contents) {
        if (!contents) {
            return void 0;
        }
        if (Array.isArray(contents)) {
            return contents;
        }
        return [contents];
    }
    // --- hover ------
    var HoverAdapter = (function () {
        function HoverAdapter(_worker) {
            this._worker = _worker;
        }
        HoverAdapter.prototype.provideHover = function (model, position, token) {
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.doHover(resource.toString(), fromPosition(position));
            }).then(function (info) {
                if (!info) {
                    return;
                }
                return {
                    range: toRange(info.range),
                    contents: toMarkedStringArray(info.contents)
                };
            }));
        };
        return HoverAdapter;
    }());
    exports.HoverAdapter = HoverAdapter;
    // --- document highlights ------
    function toDocumentHighlightKind(kind) {
        switch (kind) {
            case 2 /* Read */: return monaco.languages.DocumentHighlightKind.Read;
            case 3 /* Write */: return monaco.languages.DocumentHighlightKind.Write;
            case 1 /* Text */: return monaco.languages.DocumentHighlightKind.Text;
        }
        return monaco.languages.DocumentHighlightKind.Text;
    }
    var DocumentHighlightAdapter = (function () {
        function DocumentHighlightAdapter(_worker) {
            this._worker = _worker;
        }
        DocumentHighlightAdapter.prototype.provideDocumentHighlights = function (model, position, token) {
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.findDocumentHighlights(resource.toString(), fromPosition(position));
            }).then(function (entries) {
                if (!entries) {
                    return;
                }
                return entries.map(function (entry) {
                    return {
                        range: toRange(entry.range),
                        kind: toDocumentHighlightKind(entry.kind)
                    };
                });
            }));
        };
        return DocumentHighlightAdapter;
    }());
    exports.DocumentHighlightAdapter = DocumentHighlightAdapter;
    // --- definition ------
    function toLocation(location) {
        return {
            uri: Uri.parse(location.uri),
            range: toRange(location.range)
        };
    }
    var DefinitionAdapter = (function () {
        function DefinitionAdapter(_worker) {
            this._worker = _worker;
        }
        DefinitionAdapter.prototype.provideDefinition = function (model, position, token) {
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.findDefinition(resource.toString(), fromPosition(position));
            }).then(function (definition) {
                if (!definition) {
                    return;
                }
                return [toLocation(definition)];
            }));
        };
        return DefinitionAdapter;
    }());
    exports.DefinitionAdapter = DefinitionAdapter;
    // --- references ------
    var ReferenceAdapter = (function () {
        function ReferenceAdapter(_worker) {
            this._worker = _worker;
        }
        ReferenceAdapter.prototype.provideReferences = function (model, position, context, token) {
            if (context) { }
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.findReferences(resource.toString(), fromPosition(position));
            }).then(function (entries) {
                if (!entries) {
                    return;
                }
                return entries.map(toLocation);
            }));
        };
        return ReferenceAdapter;
    }());
    exports.ReferenceAdapter = ReferenceAdapter;
    // --- rename ------
    function toWorkspaceEdit(edit) {
        if (!edit || !edit.changes) {
            return void 0;
        }
        var resourceEdits = [];
        for (var uri in edit.changes) {
            var textDocumentEdit = edit.changes[uri];
            var edits = textDocumentEdit.edits;
            for (var _i = 0, edits_1 = edits; _i < edits_1.length; _i++) {
                var e = edits_1[_i];
                resourceEdits.push({ resource: Uri.parse(uri), range: toRange(e.range), newText: e.newText });
            }
        }
        return {
            edits: resourceEdits
        };
    }
    var RenameAdapter = (function () {
        function RenameAdapter(_worker) {
            this._worker = _worker;
        }
        RenameAdapter.prototype.provideRenameEdits = function (model, position, newName, token) {
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) {
                return worker.doRename(resource.toString(), fromPosition(position), newName);
            }).then(function (edit) {
                return toWorkspaceEdit(edit);
            }));
        };
        return RenameAdapter;
    }());
    exports.RenameAdapter = RenameAdapter;
    // --- document symbols ------
    function toSymbolKind(kind) {
        var mKind = monaco.languages.SymbolKind;
        switch (kind) {
            case 1 /* File */: return mKind.Array;
            case 2 /* Module */: return mKind.Module;
            case 3 /* Namespace */: return mKind.Namespace;
            case 4 /* Package */: return mKind.Package;
            case 5 /* Class */: return mKind.Class;
            case 6 /* Method */: return mKind.Method;
            case 7 /* Property */: return mKind.Property;
            case 8 /* Field */: return mKind.Field;
            case 9 /* Constructor */: return mKind.Constructor;
            case 10 /* Enum */: return mKind.Enum;
            case 11 /* Interface */: return mKind.Interface;
            case 12 /* Function */: return mKind.Function;
            case 13 /* Variable */: return mKind.Variable;
            case 14 /* Constant */: return mKind.Constant;
            case 15 /* String */: return mKind.String;
            case 16 /* Number */: return mKind.Number;
            case 17 /* Boolean */: return mKind.Boolean;
            case 18 /* Array */: return mKind.Array;
        }
        return mKind.Function;
    }
    var DocumentSymbolAdapter = (function () {
        function DocumentSymbolAdapter(_worker) {
            this._worker = _worker;
        }
        DocumentSymbolAdapter.prototype.provideDocumentSymbols = function (model, token) {
            var resource = model.uri;
            return wireCancellationToken(token, this._worker(resource).then(function (worker) { return worker.findDocumentSymbols(resource.toString()); }).then(function (items) {
                if (!items) {
                    return;
                }
                return items.map(function (item) { return ({
                    name: item.name,
                    containerName: item.containerName,
                    kind: toSymbolKind(item.kind),
                    location: toLocation(item.location)
                }); });
            }));
        };
        return DocumentSymbolAdapter;
    }());
    exports.DocumentSymbolAdapter = DocumentSymbolAdapter;
    /**
     * Hook a cancellation token to a WinJS Promise
     */
    function wireCancellationToken(token, promise) {
        token.onCancellationRequested(function () { return promise.cancel(); });
        return promise;
    }
});

define('vs/language/xtext/language-client/web-socket-reader',["require", "exports"], function (require, exports) {
    "use strict";
    var Emitter = monaco.Emitter;
    var WebSocketMessageReader = (function () {
        function WebSocketMessageReader(ws, uiHooks) {
            this.ws = ws;
            this.uiHooks = uiHooks;
            this._logMsgs = true;
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
                var reader = new FileReader();
                var self = _this;
                reader.onload = function () {
                    var text = reader.result;
                    if (!self._callback || typeof text !== 'string') {
                    }
                    else {
                        self.logMsg(text);
                        self.handleMessages(text);
                    }
                };
                reader.readAsText(data);
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
            console.info('WebSocketMessageReader:onmessage - msgs.length ', msgs.length);
            msgs.map(function (data) {
                _this.logMsg(data);
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
            if (response[0].startsWith('Content-Length:'))
                return;
            var json = response[0];
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
    "use strict";
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
define('vs/language/xtext/language-client/web-socket-writer',["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
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

define('vs/language/xtext/language-client/web-socket-stream',["require", "exports", "./web-socket-reader", "./web-socket-writer"], function (require, exports, web_socket_reader_1, web_socket_writer_1) {
    "use strict";
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
                hostname: 'localhost',
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
                    console.info('WebSocketStream:onmessage - MessageEvent: ', ev);
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
define('vs/language/xtext/language-client/monaco-language-client',["require", "exports", "vscode-languageclient", "./web-socket-stream"], function (require, exports, vscode_languageclient_1, web_socket_stream_1) {
    "use strict";
    var Uri = monaco.Uri;
    var MonacoLanguageClient = (function (_super) {
        __extends(MonacoLanguageClient, _super);
        function MonacoLanguageClient(id, serverOptions, clientOptions, forceDebug) {
            if (forceDebug === void 0) { forceDebug = false; }
            return _super.call(this, id, serverOptions, clientOptions, forceDebug) || this;
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
                    return value;
                },
                protocol2Code: function (value) {
                    // not ideal: replace the file:// scheme that is returned by
                    // the langserver to http:// for monaco to load model
                    return Uri.parse(value);
                }
            };
        };
        return MonacoLanguageClient;
    }(vscode_languageclient_1.LanguageClient));
    exports.MonacoLanguageClient = MonacoLanguageClient;
});

define('vs/language/xtext/xtextMode',["require", "exports", "./workerManager", "./languageFeatures", "./language-client/monaco-language-client"], function (require, exports, workerManager_1, languageFeatures, monaco_language_client_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
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
        disposables.push(monaco.languages.registerCompletionItemProvider(languageId, new languageFeatures.CompletionAdapter(worker, languageClient)));
        disposables.push(monaco.languages.registerHoverProvider(languageId, new languageFeatures.HoverAdapter(worker)));
        disposables.push(monaco.languages.registerDocumentHighlightProvider(languageId, new languageFeatures.DocumentHighlightAdapter(worker)));
        disposables.push(monaco.languages.registerDefinitionProvider(languageId, new languageFeatures.DefinitionAdapter(worker)));
        disposables.push(monaco.languages.registerReferenceProvider(languageId, new languageFeatures.ReferenceAdapter(worker)));
        disposables.push(monaco.languages.registerDocumentSymbolProvider(languageId, new languageFeatures.DocumentSymbolAdapter(worker)));
        disposables.push(monaco.languages.registerRenameProvider(languageId, new languageFeatures.RenameAdapter(worker)));
        disposables.push(new languageFeatures.DiagnostcsAdapter(languageId, worker));
        return disposables;
    }
    exports.setupMode = setupMode;
});

