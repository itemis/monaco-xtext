/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-go version: 0.0.1(ce2c611b33f00a26197f84429c9eb436d581d849)
 * Released under the MIT license
 * https://github.com/mbana/monaco-go/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/
define('vs/language/xtext/monaco.contribution',["require", "exports", "./fillers/vscode/monaco-workspace"], function (require, exports, monaco_workspace_1) {
    'use strict';
    var Emitter = monaco.Emitter;
    var workspace = monaco_workspace_1.MonacoWorkspace.create();
    exports.workspace = workspace;
    // Allow for running under nodejs/requirejs in tests
    var _monaco = (typeof monaco === 'undefined' ? self.monaco : monaco);
    // --- CSS configuration and defaults ---------
    var LanguageServiceDefaultsImpl = (function () {
        function LanguageServiceDefaultsImpl(languageId, diagnosticsOptions) {
            this._onDidChange = new Emitter();
            this._languageId = languageId;
            this.setDiagnosticsOptions(diagnosticsOptions);
        }
        Object.defineProperty(LanguageServiceDefaultsImpl.prototype, "onDidChange", {
            get: function () {
                return this._onDidChange.event;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LanguageServiceDefaultsImpl.prototype, "languageId", {
            get: function () {
                return this._languageId;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LanguageServiceDefaultsImpl.prototype, "diagnosticsOptions", {
            get: function () {
                return this._diagnosticsOptions;
            },
            enumerable: true,
            configurable: true
        });
        LanguageServiceDefaultsImpl.prototype.setDiagnosticsOptions = function (options) {
            this._diagnosticsOptions = options || Object.create(null);
            this._onDidChange.fire(this);
        };
        return LanguageServiceDefaultsImpl;
    }());
    exports.LanguageServiceDefaultsImpl = LanguageServiceDefaultsImpl;
    var diagnosticDefault = {
        validate: true,
        lint: {
            compatibleVendorPrefixes: 'ignore',
            vendorPrefix: 'warning',
            duplicateProperties: 'warning',
            emptyRules: 'warning',
            importStatement: 'ignore',
            boxModel: 'ignore',
            universalSelector: 'ignore',
            zeroUnits: 'ignore',
            fontFaceProperties: 'warning',
            hexColorLength: 'error',
            argumentsInColorFunction: 'error',
            unknownProperties: 'warning',
            ieHack: 'ignore',
            unknownVendorSpecificProperties: 'ignore',
            propertyIgnoredDueToDisplay: 'warning',
            important: 'ignore',
            float: 'ignore',
            idSelector: 'ignore'
        }
    };
    exports.xtextDefaults = new LanguageServiceDefaultsImpl('mydsl', diagnosticDefault);
    // Export API
    function createAPI() {
        return {
            xtext: exports.xtextDefaults
        };
    }
    monaco.languages.xtext = createAPI();
    var uIHooksDefaults = {
        onRequestStart: function (details) {
        },
        onRequestEnd: function (details) {
        },
        extra: {},
    };
    var languageDefinitions = {};
    function _loadLanguage(languageId) {
        var module = languageDefinitions[languageId].module;
        return new _monaco.Promise(function (c, e, p) {
            require([module], function (mod) {
                _monaco.languages.setMonarchTokensProvider(languageId, mod.language);
                _monaco.languages.setLanguageConfiguration(languageId, mod.conf);
                c(void 0);
            });
        });
    }
    var languagePromises = {};
    function loadLanguage(languageId) {
        if (!languagePromises[languageId]) {
            languagePromises[languageId] = _loadLanguage(languageId);
        }
        return languagePromises[languageId];
    }
    exports.loadLanguage = loadLanguage;
    function registerLanguage(def) {
        var languageId = def.id;
        languageDefinitions[languageId] = def;
        _monaco.languages.register(def);
        _monaco.languages.onLanguage(languageId, function () {
            loadLanguage(languageId);
        });
    }
    registerLanguage({
        id: 'mydsl',
        extensions: ['.mydsl'],
        aliases: ['Mydsl', 'mydsl'],
        module: './mydsl'
    });
    function withMode(callback) {
        require(['vs/language/mydsl/xtextMode'], callback);
    }
    monaco.languages.onLanguage('mydsl', function () {
        withMode(function (mode) { return mode.setupMode(exports.xtextDefaults, uIHooksDefaults); });
    });
});

