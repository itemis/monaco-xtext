/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-go version: 0.0.1(10663473bffdcd65c6b3b4156f547e1be27124b1)
 * Released under the MIT license
 * https://github.com/mbana/monaco-go/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/

define('vs/language/xtext/xtextWorker',["require", "exports"], function (require, exports) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    
    var Promise = monaco.Promise;
    var XtextWorker = (function () {
        function XtextWorker(ctx, createData) {
            this._ctx = ctx;
            this._languageId = 'mydsl';
        }
        // --- language service host ---------------
        XtextWorker.prototype.doValidation = function (uri) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.doComplete = function (uri, position) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.doHover = function (uri, position) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.findDefinition = function (uri, position) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.findReferences = function (uri, position) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.findDocumentHighlights = function (uri, position) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.findDocumentSymbols = function (uri) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.doCodeActions = function (uri, range, context) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.findColorSymbols = function (uri) {
            return new Promise(function (resolve, reject) {
            });
        };
        XtextWorker.prototype.doRename = function (uri, position, newName) {
            return new Promise(function (resolve, reject) {
            });
        };
        return XtextWorker;
    }());
    exports.XtextWorker = XtextWorker;
    function create(ctx, createData) {
        return new XtextWorker(ctx, createData);
    }
    exports.create = create;
});
